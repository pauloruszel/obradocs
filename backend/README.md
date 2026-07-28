# Obradocs API

Backend Spring Boot 4.1 e Java 21.

## Ambiente local

1. Inicie o PostgreSQL: `docker compose up -d`.
2. Defina `JWT_SECRET` com pelo menos 32 bytes.
3. Execute: `.\mvnw.cmd spring-boot:run`.

O Flyway cria a tabela `usuarios` automaticamente.

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` com `Authorization: Bearer <token>`
- `GET /actuator/health`

## Railway

Crie um PostgreSQL e um servico usando `backend/Dockerfile`. Referencie no servico as variaveis `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD` fornecidas pelo PostgreSQL e defina `JWT_SECRET`.
