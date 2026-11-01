@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 serve.py %*
  goto :done
)

where python >nul 2>nul
if %errorlevel%==0 (
  python serve.py %*
  goto :done
)

where node >nul 2>nul
if %errorlevel%==0 (
  node serve.js %*
  goto :done
)

echo.
echo Python 3 or Node.js is required to run the local preview.
echo Install Python from https://www.python.org/downloads/ and try again.
echo.
pause
exit /b 1

:done
if errorlevel 1 pause
