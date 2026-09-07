$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\FantaAstaAPP"
$RuntimeDir = Join-Path $ProjectRoot ".fantaasta-runtime"
$PidFile = Join-Path $RuntimeDir "launcher.pid"
$LogFile = Join-Path $RuntimeDir "launcher.log"

function Write-LauncherMessage {
    param(
        [string]$Message
    )

    New-Item `
        -ItemType Directory `
        -Force `
        -Path $RuntimeDir |
        Out-Null

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"

    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

Write-LauncherMessage `
    "Arresto FantaAstaAPP richiesto."

if (-not (Test-Path $PidFile)) {
    Write-LauncherMessage `
        "Nessun processo avviato dal launcher risulta registrato."

    Read-Host "Premi INVIO per chiudere"
    exit 0
}

$storedPid =
    Get-Content `
        $PidFile `
        -ErrorAction SilentlyContinue

if (-not $storedPid) {
    Remove-Item `
        $PidFile `
        -Force `
        -ErrorAction SilentlyContinue

    Write-LauncherMessage `
        "PID non valido. File di runtime ripulito."

    Read-Host "Premi INVIO per chiudere"
    exit 0
}

$process =
    Get-Process `
        -Id ([int]$storedPid) `
        -ErrorAction SilentlyContinue

if (-not $process) {
    Remove-Item `
        $PidFile `
        -Force `
        -ErrorAction SilentlyContinue

    Write-LauncherMessage `
        "Il processo non esiste piu. Runtime ripulito."

    Read-Host "Premi INVIO per chiudere"
    exit 0
}

Write-LauncherMessage `
    "Arresto albero processi PID $storedPid..."

& taskkill.exe `
    /PID $storedPid `
    /T `
    /F |
    Out-Host

Remove-Item `
    $PidFile `
    -Force `
    -ErrorAction SilentlyContinue

Write-LauncherMessage `
    "FantaAstaAPP arrestata."

Start-Sleep -Seconds 1
