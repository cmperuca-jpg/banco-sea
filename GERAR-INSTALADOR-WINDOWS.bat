@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo       Fusion Sistema - Instalador
echo ========================================
echo.
where node >nul 2>nul || (
  echo Node.js nao encontrado. Instale o Node.js 22 LTS para gerar o instalador.
  pause
  exit /b 1
)
if exist release (
  echo Limpando arquivos da compilacao anterior...
  rmdir /s /q release
)
call npm install || goto :erro
call npm run check || goto :erro
call npm run desktop:dist || goto :erro
call npm run desktop:verify-dist || goto :erro
echo.
echo Instalador criado e validado em:
echo %CD%\release\FusionSistema-Setup.exe
explorer "%CD%\release"
pause
exit /b 0
:erro
echo.
echo Falha ao gerar ou validar o instalador. Consulte as mensagens acima.
pause
exit /b 1
