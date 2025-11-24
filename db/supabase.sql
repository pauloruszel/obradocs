-- Criacao de schema base (executar no SQL Editor do Supabase)
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text unique null,
  created_at timestamp with time zone default now()
);

-- Trigger para criar profile automaticamente ao registrar usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Garante que o criador sempre receba permissao OWNER ao inserir obra
create or replace function public.grant_owner_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.permissoes (obra_id, user_id, papel)
  values (new.id, coalesce(new.created_by, auth.uid()), 'OWNER')
  on conflict (obra_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists obras_owner_trigger on public.obras;
create trigger obras_owner_trigger
  after insert on public.obras
  for each row execute procedure public.grant_owner_on_insert();

create table if not exists public.obras (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  codigo_compartilhamento text unique not null,
  created_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamp with time zone,
  deleted_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Garante colunas de soft delete (idempotente)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'obras' and column_name = 'deleted_at'
  ) then
    alter table public.obras add column deleted_at timestamp with time zone;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'obras' and column_name = 'deleted_by'
  ) then
    alter table public.obras add column deleted_by uuid references public.profiles(id) on delete set null;
  end if;
end $$;

create table if not exists public.permissoes (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  papel text not null check (papel in ('OWNER','EDITOR','VIEWER')),
  created_at timestamp with time zone default now(),
  unique(obra_id, user_id)
);

