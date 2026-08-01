@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo =====================================================
echo  Fusion Sistema - Snapshot para correcao integral
echo =====================================================
echo.

where git >nul 2>nul || (
  echo ERRO: Git nao encontrado no Windows.
  pause
  exit /b 1
)

if not exist ".git" (
  echo ERRO: este arquivo precisa estar dentro da raiz do repositorio.
  echo Pasta esperada:
  echo C:\Users\academia01\Documents\GitHub\banco sea
  pause
  exit /b 1
)

for /f "delims=" %%A in ('git rev-parse --show-toplevel 2^>nul') do set "ROOT=%%A"
if not defined ROOT (
  echo ERRO: nao foi possivel identificar a raiz do repositorio.
  pause
  exit /b 1
)

cd /d "%ROOT%"
echo Repositorio:
echo %ROOT%
echo.

git remote get-url origin >nul 2>nul || (
  echo ERRO: o repositorio nao possui remote origin configurado.
  pause
  exit /b 1
)

echo Verificando arquivos que nunca podem ser enviados...
for %%P in (
  ".env"
  ".env.local"
  ".env.production"
  "data"
  "uploads"
  "release"
  "node_modules"
  "backups"
  "logs"
) do (
  git check-ignore -q "%%~P" >nul 2>nul
  if errorlevel 1 (
    if exist "%%~P" (
      echo ERRO: %%~P existe e nao esta protegido pelo .gitignore.
      echo Nenhum arquivo foi enviado.
      pause
      exit /b 1
    )
  )
)

set "BRANCH=correcao-integral"

git show-ref --verify --quiet "refs/heads/%BRANCH%"
if errorlevel 1 (
  echo Criando branch isolada %BRANCH%...
  git switch -c "%BRANCH%" || goto :erro
) else (
  echo Abrindo branch isolada %BRANCH%...
  git switch "%BRANCH%" || goto :erro
)

echo.
echo Preparando somente arquivos permitidos...
git add -A || goto :erro

rem Remove explicitamente qualquer arquivo sensivel que tenha sido rastreado por engano.
git restore --staged -- ".env" ".env.local" ".env.production" >nul 2>nul
git restore --staged -- "data" "uploads" "release" "node_modules" "backups" "logs" >nul 2>nul

set "PROIBIDO="
for /f "delims=" %%F in ('git diff --cached --name-only') do (
  set "ARQ=%%F"
  echo !ARQ! | findstr /R /I ^
    /C:"^\.env$" ^
    /C:"^\.env\." ^
    /C:"^data/" ^
    /C:"^uploads/" ^
    /C:"^release/" ^
    /C:"^node_modules/" ^
    /C:"^backups/" ^
    /C:"^logs/" >nul
  if not errorlevel 1 set "PROIBIDO=1"
)

if defined PROIBIDO (
  echo.
  echo ERRO: foi detectado arquivo sensivel ou gerado na area de commit.
  echo Nenhum push foi realizado.
  git diff --cached --name-only
  pause
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Snapshot local para correcao integral e testes Windows" || goto :erro
) else (
  echo Nenhuma alteracao nova para criar commit.
)

echo.
echo Enviando a branch %BRANCH%...
git push -u origin "%BRANCH%" || goto :erro

echo.
echo =====================================================
echo SNAPSHOT ENVIADO COM SUCESSO
echo Branch: %BRANCH%
echo =====================================================
echo.
echo Agora informe na conversa apenas:
echo "branch correcao-integral enviada"
echo.
pause
exit /b 0

:erro
echo.
echo ERRO: o snapshot nao foi concluido.
echo Envie as ultimas linhas desta janela.
pause
exit /b 1
