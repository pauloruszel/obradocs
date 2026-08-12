alter table arquivos
    drop constraint ck_arquivos_tamanho,
    add constraint ck_arquivos_tamanho
        check (tamanho_bytes > 0 and tamanho_bytes <= 104857600);

alter table arquivos
    drop constraint ck_arquivos_content_type,
    add constraint ck_arquivos_content_type
        check (content_type in (
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'image/vnd.dwg',
            'image/vnd.dxf'
        ));
