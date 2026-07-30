create table admin_plan_audit (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid not null references usuarios(id),
    usuario_id uuid not null references usuarios(id),
    upgrade_interest_id uuid references upgrade_interest(id) on delete set null,
    action varchar(30) not null,
    previous_status varchar(20),
    new_status varchar(20) not null,
    created_at timestamptz not null default now(),
    constraint ck_admin_plan_audit_action check (action in ('LEAD_STATUS_CHANGED', 'PRO_ACTIVATED'))
);

create index idx_admin_plan_audit_usuario_created
    on admin_plan_audit (usuario_id, created_at desc);
