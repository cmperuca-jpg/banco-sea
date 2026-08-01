@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ENVIAR-SNAPSHOT-CORRECAO-INTEGRAL-V2.ps1"
if errorlevel 1 (
  echo.
  echo O snapshot encontrou um erro.
  pause
)
endlocal
