create table planos (
    id uuid primary key,
    codigo varchar(20) not null unique,
    nome varchar(100) not null,
    preco_centavos integer not null check (preco_centavos >= 0),
    moeda varchar(3) not null,
    limite_obras integer null check (limite_obras is null or limite_obras > 0),
    limite_armazenamento_bytes bigint not null check (limite_armazenamento_bytes > 0),
    limite_colaboradores_por_obra integer null check (
        limite_colaboradores_por_obra is null or limite_colaboradores_por_obra > 0
    ),
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_planos_codigo check (codigo in ('FREE', 'PRO')),
    constraint ck_planos_moeda check (moeda = 'BRL')
);

create table assinaturas (
    id uuid primary key,
    usuario_id uuid not null references usuarios(id) on delete cascade,
    plano_id uuid not null references planos(id),
    status varchar(20) not null,
    preco_centavos_contratado integer not null check (preco_centavos_contratado >= 0),
    fundador boolean not null default false,
    inicio_em timestamptz not null,
    fim_em timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_assinaturas_status check (status in ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED')),
    constraint ck_assinaturas_periodo check (fim_em is null or fim_em >= inicio_em)
);

create unique index uk_assinaturas_usuario_ativa
    on assinaturas(usuario_id)
    where status in ('ACTIVE', 'TRIALING');

create index idx_assinaturas_usuario on assinaturas(usuario_id);
create index idx_assinaturas_plano on assinaturas(plano_id);

insert into planos (
    id, codigo, nome, preco_centavos, moeda, limite_obras,
    limite_armazenamento_bytes, limite_colaboradores_por_obra, ativo
) values
    (
        '10000000-0000-0000-0000-000000000001',
        'FREE', 'Gratuito', 0, 'BRL', 1,
        524288000, 1, true
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'PRO', 'Profissional', 2490, 'BRL', null,
        5368709120, null, true
    );

insert into assinaturas (
    id, usuario_id, plano_id, status, preco_centavos_contratado,
    fundador, inicio_em
)
select
    gen_random_uuid(),
    u.id,
    '10000000-0000-0000-0000-000000000001',
    'ACTIVE',
    0,
    false,
    now()
from usuarios u
where not exists (
    select 1
    from assinaturas a
    where a.usuario_id = u.id
      and a.status in ('ACTIVE', 'TRIALING')
);
