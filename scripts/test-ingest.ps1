# Test ingest on Windows (PowerShell). Uses curl.exe, not the curl alias.
param(
  [string]$Port = "3000",
  [string]$Secret = "check4dlive_secret_2024"
)

$url = "http://localhost:$Port/api/admin/ingest"
Write-Host "POST $url"
curl.exe -s -w "`nHTTP %{http_code}`n" -X POST $url -H "Authorization: Bearer $Secret"
