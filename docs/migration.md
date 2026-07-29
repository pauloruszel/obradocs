# Migracao do Supabase

Esta rotina faz uma migracao unica para PostgreSQL e storage S3 compativel,
preservando UUIDs, datas, papeis, soft delete, historico e caminhos dos arquivos.
Ela nao importa hashes de senha do Supabase. Todo usuario importado precisa
redefinir a senha antes do primeiro login.

## Antes de iniciar

1. Faca backup do Supabase e do PostgreSQL de destino.
2. Interrompa cadastros, uploads e alteracoes no aplicativo antigo.
3. Suba a API nova uma vez para o Flyway aplicar as migracoes ate `V5`.
4. Configure o SMTP da API e confirme o fluxo de recuperacao de senha.
5. Use um PostgreSQL e um bucket de destino vazios.

O `service_role` do Supabase ignora RLS. Use a chave somente no terminal local,
nunca no aplicativo, Railway, Git ou arquivo versionado.

## 1. Exportar

No PowerShell, dentro de `backend`:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:SUPABASE_URL = "https://SEU-PROJETO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "SUA-CHAVE-SERVICE-ROLE"
$env:SUPABASE_BUCKET = "obras-files"
$env:MIGRATION_DIR = "C:\backup\obradocs-migration"

.\mvnw.cmd compile exec:java "-Dexec.args=export"
```

A exportacao cria:

```text
obradocs-migration/
|-- manifest.json
`-- files/
```

O manifesto contem usuarios, obras, permissoes, metadados dos arquivos,
historico, tamanhos e SHA-256. O diretorio pode conter dados pessoais e
documentos privados; mantenha-o fora do repositorio.

## 2. Importar

Ainda no terminal local, remova as variaveis de origem e configure o destino:

```powershell
Remove-Item Env:SUPABASE_URL, Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_BUCKET

$env:PGHOST = "HOST-RAILWAY"
$env:PGPORT = "5432"
$env:PGDATABASE = "railway"
$env:PGUSER = "postgres"
$env:PGPASSWORD = "SENHA"

$env:AWS_ENDPOINT_URL = "ENDPOINT-DO-BUCKET"
$env:AWS_ACCESS_KEY_ID = "ACCESS-KEY"
$env:AWS_SECRET_ACCESS_KEY = "SECRET-KEY"
$env:AWS_S3_BUCKET_NAME = "BUCKET"
$env:AWS_DEFAULT_REGION = "auto"
$env:AWS_S3_URL_STYLE = "virtual"

.\mvnw.cmd compile exec:java "-Dexec.args=import"
```

Para uma URL JDBC pronta, defina `JDBC_DATABASE_URL` em vez de
`PGHOST`, `PGPORT` e `PGDATABASE`.

A carga dos registros ocorre em uma transacao. O upload dos objetos e
idempotente pelo caminho, tamanho, tipo e SHA-256. Se o banco ja contiver dados,
a ferramenta so continua quando o conteudo for exatamente o mesmo manifesto.

## 3. Validar

Execute com as mesmas variaveis do destino:

```powershell
.\mvnw.cmd compile exec:java "-Dexec.args=validate"
```

A validacao compara:

- contagem e conteudo de usuarios, obras, permissoes, arquivos e historico;
- UUIDs, relacionamentos, papeis, datas e soft delete;
- ao menos um `OWNER` por obra;
- tamanho, tipo e SHA-256 de cada arquivo local e no storage;
- marcador de troca obrigatoria de senha em todos os usuarios importados.

Se qualquer verificacao falhar, nao desative o Supabase.

## 4. Encerrar

1. Solicite a redefinicao de senha para um usuario migrado.
2. Confirme login, listagem de obras, historico e download de um arquivo.
3. Troque o aplicativo para a URL da API Railway.
4. Monitore a nova aplicacao.
5. Somente depois da validacao, remova o projeto Supabase.
6. Apague a chave `service_role` do terminal e proteja ou elimine o backup local.

O aplicativo e a API nao usam SDK nem variaveis do Supabase. As tres variaveis
`SUPABASE_*` acima existem somente durante a exportacao local.

## Projeto Supabase pausado com backup somente de Storage

Quando estiver disponivel apenas o ZIP de Storage, gere um inventario offline:

```powershell
$env:STORAGE_BACKUP_DIR = "C:\backup\vemopbgkbhlyvipkwqxc"
$env:MIGRATION_DIR = "C:\backup\obradocs-recovery"

.\mvnw.cmd compile exec:java "-Dexec.args=inventory"
```

O arquivo `recovery-inventory.json` preserva os `obra_id`, caminhos, nomes,
datas aproximadas, tamanhos e SHA-256. Fotos e PDFs com categoria no nome sao
classificados automaticamente.

Um backup de Storage nao contem usuarios, nomes ou codigos das obras,
permissoes, metadados das tabelas nem historico. Esses dados nao podem ser
reconstruidos com fidelidade a partir dos objetos. O inventario marca os campos
ausentes e os tipos que precisam de confirmacao; nao execute a importacao ate
esses campos serem revisados ou um backup do banco ser localizado.

Se os dados das tabelas forem exportados em JSON, combine-os com o backup de
Storage:

```powershell
$env:SUPABASE_DATA_FILE = "C:\backup\supabase-data.json"
$env:STORAGE_BACKUP_DIR = "C:\backup\vemopbgkbhlyvipkwqxc"
$env:MIGRATION_DIR = "C:\backup\obradocs-recovery"

.\mvnw.cmd compile exec:java "-Dexec.args=recover"
```

A recuperacao cria `manifest.json`, `recovery-report.json` e copia para `files/`
somente objetos referenciados por `public.arquivos`. Objetos orfaos permanecem no
backup original e sao listados no relatorio. Quando o criador de uma obra perdeu
o papel `OWNER` no banco antigo, a ferramenta restaura esse papel usando
`obras.created_by`.
