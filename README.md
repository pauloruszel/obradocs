# Obradocs

O Obradocs organiza fotos, PDFs e revisões de documentos por obra. O produto foi criado para arquitetos, designers de interiores, engenheiros e profissionais de reforma compartilharem arquivos sem depender do histórico de conversas ou de pastas genéricas.

## Estado atual

- Web: [pauloruszel.github.io/obradocs](https://pauloruszel.github.io/obradocs/)
- API: Spring Boot publicado no Railway
- Android: builds de teste distribuídos pelo EAS
- iOS: projeto compatível com Expo, ainda sem distribuição pública
- Supabase: removido do aplicativo e da infraestrutura ativa

## Funcionalidades

- Cadastro, login, renovação de sessão e recuperação de senha pela API HTTPS da Brevo.
- Criação de obras e entrada por código de compartilhamento.
- Papéis `OWNER`, `EDITOR` e `VIEWER`, com autorização validada no backend.
- Modelos de organização para Geral, Arquitetura, Design de Interiores, Engenharia e Reforma.
- Categorias renomeáveis e reordenáveis; categorias e modelos adicionais no plano Profissional.
- Organização e filtro de documentos por ambiente.
- Busca por nome de obra e documento.
- Upload privado de PDF e JPEG de até 10 MB.
- Revisões de documentos em sequência (`R1`, `R2`, `R3`...), preservando versões anteriores, autor, data e tamanho.
- Histórico das atividades da obra.
- Central de notificações internas para arquivos, revisões e alterações de acesso, com contador de não lidas.
- Exclusão lógica de obras e exclusão de conta.
- Termos de uso, política de privacidade, suporte e denúncia de conteúdo.
- Interface responsiva para Android, iOS e Web.

As notificações atuais são consultadas dentro do aplicativo. Push notifications com o aplicativo fechado ainda não foram implementadas.

## Planos

| Recurso | Gratuito | Profissional |
|---|---:|---:|
| Obras próprias ativas | 1 | Ilimitadas |
| Armazenamento | 500 MB | 5 GB |
| Colaboradores por obra | 1 | Ilimitados |
| Categorias do modelo escolhido | 4 | 4 ou mais |
| Modelos personalizados | Não | Sim |

O domínio de planos, os limites, a medição de uso e a captação de interesse estão implementados. Pagamento, renovação, cancelamento e webhooks ainda não fazem parte do produto; a ativação do plano Profissional é administrativa.

## Arquitetura

```text
Expo / React Native / Web
          |
          | HTTPS + JWT
          v
Spring Boot no Railway
          |
          +-- PostgreSQL + Flyway
          +-- Railway Bucket (API S3)
          +-- Brevo (API HTTPS de e-mail)
```

O aplicativo nunca acessa diretamente o PostgreSQL ou o bucket. Regras de autorização, limites, histórico, notificações e transações ficam centralizadas no backend.

## Tecnologias

**Aplicativo:** Expo SDK 54, React Native 0.81, React 19, TypeScript e React Navigation.

**Backend:** Java 21, Spring Boot 4.1, Spring Security, Spring Data JPA, PostgreSQL, Flyway e AWS SDK S3.

**Qualidade e entrega:** Vitest, ESLint, Testcontainers, Docker, GitHub Actions, GitHub Pages, Railway e EAS Build.

## Estrutura do repositório

```text
obradocs/
├── src/                         # telas, navegação, componentes e serviços do app
├── assets/                      # ícones e imagens do Expo
├── public/                      # manifest, ícones PWA e fallback 404
├── scripts/                     # preparação do build Web para GitHub Pages
├── backend/
│   ├── src/main/java/           # API e regras de negócio
│   ├── src/main/resources/
│   │   ├── db/migration/        # migrations Flyway
│   │   └── static/              # páginas legais e redefinição de senha
│   ├── src/test/                # testes do backend
│   ├── compose.yml              # PostgreSQL local
│   └── Dockerfile               # imagem usada no Railway
├── docs/                        # migração, planos e publicação nas lojas
├── .github/workflows/           # CI e deploy Web
├── app.json                     # configuração e versão do aplicativo
└── eas.json                     # perfis de build Android/iOS
```

## Desenvolvimento local

### Aplicativo

Requisitos: Node.js 22 e npm.

```bash
npm ci
```

Crie `.env` a partir de `.env.example` e configure a API:

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
```

Depois execute:

```bash
npm start
```

Em dispositivo físico, use o IP da máquina no lugar de `localhost`. No emulador Android, use `http://10.0.2.2:8080`.

### Backend

Requisitos: Java 21 e Docker. As variáveis necessárias estão documentadas em [backend/README.md](backend/README.md) e exemplificadas em [.env.example](.env.example).

```bash
cd backend
docker compose up -d
./mvnw spring-boot:run
```

No Windows PowerShell, use `./mvnw.cmd spring-boot:run`. O Flyway cria e atualiza o schema automaticamente.

## Validação

```bash
npm run typecheck
npm run lint
npm test
npm run web:build
```

Com o Docker ativo:

```bash
cd backend
./mvnw test
```

O workflow de CI executa essas verificações em pushes e pull requests.

## Publicação

- A Web é exportada por `npm run web:build` e publicada em `master` pelo workflow [pages.yml](.github/workflows/pages.yml).
- O backend usa [backend/Dockerfile](backend/Dockerfile) no Railway, conectado ao PostgreSQL e ao bucket S3 compatível.
- Builds Android de teste usam `npx eas-cli@latest build --platform android --profile preview`.
- Builds para lojas usam o perfil `production` do [eas.json](eas.json).

Antes de publicar nas lojas, siga o checklist em [docs/store-publication.md](docs/store-publication.md).

## Documentação

- [Execução e configuração da API](backend/README.md)
- [Migração do Supabase para Railway](docs/migration.md)
- [Planos e limites freemium](docs/planos-e-limites-freemium.md)
- [Publicação na Google Play e App Store](docs/store-publication.md)

## Regras de acesso

- `OWNER`: edita a obra e gerencia permissões, categorias e documentos.
- `EDITOR`: edita a obra, categorias e documentos, sem gerenciar permissões.
- `VIEWER`: visualiza e baixa documentos, sem alterar conteúdo.

Criação de obra, entrada por código, uploads, revisões, permissões e histórico são processados pelo backend. Downloads usam URLs temporárias e arquivos são validados por tamanho, MIME e assinatura binária antes do armazenamento.
