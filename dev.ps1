<#
.SYNOPSIS
  Chạy OmniNovel Studio (Backend FastAPI + Frontend Vite) trên local.

.DESCRIPTION
  Mở 2 cửa sổ terminal mới:
    1. Backend  : tạo/kích hoạt venv, cài requirements (nếu cần), chạy uvicorn.
    2. Frontend : npm install (nếu cần), chạy vite dev.

  Sau khi chạy:
    Frontend : http://localhost:5173
    Backend  : http://localhost:8000  (Swagger UI: /docs)
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# ---------- Helpers ----------
function Write-Section($msg) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
}

function Test-Port($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

# ---------- Sanity check ----------
if (-not (Test-Path (Join-Path $root 'backend\main.py'))) {
    Write-Host "[!] Không tìm thấy backend/main.py. Hãy chạy script tại thư mục gốc dự án." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $root 'package.json'))) {
    Write-Host "[!] Không tìm thấy package.json. Hãy chạy script tại thư mục gốc dự án." -ForegroundColor Red
    exit 1
}

# ---------- Cảnh báo nếu port đã bận ----------
if (Test-Port 8000) {
    Write-Host "[!] Port 8000 đang được sử dụng. Backend có thể sẽ không khởi động được." -ForegroundColor Yellow
}
if (Test-Port 5173) {
    Write-Host "[!] Port 5173 đang được sử dụng. Frontend có thể sẽ không khởi động được." -ForegroundColor Yellow
}

Write-Section "OmniNovel Studio — Dev Launcher"

# ---------- Lệnh cho Backend ----------
$backendCmd = @"
Set-Location -LiteralPath '$root\backend'
if (-not (Test-Path 'venv\Scripts\python.exe')) {
    Write-Host '[backend] Tạo virtualenv...' -ForegroundColor Yellow
    python -m venv venv
}
& '.\venv\Scripts\python.exe' -m pip install --upgrade pip | Out-Null
& '.\venv\Scripts\python.exe' -m pip install -r requirements.txt
if (-not `$env:JWT_SECRET) { `$env:JWT_SECRET = 'dev-secret-change-me' }
Write-Host '[backend] Khởi động Uvicorn tại http://localhost:8000' -ForegroundColor Green
& '.\venv\Scripts\python.exe' -m uvicorn main:app --reload --port 8000
"@

# ---------- Lệnh cho Frontend ----------
$frontendCmd = @"
Set-Location -LiteralPath '$root'
if (-not (Test-Path 'node_modules')) {
    Write-Host '[frontend] Cài đặt dependencies...' -ForegroundColor Yellow
    npm install
}
Write-Host '[frontend] Khởi động Vite tại http://localhost:5173' -ForegroundColor Green
npm run dev
"@

# ---------- Mở 2 terminal ----------
Write-Host "[*] Đang mở terminal cho Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCmd

Write-Host "[*] Đang mở terminal cho Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCmd

Write-Section "Đã mở 2 cửa sổ terminal"
Write-Host "  • Backend  → http://localhost:8000  (Swagger UI: /docs)" -ForegroundColor Green
Write-Host "  • Frontend → http://localhost:5173"  -ForegroundColor Green
Write-Host ""
Write-Host "Đóng từng cửa sổ terminal hoặc nhấn Ctrl+C trong đó để dừng service." -ForegroundColor DarkGray
