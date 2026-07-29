create table arquivos (
    id uuid primary key,
    obra_id uuid not null references obras(id) on delete cascade,
    tipo varchar(30) not null,
    nome_original varchar(255) not null,
    storage_path varchar(700) not null unique,
    content_type varchar(100) not null,
    tamanho_bytes bigint not null,
    enviado_por uuid references usuarios(id) on delete set null,
    created_at timestamptz not null default now(),
    constraint ck_arquivos_tipo
        check (tipo in ('ORCAMENTO', 'NOTA_FISCAL', 'PROJETO', 'FOTO')),
    constraint ck_arquivos_tamanho
        check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),
    constraint ck_arquivos_content_type
        check (content_type in ('application/pdf', 'image/jpeg'))
);

create index idx_arquivos_obra_tipo_created
    on arquivos(obra_id, tipo, created_at desc);
