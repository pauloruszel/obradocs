# Testes de ponta a ponta

Esta estrutura separa os testes por plataforma:

- `e2e/web`: Playwright para navegador e responsividade.
- `.maestro`: Maestro para o aplicativo Android e iOS.
- `backend/src/test`: regras e integrações com PostgreSQL.

Os testes devem usar apenas o ambiente de staging. Nunca use usuários, banco ou bucket de produção.

## Testes web

Instale o navegador do Playwright uma vez:

```powershell
npx playwright install chromium
```

Para testar a compilação local:

```powershell
npm run e2e:web
```

Para testar uma publicação existente:

```powershell
$env:E2E_WEB_BASE_URL="https://sua-url-de-staging/"
npm run e2e:web
```

## Testes mobile

Instale o Maestro conforme a documentação oficial e deixe o APK de staging aberto em um emulador ou aparelho conectado.

As credenciais são informadas em tempo de execução:

```powershell
maestro test `
  -e E2E_OWNER_EMAIL="e2e-owner@seu-dominio.com" `
  -e E2E_OWNER_PASSWORD="senha-do-secret" `
  .maestro
```

O fluxo inicial valida login e logout. Novos cenários devem ser adicionados em `flows` e podem reutilizar os passos de `shared`.

## Contas planejadas

Mantenha contas exclusivas no staging para os papéis Proprietário, Editor, Visualizador, Aprovador, Convidado e Administrador. Guarde as senhas no GitHub Actions ou no EAS, nunca no repositório.

Cada execução deve criar obras com um identificador único. A limpeza automática e os cenários que alteram dados entram na próxima etapa, depois que as contas E2E estiverem disponíveis.
