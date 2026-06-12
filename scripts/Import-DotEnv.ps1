param(
    [string] $EnvPath = ""
)

function Import-DotEnvFile {
    param([Parameter(Mandatory)] [string] $Path)
    if (!(Test-Path -LiteralPath $Path)) {
        return $false
    }
    Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
        $line = $_
        if ([string]::IsNullOrWhiteSpace($line)) { return }
        if ($line.TrimStart().StartsWith("#")) { return }
        $eq = $line.IndexOf("=")
        if ($eq -lt 1) { return }
        $name = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        if ($value.StartsWith("`"") -and $value.EndsWith("`"")) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($value.StartsWith("'") -and $value.EndsWith("'")) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        Set-Item -Path "Env:$name" -Value $value
    }
    return $true
}

$resolved = $EnvPath
if ([string]::IsNullOrWhiteSpace($resolved)) {
    $candidate = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\.env") -ErrorAction SilentlyContinue
    if ($candidate) {
        $resolved = $candidate.Path
    }
}

if ([string]::IsNullOrWhiteSpace($resolved)) {
    Write-Error "Không tìm thấy file .env. Truyền -EnvPath 'D:\...\ .env'"
    exit 2
}

if (!(Import-DotEnvFile -Path $resolved)) {
    Write-Error "Không đọc được: $resolved"
    exit 2
}

Write-Host "Đã nạp biến môi trường từ: $resolved"
