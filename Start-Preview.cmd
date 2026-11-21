@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then open this launcher again.
  pause
  exit /b 1
)
echo Starting Arkimaison and Arkimade...
echo Open http://localhost:3000/ in your browser.
echo Keep this window open while using the website.
echo.
node server.cjs
echo.
echo The preview server has stopped. Any error is shown above.
pause
