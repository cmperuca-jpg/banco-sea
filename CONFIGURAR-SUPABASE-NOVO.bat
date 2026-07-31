@echo off
setlocal
cd /d "%~dp0"

if exist ".env" (
  echo O arquivo .env ja existe.
  echo Nenhuma configuracao foi substituida.
  echo Renomeie ou remova o .env atual e execute novamente.
  pause
  exit /b 1
)

copy /Y ".env.fusion-novo.example" ".env" >nul
if errorlevel 1 (
  echo Nao foi possivel criar o arquivo .env.
  pause
  exit /b 1
)

echo.
echo Configuracao criada em .env.
echo Execute agora: npm install
echo Depois execute: npm run dev
echo.
pause
