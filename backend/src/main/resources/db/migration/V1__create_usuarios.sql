create table usuarios (
    id uuid primary key,
    nome varchar(150) not null,
    email varchar(320) not null unique,
    senha_hash varchar(255) not null,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_usuarios_email_normalizado check (email = lower(email))
);
