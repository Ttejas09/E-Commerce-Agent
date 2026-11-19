# run.ps1 - Launch Anticipatory Commerce Agent (Backend + Frontend)
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$pythonExe = "D:\Python312\python.exe"
$nodeDir = "C:\Users\tejas\.local\nodejs"
$env:PATH = "$nodeDir;$env:PATH"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Anticipatory Commerce Agent Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend (Port 8000)
Write-Host "`n[1/3] Starting Backend API on http://localhost:8000 ..." -ForegroundColor Yellow
$backendProc = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" `
    -WorkingDirectory $repoRoot `
    -PassThru

Start-Sleep -Seconds 2

# 2. Start Vite Frontend (Port 5173)
Write-Host "[2/3] Starting Frontend Dev Server on http://localhost:5173 ..." -ForegroundColor Yellow
$frontendProc = Start-Process -FilePath "$nodeDir\npm.cmd" `
    -ArgumentList "run", "dev", "--", "--host" `
    -WorkingDirectory "$repoRoot\frontend" `
    -PassThru

Start-Sleep -Seconds 2

# 3. Open Browser
Write-Host "[3/3] Opening browser at http://localhost:5173 ..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "`nAgent is LIVE!" -ForegroundColor Cyan
Write-Host "  - Frontend UI:  http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend API:  http://localhost:8000" -ForegroundColor White
Write-Host "  - Combined SPA: http://localhost:8000" -ForegroundColor White
Write-Host "  - API Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host "`nPress Ctrl+C or close this window to stop both servers." -ForegroundColor Gray

try {
    Wait-Process -Id $backendProc.Id, $frontendProc.Id
} finally {
    Stop-Process -Id $backendProc.Id, $frontendProc.Id -Force -ErrorAction SilentlyContinue
}
