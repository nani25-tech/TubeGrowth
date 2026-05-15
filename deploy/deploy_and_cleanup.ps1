<#
.SYNOPSIS
  Automated deploy + optional cleanup for TubeGrowth.

.DESCRIPTION
  This script:
    - Connects to a remote Linux server using SSH
    - Pulls latest code from Git
    - Installs production dependencies
    - Restarts the Node.js app using PM2 or systemd
    - Runs duplicate-user cleanup (dry-run or apply)

.USAGE

  PowerShell:

    $env:DEPLOY_USER = "ubuntu"
    $env:DEPLOY_HOST = "your.server.com"
    $env:DEPLOY_PATH = "/var/www/TubeGrowth"

    # Optional SSH key
    $env:DEPLOY_KEY = "C:\Users\you\.ssh\id_rsa"

    # Safe cleanup preview
    .\deploy_and_cleanup.ps1 -CleanupAction DryRun

    # Apply cleanup
    .\deploy_and_cleanup.ps1 -CleanupAction Apply

.REQUIREMENTS
  - PowerShell 7+
  - SSH installed and available in PATH
  - Remote Linux server
  - Git + Node.js installed on server
#>

param(
    [ValidateSet("DryRun", "Apply")]
    [string]$CleanupAction = "DryRun",
    [string]$DeployUser,
    [string]$DeployHost,
    [string]$DeployPath,
    [string]$DeployKey
)

# =========================
# Validate Environment Variables
# =========================

# Allow passing deploy details via parameters or fallback to environment variables
$deployUser = $DeployUser; if ([string]::IsNullOrWhiteSpace($deployUser)) { $deployUser = $env:DEPLOY_USER }
$deployHost = $DeployHost; if ([string]::IsNullOrWhiteSpace($deployHost)) { $deployHost = $env:DEPLOY_HOST }
$deployPath = $DeployPath; if ([string]::IsNullOrWhiteSpace($deployPath)) { $deployPath = $env:DEPLOY_PATH }
$deployKey = $DeployKey; if ([string]::IsNullOrWhiteSpace($deployKey)) { $deployKey = $env:DEPLOY_KEY }

if (
    [string]::IsNullOrWhiteSpace($deployUser) -or
    [string]::IsNullOrWhiteSpace($deployHost) -or
    [string]::IsNullOrWhiteSpace($deployPath)
) {
    Write-Host ""
    Write-Host "ERROR: Missing required deployment details." -ForegroundColor Red
    Write-Host ""
    Write-Host "Provide via parameters or environment variables. Required:"
    Write-Host "  -DeployUser  (or DEPLOY_USER env var)"
    Write-Host "  -DeployHost  (or DEPLOY_HOST env var)"
    Write-Host "  -DeployPath  (or DEPLOY_PATH env var)"
    Write-Host ""
    Write-Host "Example:" 
    Write-Host "  powershell -File ./deploy_and_cleanup.ps1 -CleanupAction DryRun -DeployUser ubuntu -DeployHost your.server.com -DeployPath /var/www/TubeGrowth -DeployKey C:\\Users\\you\\.ssh\\id_rsa"
    Write-Host ""
    exit 2
}

# =========================
# SSH Key Handling
# =========================

$sshArgs = @()

if (-not [string]::IsNullOrWhiteSpace($env:DEPLOY_KEY)) {
    $sshArgs += "-i"
    $sshArgs += $env:DEPLOY_KEY
}

$sshArgs += "$deployUser@$deployHost"

# =========================
# Function: Invoke Remote Command
# =========================

function Invoke-RemoteCommand {
    param(
        [string]$Command
    )

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Running Remote Command:" -ForegroundColor Yellow
    Write-Host $Command
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    $fullArgs = @()
    $fullArgs += $sshArgs
    $fullArgs += "--"
    $fullArgs += $Command

    & ssh @fullArgs

    return $LASTEXITCODE
}

# =========================
# Deployment Commands
# =========================

Write-Host ""
Write-Host "Starting deployment..." -ForegroundColor Green
Write-Host "Target: ${deployUser}@${deployHost}" -ForegroundColor Green
Write-Host "Path: $deployPath" -ForegroundColor Green
Write-Host ""

$commands = @()

# Go to project folder
$commands += "cd '$deployPath' || exit 1"

# Update code
$commands += "git fetch --all --prune"
$commands += "git reset --hard origin/main"

# Install dependencies
$commands += "npm ci --production"

# Restart application
$commands += @"
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart tubegrowth || pm2 restart all
elif command -v systemctl >/dev/null 2>&1; then
    sudo systemctl restart tubegrowth
else
    echo 'No process manager found'
    exit 1
fi
"@

# Cleanup dry-run
$commands += "cd '$deployPath/backend' && npm run cleanup:users:dry-run"

# Cleanup apply
if ($CleanupAction -eq "Apply") {
    $commands += "cd '$deployPath/backend' && npm run cleanup:users"
}

# =========================
# Execute Commands
# =========================

foreach ($cmd in $commands) {

    $exitCode = Invoke-RemoteCommand -Command $cmd

    if ($exitCode -ne 0) {
        Write-Host ""
        Write-Host "Deployment failed!" -ForegroundColor Red
        Write-Host "Exit Code: $exitCode" -ForegroundColor Red
        Write-Host ""
        exit $exitCode
    }
}

# =========================
# Success
# =========================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Cleanup Mode: $CleanupAction" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

exit 0