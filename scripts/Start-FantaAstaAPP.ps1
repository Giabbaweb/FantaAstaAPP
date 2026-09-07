$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\FantaAstaAPP"
$RuntimeDir = Join-Path $ProjectRoot ".fantaasta-runtime"
$PidFile = Join-Path $RuntimeDir "launcher.pid"
$LogFile = Join-Path $RuntimeDir "launcher.log"

function Write-LauncherMessage {
    param(
        [string]$Message
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"

    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

function Test-WebReady {
    try {
        $response = Invoke-WebRequest `
            -Uri "http://127.0.0.1:5173/" `
            -UseBasicParsing `
            -TimeoutSec 2

        return $response.StatusCode -ge 200 -and
               $response.StatusCode -lt 500
    }
    catch {
        return $false
    }
}

if (-not (Test-Path $ProjectRoot)) {
    Write-Host ""
    Write-Host "ERRORE: cartella progetto non trovata:"
    Write-Host $ProjectRoot
    Write-Host ""
    Read-Host "Premi INVIO per chiudere"
    exit 1
}

New-Item `
    -ItemType Directory `
    -Force `
    -Path $RuntimeDir |
    Out-Null

if (-not (Test-Path $LogFile)) {
    New-Item `
        -ItemType File `
        -Force `
        -Path $LogFile |
        Out-Null
}

Set-Location $ProjectRoot

Write-LauncherMessage "Avvio FantaAstaAPP richiesto."

if (Test-Path $PidFile) {
    $storedPid = Get-Content $PidFile -ErrorAction SilentlyContinue

    if ($storedPid) {
        $existingProcess =
            Get-Process `
                -Id ([int]$storedPid) `
                -ErrorAction SilentlyContinue

        if ($existingProcess) {
            Write-LauncherMessage `
                "FantaAstaAPP risulta gia avviata (PID $storedPid)."

            if (Test-WebReady) {
                Write-LauncherMessage `
                    "Landing raggiungibile. Apro il browser."

                Start-Process "http://localhost:5173/"
                exit 0
            }

            Write-LauncherMessage `
                "Processo presente ma Landing non ancora disponibile."

            Read-Host "Premi INVIO per chiudere"
            exit 1
        }
    }

    Remove-Item `
        $PidFile `
        -Force `
        -ErrorAction SilentlyContinue
}

$pnpmCommand =
    Get-Command pnpm `
        -ErrorAction SilentlyContinue

if (-not $pnpmCommand) {
    Write-LauncherMessage `
        "ERRORE: pnpm non trovato nel PATH."

    Read-Host "Premi INVIO per chiudere"
    exit 1
}

Write-LauncherMessage `
    "Avvio pnpm dev..."

$process = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList `
        "/k",
        "cd /d `"$ProjectRoot`" && pnpm dev" `
    -WorkingDirectory $ProjectRoot `
    -PassThru

Set-Content `
    -Path $PidFile `
    -Value $process.Id `
    -Encoding ascii

Write-LauncherMessage `
    "Processo principale avviato con PID $($process.Id)."

$maxAttempts = 60
$ready = $false

for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    if (Test-WebReady) {
        $ready = $true
        break
    }

    Start-Sleep -Seconds 1
}

if (-not $ready) {
    Write-LauncherMessage `
        "ERRORE: la Landing non risponde dopo 60 secondi."

    Write-Host ""
    Write-Host "Controlla la finestra FantaAstaAPP rimasta aperta."
    Write-Host ""

    Read-Host "Premi INVIO per chiudere"
    exit 1
}

Write-LauncherMessage `
    "FantaAstaAPP pronta."

Start-Process "http://localhost:5173/"

Write-LauncherMessage `
    "Landing aperta nel browser."
