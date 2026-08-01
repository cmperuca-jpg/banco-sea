param(
  [string]$Branch = "correcao-integral"
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
  Write-Host ""
  Write-Host "ERRO: $Message" -ForegroundColor Red
  Write-Host "Nenhum push foi realizado." -ForegroundColor Yellow
  Read-Host "Pressione Enter para fechar"
  exit 1
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Fusion Sistema - Snapshot para correcao integral V2" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail "Git nao encontrado no Windows."
}

try {
  $root = (& git rev-parse --show-toplevel 2>$null | Out-String).Trim()
} catch {
  Fail "Execute este arquivo dentro da raiz do repositorio."
}

if (-not $root -or -not (Test-Path -LiteralPath (Join-Path $root ".git"))) {
  Fail "Nao foi possivel identificar a raiz do repositorio."
}

Set-Location -LiteralPath $root

Write-Host "Repositorio:" -ForegroundColor White
Write-Host $root -ForegroundColor Yellow
Write-Host ""

try {
  $origin = (& git remote get-url origin 2>$null | Out-String).Trim()
} catch {
  Fail "O repositorio nao possui remote origin configurado."
}

if (-not $origin) {
  Fail "O repositorio nao possui remote origin configurado."
}

Write-Host "Remote origin:" -ForegroundColor White
Write-Host $origin -ForegroundColor DarkGray
Write-Host ""

# Nomes que nunca devem entrar no snapshot.
$blockedExact = @(
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  "render-environment.txt"
)

$blockedPrefixes = @(
  "data/",
  "uploads/",
  "release/",
  "node_modules/",
  "backups/",
  "logs/",
  "tmp/",
  "temp/",
  ".fusion-runtime/"
)

# Primeiro verifica se algum item proibido JA esta rastreado no repositorio.
# Arquivos de exemplo de ambiente continuam permitidos.
$tracked = @(& git ls-files)
$trackedBlocked = @()

foreach ($file in $tracked) {
  $normalized = $file.Replace("\", "/")

  if ($blockedExact -contains $normalized) {
    $trackedBlocked += $normalized
    continue
  }

  if ($normalized -like ".env.*" -and $normalized -notlike "*.example") {
    $trackedBlocked += $normalized
    continue
  }

  foreach ($prefix in $blockedPrefixes) {
    if ($normalized.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      $trackedBlocked += $normalized
      break
    }
  }
}

if ($trackedBlocked.Count -gt 0) {
  Write-Host "Arquivos proibidos ja estao rastreados pelo Git:" -ForegroundColor Red
  $trackedBlocked | Sort-Object -Unique | ForEach-Object {
    Write-Host " - $_" -ForegroundColor Yellow
  }
  Fail "Remova esses arquivos do indice Git antes do snapshot."
}

# Proteção local, sem alterar o .gitignore do projeto.
$excludePath = Join-Path $root ".git\info\exclude"
$excludeLines = @(
  "",
  "# Fusion snapshot integral - exclusoes locais",
  "/.env",
  "/.env.local",
  "/.env.development",
  "/.env.production",
  "/.env.test",
  "/render-environment.txt",
  "/data/",
  "/uploads/",
  "/release/",
  "/node_modules/",
  "/backups/",
  "/logs/",
  "/tmp/",
  "/temp/",
  "/.fusion-runtime/"
)

$currentExclude = ""
if (Test-Path -LiteralPath $excludePath) {
  $currentExclude = Get-Content -LiteralPath $excludePath -Raw -ErrorAction SilentlyContinue
}

if ($currentExclude -notmatch "Fusion snapshot integral - exclusoes locais") {
  Add-Content -LiteralPath $excludePath -Value ($excludeLines -join [Environment]::NewLine) -Encoding UTF8
}

Write-Host "Criando/atualizando branch isolada: $Branch" -ForegroundColor White

# Reaponta apenas a branch de trabalho para o HEAD atual. A main nao e alterada.
& git switch -C $Branch HEAD
if ($LASTEXITCODE -ne 0) {
  Fail "Nao foi possivel abrir a branch $Branch."
}

Write-Host "Preparando arquivos permitidos..." -ForegroundColor White

& git add -A
if ($LASTEXITCODE -ne 0) {
  Fail "git add falhou."
}

# Defesa adicional: remove do stage qualquer nome proibido, mesmo se alguma regra local falhar.
$unstagePaths = @(
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  "render-environment.txt",
  "data",
  "uploads",
  "release",
  "node_modules",
  "backups",
  "logs",
  "tmp",
  "temp",
  ".fusion-runtime"
)

foreach ($item in $unstagePaths) {
  & git reset -q HEAD -- $item 2>$null
}

$staged = @(& git diff --cached --name-only)
$stagedBlocked = @()

foreach ($file in $staged) {
  $normalized = $file.Replace("\", "/")

  if ($blockedExact -contains $normalized) {
    $stagedBlocked += $normalized
    continue
  }

  if ($normalized -like ".env.*" -and $normalized -notlike "*.example") {
    $stagedBlocked += $normalized
    continue
  }

  foreach ($prefix in $blockedPrefixes) {
    if ($normalized.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      $stagedBlocked += $normalized
      break
    }
  }
}

if ($stagedBlocked.Count -gt 0) {
  Write-Host "Itens proibidos detectados no stage:" -ForegroundColor Red
  $stagedBlocked | Sort-Object -Unique | ForEach-Object {
    Write-Host " - $_" -ForegroundColor Yellow
  }
  & git reset
  Fail "O snapshot foi cancelado por seguranca."
}

if ($staged.Count -eq 0) {
  Write-Host "Nenhuma alteracao nova para criar commit." -ForegroundColor DarkGray
} else {
  Write-Host "Arquivos preparados: $($staged.Count)" -ForegroundColor Green
  & git commit -m "Snapshot local para correcao integral e testes Windows"
  if ($LASTEXITCODE -ne 0) {
    Fail "Nao foi possivel criar o commit."
  }
}

Write-Host ""
Write-Host "Enviando a branch para o GitHub..." -ForegroundColor White
& git push --force-with-lease -u origin $Branch
if ($LASTEXITCODE -ne 0) {
  Fail "O push nao foi concluido."
}

$commit = (& git rev-parse HEAD | Out-String).Trim()

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host " SNAPSHOT ENVIADO COM SUCESSO" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "Branch: $Branch" -ForegroundColor Yellow
Write-Host "Commit: $commit" -ForegroundColor Yellow
Write-Host ""
Write-Host "Informe na conversa:" -ForegroundColor White
Write-Host "branch correcao-integral enviada" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione Enter para fechar"
