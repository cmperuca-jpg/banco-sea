# Fusion Sistema — entrega ao cliente

O cliente final recebe somente `FusionSistema-Setup.exe`.

## Experiência do cliente

1. Executa o instalador.
2. Abre o Fusion Sistema pelo atalho.
3. Entra com e-mail e senha.
4. O sistema inicia junto com o Windows e permanece na bandeja.
5. Alunos, professores e modalidades são sincronizados automaticamente quando necessário.

O cliente não precisa instalar Node.js, usar PowerShell, extrair ZIP ou configurar Supabase.

## Dados locais

Os dados operacionais ficam fora da pasta do programa, em `%APPDATA%/fusion-sistema/runtime`. Atualizações do aplicativo não apagam essa pasta. A desinstalação também preserva os dados por padrão.

## Geração automática pelo GitHub

O workflow `.github/workflows/gerar-instalador-windows.yml` gera o instalador:

- manualmente em **Actions > Gerar instalador Windows > Run workflow**; ou
- automaticamente quando for criada uma tag, por exemplo `v3.0.0-beta.1`.

Quando a execução é iniciada por tag, o instalador e o arquivo `latest.yml` são publicados em GitHub Releases. O aplicativo instalado usa esses arquivos para verificar atualizações.

## PWA

A página `/pages/instalar/index.html` orienta a instalação da PWA no celular e oferece o download do instalador Windows.

## Limite desta versão

Esta versão consolida autenticação Supabase, aplicativo Windows e sincronização automática de alunos, professores e modalidades. Os demais módulos continuam locais até serem migrados para o modelo de sincronização incremental.
