@echo off
setlocal
cd /d "%~dp0"

echo ================================================
echo   Fusion Sistema - Correcao visual 3.0 beta 4
echo ================================================
echo.

echo Fechando versoes anteriores do Fusion Sistema...
taskkill /F /IM "Fusion Sistema.exe" >nul 2>nul
taskkill /F /IM "FusionSistema.exe" >nul 2>nul
timeout /t 2 /nobreak >nul

where node >nul 2>nul || (
  echo Node.js nao encontrado.
  pause
  exit /b 1
)

echo Aplicando menu superior e atualizando as paginas...
node scripts\aplicar-correcao-visual-beta4.mjs || goto :erro

if exist release (
  echo Limpando compilacao anterior...
  rmdir /s /q release
)

call npm install || goto :erro
call npm run check || goto :erro
call npm run desktop:dist || goto :erro
call npm run desktop:verify-dist || goto :erro
node scripts\verificar-correcao-visual-beta4.mjs || goto :erro

echo.
echo Correcao concluida.
echo Instalador:
echo %CD%\release\FusionSistema-Setup.exe
echo.
start "" "%CD%\release\FusionSistema-Setup.exe"
pause
exit /b 0

:erro
echo.
echo A correcao ou a geracao encontrou um erro.
echo Envie as ultimas linhas exibidas nesta janela.
pause
exit /b 1
