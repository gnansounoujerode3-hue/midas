@echo off
setlocal EnableExtensions
title MIDAS-Benin - Reparation des dependances
cd /d "%~dp0"

echo.
echo ================================================================
echo       MIDAS-Benin - Reparation des dependances Node.js
echo ================================================================
echo.
echo Cette operation supprime uniquement node_modules local,
echo puis reinstalle les dependances compatibles avec Node.js 24.
echo.

if exist "node_modules\" (
    echo Suppression de node_modules en cours...
    rmdir /s /q "node_modules"
)

if exist "node_modules\" (
    echo.
    echo [ERREUR] Windows bloque encore node_modules.
    echo Fermez Android Studio, tous les terminaux Node.js et l'Explorateur
    echo ouvert dans ce dossier, puis relancez ce fichier.
    pause
    exit /b 1
)

echo Reparation terminee. Lancement du backend...
call "%~dp0Lancer_MIDAS_Backend.bat"
