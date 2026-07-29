create table content_reports (
    id uuid primary key,
    reporter_id uuid references usuarios(id) on delete set null,
    obra_id uuid references obras(id) on delete cascade,
    arquivo_id uuid references arquivos(id) on delete cascade,
    reason varchar(1000) not null,
    status varchar(20) not null default 'OPEN',
    created_at timestamptz not null default now(),
    constraint ck_content_reports_target check (
        (obra_id is not null and arquivo_id is null)
        or (obra_id is null and arquivo_id is not null)
    ),
    constraint ck_content_reports_status check (status in ('OPEN', 'REVIEWED', 'DISMISSED'))
);

create index idx_content_reports_status_created
    on content_reports(status, created_at);
