alter table documentos
    add column ambiente varchar(80);

create index idx_documentos_ambiente
    on documentos (obra_id, lower(ambiente))
    where ambiente is not null;

create table modelos_categoria (
    id uuid primary key,
    usuario_id uuid not null references usuarios(id) on delete cascade,
    nome varchar(80) not null,
    categorias jsonb not null,
    created_at timestamptz not null default now(),
    constraint ck_modelos_categoria_lista
        check (jsonb_typeof(categorias) = 'array')
);

create unique index uk_modelos_categoria_usuario_nome
    on modelos_categoria (usuario_id, lower(nome));
