@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo   Fusion Sistema 3.0.0-beta.3
echo   Corrigir, gerar e instalar
ECHO ========================================
echo.

where node >nul 2>nul || (
  echo Node.js nao encontrado.
  pause
  exit /b 1
)

echo Fechando versao instalada, se estiver aberta...
taskkill /F /IM "Fusion Sistema.exe" >nul 2>nul

if exist release (
  echo Limpando compilacao anterior...
  rmdir /s /q release
)

call npm install || goto :erro
call npm run check || goto :erro
call npm run desktop:dist || goto :erro
call npm run desktop:verify-dist || goto :erro

echo.
echo Instalador beta.3 criado e validado.
echo Fechando qualquer processo antigo antes da instalacao...
taskkill /F /IM "Fusion Sistema.exe" >nul 2>nul

echo Abrindo instalador...
start "" "%CD%\release\FusionSistema-Setup.exe"
exit /b 0

:erro
echo.
echo Falha ao gerar a versao beta.3. Consulte as linhas acima.
pause
exit /b 1
