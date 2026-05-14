<#
.SYNOPSIS
  Automated deploy + optional cleanup for TubeGrowth.

.DESCRIPTION
  This script performs a git pull on the remote host, installs dependencies,
  restarts the Node process, and runs the duplicate-user cleanup (dry-run or apply).

.USAGE
  From your local machine (PowerShell):

    $env:DEPLOY_USER = 'ubuntu'
    $env:DEPLOY_HOST = 'your.server.com'
    $env:DEPLOY_PATH = '/var/www/TubeGrowth'
    # Optional: path to private key
    $env:DEPLOY_KEY = 'C:\Users\you\.ssh\id_rsa'

    # Dry-run only (safe):
    ./deploy_and_cleanup.ps1 -CleanupAction DryRun

    # Apply cleanup (destructive):
    ./deploy_and_cleanup.ps1 -CleanupAction Apply

  NOTE: This script uses `ssh` in PATH. It does not store credentials.
#>

param(
  [ValidateSet('DryRun','Apply')]
  [string]$CleanupAction = 'DryRun'
)

if (-not $env:DEPLOY_USER -or -not $env:DEPLOY_HOST -or -not $env:DEPLOY_PATH) {
  Write-Error "Missing required environment variables. Set DEPLOY_USER, DEPLOY_HOST, DEPLOY_PATH."
  exit 2
}

$deployUser = $env:DEPLOY_USER
$deployHost = $env:DEPLOY_HOST
$deployPath = $env:DEPLOY_PATH
$keyArg = if ($env:DEPLOY_KEY) { "-i `"$env:DEPLOY_KEY`"" } else { '' }

function RunRemote([string]$cmd) {
  $sshCmd = "ssh $keyArg $deployUser@$deployHost -- `"$cmd`""
  Write-Host "Running: $sshCmd"
  $proc = Start-Process -FilePath pwsh -ArgumentList "-NoProfile","-Command",$sshCmd -NoNewWindow -Wait -PassThru
  return $proc.ExitCode
}

Write-Host "Deploying to ${deployUser}@${deployHost}:${deployPath}"

$cmds = @(
  "cd $path || exit 1",
  "git fetch --all --prune",
  "git reset --hard origin/main",
  "npm ci --production",
  # attempt pm2 restart, fallback to systemd
  "(pm2 restart tubegrowth || pm2 restart all) 2>/dev/null || (sudo systemctl restart tubegrowth 2>/dev/null)",
  # run backend cleanup dry-run by default
  "cd $path/backend && npm run cleanup:users:dry-run"
)

if ($CleanupAction -eq 'Apply') {
  $cmds += "cd $path/backend && npm run cleanup:users"
}

foreach ($c in $cmds) {
  $exit = RunRemote($c)
  if ($exit -ne 0) {
    Write-Error "Remote command failed (exit $exit): $c"
    exit $exit
  }
}

Write-Host "Deploy + cleanup ($CleanupAction) completed successfully."
exit 0