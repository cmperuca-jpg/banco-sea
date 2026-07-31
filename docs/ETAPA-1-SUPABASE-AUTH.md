# Etapa 1 — Supabase Auth no Fusion Sistema

Esta etapa conecta o login principal do sistema ao projeto Supabase novo, mantendo temporariamente os dados operacionais nos arquivos JSON locais.

## Projeto Supabase

- Projeto: `fusion-sistema-novo`
- Região: São Paulo (`sa-east-1`)
- URL: `https://kruujujuxeqexxuugwci.supabase.co`
- Academia: `academia fusion combat fit`
- Slug: `academia-fusion-combat-fit`

A chave incluída em `.env.fusion-novo.example` é publicável. Ela pode ser usada para autenticação do cliente e não possui privilégios administrativos. Não adicione uma chave `service_role` ao navegador, PWA ou aplicativo distribuído.

## Como iniciar

1. Execute `CONFIGURAR-SUPABASE-NOVO.bat`.
2. Execute `npm install`.
3. Execute `npm run dev`.
4. Abra `http://localhost:3000/pages/login/index.html`.
5. Entre com a conta de proprietário criada no Supabase.

## O que já funciona

- login por e-mail e senha no Supabase Auth;
- leitura do perfil e vínculo com a academia;
- identificação do proprietário como administrador do sistema;
- renovação automática da sessão;
- validação do token Supabase nas APIs existentes;
- bloqueio de usuários, vínculos ou academias inativos;
- compatibilidade com as páginas que usam `FusionAuth`.

## Limite desta etapa

Os módulos existentes ainda utilizam os arquivos JSON locais. A tela administrativa antiga de usuários continua ligada ao cadastro legado e não deve ser usada para criar novas contas nesta etapa. A gestão de usuários Supabase será implementada por função segura do servidor na próxima etapa.

Professor e aluno ainda usam seus portais legados. Eles serão migrados depois que a gestão central de usuários estiver concluída.
