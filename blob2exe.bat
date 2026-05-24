@echo off
set "BLOB=%1"
if "%BLOB%"=="" set /p BLOB="Drag .blob file and press Enter: "
if not exist "%BLOB%" if exist "%BLOB%.blob" set "BLOB=%BLOB%.blob"
if not exist "%BLOB%" echo File not found & pause & exit /b 1

for %%I in ("%BLOB%") do set "NAME=%%~nI"
set "EXE=%NAME%.exe"

echo Blob: %BLOB%
echo Exe : %EXE%

:: Find node.exe
for /f "delims=" %%i in ('where node') do set "NODE=%%i"
if not defined NODE echo node.exe not found & pause & exit /b 1

copy "%NODE%" "%EXE%" >nul
npx postject "%EXE%" NODE_SEA_BLOB "%BLOB%" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 copy
echo Done: %EXE%
pause