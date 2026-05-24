const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
if (!inputFile) {
    console.error('[ERROR] No JS file provided.');
    process.exit(1);
}

const absPath = path.resolve(inputFile);
if (!fs.existsSync(absPath)) {
    console.error(`[ERROR] File not found: ${absPath}`);
    process.exit(1);
}

const workDir = path.dirname(absPath);
const baseName = path.basename(absPath, '.js');

console.log(`[INFO] Input file: ${absPath}`);
console.log(`[INFO] Working directory: ${workDir}`);
process.chdir(workDir);

// Check Node.js version
const nodeVersion = execSync('node -v', { encoding: 'utf8' }).trim();
const major = parseInt(nodeVersion.slice(1).split('.')[0]);
if (major < 20) {
    console.error(`[ERROR] Node.js version too old (${nodeVersion}), need v20+`);
    process.exit(1);
}
console.log(`[CHECK] Node.js ${nodeVersion} ✓`);

// Auto-detect and install missing dependencies (same as before)
console.log('[STEP 0] Scanning project dependencies...');
const sourceCode = fs.readFileSync(absPath, 'utf8');
const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
const importSideEffectRegex = /import\s+['"]([^'"]+)['"]/g;
const modules = new Set();
let match;
while ((match = requireRegex.exec(sourceCode)) !== null) modules.add(match[1]);
while ((match = importRegex.exec(sourceCode)) !== null) modules.add(match[1]);
while ((match = importSideEffectRegex.exec(sourceCode)) !== null) modules.add(match[1]);

const builtinModules = new Set([
    'fs', 'path', 'http', 'https', 'url', 'querystring', 'crypto', 'zlib',
    'stream', 'events', 'util', 'child_process', 'os', 'net', 'dns', 'tls',
    'readline', 'repl', 'vm', 'assert', 'buffer', 'console', 'module', 'process'
]);

const externalModules = [...modules].filter(mod => {
    if (builtinModules.has(mod)) return false;
    if (mod.startsWith('.') || mod.startsWith('/') || mod.startsWith('\\')) return false;
    if (/^[a-zA-Z]:[\\/]/.test(mod)) return false;
    return true;
});

if (externalModules.length === 0) {
    console.log('[INFO] No external dependencies detected.');
} else {
    console.log(`[INFO] Found external dependencies: ${externalModules.join(', ')}`);
    let existingDeps = new Set();
    if (fs.existsSync('package.json')) {
        try {
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            if (pkg.dependencies) Object.keys(pkg.dependencies).forEach(d => existingDeps.add(d));
            if (pkg.devDependencies) Object.keys(pkg.devDependencies).forEach(d => existingDeps.add(d));
        } catch(e) {}
    }
    const missing = [];
    for (const mod of externalModules) {
        const modulePath = path.join(workDir, 'node_modules', mod);
        if (!fs.existsSync(modulePath) && !existingDeps.has(mod)) {
            missing.push(mod);
        }
    }
    if (missing.length === 0) {
        console.log('[INFO] All dependencies already installed ✓');
    } else {
        console.log(`[INFO] Missing dependencies: ${missing.join(', ')}`);
        console.log('[STEP 0] Installing missing dependencies...');
        try {
            execSync(`npm install ${missing.join(' ')} --save`, { stdio: 'inherit' });
            console.log('[INFO] Dependencies installed ✓');
        } catch(e) {
            console.error('[ERROR] Failed to install dependencies.');
            process.exit(1);
        }
    }
}

// Ensure package.json exists
if (!fs.existsSync('package.json')) {
    fs.writeFileSync('package.json', '{}');
}

// Install webpack build tools (if needed)
console.log('[STEP 1] Installing webpack build tools...');
try {
    execSync('npm install --save-dev webpack webpack-cli', { stdio: 'inherit' });
} catch(e) {
    console.error('[ERROR] Failed to install webpack.');
    process.exit(1);
}
console.log('[INFO] Build tools installed ✓');

// ----- KEY CHANGE: Webpack config without externals -----
// We need to bundle ALL dependencies into the single file.
// For native modules, this might still fail, but we try.
const configContent = `
const path = require('path');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: ${JSON.stringify(absPath)},
  output: {
    filename: 'bundle_${baseName}.js',
    path: path.resolve(__dirname),
    libraryTarget: 'commonjs2',
  },
  // Do NOT use externals - we want everything bundled
  externals: [],
  // This tells webpack to not ignore built-in modules
  externalsPresets: { node: true },
  // Resolve .js files
  resolve: {
    extensions: ['.js'],
  },
  // Ignore warnings about critical dependencies (e.g., optional native modules)
  ignoreWarnings: [
    { message: /Critical dependency/ },
  ],
};
`;
const configPath = path.join(workDir, 'webpack.sea.config.js');
fs.writeFileSync(configPath, configContent);
console.log(`[INFO] Webpack config (with full bundling) generated: ${configPath}`);

// Run webpack
console.log('[STEP 2] Running webpack (bundling all dependencies)...');
try {
    execSync(`npx webpack --config "${configPath}" --output-path "${workDir}"`, { stdio: 'inherit' });
} catch(e) {
    console.error('[ERROR] Webpack build failed.');
    process.exit(1);
}

const bundleFile = path.join(workDir, `bundle_${baseName}.js`);
if (!fs.existsSync(bundleFile)) {
    console.error(`[ERROR] Webpack output not found: ${bundleFile}`);
    process.exit(1);
}
console.log(`[INFO] Webpack build completed: ${bundleFile} ✓`);

// Generate SEA config
const seaConfig = {
    main: bundleFile,
    output: `${baseName}.blob`,
    disableExperimentalSEAWarning: true,
    useCodeCache: false,
};
const seaConfigPath = path.join(workDir, 'sea-config.json');
fs.writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2));

// Generate blob
console.log('[STEP 3] Generating SEA blob...');
try {
    execSync(`node --experimental-sea-config "${seaConfigPath}"`, { stdio: 'inherit' });
} catch(e) {
    console.error('[ERROR] SEA blob generation failed.');
    process.exit(1);
}

const blobFile = path.join(workDir, `${baseName}.blob`);
if (!fs.existsSync(blobFile)) {
    console.error(`[ERROR] Blob file not found: ${blobFile}`);
    process.exit(1);
}

console.log('\n========================================');
console.log('Build successful!');
console.log(`Blob file: ${blobFile}`);
console.log('\nNext step to create exe:');
console.log(`  Drag the .blob file onto blob2exe.bat`);
console.log('========================================');