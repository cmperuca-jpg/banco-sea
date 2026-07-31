begin;

alter table public.alunos
  add column if not exists legacy_id text;

alter table public.alunos
  alter column legacy_id set not null;

alter table public.alunos
  drop constraint if exists alunos_academia_legacy_id_key;

alter table public.alunos
  add constraint alunos_academia_legacy_id_key unique (academia_id, legacy_id);

create index if not exists alunos_atualizado_sync_idx
  on public.alunos(academia_id, atualizado_em desc, sync_version desc)
  where excluido_em is null;

comment on column public.alunos.legacy_id is
  'Identificador do registro no sistema local durante a transicao e sincronizacao incremental.';

commit;
