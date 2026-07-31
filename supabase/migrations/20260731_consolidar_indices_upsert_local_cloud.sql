begin;

drop index if exists public.alunos_academia_legacy_id_uidx;

create unique index if not exists alunos_academia_legacy_id_key
  on public.alunos(academia_id, legacy_id);

drop index if exists public.professores_academia_legacy_id_uidx;
create unique index professores_academia_legacy_id_uidx
  on public.professores(academia_id, legacy_id);

commit;
