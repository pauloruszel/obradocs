alter table obras drop constraint obras_created_by_fkey;
alter table obras alter column created_by drop not null;
alter table obras
    add constraint obras_created_by_fkey
    foreign key (created_by) references usuarios(id) on delete set null;

alter table obras drop constraint obras_deleted_by_fkey;
alter table obras
    add constraint obras_deleted_by_fkey
    foreign key (deleted_by) references usuarios(id) on delete set null;

create table storage_deletion_queue (
    id uuid primary key,
    storage_path varchar(700) not null unique,
    attempts integer not null default 0,
    last_attempt_at timestamptz,
    last_error varchar(1000),
    created_at timestamptz not null default now()
);

create index idx_storage_deletion_queue_created
    on storage_deletion_queue(created_at);
