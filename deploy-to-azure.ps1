# Deploy osp-search-ai-adminui to Azure App Service
# Usage: .\deploy-to-azure.ps1

param(
    [string]$ResourceGroup = "osp-search-ai-adminui_group",
    [string]$AppServiceName = "osp-search-ai-adminui",
    [string]$Configuration = "Release",
    [string]$PublishFolder = ".\publish-temp"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "osp-search-ai-adminui Deploy Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking Azure CLI..." -ForegroundColor Yellow
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "Azure CLI version: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Azure CLI is not installed" -ForegroundColor Red
    exit 1
}

Write-Host "Checking Azure login..." -ForegroundColor Yellow
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Please login to Azure..." -ForegroundColor Yellow
    az login
}

Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host ""

Write-Host "Cleaning previous publish folder..." -ForegroundColor Yellow
if (Test-Path $PublishFolder) {
    Remove-Item -Path $PublishFolder -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Building project..." -ForegroundColor Yellow
dotnet build -c $Configuration --no-incremental
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Publishing project..." -ForegroundColor Yellow
dotnet publish S365.Search.Admin.UI.csproj -c $Configuration -o $PublishFolder --no-build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Publish failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Creating deployment package..." -ForegroundColor Yellow
$zipPath = ".\publish-adminui.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$publishPath = Resolve-Path $PublishFolder
$tempZip = Join-Path $env:TEMP "adminui-deploy-$(Get-Date -Format 'yyyyMMddHHmmss').zip"
[System.IO.Compression.ZipFile]::CreateFromDirectory($publishPath, $tempZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Move-Item -Path $tempZip -Destination $zipPath -Force

Write-Host "Package created: $zipPath" -ForegroundColor Green
Write-Host "Package size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor Gray
Write-Host ""

Write-Host "Setting environment variables..." -ForegroundColor Yellow
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $AppServiceName `
    --settings ASPNETCORE_ENVIRONMENT=Production `
    --output none

Write-Host "Deploying to Azure..." -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Gray
Write-Host "App Service: $AppServiceName" -ForegroundColor Gray
Write-Host ""

az webapp deploy `
    --resource-group $ResourceGroup `
    --name $AppServiceName `
    --src-path $zipPath `
    --type zip `
    --async false

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    Write-Host "App URL: https://$AppServiceName.australiaeast-01.azurewebsites.net" -ForegroundColor Cyan
} else {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Cleaning up..." -ForegroundColor Yellow
if (Test-Path $PublishFolder) {
    Remove-Item -Path $PublishFolder -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Done!" -ForegroundColor Green

