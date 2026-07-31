# Etapa 4 — Modalidades no novo Supabase

Esta etapa mantém `data/modalidades.json` como fonte operacional local e cria uma cópia incremental na tabela `public.modalidades`.

## Funcionamento

- O botão **Sincronizar nuvem** envia todas as modalidades locais.
- Cadastros e edições tentam sincronizar o registro automaticamente.
- Exclusões locais são registradas na nuvem por `excluido_em`.
- A identificação usa `(academia_id, legacy_id)` para impedir duplicações.
- Uma falha de internet não impede a gravação local.

A migration `20260731_modalidades_sincronizacao_incremental.sql` já foi aplicada ao projeto Supabase novo.
