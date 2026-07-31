-- Fusion Sistema — base nova do Supabase.
-- Não contém usuários, senhas ou IDs específicos de academia.

begin;

create extension if not exists pgcrypto;
create schema if not exists fusion_private;
revoke all on schema fusion_private from public, anon;
grant usage on schema fusion_private to authenticated, service_role;

create table if not exists public.academias (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'ativa' check (status in ('ativa','inativa','suspensa')),
  timezone text not null default 'America/Sao_Paulo',
  configuracoes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  telefone text,
  avatar_url text,
  status text not null default 'ativo' check (status in ('ativo','inativo','bloqueado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.academia_usuarios (
  academia_id uuid not null references public.academias(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  papel text not null check (papel in ('proprietario','administrador','gerente','recepcao','professor','aluno')),
  status text not null default 'ativo' check (status in ('ativo','inativo','convite')),
  permissoes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (academia_id, usuario_id)
);

create index if not exists academia_usuarios_usuario_idx on public.academia_usuarios(usuario_id);
create index if not exists academia_usuarios_academia_papel_idx on public.academia_usuarios(academia_id, papel, status);

create table if not exists public.professores (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  nome text not null,
  cpf text,
  email text,
  telefone text,
  foto_url text,
  especialidades text[] not null default '{}',
  ativo boolean not null default true,
  sync_version bigint not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,
  unique (academia_id, usuario_id)
);

create index if not exists professores_academia_idx on public.professores(academia_id, ativo) where excluido_em is null;
create index if not exists professores_usuario_idx on public.professores(usuario_id) where usuario_id is not null;

create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  nome text not null,
  cpf text,
  data_nascimento date,
  email text,
  telefone text,
  foto_url text,
  matricula text,
  status text not null default 'ativo' check (status in ('ativo','inativo','trancado','cancelado','pendente')),
  dados jsonb not null default '{}'::jsonb,
  sync_version bigint not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,
  unique (academia_id, usuario_id),
  unique (academia_id, matricula)
);

create index if not exists alunos_academia_status_idx on public.alunos(academia_id, status) where excluido_em is null;
create index if not exists alunos_usuario_idx on public.alunos(usuario_id) where usuario_id is not null;
create index if not exists alunos_nome_idx on public.alunos(academia_id, lower(nome));

create table if not exists public.dispositivos_acesso (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  codigo text not null,
  nome text not null,
  tipo text not null default 'catraca' check (tipo in ('catraca','biometria','facial','computador','outro')),
  plataforma text,
  status text not null default 'offline' check (status in ('online','offline','bloqueado','manutencao')),
  configuracoes jsonb not null default '{}'::jsonb,
  ultima_conexao_em timestamptz,
  sync_version bigint not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (academia_id, codigo)
);

create index if not exists dispositivos_acesso_academia_idx on public.dispositivos_acesso(academia_id, status);

create table if not exists public.comandos_acesso (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  dispositivo_id uuid not null references public.dispositivos_acesso(id) on delete cascade,
  acao text not null check (acao in ('liberar_entrada','liberar_saida','sincronizar','reiniciar','testar','atualizar_configuracao')),
  payload jsonb not null default '{}'::jsonb,
  solicitado_por uuid references auth.users(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente','processando','executado','falhou','expirado','cancelado')),
  resultado jsonb,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '2 minutes'),
  iniciado_em timestamptz,
  finalizado_em timestamptz
);

create index if not exists comandos_acesso_pendentes_idx on public.comandos_acesso(dispositivo_id, criado_em) where status = 'pendente';
create index if not exists comandos_acesso_academia_idx on public.comandos_acesso(academia_id, criado_em desc);

create table if not exists public.eventos_acesso (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  dispositivo_id uuid references public.dispositivos_acesso(id) on delete set null,
  aluno_id uuid references public.alunos(id) on delete set null,
  tipo text not null,
  direcao text check (direcao in ('entrada','saida') or direcao is null),
  autorizado boolean,
  motivo text,
  dados jsonb not null default '{}'::jsonb,
  ocorrido_em timestamptz not null default now(),
  recebido_em timestamptz not null default now()
);

create index if not exists eventos_acesso_academia_data_idx on public.eventos_acesso(academia_id, ocorrido_em desc);
create index if not exists eventos_acesso_aluno_data_idx on public.eventos_acesso(aluno_id, ocorrido_em desc) where aluno_id is not null;

create table if not exists public.sync_eventos (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  dispositivo_id uuid references public.dispositivos_acesso(id) on delete set null,
  entidade text not null,
  entidade_id uuid,
  operacao text not null check (operacao in ('insert','update','delete')),
  versao bigint not null default 1,
  payload jsonb,
  origem text not null default 'nuvem' check (origem in ('nuvem','local','mobile','importacao')),
  criado_em timestamptz not null default now(),
  processado_em timestamptz
);

create index if not exists sync_eventos_pendentes_idx on public.sync_eventos(academia_id, criado_em) where processado_em is null;

create or replace function public.fusion_atualizar_timestamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create or replace function public.fusion_atualizar_sync()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.atualizado_em = now();
  new.sync_version = old.sync_version + 1;
  return new;
end;
$$;

drop trigger if exists academias_atualizado_em on public.academias;
create trigger academias_atualizado_em before update on public.academias for each row execute function public.fusion_atualizar_timestamp();
drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em before update on public.perfis for each row execute function public.fusion_atualizar_timestamp();
drop trigger if exists academia_usuarios_atualizado_em on public.academia_usuarios;
create trigger academia_usuarios_atualizado_em before update on public.academia_usuarios for each row execute function public.fusion_atualizar_timestamp();
drop trigger if exists professores_sync on public.professores;
create trigger professores_sync before update on public.professores for each row execute function public.fusion_atualizar_sync();
drop trigger if exists alunos_sync on public.alunos;
create trigger alunos_sync before update on public.alunos for each row execute function public.fusion_atualizar_sync();
drop trigger if exists dispositivos_acesso_sync on public.dispositivos_acesso;
create trigger dispositivos_acesso_sync before update on public.dispositivos_acesso for each row execute function public.fusion_atualizar_sync();

create or replace function fusion_private.fusion_criar_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.perfis (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), ''),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    nome = case when public.perfis.nome = '' then excluded.nome else public.perfis.nome end,
    atualizado_em = now();
  return new;
end;
$$;

revoke all on function fusion_private.fusion_criar_perfil_usuario() from public, anon, authenticated;
grant execute on function fusion_private.fusion_criar_perfil_usuario() to service_role;

drop trigger if exists auth_usuario_criar_perfil on auth.users;
create trigger auth_usuario_criar_perfil
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function fusion_private.fusion_criar_perfil_usuario();

create or replace function fusion_private.fusion_usuario_e_membro(p_academia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.academia_usuarios au
    where au.academia_id = p_academia_id
      and au.usuario_id = auth.uid()
      and au.status = 'ativo'
  );
$$;

create or replace function fusion_private.fusion_usuario_tem_papel(p_academia_id uuid, p_papeis text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.academia_usuarios au
    where au.academia_id = p_academia_id
      and au.usuario_id = auth.uid()
      and au.status = 'ativo'
      and au.papel = any(p_papeis)
  );
$$;

create or replace function fusion_private.fusion_pode_ver_perfil(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() = p_usuario_id
  or exists (
    select 1
    from public.academia_usuarios atual
    join public.academia_usuarios alvo
      on alvo.academia_id = atual.academia_id
     and alvo.usuario_id = p_usuario_id
     and alvo.status = 'ativo'
    where atual.usuario_id = auth.uid()
      and atual.status = 'ativo'
      and atual.papel = any(array['proprietario','administrador','gerente','recepcao']::text[])
  );
$$;

revoke all on function fusion_private.fusion_usuario_e_membro(uuid) from public, anon;
revoke all on function fusion_private.fusion_usuario_tem_papel(uuid,text[]) from public, anon;
revoke all on function fusion_private.fusion_pode_ver_perfil(uuid) from public, anon;
grant execute on function fusion_private.fusion_usuario_e_membro(uuid) to authenticated, service_role;
grant execute on function fusion_private.fusion_usuario_tem_papel(uuid,text[]) to authenticated, service_role;
grant execute on function fusion_private.fusion_pode_ver_perfil(uuid) to authenticated, service_role;

create or replace function public.fusion_bootstrap_academia(p_nome text, p_slug text, p_nome_usuario text default null)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_usuario uuid := auth.uid();
  v_academia uuid;
begin
  if v_usuario is null then raise exception 'Autenticação obrigatória.'; end if;
  if exists (select 1 from public.academia_usuarios where usuario_id = v_usuario) then
    raise exception 'Este usuário já pertence a uma academia.';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Slug inválido.'; end if;

  insert into public.academias (nome, slug) values (trim(p_nome), trim(p_slug)) returning id into v_academia;
  insert into public.academia_usuarios (academia_id, usuario_id, papel, status)
  values (v_academia, v_usuario, 'proprietario', 'ativo');
  update public.perfis set nome = coalesce(nullif(trim(p_nome_usuario), ''), nome), atualizado_em = now() where id = v_usuario;
  return v_academia;
end;
$$;

revoke all on function public.fusion_bootstrap_academia(text,text,text) from public, anon;
grant execute on function public.fusion_bootstrap_academia(text,text,text) to authenticated, service_role;

alter table public.academias enable row level security;
alter table public.perfis enable row level security;
alter table public.academia_usuarios enable row level security;
alter table public.professores enable row level security;
alter table public.alunos enable row level security;
alter table public.dispositivos_acesso enable row level security;
alter table public.comandos_acesso enable row level security;
alter table public.eventos_acesso enable row level security;
alter table public.sync_eventos enable row level security;

-- Recriação idempotente das políticas.
drop policy if exists academias_select_membros on public.academias;
create policy academias_select_membros on public.academias for select to authenticated using (fusion_private.fusion_usuario_e_membro(id));
drop policy if exists academias_update_administracao on public.academias;
create policy academias_update_administracao on public.academias for update to authenticated
using (fusion_private.fusion_usuario_tem_papel(id, array['proprietario','administrador']))
with check (fusion_private.fusion_usuario_tem_papel(id, array['proprietario','administrador']));

drop policy if exists perfis_select_autorizado on public.perfis;
create policy perfis_select_autorizado on public.perfis for select to authenticated using (fusion_private.fusion_pode_ver_perfil(id));
drop policy if exists perfis_update_proprio on public.perfis;
create policy perfis_update_proprio on public.perfis for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists academia_usuarios_select on public.academia_usuarios;
create policy academia_usuarios_select on public.academia_usuarios for select to authenticated
using (usuario_id = auth.uid() or fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao']));
drop policy if exists academia_usuarios_insert_admin on public.academia_usuarios;
create policy academia_usuarios_insert_admin on public.academia_usuarios for insert to authenticated
with check (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']));
drop policy if exists academia_usuarios_update_admin on public.academia_usuarios;
create policy academia_usuarios_update_admin on public.academia_usuarios for update to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']))
with check (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']));
drop policy if exists academia_usuarios_delete_admin on public.academia_usuarios;
create policy academia_usuarios_delete_admin on public.academia_usuarios for delete to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']) and usuario_id <> auth.uid());

drop policy if exists professores_select on public.professores;
create policy professores_select on public.professores for select to authenticated
using (usuario_id = auth.uid() or fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao','professor']));
drop policy if exists professores_insert on public.professores;
create policy professores_insert on public.professores for insert to authenticated
with check (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente']));
drop policy if exists professores_update on public.professores;
create policy professores_update on public.professores for update to authenticated
using (usuario_id = auth.uid() or fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente']))
with check (usuario_id = auth.uid() or fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente']));
drop policy if exists professores_delete on public.professores;
create policy professores_delete on public.professores for delete to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']));

drop policy if exists alunos_select on public.alunos;
create policy alunos_select on public.alunos for select to authenticated
using (usuario_id = auth.uid() or fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao','professor']));
drop policy if exists alunos_insert on public.alunos;
create policy alunos_insert on public.alunos for insert to authenticated
with check (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao']));
drop policy if exists alunos_update on public.alunos;
create policy alunos_update on public.alunos for update to authenticated
using (usuario_id = auth.uid() or fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao']))
with check (usuario_id = auth.uid() or fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao']));
drop policy if exists alunos_delete on public.alunos;
create policy alunos_delete on public.alunos for delete to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']));

drop policy if exists dispositivos_select on public.dispositivos_acesso;
create policy dispositivos_select on public.dispositivos_acesso for select to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao']));
drop policy if exists dispositivos_write on public.dispositivos_acesso;
create policy dispositivos_write on public.dispositivos_acesso for all to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']))
with check (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']));

drop policy if exists comandos_select on public.comandos_acesso;
create policy comandos_select on public.comandos_acesso for select to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao']));
drop policy if exists comandos_insert on public.comandos_acesso;
create policy comandos_insert on public.comandos_acesso for insert to authenticated
with check (solicitado_por = auth.uid() and fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao']));
drop policy if exists comandos_cancelar on public.comandos_acesso;
create policy comandos_cancelar on public.comandos_acesso for update to authenticated
using (solicitado_por = auth.uid() and status = 'pendente' and fusion_private.fusion_usuario_e_membro(academia_id))
with check (solicitado_por = auth.uid() and status = 'cancelado' and fusion_private.fusion_usuario_e_membro(academia_id));

drop policy if exists eventos_select_equipe on public.eventos_acesso;
create policy eventos_select_equipe on public.eventos_acesso for select to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente','recepcao','professor']));
drop policy if exists eventos_select_aluno on public.eventos_acesso;
create policy eventos_select_aluno on public.eventos_acesso for select to authenticated
using (exists (select 1 from public.alunos a where a.id = aluno_id and a.usuario_id = auth.uid()));

drop policy if exists sync_eventos_select_equipe on public.sync_eventos;
create policy sync_eventos_select_equipe on public.sync_eventos for select to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente']));
drop policy if exists sync_eventos_insert_equipe on public.sync_eventos;
create policy sync_eventos_insert_equipe on public.sync_eventos for insert to authenticated
with check (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador','gerente']));
drop policy if exists sync_eventos_update_admin on public.sync_eventos;
create policy sync_eventos_update_admin on public.sync_eventos for update to authenticated
using (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']))
with check (fusion_private.fusion_usuario_tem_papel(academia_id, array['proprietario','administrador']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fusion-publico', 'fusion-publico', true, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('fusion-privado', 'fusion-privado', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_publico_leitura on storage.objects;
drop policy if exists storage_publico_admin_escrita on storage.objects;
create policy storage_publico_admin_escrita on storage.objects for all to authenticated
using (
  bucket_id = 'fusion-publico'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and fusion_private.fusion_usuario_tem_papel(((storage.foldername(name))[1])::uuid, array['proprietario','administrador'])
)
with check (
  bucket_id = 'fusion-publico'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and fusion_private.fusion_usuario_tem_papel(((storage.foldername(name))[1])::uuid, array['proprietario','administrador'])
);

drop policy if exists storage_privado_membros on storage.objects;
create policy storage_privado_membros on storage.objects for select to authenticated
using (
  bucket_id = 'fusion-privado'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and fusion_private.fusion_usuario_e_membro(((storage.foldername(name))[1])::uuid)
);
drop policy if exists storage_privado_equipe_escrita on storage.objects;
create policy storage_privado_equipe_escrita on storage.objects for insert to authenticated
with check (
  bucket_id = 'fusion-privado'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and fusion_private.fusion_usuario_tem_papel(((storage.foldername(name))[1])::uuid, array['proprietario','administrador','gerente','recepcao','professor'])
);
drop policy if exists storage_privado_equipe_update on storage.objects;
create policy storage_privado_equipe_update on storage.objects for update to authenticated
using (
  bucket_id = 'fusion-privado'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and fusion_private.fusion_usuario_tem_papel(((storage.foldername(name))[1])::uuid, array['proprietario','administrador','gerente','recepcao','professor'])
)
with check (
  bucket_id = 'fusion-privado'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and fusion_private.fusion_usuario_tem_papel(((storage.foldername(name))[1])::uuid, array['proprietario','administrador','gerente','recepcao','professor'])
);
drop policy if exists storage_privado_admin_delete on storage.objects;
create policy storage_privado_admin_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'fusion-privado'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and fusion_private.fusion_usuario_tem_papel(((storage.foldername(name))[1])::uuid, array['proprietario','administrador'])
);

commit;
