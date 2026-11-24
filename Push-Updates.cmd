@echo off
setlocal
cd /d "C:\Users\jakup\OneDrive\Documents\Zenith-Architecture-Studio"
if errorlevel 1 (
  echo Could not open the website project folder.
  pause
  exit /b 1
)
echo Uploading the website and Studio Manager to GitHub...
echo Complete GitHub sign-in if a browser window opens.
echo.
git add -- index.html arkimade.html arkimaison.html arkimade-staff.html arkimaison-staff.html "Studio Manager.url" style.css welcome.css brands.css app.js admin.html assets content/site.json lib api build.cjs server.cjs package.json package-lock.json vercel.json .env.example CMS-SETUP.md README.md qa-all.cjs qa-site.cjs qa-cms.cjs qa-blob.cjs qa-admin.cjs qa-transitions.cjs Push-Updates.cmd
if errorlevel 1 goto failed
git diff --cached --quiet -- index.html arkimade.html arkimaison.html arkimade-staff.html arkimaison-staff.html "Studio Manager.url" style.css welcome.css brands.css app.js admin.html assets content/site.json lib api build.cjs server.cjs package.json package-lock.json vercel.json .env.example CMS-SETUP.md README.md qa-all.cjs qa-site.cjs qa-cms.cjs qa-blob.cjs qa-admin.cjs qa-transitions.cjs Push-Updates.cmd
if errorlevel 1 (
  git commit -m "Add owner CMS for both studios" -- index.html arkimade.html arkimaison.html arkimade-staff.html arkimaison-staff.html "Studio Manager.url" style.css welcome.css brands.css app.js admin.html assets content/site.json lib api build.cjs server.cjs package.json package-lock.json vercel.json .env.example CMS-SETUP.md README.md qa-all.cjs qa-site.cjs qa-cms.cjs qa-blob.cjs qa-admin.cjs qa-transitions.cjs Push-Updates.cmd
  if errorlevel 1 goto failed
)
git push origin HEAD:main
if errorlevel 1 goto failed
echo.
echo GitHub is up to date. Check your Vercel project's latest deployment.
pause
exit /b 0
:failed
echo.
echo Upload failed. Please send the error shown above.
pause
exit /b 1
