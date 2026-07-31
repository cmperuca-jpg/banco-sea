begin;

create table if not exists public.modalidades (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  legacy_id text not null,
  nome text not null,
  categoria text not null,
  descricao text,
  professor_responsavel text,
  duracao_minutos integer not null default 60 check (duracao_minutos > 0),
  capacidade_maxima integer not null default 20 check (capacidade_maxima > 0),
  valor_sugerido numeric(12,2) not null default 0 check (valor_sugerido >= 0),
  cor text,
  icone text,
  status text not null default 'ativa' check (status in ('ativa','inativa')),
  dados jsonb not null default '{}'::jsonb,
  sync_version bigint not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,
  unique (academia_id, legacy_id)
);

create index if not exists modalidades_academia_status_idx
  on public.modalidades(academia_id, status, nome)
  where excluido_em is null;

create index if not exists modalidades_atualizado_sync_idx
  on public.modalidades(academia_id, atualizado_em desc, sync_version desc);

create trigger modalidades_sync
before update on public.modalidades
for each row execute function public.fusion_atualizar_sync();

alter table public.modalidades enable row level security;

create policy modalidades_select_membros on public.modalidades
for select to authenticated
using (fusion_private.fusion_usuario_e_membro(academia_id));

create policy modalidades_insert_equipe on public.modalidades
for insert to authenticated
with check (
  fusion_private.fusion_usuario_tem_papel(
    academia_id,
    array['proprietario','administrador','gerente','recepcao']::text[]
  )
);

create policy modalidades_update_equipe on public.modalidades
for update to authenticated
using (
  fusion_private.fusion_usuario_tem_papel(
    academia_id,
    array['proprietario','administrador','gerente','recepcao']::text[]
  )
)
with check (
  fusion_private.fusion_usuario_tem_papel(
    academia_id,
    array['proprietario','administrador','gerente','recepcao']::text[]
  )
);

create policy modalidades_delete_admin on public.modalidades
for delete to authenticated
using (
  fusion_private.fusion_usuario_tem_papel(
    academia_id,
    array['proprietario','administrador']::text[]
  )
);

commit;
