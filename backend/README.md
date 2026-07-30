# Obradocs API

Backend Spring Boot 4.1 e Java 21.

## Ambiente local

1. Inicie o PostgreSQL: `docker compose up -d`.
2. Defina `JWT_SECRET` com pelo menos 32 bytes.
3. Execute: `.\mvnw.cmd spring-boot:run`.

O Flyway cria as tabelas de usuários, domínio, arquivos e tokens automaticamente.
Usuários importados pela rotina de migração ficam bloqueados até redefinirem a senha.

Configure um bucket S3 compatível pelas variáveis do `.env.example`. Para desenvolvimento local, pode ser usado MinIO; no Railway, conecte um Storage Bucket ao serviço e injete as credenciais `AWS_*`.

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/accept-terms`
- `DELETE /auth/account`
- `GET /auth/me` com `Authorization: Bearer <token>`
- `GET /v1/obras`
- `POST /v1/obras`
- `GET /v1/obras/{obraId}`
- `PATCH /v1/obras/{obraId}`
- `DELETE /v1/obras/{obraId}`
- `POST /v1/obras/entrar`
- `GET /v1/obras/{obraId}/permissoes`
- `POST /v1/obras/{obraId}/permissoes`
- `PATCH /v1/obras/{obraId}/permissoes/{permissaoId}`
- `DELETE /v1/obras/{obraId}/permissoes/{permissaoId}`
- `GET /v1/obras/{obraId}/historico`
- `GET /v1/obras/{obraId}/arquivos?tipo=FOTO`
- `POST /v1/obras/{obraId}/arquivos` como `multipart/form-data`, com `tipo` e `arquivo`
- `GET /v1/arquivos/{arquivoId}`
- `PATCH /v1/arquivos/{arquivoId}`
- `GET /v1/arquivos/{arquivoId}/download-url`
- `POST /v1/reports`
- `GET /actuator/health`

Uploads aceitam PDF e JPEG de até 10 MB. O backend verifica permissão, extensão, MIME e assinatura binária antes de armazenar e gera URLs privadas com validade configurável por `STORAGE_DOWNLOAD_URL_TTL`.

## Railway

Crie um PostgreSQL, um Storage Bucket e um serviço usando `backend/Dockerfile`. Referencie no serviço as variáveis `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD` fornecidas pelo PostgreSQL, defina `JWT_SECRET` e injete as credenciais do bucket como `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_DEFAULT_REGION` e `AWS_S3_URL_STYLE`.

Configure `PASSWORD_RESET_URL=https://seu-backend/reset-password.html`, `PASSWORD_RESET_FROM` e `BREVO_API_KEY` para recuperação de senha pela API HTTPS da Brevo. Defina também `ADMIN_EMAILS` com os e-mails administrativos separados por vírgula; sem essa variável, o painel administrativo permanece bloqueado.

## Migracao

A ferramenta `br.com.obradocs.migration.MigrationTool` exporta o Supabase por
HTTP administrativo e importa os dados no PostgreSQL e storage configurados.
O procedimento completo e os cuidados de corte estão em
[`../docs/migration.md`](../docs/migration.md).
