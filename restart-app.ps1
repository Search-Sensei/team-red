# Script to stop running app and restart
Write-Host "Stopping any running instances of S365.Search.Admin.UI..."

# Find and stop the process
$processes = Get-Process | Where-Object { $_.ProcessName -like "*S365.Search.Admin.UI*" -or $_.MainWindowTitle -like "*S365*" }
if ($processes) {
    foreach ($proc in $processes) {
        Write-Host "Stopping process: $($proc.ProcessName) (PID: $($proc.Id))"
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

Write-Host "Building application..."
dotnet build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! Starting application..."
    dotnet run
} else {
    Write-Host "Build failed! Please check errors above."
}



