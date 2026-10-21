@echo off
rem Kanka Manifest - DepotDataManager: turkce turkon
chcp 65001 >nul
echo ============================================
echo   KANKA INDIRICI (DepotDownloader)
echo ============================================
if not exist DepotDownloader.exe (
  echo.
  echo  [HATA] DepotDownloader.exe bu klasorde yok!
  echo  Su adresten ZIP indir, bu klasore cikar:
  echo  https://github.com/SteamRE/DepotDownloader/releases
  echo.
  pause
  exit /b
)
echo.
set /p APP=Steam AppID yaz (or: 730): 
if "%APP%"=="" exit /b
set /p USERNAME=Steam hesap adini yaz: 
if "%USERNAME%"=="" exit /b
set /p DEPOT=Depot ID (bosa birak, tum depotlar): 
set /p MANI=Manifest ID (bosa birak, guncel): 
echo.
echo Basliyor... Dosyalar "depots\" klasorune inecek.
echo Steam sifre + 2FA soracak, giris kendi hesabinla.
echo.
if "%DEPOT%"=="" (
  DepotDownloader.exe -app %APP% -username %USERNAME%
) else (
  if "%MANI%"=="" (
    DepotDownloader.exe -app %APP% -depot %DEPOT% -username %USERNAME%
  ) else (
    DepotDownloader.exe -app %APP% -depot %DEPOT% -manifest %MANI% -username %USERNAME%
  )
)
echo.
echo BITTI - dosyalar depots klasorunde.
pause
