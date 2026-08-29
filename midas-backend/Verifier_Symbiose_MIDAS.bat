@echo off
setlocal EnableExtensions
title MIDAS-Benin - Verification application / backend
cd /d "%~dp0"

REM Le script PowerShell separe evite les problemes de guillemets et garde
REM toujours la fenetre ouverte afin que les erreurs soient visibles.
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0Verifier_Symbiose_MIDAS.ps1"

pause
