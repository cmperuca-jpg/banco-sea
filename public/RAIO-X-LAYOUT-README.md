# Refatoração estrutural do Fusion Sistema

Arquivos globais substituídos:

- `assets/css/fusion-app.css`: único controlador de largura, deslocamento e responsividade.
- `assets/css/fusion-menu-global.css`: único controlador visual/tipográfico do menu.
- `assets/css/fusion-v3-layout.css`: compatibilidade mínima, sem segundo layout.
- `assets/css/fusion-theme.css`: tema visual, sem posicionamento.
- `assets/css/fusion-standard-financeiro.css`: componentes internos, sem layout/menu.
- `assets/js/fusion-layout.js`: ordem e cache dos estilos atualizados.

## Varredura da pasta pages

Foram encontrados 20 CSS locais com regras potencialmente concorrentes. Eles não foram apagados automaticamente para evitar quebrar telas funcionais; a nova camada global neutraliza deslocamentos e larguras na raiz das páginas.

- `pages/_shared/fusion-area-clara.css` — main_layout
- `pages/alunos/prontuario-contraste.css` — viewport_width, sidebar_margin, main_layout
- `pages/alunos/prontuario.css` — sidebar_position
- `pages/alunos/style.css` — viewport_width, main_layout
- `pages/avaliacoes/style.css` — viewport_width, sidebar_position, main_layout
- `pages/biblioteca-inteligente/style.css` — viewport_width
- `pages/caixa/style.css` — viewport_width, sidebar_margin, sidebar_position
- `pages/comercial-painel/ajuste-painel.css` — main_layout
- `pages/comercial-painel/style.css` — main_layout
- `pages/matriculas-pendentes/style.css` — main_layout
- `pages/mensalidades/style.css` — viewport_width, sidebar_margin, sidebar_position
- `pages/modalidades/modalidades.css` — main_layout
- `pages/planos/planos.css` — main_layout
- `pages/portal-aluno/style.css` — sidebar_position
- `pages/professor-painel/style.css` — viewport_width, sidebar_position
- `pages/professores/style.css` — viewport_width
- `pages/recebimentos/layout-fix.css` — viewport_width
- `pages/relatorios-caixa/style.css` — viewport_width, sidebar_margin, sidebar_position
- `pages/treinos-v3-aluno/style.css` — viewport_width
- `pages/treinos-v3/style.css` — viewport_width
