@echo off
REM RouteMind AI — GitHub Repository Setup & Push Script
REM Run this after generating your GitHub Personal Access Token

REM ─── INSTRUCTIONS ─────────────────────────────────────────────────────────
REM 1. Go to: https://github.com/new
REM    - Repository name: routemind-ai
REM    - Description: RouteMind AI — Intelligent Navigation Assistant with MCDA scoring
REM    - Visibility: Public
REM    - DO NOT initialize with README (we have our own)
REM    - Click "Create repository"
REM
REM 2. Go to: https://github.com/settings/tokens/new
REM    - Note: routemind-ai-push
REM    - Expiration: 30 days
REM    - Scopes: check "repo" (full control of private repositories)
REM    - Click "Generate token" and COPY the token (ghp_xxx...)
REM
REM 3. Replace YOUR_TOKEN_HERE below with your actual token
REM    Replace YOUR_USERNAME with your GitHub username (dpsarvesh)
REM
REM 4. Double-click this .bat file to run it

set GITHUB_TOKEN=YOUR_TOKEN_HERE
set GITHUB_USERNAME=dpsarvesh
set REPO_NAME=routemind-ai

echo.
echo === RouteMind AI — GitHub Push Script ===
echo.
echo Configuring remote...
git remote remove origin 2>nul
git remote add origin https://%GITHUB_USERNAME%:%GITHUB_TOKEN%@github.com/%GITHUB_USERNAME%/%REPO_NAME%.git

echo.
echo Pushing to GitHub...
git push -u origin main --force

echo.
echo Done! Visit: https://github.com/%GITHUB_USERNAME%/%REPO_NAME%
echo.
echo Next steps:
echo   1. Go to your repo Settings → Pages → GitHub Actions
echo   2. The CI/CD pipeline will auto-deploy on next push
echo.
pause
