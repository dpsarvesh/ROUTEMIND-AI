@echo off
echo ===================================================
echo     RouteMind AI - Push to GitHub Helper
echo ===================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please download and install Git from: https://git-scm.com/download/win
    echo After installing Git, run this script again!
    pause
    exit /b 1
)

set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/your-name/routemind-ai.git): "

if "%REPO_URL%"=="" (
    echo [ERROR] No repository URL entered. Exiting.
    pause
    exit /b 1
)

echo.
echo Initializing Git repository...
git init
git add .
git commit -m "Initial commit: RouteMind AI Full Production Navigation System"
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo.
echo Pushing to GitHub...
git push -u origin main

echo.
echo ===================================================
echo Done! Your project is now on GitHub.
echo To enable your free live website link:
echo 1. Go to your GitHub repository in your browser
echo 2. Click on 'Settings' -> 'Pages'
echo 3. Under 'Build and deployment', choose 'GitHub Actions'
echo Your live website link will be ready in 1-2 minutes!
echo ===================================================
pause
