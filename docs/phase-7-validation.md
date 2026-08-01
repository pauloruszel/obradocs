# Fase 7.6 - Validacao operacional

Use este roteiro em `staging`. Nao copie segredos para o documento nem execute
restauracao sobre o banco atual.

## Estado em 2026-08-01

Validado no codigo:

- frontend: tipos, lint, 18 testes e build web aprovados;
- backend: 56 testes aprovados com Java 21, PostgreSQL e Testcontainers;
- staging: `/actuator/health` respondeu `200` com `X-Request-ID` valido;
- endpoints legados foram mantidos durante a migracao para paginacao;
- endpoint de metricas possui teste de integracao para acesso administrativo e
  rejeicao de usuario comum.

Ainda exige evidencia operacional no Railway:

- referencias isoladas de banco e bucket;
- restauracao em recursos temporarios;
- busca de um erro real pelo `X-Request-ID`;
- teste do APK anterior;
- comparacao das metricas com SQL manual;
- auditoria dos logs de staging.

## Evidencias exigidas

| Criterio | Evidencia |
|---|---|
| Banco e bucket isolados | Captura das referencias de variaveis do ambiente `staging`, sem valores |
| Restauracao valida | Data, destino temporario, contagens e resultado do teste de download |
| `X-Request-ID` | Cabecalho recebido e busca do mesmo ID nos logs |
| Paginacao | Duas paginas consecutivas sem IDs repetidos |
| APK antigo | Versao testada e respostas `200` nos endpoints legados |
| Metricas | JSON administrativo comparado com SQL manual |
| Autorizacao administrativa | Usuario comum recebe `403` |
| Logs seguros | Busca sem e-mail, token, URL assinada ou nome de arquivo |

## 1. Isolamento do staging

No servico `obradocs-api` do ambiente `staging`, confirme:

- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD` referenciam o
  servico PostgreSQL do proprio ambiente;
- `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_S3_BUCKET_NAME` e `AWS_DEFAULT_REGION` referenciam o bucket do proprio
  ambiente;
- `PASSWORD_RESET_URL`, `INVITATION_URL` e `CORS_ALLOWED_ORIGINS` usam os
  dominios de staging;
- nenhum valor foi copiado das credenciais de producao.

Registre apenas nomes dos servicos e referencias. Nao registre valores.

## 2. Backup e restauracao

1. Crie um PostgreSQL temporario no ambiente de staging.
2. Gere um dump do PostgreSQL de staging com `pg_dump --format=custom`.
3. Restaure com `pg_restore --clean --if-exists --no-owner` no banco temporario.
4. Compare as contagens das tabelas `usuarios`, `obras`, `permissoes`,
   `arquivos`, `historico`, `obra_convites` e `notificacoes`.
5. Confirme que a tabela `flyway_schema_history` possui as mesmas migracoes.
6. Gere um inventario do bucket, copie uma amostra para um bucket temporario e
   valide o download e o tamanho do objeto.
7. Guarde data, resultado e responsavel. Depois, remova os recursos temporarios.

## 3. Request ID e localizacao de erro

```powershell
$response = Invoke-WebRequest `
  -Uri "https://obradocs-api-staging.up.railway.app/actuator/health" `
  -UseBasicParsing
$requestId = $response.Headers["X-Request-ID"]
$requestId
```

O valor deve existir. Envie esse valor em uma requisicao autenticada invalida e
confirme que a resposta o preserva:

```powershell
Invoke-WebRequest `
  -Uri "https://obradocs-api-staging.up.railway.app/v1/notificacoes/pagina?page=-1&size=20" `
  -Headers @{ Authorization = "Bearer TOKEN_DE_TESTE"; "X-Request-ID" = $requestId } `
  -SkipHttpErrorCheck
```

Busque o mesmo ID nos logs do Railway. O registro deve informar metodo, caminho,
status e duracao, sem corpo da requisicao ou dados pessoais.

## 4. Paginacao e APK antigo

Com um token de teste, consulte `page=0&size=2` e `page=1&size=2` em:

- `/v1/obras/{obraId}/arquivos/pagina`;
- `/v1/obras/{obraId}/historico/pagina`;
- `/v1/notificacoes/pagina`.

Confirme `items`, `page`, `size`, `total_items`, `total_pages` e `has_more`, sem
IDs repetidos entre paginas. O app atual carrega mais itens ao chegar ao fim.

Para compatibilidade, teste no APK anterior que estes endpoints continuam `200`:

- `/v1/obras/{obraId}/arquivos`;
- `/v1/obras/{obraId}/historico`;
- `/v1/notificacoes`.

Eles permanecem durante a migracao e so devem ser removidos apos encerrar o
suporte ao APK antigo.

## 5. Metricas e autorizacao

Consulte como administrador:

`GET /v1/admin/metricas?inicio=2026-07-01&fim=2026-07-31`

Compare com consultas SQL usando intervalo UTC semiaberto
`[2026-07-01 00:00:00+00, 2026-08-01 00:00:00+00)`:

```sql
select count(*) from obra_convites where created_at >= :inicio and created_at < :fim;
select count(*) from obra_convites where accepted_at >= :inicio and accepted_at < :fim;
select count(*) from arquivos where revisao > 1 and created_at >= :inicio and created_at < :fim;
select count(*) from arquivos where aprovacao_solicitada_at >= :inicio and aprovacao_solicitada_at < :fim;
select count(*) from arquivos where aprovacao_decidida_at >= :inicio and aprovacao_decidida_at < :fim;
select round(avg(extract(epoch from (aprovacao_decidida_at - aprovacao_solicitada_at)) / 3600.0), 2)
from arquivos where aprovacao_decidida_at >= :inicio and aprovacao_decidida_at < :fim;
select count(*) from arquivos where aprovacao_status = 'CHANGES_REQUESTED'
  and aprovacao_decidida_at >= :inicio and aprovacao_decidida_at < :fim;
select obra_id, count(distinct user_id) from historico
where created_at >= :inicio and created_at < :fim and user_id is not null group by obra_id;
```

Repita o endpoint com um usuario comum e confirme `403`.

## 6. Auditoria dos logs

No periodo do teste, procure por `@`, `token=`, `X-Amz-`, `.pdf`, `.jpg` e `.jpeg`.
O resultado nao deve conter e-mails, tokens, URLs assinadas ou nomes de arquivos.
IDs tecnicos, tipo da excecao, rota, status e duracao podem permanecer.

## Encerramento

Preencha a data e o resultado de cada item. A fase termina somente quando todos
os criterios possuem evidencia; testes automatizados nao substituem o teste real
de restauracao nem a verificacao das referencias do Railway.
