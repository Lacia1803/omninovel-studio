<#
.SYNOPSIS
  Dừng các tiến trình dev đã khởi động bởi dev.ps1.
#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $root '.logs'

function Stop-Service($name, $port) {
    $pidFile = Join-Path $logDir "$name.pid"
    if (Test-Path $pidFile) {
        $pidVal = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($pidVal -and (Get-Process -Id $pidVal -ErrorAction SilentlyContinue)) {
            Write-Host "[$name] Dừng PID $pidVal..." -ForegroundColor Yellow
            Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue
        }
        Remove-Item $pidFile -ErrorAction SilentlyContinue
    }
    $portProc = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($portProc) {
        foreach ($p in $portProc) {
            Write-Host "[$name] Dừng tiến trình còn lại trên port $port (PID $($p.OwningProcess))" -ForegroundColor Yellow
            Stop-Process -Id $p.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

Stop-Service 'backend'  8000
Stop-Service 'frontend' 5173

Write-Host "Đã dừng xong." -ForegroundColor Green