create table if not exists public.arquivos (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  tipo text not null check (tipo in ('ORCAMENTO','NOTA_FISCAL','PROJETO','FOTO')),
  nome_original text not null,
  storage_path text not null,
  enviado_por uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table if not exists public.historico (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  acao text not null,
  detalhes jsonb,
  created_at timestamp with time zone default now()
);

-- Bucket para arquivos
insert into storage.buckets (id, name, public)
values ('obras-files', 'obras-files', false)
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.obras enable row level security;
alter table public.permissoes enable row level security;
alter table public.arquivos enable row level security;
alter table public.historico enable row level security;

-- Helpers antigos removidos; logica inline para evitar recursao em RLS
drop function if exists public.usuario_tem_acesso(uuid);
drop function if exists public.usuario_e_owner(uuid);
drop function if exists public.usuario_pode_editar(uuid);

-- Soft delete seguro para obras (OWNER/EDITOR), com checagem inline
drop function if exists public.soft_delete_obra(uuid);
create or replace function public.soft_delete_obra(p_obra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado' using errcode = '28P01';
  end if;

  if not exists (
    select 1
    from public.permissoes p
    join public.obras o on o.id = p.obra_id
    where p.obra_id = p_obra_id
      and p.user_id = auth.uid()
      and p.papel in ('OWNER','EDITOR')
      and o.deleted_at is null
  ) then
    raise exception 'Acesso negado';
  end if;

  update public.obras
  set deleted_at = now(),
      deleted_by = auth.uid()
  where id = p_obra_id;

  insert into public.historico (obra_id, user_id, acao, detalhes)
  values (p_obra_id, auth.uid(), 'EXCLUIR_OBRA', jsonb_build_object('soft_delete', true));
end;
$$;
grant execute on function public.soft_delete_obra(uuid) to authenticated;
grant execute on function public.soft_delete_obra(uuid) to service_role;

-- Policies profiles (idempotente)
drop policy if exists "profiles select self" on public.profiles;
drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles select self" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles insert self" on public.profiles
  for insert with check (auth.uid() = id);

-- Policies obras
drop policy if exists "obras select with perm" on public.obras;
drop policy if exists "obras insert owner" on public.obras;
drop policy if exists "obras update owner" on public.obras;
create policy "obras select with perm" on public.obras
  for select using (
    deleted_at is null
    and exists(
      select 1 from public.permissoes p
      where p.obra_id = id and p.user_id = auth.uid()
    )
  );
create policy "obras insert owner" on public.obras
  for insert with check (
    auth.uid() = created_by
    and created_by is not null
  );
create policy "obras update owner" on public.obras
  for update using (
    deleted_at is null
    and exists(
      select 1 from public.permissoes p
      where p.obra_id = id and p.user_id = auth.uid() and p.papel in ('OWNER','EDITOR')
    )
  )
  with check (
    deleted_at is null
    and exists(
      select 1 from public.permissoes p
      where p.obra_id = id and p.user_id = auth.uid() and p.papel in ('OWNER','EDITOR')
    )
  );

-- Policies permissoes
drop policy if exists "permissoes select com acesso" on public.permissoes;
drop policy if exists "permissoes insert owner" on public.permissoes;
drop policy if exists "permissoes update owner" on public.permissoes;
drop policy if exists "permissoes delete owner" on public.permissoes;
create policy "permissoes select com acesso" on public.permissoes
  for select using (user_id = auth.uid());
create policy "permissoes insert owner" on public.permissoes
  for insert with check (
    exists(select 1 from public.obras o where o.id = obra_id and o.created_by = auth.uid())
    or exists(
      select 1 from public.permissoes p
      where p.obra_id = obra_id and p.user_id = auth.uid() and p.papel = 'OWNER'
    )
  );
create policy "permissoes update owner" on public.permissoes
  for update using (
    exists(
      select 1 from public.permissoes p
      where p.obra_id = obra_id and p.user_id = auth.uid() and p.papel = 'OWNER'
    )
  );
create policy "permissoes delete owner" on public.permissoes
  for delete using (
    exists(
      select 1 from public.permissoes p
      where p.obra_id = obra_id and p.user_id = auth.uid() and p.papel = 'OWNER'
    )
  );

-- Policies arquivos
drop policy if exists "arquivos select com acesso" on public.arquivos;
drop policy if exists "arquivos insert editor" on public.arquivos;
drop policy if exists "arquivos update editor" on public.arquivos;
create policy "arquivos select com acesso" on public.arquivos
  for select using (
    exists(
      select 1
      from public.permissoes p
      join public.obras o on o.id = p.obra_id
      where p.obra_id = obra_id
        and p.user_id = auth.uid()
        and o.deleted_at is null
    )
  );
create policy "arquivos insert editor" on public.arquivos
  for insert with check (
    exists(
      select 1
      from public.permissoes p
      join public.obras o on o.id = p.obra_id
      where p.obra_id = obra_id
        and p.user_id = auth.uid()
        and p.papel in ('OWNER','EDITOR')
        and o.deleted_at is null
    )
  );
create policy "arquivos update editor" on public.arquivos
  for update using (
    exists(
      select 1
      from public.permissoes p
      join public.obras o on o.id = p.obra_id
      where p.obra_id = obra_id
        and p.user_id = auth.uid()
        and p.papel in ('OWNER','EDITOR')
        and o.deleted_at is null
    )
  )
  with check (
    exists(
      select 1
      from public.permissoes p
      join public.obras o on o.id = p.obra_id
      where p.obra_id = obra_id
        and p.user_id = auth.uid()
        and p.papel in ('OWNER','EDITOR')
        and o.deleted_at is null
    )
  );

-- Policies historico
drop policy if exists "historico select com acesso" on public.historico;
drop policy if exists "historico insert com acesso" on public.historico;
create policy "historico select com acesso" on public.historico
  for select using (
    exists(
      select 1
      from public.permissoes p
      join public.obras o on o.id = p.obra_id
      where p.obra_id = obra_id
        and p.user_id = auth.uid()
        and o.deleted_at is null
    )
  );
create policy "historico insert com acesso" on public.historico
  for insert with check (
    exists(
      select 1
      from public.permissoes p
      join public.obras o on o.id = p.obra_id
      where p.obra_id = obra_id
        and p.user_id = auth.uid()
        and o.deleted_at is null
    )
  );

-- Storage policies
drop policy if exists "storage read com acesso" on storage.objects;
drop policy if exists "storage write editor" on storage.objects;
create policy "storage read com acesso"
on storage.objects for select
using (
  bucket_id = 'obras-files'
  and exists(
    select 1
    from public.permissoes p
    join public.obras o on o.id = p.obra_id
    where p.obra_id = (string_to_array(name, '/'))[1]::uuid
      and p.user_id = auth.uid()
      and o.deleted_at is null
  )
);

create policy "storage write editor"
on storage.objects for insert
with check (
  bucket_id = 'obras-files'
  and exists(
    select 1
    from public.permissoes p
    join public.obras o on o.id = p.obra_id
    where p.obra_id = (string_to_array(name, '/'))[1]::uuid
      and p.user_id = auth.uid()
      and p.papel in ('OWNER','EDITOR')
      and o.deleted_at is null
  )
);
