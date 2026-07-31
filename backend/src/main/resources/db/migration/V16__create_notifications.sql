create table notificacoes (
    id uuid primary key,
    usuario_id uuid not null references usuarios(id) on delete cascade,
    historico_id uuid not null references historico(id) on delete cascade,
    lida_at timestamptz,
    created_at timestamptz not null default now(),
    constraint uk_notificacoes_usuario_historico unique (usuario_id, historico_id)
);

create index idx_notificacoes_usuario_created
    on notificacoes (usuario_id, created_at desc);

create index idx_notificacoes_usuario_nao_lidas
    on notificacoes (usuario_id, created_at desc)
    where lida_at is null;
