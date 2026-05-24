@echo off
setlocal
:: get path of the file dragged in
set "INPUT_FILE=%~1"
if "%INPUT_FILE%"=="" (
    echo drag source file onto this bat
    pause
    exit /b 1
)
:: call node.js script in the same folder
node "%~dp0sea-builder.js" "%INPUT_FILE%"
pause