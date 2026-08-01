alter table documentos
    add column revisao_aprovada integer,
    add constraint ck_documentos_revisao_aprovada
        check (revisao_aprovada is null or revisao_aprovada between 1 and revisao_atual);

alter table arquivos
    add column aprovacao_status varchar(30),
    add column aprovacao_solicitada_por uuid references usuarios(id),
    add column aprovacao_solicitada_at timestamptz,
    add column aprovacao_decidida_por uuid references usuarios(id),
    add column aprovacao_decidida_at timestamptz,
    add column aprovacao_comentario varchar(1000),
    add constraint ck_arquivos_aprovacao_status
        check (aprovacao_status is null or aprovacao_status in ('PENDING', 'APPROVED', 'CHANGES_REQUESTED')),
    add constraint ck_arquivos_aprovacao_solicitada
        check (
            (aprovacao_status is null and aprovacao_solicitada_por is null and aprovacao_solicitada_at is null)
            or
            (aprovacao_status is not null and aprovacao_solicitada_por is not null and aprovacao_solicitada_at is not null)
        ),
    add constraint ck_arquivos_aprovacao_decidida
        check (
            (aprovacao_status in ('APPROVED', 'CHANGES_REQUESTED') and aprovacao_decidida_por is not null and aprovacao_decidida_at is not null)
            or
            (aprovacao_status is null or aprovacao_status = 'PENDING')
                and aprovacao_decidida_por is null
                and aprovacao_decidida_at is null
                and aprovacao_comentario is null
        ),
    add constraint ck_arquivos_alteracoes_comentario
        check (aprovacao_status <> 'CHANGES_REQUESTED' or length(trim(aprovacao_comentario)) > 0);

create index idx_arquivos_aprovacao_pendente
    on arquivos (obra_id, created_at desc)
    where aprovacao_status = 'PENDING';
