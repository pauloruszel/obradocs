alter table obras
    add column template_codigo varchar(30) not null default 'GERAL',
    add constraint ck_obras_template_codigo
        check (template_codigo in ('GERAL', 'ARQUITETURA', 'INTERIORES', 'ENGENHARIA', 'REFORMA'));

create table categorias_obra (
    id uuid primary key,
    obra_id uuid not null references obras(id) on delete cascade,
    nome varchar(80) not null,
    tipo varchar(30) not null,
    ordem integer not null,
    padrao boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_categorias_obra_tipo
        check (tipo in ('ORCAMENTO', 'NOTA_FISCAL', 'PROJETO', 'FOTO')),
    constraint ck_categorias_obra_ordem check (ordem >= 0)
);

create unique index uk_categorias_obra_nome
    on categorias_obra (obra_id, lower(nome));

insert into categorias_obra (id, obra_id, nome, tipo, ordem, padrao)
select gen_random_uuid(), o.id, categoria.nome, categoria.tipo, categoria.ordem, true
from obras o
cross join (
    values
        ('Orçamento', 'ORCAMENTO', 0),
        ('Nota fiscal', 'NOTA_FISCAL', 1),
        ('Projeto', 'PROJETO', 2),
        ('Foto', 'FOTO', 3)
) as categoria(nome, tipo, ordem);

alter table documentos add column categoria_id uuid;

update documentos d
set categoria_id = c.id
from categorias_obra c
where c.obra_id = d.obra_id
  and c.tipo = d.tipo
  and c.padrao = true;

alter table documentos
    alter column categoria_id set not null,
    add constraint fk_documentos_categoria
        foreign key (categoria_id) references categorias_obra(id);

create index idx_categorias_obra_ordem
    on categorias_obra (obra_id, ordem);

create index idx_documentos_categoria
    on documentos (categoria_id, created_at desc);
