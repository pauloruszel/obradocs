# Obradocs

Aplicativo React Native/Expo para gestao colaborativa de obras, com backend Spring Boot, PostgreSQL e storage S3 compativel.

## Estrutura

- `src`: aplicativo Android, iOS e Web
- `backend`: API REST Java 21/Spring Boot
- `backend/src/main/resources/db/migration`: migracoes PostgreSQL com Flyway

## Aplicativo

Crie `.env` a partir de `.env.example` e informe a URL publica da API:

```env
EXPO_PUBLIC_API_URL=https://sua-api.up.railway.app
```

Para desenvolvimento local:

```bash
npm install
npm start
```

Em um emulador Android, use uma URL acessivel pelo dispositivo, como `http://10.0.2.2:8080`.

Os access e refresh tokens ficam no SecureStore no Android/iOS. No Web, a sessao usa AsyncStorage.

## Backend

Consulte [`backend/README.md`](backend/README.md) para executar a API, configurar PostgreSQL, storage e SMTP.

## Migracao

Consulte [`docs/migration.md`](docs/migration.md) para exportar usuarios, obras,
permissoes, arquivos e historico do Supabase, importar no Railway e validar a
consistencia antes de desligar o ambiente antigo.

## Regras preservadas

- OWNER, EDITOR e VIEWER controlam leitura, edicao e permissoes.
- Criacao e entrada por codigo continuam transacionais.
- Exclusao de obra permanece logica.
- Upload aceita PDF e JPEG de ate 10 MB.
- Downloads usam URLs temporarias.
- Criacao, entrada, upload, renomeacoes e exclusao permanecem no historico.
