# MIDAS-Bénin — contrôle de connectivité application / backend
$ErrorActionPreference = 'Stop'
$urls = @(
    'https://192.168.1.200:3443',
    'https://192.168.1.199:3443'
)

Write-Host ''
Write-Host '================================================================' -ForegroundColor Green
Write-Host '     MIDAS-Benin - Verification de la symbiose backend' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Green
Write-Host ''

$baseUrl = $null
$health = $null
foreach ($url in $urls) {
    try {
        Write-Host "Test de $url ..." -ForegroundColor Yellow
        $health = Invoke-RestMethod -Uri "$url/health" -TimeoutSec 5
        $baseUrl = $url
        break
    } catch {
        Write-Host "  Non disponible." -ForegroundColor DarkGray
    }
}

if ($null -eq $baseUrl) {
    Write-Host ''
    Write-Host '[ERREUR] Aucun backend MIDAS ne repond sur .200 ou .199, port 3443.' -ForegroundColor Red
    Write-Host 'Verifiez que Lancer_MIDAS_Backend.bat est ouvert, que le PC et le' -ForegroundColor Yellow
    Write-Host 'telephone sont sur le meme Wi-Fi, et que le pare-feu autorise le port 3443.' -ForegroundColor Yellow
    Read-Host 'Appuyez sur Entree pour fermer'
    exit 1
}

Write-Host ''
Write-Host "[OK] Backend detecte : $baseUrl" -ForegroundColor Green
Write-Host "Statut  : $($health.status)"
Write-Host "Produit : $($health.product)"
Write-Host ''

try {
    $summary = Invoke-RestMethod -Uri "$baseUrl/api/v1/demo/summary" -TimeoutSec 5
    Write-Host '--- Base SQLite ---' -ForegroundColor Cyan
    Write-Host "Citoyens      : $($summary.citizens)"
    Write-Host "Credentials   : $($summary.credentials)"
    Write-Host "Consentements : $($summary.consents)"
    Write-Host "Objets IoT    : $($summary.devices)"
    Write-Host "Mesures       : $($summary.measurements)"
    Write-Host "Audit         : $($summary.auditEvents)"
    Write-Host ''
    Write-Host 'Dernieres mesures capteurs :' -ForegroundColor Cyan
    foreach ($measurement in $summary.lastMeasurements) {
        Write-Host " - $($measurement.receivedAt) | $($measurement.metric) = $($measurement.value) $($measurement.unit) | $($measurement.source)"
    }
    Write-Host ''
    Write-Host 'Dernieres actions :' -ForegroundColor Cyan
    foreach ($event in $summary.lastAuditEvents) {
        Write-Host " - $($event.timestamp) | $($event.action) | $($event.details)"
    }
} catch {
    Write-Host "[ERREUR] Le health check fonctionne mais /api/v1/demo/summary echoue : $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ''
Write-Host 'Si les compteurs augmentent apres un enrollement Android, l application et le backend fonctionnent ensemble.' -ForegroundColor Green
Read-Host 'Appuyez sur Entree pour fermer'
