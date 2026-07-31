# Etapa 3 — Professores no novo Supabase

Nesta etapa, o cadastro local continua sendo a fonte operacional principal.

O botão **Sincronizar nuvem** copia os professores locais para a tabela `professores` do novo Supabase. Novos cadastros, edições, mudanças de status e exclusões também tentam atualizar a cópia na nuvem automaticamente.

Proteções aplicadas:

- senhas, hashes e tokens não são enviados;
- fotos e documentos em base64 não são copiados para o banco;
- o ID local é preservado em `legacy_id` para impedir duplicações;
- falha na nuvem não impede o salvamento local;
- exclusões locais são registradas na nuvem com `excluido_em`.
