create table documentos (
    id uuid primary key,
    obra_id uuid not null references obras(id) on delete cascade,
    tipo varchar(30) not null,
    nome varchar(255) not null,
    revisao_atual integer not null default 1,
    created_at timestamptz not null default now(),
    constraint ck_documentos_tipo
        check (tipo in ('ORCAMENTO', 'NOTA_FISCAL', 'PROJETO', 'FOTO')),
    constraint ck_documentos_revisao_atual
        check (revisao_atual > 0)
);

insert into documentos (id, obra_id, tipo, nome, revisao_atual, created_at)
select id, obra_id, tipo, nome_original, 1, created_at
from arquivos;

alter table arquivos
    add column documento_id uuid,
    add column revisao integer;

update arquivos
set documento_id = id,
    revisao = 1;

alter table arquivos
    alter column documento_id set not null,
    alter column revisao set not null,
    add constraint fk_arquivos_documento
        foreign key (documento_id) references documentos(id) on delete cascade,
    add constraint uk_arquivos_documento_revisao
        unique (documento_id, revisao),
    add constraint ck_arquivos_revisao
        check (revisao > 0);

create index idx_documentos_obra_tipo
    on documentos (obra_id, tipo, created_at desc);

create index idx_arquivos_documento_revisao
    on arquivos (documento_id, revisao desc);
