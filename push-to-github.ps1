# Script tu dong day code len GitHub de deploy len Vercel
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   TỰ ĐỘNG ĐẨY CODE LÊN GITHUB ĐỂ DEPLOY LÊN VERCEL" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "`n[LỖI] Máy tính của bạn chưa cài đặt Git!" -ForegroundColor Red
    Write-Host "Vui lòng tải và cài đặt Git tại: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Hoặc dùng GitHub Desktop: https://desktop.github.com" -ForegroundColor Yellow
    Read-Host "`nNhấn Enter để thoát..."
    exit
}

$repoUrl = Read-Host "`nNhập link GitHub Repository của bạn (VD: https://github.com/username/ten-du-an.git)"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "`n[LỖI] Bạn chưa nhập đường dẫn Repository!" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát..."
    exit
}

Write-Host "`n[1/4] Khởi tạo Git..." -ForegroundColor Blue
if (-not (Test-Path ".git")) {
    git init -b main
}

Write-Host "`n[2/4] Thêm file..." -ForegroundColor Blue
git add .

Write-Host "`n[3/4] Commit code..." -ForegroundColor Blue
git commit -m "Deploy project to Vercel"

Write-Host "`n[4/4] Đẩy code lên GitHub..." -ForegroundColor Blue
git remote remove origin 2>$null
git remote add origin $repoUrl
git branch -M main
git push -u origin main --force

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "   HOÀN TẤT! Đã đẩy mã nguồn lên GitHub thành công." -ForegroundColor Green
Write-Host "   Bây giờ bạn chỉ cần vào: https://vercel.com/new" -ForegroundColor Cyan
Write-Host "   chọn repository này và bấm DEPLOY là xong!" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Green
Read-Host "`nNhấn Enter để kết thúc..."

