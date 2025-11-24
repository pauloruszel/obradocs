# Obradocs

Aplicativo movel (React Native + Expo) com backend Supabase para gestao colaborativa de obras com compartilhamento por codigo, upload de PDFs/JPEGs e controle de permissoes via RLS.

## Tecnologias
- React Native + Expo (TypeScript)
- Navegacao: `@react-navigation/native` + `native-stack`
- Estado: Context API (auth + perfil)
- Backend: Supabase (Postgres, Auth, Storage, RLS)

## Estrutura de pastas
- `src/screens`: telas (login, obras, detalhe, upload, historico, permissoes)
- `src/services`: Supabase client e servicos (obras, arquivos, permissoes, historico)
- `src/context`: AuthProvider (sessao + perfil)
- `src/navigation`: stack navigator
- `src/types`: modelos TypeScript
- `db/supabase.sql`: DDL + politicas RLS + bucket
- `assets/`: icones/splash placeholders

## Setup local
1. Instale dependencias: `npm install` (ou `yarn`)  
2. Crie `.env` baseado em `.env.example` com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`.  
3. Supabase:
   - Crie o projeto e aplique `db/supabase.sql` no SQL Editor. Isso cria tabelas, bucket `obras-files` e politicas RLS.
   - Ative Storage publico somente via URL assinada (bucket e privado).
4. Rodar app:
   - `npm start` ou `npx expo start`
   - Expo Go: leia o QR code no terminal.
   - Emulador: `npm run android` ou `npm run ios` (necessario Android Studio / Xcode configurados).

## Build
- Android (APK/AAB via EAS): `eas build -p android --profile production`
- iOS (ipa via EAS): `eas build -p ios --profile production`
- Bare/locais: `expo prebuild` seguido de `npm run android/ios` para builds nativos.

## Scripts uteis
- `npm start` / `expo start`: iniciar em modo dev.
- `npm run android` / `npm run ios`: abrir emulador.
- `npm run web`: testar no navegador.
- `npm run lint`: lint TypeScript.
- `npm run typecheck`: checagem de tipos.

## Fluxo principal do app
- Autenticacao por e-mail/senha (Supabase Auth). Perfis sincronizados na tabela `profiles`.
- Criar obra gera `codigo_compartilhamento` e permissao OWNER para o criador + evento em `historico`.
- Entrar com codigo cria permissao EDITOR e registra `ENTROU_OBRA`.
- Upload de PDF/JPEG ou foto da camera para bucket `obras-files`; grava em `arquivos` e loga `UPLOAD_ARQUIVO`.
- Detalhe da obra lista arquivos por categoria, acessa historico e permissoes (apenas OWNER altera permissoes).

## Banco e RLS (resumo)
- Tabelas: `profiles`, `obras`, `permissoes`, `arquivos`, `historico` (veja `db/supabase.sql`).
- Policies:
  - Usuario so enxerga obras/arquivos/historico onde possui permissao.
  - OWNER pode inserir/alterar/remover permissoes.
  - OWNER/EDITOR podem inserir arquivos; VIEWER apenas le.
  - Storage `obras-files` restrito por politicas no `storage.objects` (usa obra_id no prefixo do path).

## Observacoes
- Conversao de foto para PDF esta como opcional (envio mantem JPEG).
- Ajuste icones/splash em `assets/` conforme identidade visual antes de publicar.

## Novidades recentes
- UI/UX: tela de login redesenhada (fundo azul, card) e logos circularizadas; splash em modo cover.
- Recuperacao de senha completa: telas Forgot/Reset com toasts e validacao; link “Esqueci minha senha” no login.
- Permissoes/convites: uso de RPCs `adicionar_permissao_por_email` e `entrar_por_codigo` (evita RLS bloquear buscas por e-mail/codigo).
- Soft delete de obras: colunas `deleted_at/deleted_by`, funcao `soft_delete_obra` e policies ajustadas; listagens filtram obras ativas.
- Renomear obra/arquivo: modal dedicado para renomear obra (OWNER/EDITOR) e rename direto em ArquivoView; updates registrados em historico.
- Tipo estatico para imagens (`src/types/images.d.ts`) e ignorados extras no `.gitignore` (scan, assets de sistema).
