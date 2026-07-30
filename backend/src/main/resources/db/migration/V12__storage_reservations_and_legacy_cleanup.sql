insert into storage_deletion_queue (id, storage_path)
select gen_random_uuid(), a.storage_path
from arquivos a
join obras o on o.id = a.obra_id
where o.deleted_at is not null
on conflict (storage_path) do nothing;

delete from obras where deleted_at is not null;

create table storage_upload_reservations (
    id uuid primary key,
    proprietario_id uuid not null references usuarios(id) on delete cascade,
    obra_id uuid not null references obras(id) on delete cascade,
    tamanho_bytes bigint not null check (tamanho_bytes > 0),
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index idx_storage_upload_reservations_owner_expiry
    on storage_upload_reservations (proprietario_id, expires_at);
