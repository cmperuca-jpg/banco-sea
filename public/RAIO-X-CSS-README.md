# Raio-X CSS — limpeza estrutural fase 1

Arquivos alterados:

- `assets/js/fusion-layout.js`: deixa de injetar `fusion-correcoes-visuais.css`.
- `assets/css/fusion-app.css`: remove o `@import` duplicado do mesmo arquivo legado.
- `pages/financeiro/recebimento-contraste.css`: mantém somente as correções do modal e substitui a camada escura da página por regras claras, escopadas em `.financeiro-page`.
- `pages/login/cadastro.html`: remove referência quebrada para `/js/alunos-cadastro.js`, arquivo inexistente no pacote.

Principais achados da varredura:

- 999 arquivos, 87 HTML, 101 CSS e 149 JS.
- 1 referência local quebrada.
- 11 CSS com mais de 100 declarações `!important`.
- `pages/avaliacoes/style.css`: 993 `!important`.
- `pages/alunos/style.css`: 362 `!important`.
- `pages/professores/style.css`: 309 `!important`.
- `pages/financeiro/recebimento-contraste.css`: 167 `!important` e regras escuras aplicadas à página inteira.
- `fusion-correcoes-visuais.css` era carregado duas vezes: por `fusion-layout.js` e por `@import` em `fusion-app.css`.
- Permanecem arquivos legados não carregados em produção, como `fusion-premium-final.css`, `index_teste_antigo.html` e `pages_cadastro.html`. Eles devem ser arquivados fora de `public`, não reutilizados.

Aplicação: extraia este ZIP na raiz de `public`, substituindo os arquivos. Depois limpe cache e service worker.
