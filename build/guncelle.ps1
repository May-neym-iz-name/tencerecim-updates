# ============================================================================
# Tencerecim Mağaza Yönetim Sistemi — Güncelleme Paketi Üretici
#
# Çalıştırma (proje kökünden):
#     powershell -ExecutionPolicy Bypass -File build\guncelle.ps1
#
# Yeni bir kurulum .exe'si üretir. Bunu diğer bilgisayarlara kopyalayıp
# kurarak programı güncelleyebilirsiniz.
# ============================================================================

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $ROOT

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Tencerecim Magaza - Guncelleme Paketi Uretici" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Mevcut versiyonu oku
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$mevcutVersiyon = $pkg.version
Write-Host "Mevcut surum: v$mevcutVersiyon" -ForegroundColor Yellow

# Yeni versiyon sor
Write-Host ""
$yeniVersiyon = Read-Host "Yeni surum numarasi (bos birakir Enter'larsan v$mevcutVersiyon kalir)"
if ([string]::IsNullOrWhiteSpace($yeniVersiyon)) {
    $yeniVersiyon = $mevcutVersiyon
} else {
    # package.json'u guncelle
    $icerik = Get-Content "package.json" -Raw
    $icerik = $icerik -replace '"version": "[^"]*"', "`"version`": `"$yeniVersiyon`""
    Set-Content "package.json" -Value $icerik -Encoding UTF8
    Write-Host "Surum $yeniVersiyon olarak guncellendi." -ForegroundColor Green
}

Write-Host ""
Write-Host "[1/2] Build aliniyor (bu 2-3 dakika surebilir)..." -ForegroundColor Yellow
npm run build:win
if ($LASTEXITCODE -ne 0) { throw "Build basarisiz!" }

Write-Host ""
Write-Host "[2/2] Kurulum dosyasi hazir!" -ForegroundColor Green
Write-Host ""

$cikti = Join-Path $ROOT "dist-electron\Tencerecim Magaza Setup $yeniVersiyon.exe"
# Dosya adinda Turkce karakter olabilir, bul
$exe = Get-ChildItem "dist-electron\*.exe" | Where-Object { $_.Name -notlike "*.blockmap" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($exe) {
    Write-Host "CIKTI DOSYASI:" -ForegroundColor Cyan
    Write-Host "  $($exe.FullName)" -ForegroundColor White
    $mb = [math]::Round($exe.Length / 1MB, 1)
    Write-Host "  Boyut: $mb MB" -ForegroundColor White
    Write-Host ""
    Write-Host "Bu dosyayi diger bilgisayarlara kopyalayip calistirarak programi guncelleyin." -ForegroundColor Green

    # Klasoru ac
    explorer.exe /select,"$($exe.FullName)"
} else {
    Write-Host "UYARI: .exe dosyasi bulunamadi, dist-electron klasorunu kontrol edin." -ForegroundColor Red
}

Write-Host ""
Write-Host "Islem tamamlandi." -ForegroundColor Cyan
