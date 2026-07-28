create table refresh_tokens (
    id uuid primary key,
    usuario_id uuid not null references usuarios(id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create table password_reset_tokens (
    id uuid primary key,
    usuario_id uuid not null references usuarios(id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_refresh_tokens_usuario on refresh_tokens(usuario_id);
create index idx_password_reset_tokens_usuario on password_reset_tokens(usuario_id);
