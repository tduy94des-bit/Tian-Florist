@echo off
chcp 65001 >nul
echo =======================================================
echo   TỰ ĐỘNG ĐẨY CODE LÊN GITHUB ĐỂ DEPLOY LÊN VERCEL
echo =======================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] May cua ban chua cai dat Git hoac chua them Git vao PATH.
    echo Vui long cai dat Git tai: https://git-scm.com/download/win
    echo Hoac su dung GitHub Desktop: https://desktop.github.com
    echo.
    pause
    exit /b
)

set /p REPO_URL="Nhap link GitHub Repository cua ban (vd: https://github.com/username/ten-du-an.git): "

if "%REPO_URL%"=="" (
    echo [LOI] Ban chua nhap link GitHub repository!
    pause
    exit /b
)

echo.
echo [1/4] Khoi tao Git repository...
if not exist ".git" (
    git init -b main
)

echo.
echo [2/4] Them toan bo file...
git add .

echo.
echo [3/4] Commit code...
git commit -m "Deploy project to Vercel"

echo.
echo [4/4] Ket noi remote va day code len GitHub...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
git push -u origin main --force

echo.
echo =======================================================
echo   HOAN TAT! Code da duoc day len GitHub thanh cong.
echo   Bay gio hay vao: https://vercel.com/new de Import va Deploy!
echo =======================================================
pause

