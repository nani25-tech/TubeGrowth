Deployment helper
=================

This folder contains a PowerShell script to automate a server-side deployment and optional duplicate-user cleanup.

Automatic deployment
--------------------
- A GitHub Actions workflow in `.github/workflows/deploy.yml` runs on every push to `main`.
- The workflow calls this script automatically, so merged updates deploy without a manual run.
- Required repository secrets: `DEPLOY_USER`, `DEPLOY_HOST`, `DEPLOY_PATH`.
- Optional secret: `DEPLOY_KEY` for SSH key-based login.

How it works
------------
- Uses `ssh` to run commands on the remote host: pull code, install, restart, run cleanup (dry-run or apply).
- Requires environment variables to be set locally for credentials.

Examples
--------
Set env and run dry-run:

```powershell
$env:DEPLOY_USER = 'ubuntu'
$env:DEPLOY_HOST = 'your.server.com'
$env:DEPLOY_PATH = '/var/www/TubeGrowth'
# Optional private key path
$env:DEPLOY_KEY = 'C:\Users\you\.ssh\id_rsa'

./deploy_and_cleanup.ps1 -CleanupAction DryRun
```

Apply the cleanup (destructive):

```powershell
./deploy_and_cleanup.ps1 -CleanupAction Apply
```

Notes
-----
- This script requires `ssh` client available in PATH and appropriate server-side keys or passwordless login configured.
- The script will run `npm run cleanup:users:dry-run` by default and run `npm run cleanup:users` only if `-CleanupAction Apply` is provided.
- Test the dry-run first and review output before applying.
