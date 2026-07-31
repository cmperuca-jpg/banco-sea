# Fusion Sistema — Template Global Único

Este pacote padroniza as páginas que usam `assets/js/fusion-layout.js`.

## Regra aplicada

A ordem dos estilos em cada página passa a ser:

1. `assets/css/fusion-app.css`
2. estilos globais auxiliares já usados pela página
3. `assets/css/fusion-theme.css`
4. CSS específico da página
5. `assets/css/fusion-menu-global.css` por último

Também foram removidas referências a `assets/js/fusion-menu-global.js` nas páginas
que já usam `fusion-layout.js`, evitando inicialização duplicada do menu.

## Resultado

- 67 páginas HTML normalizadas.
- Apenas uma referência a cada CSS global por página.
- `fusion-menu-global.css` sempre por último.
- HTML e IDs funcionais preservados.
- JavaScript de negócio preservado.
- APIs, rotas e autenticação não foram alteradas.

## Instalação

Extraia o ZIP na raiz do projeto `fusion-erp`, permitindo substituir a pasta `public`.

Depois reinicie o servidor e faça recarga forçada no navegador com `Ctrl + F5`.

## Arquivos HTML alterados

- `pages/access-engine/index.html`
- `pages/admin/index.html`
- `pages/agenda/cadastro.html`
- `pages/agenda/ficha.html`
- `pages/agenda/index.html`
- `pages/aluno-avaliacao/index.html`
- `pages/alunos/cadastro.html`
- `pages/alunos/ficha.html`
- `pages/alunos/index.html`
- `pages/alunos/prontuario.html`
- `pages/avaliacoes/index.html`
- `pages/bi-academia-operacional/index.html`
- `pages/bi-academia/index.html`
- `pages/bi-financeiro/index.html`
- `pages/bi/index.html`
- `pages/biblioteca-inteligente/index.html`
- `pages/biometria/index.html`
- `pages/caixa/index.html`
- `pages/checkin/index.html`
- `pages/comercial-painel/index.html`
- `pages/configuracoes/index.html`
- `pages/dashboard/index.html`
- `pages/estoque/index.html`
- `pages/exercicios/ficha.html`
- `pages/exercicios/index.html`
- `pages/financeiro/index.html`
- `pages/financeiro/pagamentos/index.html`
- `pages/importador-access/index.html`
- `pages/importador-avaliacoes/index.html`
- `pages/importador-fotos/index.html`
- `pages/matriculas-pendentes/index.html`
- `pages/matriculas/cadastro.html`
- `pages/matriculas/ficha.html`
- `pages/matriculas/index.html`
- `pages/mensalidades/index.html`
- `pages/migracao-dados/index.html`
- `pages/modalidades/index.html`
- `pages/modelos-treino/index.html`
- `pages/natacao-aluno/index.html`
- `pages/natacao-professor/index.html`
- `pages/pagamentos/index.html`
- `pages/planos/index.html`
- `pages/portal-aluno-operacional/index.html`
- `pages/portal-aluno/index.html`
- `pages/portal-professor/index.html`
- `pages/portal-treinos/index.html`
- `pages/presencas/cadastro.html`
- `pages/presencas/ficha.html`
- `pages/presencas/index.html`
- `pages/professor-painel/index.html`
- `pages/professores/cadastro.html`
- `pages/professores/ficha.html`
- `pages/professores/index.html`
- `pages/recebimentos/index.html`
- `pages/reconhecimento-facial/admin.html`
- `pages/relatorios-caixa/index.html`
- `pages/site-chat/index.html`
- `pages/treinos-editor/index.html`
- `pages/treinos-v3-aluno/index.html`
- `pages/treinos-v3/index.html`
- `pages/treinos-v4/index.html`
- `pages/treinos/ficha.html`
- `pages/treinos/index.html`
- `pages/turmas/cadastro.html`
- `pages/turmas/ficha.html`
- `pages/turmas/index.html`
- `pages_cadastro.html`
