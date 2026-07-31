# Etapa 2 — cópia incremental de alunos para o Supabase

Nesta etapa, `data/alunos.json` continua sendo a fonte operacional local.

A tela Alunos ganhou o botão **Sincronizar nuvem**. Ele copia os registros para `public.alunos` usando a sessão Supabase do proprietário e as políticas RLS. As senhas do portal e imagens em base64 não são enviadas.

Cadastros e edições novos tentam atualizar a cópia na nuvem automaticamente. Se a internet falhar, o registro local permanece salvo e poderá ser reenviado pelo botão.
