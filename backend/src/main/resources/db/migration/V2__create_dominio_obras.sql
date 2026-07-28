create table obras (
    id uuid primary key,
    nome varchar(200) not null,
    codigo_compartilhamento varchar(9) not null unique,
    created_by uuid not null references usuarios(id),
    deleted_at timestamptz,
    deleted_by uuid references usuarios(id),
    created_at timestamptz not null default now(),
    constraint ck_obras_codigo check (codigo_compartilhamento ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}$')
);

create table permissoes (
    id uuid primary key,
    obra_id uuid not null references obras(id) on delete cascade,
    user_id uuid not null references usuarios(id) on delete cascade,
    papel varchar(20) not null,
    created_at timestamptz not null default now(),
    constraint uk_permissoes_obra_usuario unique (obra_id, user_id),
    constraint ck_permissoes_papel check (papel in ('OWNER', 'EDITOR', 'VIEWER'))
);

create table historico (
    id uuid primary key,
    obra_id uuid not null references obras(id) on delete cascade,
    user_id uuid references usuarios(id) on delete set null,
    acao varchar(50) not null,
    detalhes jsonb,
    created_at timestamptz not null default now()
);

create index idx_obras_created_by on obras(created_by);
create index idx_permissoes_user_id on permissoes(user_id);
create index idx_permissoes_obra_id on permissoes(obra_id);
create index idx_historico_obra_created on historico(obra_id, created_at desc);
