alter table obras
    add column codigo_compartilhamento_ativo boolean not null default true,
    add column codigo_compartilhamento_expira_em timestamptz,
    add column codigo_compartilhamento_papel varchar(20) not null default 'VIEWER';

alter table obras
    add constraint ck_obras_codigo_papel
        check (codigo_compartilhamento_papel in ('EDITOR', 'VIEWER')),
    add constraint ck_obras_codigo_expiracao
        check (codigo_compartilhamento_expira_em is null or codigo_compartilhamento_ativo);
