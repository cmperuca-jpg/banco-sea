begin;

alter table public.professores
  add column if not exists legacy_id text,
  add column if not exists cref text,
  add column if not exists modalidades text[] not null default '{}',
  add column if not exists status text not null default 'ativo',
  add column if not exists dados jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'professores_status_check'
      and conrelid = 'public.professores'::regclass
  ) then
    alter table public.professores
      add constraint professores_status_check
      check (status in ('ativo','inativo','cancelado','bloqueado'));
  end if;
end
$$;

create unique index if not exists professores_academia_legacy_id_uidx
  on public.professores(academia_id, legacy_id);

create index if not exists professores_atualizado_sync_idx
  on public.professores(academia_id, atualizado_em desc, sync_version desc)
  where excluido_em is null;

comment on column public.professores.legacy_id is
  'Identificador do registro no sistema local durante a transicao e sincronizacao incremental.';

commit;
