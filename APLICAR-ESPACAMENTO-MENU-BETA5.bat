@echo off
setlocal
cd /d "%~dp0"

echo ==================================================
echo  Fusion Sistema - Espacamento do menu - beta 5
echo ==================================================
echo.

echo Fechando o Fusion Sistema aberto...
taskkill /F /IM "Fusion Sistema.exe" >nul 2>nul
taskkill /F /IM "FusionSistema.exe" >nul 2>nul
timeout /t 2 /nobreak >nul

where node >nul 2>nul || (
  echo Node.js nao encontrado.
  pause
  exit /b 1
)

echo Aplicando a correcao global de posicionamento...
node scripts\aplicar-correcao-espacamento-beta5.mjs || goto :erro

if exist release (
  echo Limpando compilacao anterior...
  rmdir /s /q release
)

call npm install || goto :erro
call npm run check || goto :erro
call npm run desktop:dist || goto :erro
call npm run desktop:verify-dist || goto :erro
node scripts\verificar-correcao-espacamento-beta5.mjs || goto :erro

echo.
echo Correcao concluida e validada.
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
