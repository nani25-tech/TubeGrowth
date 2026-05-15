# PowerShell script: index_urls.ps1
# Usage: Put your service account key as ./key.json, install gcloud, then run:
#   gcloud auth activate-service-account --key-file=key.json
#   .\scripts\index_urls.ps1

param()

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Error "gcloud not found. Install Google Cloud SDK and authenticate first."
  exit 1
}

$key = "key.json"
if (-not (Test-Path $key)) {
  Write-Error "Place your service account key JSON at $key"
  exit 1
}

Write-Output "Getting access token..."
$token = (& gcloud auth print-access-token).Trim()
if (-not $token) { Write-Error "Failed to obtain access token"; exit 1 }

$urls = @(
  'https://tubegrowth.me/no-ads.html',
  'https://tubegrowth.me/',
  'https://tubegrowth.me/about.html',
  'https://tubegrowth.me/contact.html',
  'https://tubegrowth.me/privacy.html',
  'https://tubegrowth.me/terms.html',
  'https://tubegrowth.me/refund.html'
)

foreach ($u in $urls) {
  Write-Output "Notifying Indexing API for: $u"
  $body = @{ url = $u; type = 'URL_UPDATED' } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri 'https://indexing.googleapis.com/v3/urlNotifications:publish' -Method Post -Headers @{ Authorization = "Bearer $token"; 'Content-Type'='application/json' } -Body $body -ErrorAction Stop
  $resp | ConvertTo-Json | Write-Output
  Start-Sleep -Seconds 1
}

Write-Output 'Done.'
