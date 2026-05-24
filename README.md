#### [README中文版本](/README_ZH.md)
# Node.js SEA + Webpack Packaging Tool
[![Language - JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow?style=flat&logo=javascript&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Runtime - Node.js](https://img.shields.io/badge/Runtime-Node.js_v20+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform - Windows](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat&logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![License - MIT](https://img.shields.io/badge/License-MIT-3da639?style=flat)](https://opensource.org/licenses/MIT)


This toolset provides a set of automated scripts to package a Node.js project (a single JS file and all its dependencies) into a standalone executable file (`.exe`), based on Node.js official **Single Executable Applications (SEA)** feature and **Webpack**.

---

## 📦 Tech Stack

| Technology/Tool | Purpose |
|----------------|---------|
| **Node.js (v20+)** | JavaScript runtime, provides SEA experimental feature |
| **Webpack** | Bundles the project source code and all dependencies into a single JS file |
| **Node.js SEA** | Injects the bundled JS file into a Node.js binary to generate a standalone executable |
| **postject** | Tool for injecting SEA blob into an executable file |
| **webpack-node-externals** (optional) | Helps exclude Node built-in modules |

---

## 🛠️ Environment Setup (Must Read Before Use)

### 1. Install Node.js
- Requires version **v20.0.0 or higher** (recommended v22 LTS or v24)
- Download: [https://nodejs.org/](https://nodejs.org/)
- During installation, please check **“Add to PATH”**

Verify installation:
```bash
node -v   # Should show v20.x.x or higher
npm -v
```

### 2. Install Python Build Tools (Optional)
If your project depends on native modules that need compilation (e.g., `bcrypt`, `sqlite3`), it is recommended to install:
- **Windows**: Run the following command as Administrator (requires npm already installed):
  ```bash
  npm install --global windows-build-tools
  ```
- **macOS/Linux**: Build tools are usually already available; no additional action needed.

### 3. Network Requirements
The first time you run the scripts, `webpack`, `webpack-cli`, and your project dependencies will be automatically installed, requiring a stable internet connection.

> ⚠️ **Important Limitation**: Node.js SEA **does not support** packaging native modules (`.node` files) into the binary. If your project depends on native modules (e.g., `puppeteer-core`, `sharp`), the generated `.exe` may not work correctly. For pure JavaScript projects, it works perfectly fine.

---

## 🚀 Quick Start

### Step 0: Prepare Your Project File
Make sure you have an entry JS file (e.g., `app.js`) and all dependencies installed (or let the script install them automatically).

### Step 1: Bundle JS into SEA Blob
- **Method 1 (Recommended)**: Drag and drop your `app.js` file directly onto the `build_sea.bat` icon.
- **Method 2 (Command Line)**:
  ```bash
  build_sea.bat "C:\path\to\app.js"
  ```

The script will automatically:
1. Check Node.js version (must be ≥20)
2. Scan your JS file to identify all `require`/`import` third-party dependencies
3. Automatically install missing npm packages
4. Install Webpack build tools (temporarily)
5. Use Webpack to bundle your code and all dependencies into a `bundle_*.js`
6. Invoke Node.js SEA to generate a `.blob` intermediate file

Upon success, the following files are generated:
- `bundle_app.js`   (Webpack bundle output)
- `app.blob`        (SEA intermediate file, for next step)

### Step 2: Convert Blob to Final Executable
- **Method 1 (Drag and drop)**: Drag and drop the `app.blob` file generated in the previous step onto the `blob2exe.bat` icon.
- **Method 2 (Command Line)**:
  ```bash
  blob2exe.bat app.blob
  ```

The script will automatically:
1. Locate `node.exe` on your system (preferring the `NODE_HOME` environment variable)
2. Copy `node.exe` and rename it to `app.exe`
3. Invoke `postject` to inject `app.blob` into `app.exe`
4. Done! The standalone `app.exe` is generated

### Step 3: Run Your Application
Double-click `app.exe` to run. No Node.js or dependencies need to be installed (except possibly external resources like Chrome browser, etc.).

---

## 📁 File Descriptions

| File | Purpose |
|------|---------|
| `build_sea.bat` | Entry batch script, receives JS file path, calls `sea-builder.js` |
| `sea-builder.js` | Core script: dependency detection, installation, Webpack bundling, SEA blob generation |
| `blob2exe.bat` | Injects `.blob` file into `node.exe` to produce final `.exe` |

> Note: `sea-builder.js` and the two `.bat` files should be placed in the **same directory** (e.g., a folder on your desktop).

---

## ⚠️ Common Issues and Limitations

### 1. `ERR_UNKNOWN_BUILTIN_MODULE` at runtime
- **Cause**: The code `require()`s a third-party module that was not bundled by Webpack (e.g., due to incorrect `externals` configuration in Webpack).
- **Solution**: This tool bundles all dependencies by default. If this error occurs, check if the `externals` configuration in `sea-builder.js` has been accidentally modified.

### 2. After packaging, the exe still shows Node.js version information instead of your program's output
- **Cause**: Injection failed or the sentinel fuse string is incorrect.
- **Solution**:
  - Run `blob2exe.bat` as Administrator
  - Disable antivirus software (may block injection)
  - Verify that the sentinel fuse string in the `postject` command is the official value: `NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`

### 3. Project depends on native modules (e.g., `bcrypt`, `puppeteer-core`)
- **Limitation**: SEA **cannot package native modules**. Such dependencies still need to load from disk at runtime, so the generated exe cannot be fully standalone.
- **Suggestions**:
  - If `puppeteer-core` is required, consider leaving it as an external dependency and distribute the Chrome executable together with the exe.
  - For `bcrypt` etc., try using pure JavaScript alternatives (e.g., `bcryptjs`).

### 4. Webpack warning `Module not found` for `bufferutil`, `utf-8-validate`
- These are optional native modules; missing them does not affect functionality. The script filters these warnings via `ignoreWarnings`; they can be safely ignored.

### 5. How to update the Node.js version used for packaging?
- The tool automatically uses the `node.exe` found in your PATH. If you want to use a specific Node.js version, set the `NODE_HOME` environment variable to point to the installation directory of the desired version; that directory must contain `node.exe`.