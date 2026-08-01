create table obra_convites (
    id uuid primary key,
    obra_id uuid not null references obras(id) on delete cascade,
    email varchar(320) not null,
    papel varchar(20) not null,
    token_hash varchar(64) not null unique,
    status varchar(20) not null,
    expires_at timestamptz not null,
    invited_by uuid not null references usuarios(id),
    accepted_by uuid references usuarios(id),
    created_at timestamptz not null default now(),
    accepted_at timestamptz,
    constraint ck_obra_convites_papel check (papel in ('EDITOR', 'VIEWER')),
    constraint ck_obra_convites_status check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'))
);

create unique index uk_obra_convites_pendente
    on obra_convites (obra_id, lower(email))
    where status = 'PENDING';

create index idx_obra_convites_obra_status
    on obra_convites (obra_id, status, created_at desc);
