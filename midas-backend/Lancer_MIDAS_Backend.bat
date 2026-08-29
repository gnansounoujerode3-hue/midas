@echo off
setlocal EnableExtensions
title MIDAS-Benin - Backend local
color 0A

REM =====================================================================
REM MIDAS-Benin - Lanceur backend local (Node.js 24 + SQLite integre)
REM Le serveur ecoute sur toutes les interfaces : 0.0.0.0:3443
REM =====================================================================

cd /d "%~dp0"
set "PORT=3443"

echo.
echo ================================================================
echo             MIDAS-Benin - Demarrage du backend
echo ================================================================
echo.
echo Adresses telephone possibles :
echo   https://192.168.1.200:%PORT%
echo   https://192.168.1.199:%PORT%
echo Dossier courant : %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js 24 est introuvable.
    pause
    exit /b 1
)

for /f %%V in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%V"
if %NODE_MAJOR% LSS 24 (
    echo [ERREUR] Node.js 24 ou superieur est requis. Version actuelle :
    node -v
    pause
    exit /b 1
)

echo [OK] Node.js detecte :
node -v
echo.
echo [1/3] Synchronisation des dependances sans module natif...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo [ERREUR] Installation des dependances impossible.
    echo Lancez Reparer_MIDAS_Backend.bat puis recommencez.
    pause
    exit /b 1
)

echo [2/3] Verification TypeScript...
call npm run check
if errorlevel 1 (
    echo [ERREUR] Le backend contient une erreur TypeScript.
    pause
    exit /b 1
)

REM Essai non bloquant d'ouverture du port dans le pare-feu.
netsh advfirewall firewall add rule name="MIDAS-Benin Backend 3443" dir=in action=allow protocol=TCP localport=%PORT% profile=private >nul 2>&1

echo [3/3] Backend pret.
echo Testez ensuite avec Verifier_Symbiose_MIDAS.bat.
echo Pour arreter le serveur : CTRL+C ou fermeture de cette fenetre.
echo.

set "PORT=%PORT%"
call npm run start
pause
