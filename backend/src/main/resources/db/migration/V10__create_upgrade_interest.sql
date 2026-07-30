create table upgrade_interest (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references usuarios(id) on delete cascade,
    nome varchar(150) not null,
    email varchar(320) not null,
    telefone varchar(30),
    empresa varchar(150),
    status varchar(20) not null default 'PENDING',
    origem varchar(40) not null default 'PLANO_PROFISSIONAL',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_upgrade_interest_status check (status in ('PENDING', 'CONTACTED', 'CONVERTED', 'CANCELLED')),
    constraint uk_upgrade_interest_usuario unique (usuario_id)
);

create index idx_upgrade_interest_status_created_at
    on upgrade_interest (status, created_at desc);
