<#
.SYNOPSIS
  Xuất schema + dữ liệu PostgreSQL (pg_dump) ra database/exports/

.DESCRIPTION
  Đọc ConnectionStrings__DefaultConnection từ file .env ở root repo (cùng cấp README),
  hoặc truyền tham số thủ công. Cần pg_dump trong PATH (PostgreSQL client tools).

.EXAMPLE
  .\scripts\export-postgres.ps1
  .\scripts\export-postgres.ps1 -DbHost localhost -DbPort 5432 -Database quangtrung_mn -DbUser postgres -Password "secret"
#>
param(
    [string] $EnvFile = "",
    [string] $DbHost = "",
    [int] $DbPort = 5432,
    [string] $Database = "",
    [string] $DbUser = "",
    [string] $Password = "",
    [string] $OutDir = ""
)

$ErrorActionPreference = "Stop"

function Parse-NpgsqlConnectionString {
    param([string] $Conn)
    $map = @{}
    foreach ($part in ($Conn -split ";")) {
        $p = $part.Trim()
        if ([string]::IsNullOrWhiteSpace($p)) { continue }
        $eq = $p.IndexOf("=")
        if ($eq -lt 1) { continue }
        $k = $p.Substring(0, $eq).Trim()
        $v = $p.Substring($eq + 1).Trim()
        $map[$k.ToLowerInvariant()] = $v
    }
    return $map
}

$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($EnvFile)) {
    $EnvFile = Join-Path $root ".env"
}

if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $OutDir = Join-Path $root "database\exports"
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$connStr = $null
if (Test-Path -LiteralPath $EnvFile) {
    Get-Content -LiteralPath $EnvFile -Encoding UTF8 | ForEach-Object {
        if ($_ -match '^\s*ConnectionStrings__DefaultConnection\s*=\s*(.+)$') {
            $script:connStr = $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

$h = $DbHost; $prt = $DbPort; $db = $Database; $u = $DbUser; $pwd = $Password

if ($connStr -and [string]::IsNullOrWhiteSpace($h)) {
    $m = Parse-NpgsqlConnectionString -Conn $connStr
    $h = $m["host"]
    if ($m.ContainsKey("port") -and -not [string]::IsNullOrWhiteSpace($m["port"])) {
        $prt = [int]$m["port"]
    }
    $db = $m["database"]
    $u = $m["username"]
    $pwd = $m["password"]
}

if ([string]::IsNullOrWhiteSpace($h) -or [string]::IsNullOrWhiteSpace($db) -or [string]::IsNullOrWhiteSpace($u)) {
    Write-Host "Không có đủ thông tin kết nối. Kiểm tra .env có ConnectionStrings__DefaultConnection,"
    Write-Host "hoặc gọi với -DbHost -Database -DbUser -Password"
    exit 1
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Error "Không tìm thấy 'pg_dump' trong PATH. Cài PostgreSQL client tools và thử lại."
    exit 1
}

if (-not [string]::IsNullOrWhiteSpace($pwd)) {
    $env:PGPASSWORD = $pwd
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $OutDir "quangtrung_mn-$stamp.sql"

Write-Host "Đang xuất: $db @ ${h}:${prt} người dùng=$u → $outFile"

& pg_dump `
    -h $h `
    -p $prt `
    -U $u `
    -d $db `
    --no-owner `
    --no-acl `
    -F p `
    -f $outFile

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump thoát với mã $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Xong. Kích thước file:" (Get-Item $outFile).Length "bytes"
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
