#!/usr/bin/env bash
# Usage: place your service account key as ./key.json and run:
#   bash ./scripts/index_urls.sh

set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found. Install Google Cloud SDK and run 'gcloud auth activate-service-account --key-file=key.json'" >&2
  exit 1
fi

KEY_FILE="key.json"
if [ ! -f "$KEY_FILE" ]; then
  echo "Place your service account key JSON at $KEY_FILE" >&2
  exit 1
fi

echo "Activating service account..."
gcloud auth activate-service-account --key-file="$KEY_FILE"

TOKEN=$(gcloud auth print-access-token)

URLS=(
  "https://tubegrowth.me/no-ads.html"
  "https://tubegrowth.me/"
  "https://tubegrowth.me/about.html"
  "https://tubegrowth.me/contact.html"
  "https://tubegrowth.me/privacy.html"
  "https://tubegrowth.me/terms.html"
  "https://tubegrowth.me/refund.html"
)

for url in "${URLS[@]}"; do
  echo "Notifying Google Indexing API for: $url"
  resp=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "https://indexing.googleapis.com/v3/urlNotifications:publish" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"url\":\"$url\",\"type\":\"URL_UPDATED\"}")
  echo "$resp"
  sleep 1
done

echo "Done." 
