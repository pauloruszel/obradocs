# Obradocs

Aplicativo React Native/Expo para gestão colaborativa de obras, com backend Spring Boot, PostgreSQL e storage S3 compatível.

## Estrutura

- `src`: aplicativo Android, iOS e Web
- `backend`: API REST Java 21/Spring Boot
- `backend/src/main/resources/db/migration`: migrações PostgreSQL com Flyway

## Aplicativo

Crie `.env` a partir de `.env.example` e informe a URL pública da API:

```env
EXPO_PUBLIC_API_URL=https://sua-api.up.railway.app
```

Para desenvolvimento local:

```bash
npm install
npm start
```

Em um emulador Android, use uma URL acessível pelo dispositivo, como `http://10.0.2.2:8080`.

Os access e refresh tokens ficam no SecureStore no Android/iOS. No Web, a sessão usa AsyncStorage.

## Backend

Consulte [`backend/README.md`](backend/README.md) para executar a API e configurar PostgreSQL, storage e a API de e-mail da Brevo.

## Migracao

Consulte [`docs/migration.md`](docs/migration.md) para exportar usuários, obras,
permissões, arquivos e histórico do Supabase, importar no Railway e validar a
consistência antes de desligar o ambiente antigo.

Para preparar uma versão para Google Play e App Store, siga
[`docs/store-publication.md`](docs/store-publication.md).

## Regras preservadas

- OWNER, EDITOR e VIEWER controlam leitura, edição e permissões.
- Criação e entrada por código continuam transacionais.
- Exclusão de obra permanece lógica.
- Upload aceita PDF e JPEG de até 10 MB.
- Downloads usam URLs temporárias.
- Criação, entrada, upload, renomeações e exclusão permanecem no histórico.
