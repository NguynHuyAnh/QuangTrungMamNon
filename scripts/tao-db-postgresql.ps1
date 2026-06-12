# Tao database + migration (Windows) — tim psql trong C:\Program Files\PostgreSQL
$ErrorActionPreference = "Stop"

$psql = Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName "bin\psql.exe" } |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1

if (-not $psql) {
    Write-Error "Khong tim thay psql.exe trong C:\Program Files\PostgreSQL. Cai PostgreSQL hoac them psql vao PATH."
}

$env:PGPASSWORD = "123456"
$pgHost = "localhost"
$pgPort = "5432"
$pgUser = "postgres"
$dbName = "quangtrung_mn"

Write-Host "Dung psql: $psql"

$exists = & $psql -h $pgHost -p $pgPort -U $pgUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName';" 2>$null
if ($exists -match "1") {
    Write-Host "Database $dbName da ton tai."
} else {
    Write-Host "Tao database $dbName..."
    & $psql -h $pgHost -p $pgPort -U $pgUser -d postgres -c "CREATE DATABASE $dbName;"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Chay dotnet ef database update..."
dotnet ef database update --project backend\QuangTrung.Infrastructure --startup-project backend\QuangTrung.Api

Write-Host "Xong. Chay API: cd backend\QuangTrung.Api ; dotnet run --launch-profile http"
Write-Host "(Neu build loi file locked: tat tien trinh QuangTrung.Api dang chay.)"
