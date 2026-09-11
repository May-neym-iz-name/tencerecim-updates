@echo off
REM ===================================================================
REM  URUN ACIKLAMA TOPLU YAZIM
REM
REM  Kullanim:
REM    aciklama-yaz            -> 25 urun yazar
REM    aciklama-yaz 100        -> 100 urun yazar
REM    aciklama-yaz 0          -> KALAN HEPSINI yazar
REM    aciklama-yaz 10 tazele  -> daha once yazilmis 10 urunu YENIDEN yazar
REM
REM  Notlar:
REM   - Kurulu uygulama acik olsa da calisir (seyirci kipi).
REM   - Pencere ACILMAZ, is bitince kendini kapatir.
REM   - Gemini gunluk kotasi bitince durur; ertesi gun ayni komutu calistir,
REM     yazilanlar imzali oldugu icin kaldigi yerden devam eder.
REM ===================================================================

setlocal

set LIMIT=%1
if "%LIMIT%"=="" set LIMIT=25

set TNC_SEYIRCI=1
set TNC_ACIKLAMA=uygula
set TNC_ACIKLAMA_LIMIT=%LIMIT%

if /I "%2"=="tazele" (
  set TNC_ACIKLAMA_YENIDEN=1
  echo [TAZELEME KIPI] Daha once yazilmis urunler yeniden yazilacak.
)

echo.
if "%LIMIT%"=="0" (
  echo Kalan TUM urunler yazilacak.
) else (
  echo En fazla %LIMIT% urun yazilacak.
)
echo Sonuc dosyasi: %APPDATA%\tencerecim\aciklama-toplu-uygula.log
echo.
echo Baslatiliyor... (bu pencereyi kapatma)
echo.

call npm run dev

echo.
echo ===================== BITTI =====================
type "%APPDATA%\tencerecim\aciklama-toplu-uygula.log" | findstr /C:"BITTI" /C:"BİTTİ" /C:"DURDURULDU"
echo.
echo Tam dokum: %APPDATA%\tencerecim\aciklama-toplu-uygula.log
echo.
pause
