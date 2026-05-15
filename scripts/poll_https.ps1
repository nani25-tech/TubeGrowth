$max=20
for ($i=1; $i -le $max; $i++) {
  Write-Output "[check $i/$max] Trying HTTPS https://tubegrowth.me/ ..."
  & curl.exe -I https://tubegrowth.me/ -m 10 2>&1 | Write-Output
  if ($LASTEXITCODE -eq 0) {
    Write-Output "[ready] HTTPS responded (exit 0)."
    exit 0
  } else {
    Write-Output "[not ready] sleeping 60s"
    Start-Sleep -Seconds 60
  }
}
Write-Output "[timeout] HTTPS not ready after $max checks"
exit 2
