# Publicação na Google Play e App Store

Este documento reúne o que precisa ser confirmado antes de cada versão pública do Obradocs.

## URLs públicas

- Política de Privacidade: `https://obradocs-production.up.railway.app/privacy.html`
- Termos de Uso: `https://obradocs-production.up.railway.app/terms.html`
- Suporte: `https://obradocs-production.up.railway.app/support.html`
- Exclusão de conta fora do aplicativo: `https://obradocs-production.up.railway.app/delete-account.html`

Teste essas URLs sem autenticação antes de enviar uma versão para análise.

## Declarações de dados

O aplicativo não exibe publicidade e não realiza rastreamento entre aplicativos ou sites.
Os dados são criptografados em trânsito por HTTPS e podem ser excluídos pelo usuário.

| Categoria | Finalidade | Associado ao usuário | Obrigatório |
|---|---|---:|---:|
| Nome e e-mail | Conta, autenticação e colaboração | Sim | Sim |
| Fotos e documentos | Funcionalidade principal do Obradocs | Sim | Não |
| Obras, permissões e histórico de ações | Funcionalidade, segurança e auditoria | Sim | Sim |
| Relatos de conteúdo | Segurança e suporte | Sim | Não |

Na Google Play, declare esses itens no formulário **Segurança dos dados**. Na App Store,
declare nome/e-mail em **Contact Info**, arquivos em **User Content** e o histórico de
ações em **Product Interaction**, sem finalidade de rastreamento.

Revise as respostas quando um SDK, serviço externo ou nova coleta de dados for adicionado.

## Contas e conteúdo

- O aplicativo oferece exclusão de conta em `Minha conta`.
- A exclusão externa usa a URL pública informada acima.
- Obras cujo usuário é o único proprietário e seus arquivos são excluídos.
- Obras com outro proprietário permanecem, e o acesso do usuário excluído é removido.
- Usuários podem denunciar uma obra ou arquivo pelo próprio aplicativo.
- A equipe deve acompanhar nos logs do Railway a mensagem `Denúncia de conteúdo recebida`
  e tratar os registros da tabela `content_reports`.
- Termos e Política de Privacidade são apresentados no cadastro e no primeiro acesso de
  contas migradas.

## Permissões

- Câmera: usada apenas quando o usuário escolhe tirar uma foto da obra.
- Fotos: usada apenas quando o usuário escolhe um arquivo.
- Microfone: não solicitado.
- Android abre PDFs em um visualizador instalado; iOS e Web usam a visualização interna.

As descrições de permissão ficam em `app.json`. Não adicione permissões nativas sem uso real.

## Checklist técnico

1. Atualizar `expo.version` em `app.json` para a versão pública.
2. Confirmar `android.package` e `ios.bundleIdentifier`.
3. Confirmar `EXPO_PUBLIC_API_URL` no perfil `production` de `eas.json`.
4. Executar `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run web:build`, `npx expo-doctor` e `npm audit --omit=dev`.
5. Executar `backend/mvnw test` com Docker ativo.
6. Confirmar `GET /actuator/health` com status `UP`.
7. Testar cadastro, login, recuperação de senha, criação e compartilhamento de obra,
   upload/download, denúncia, logout e exclusão de conta em aparelhos reais.
8. Testar rede lenta, perda de conexão, arquivo inválido e arquivo acima de 10 MB.
9. Gerar os binários com `npx eas-cli build --platform all --profile production`.
10. Distribuir primeiro em TestFlight e teste fechado da Google Play.

## Cadastro nas lojas

Preparar manualmente:

- nome, descrição curta e descrição completa em português;
- ícone, screenshots de celular e imagem promocional exigida pela Google Play;
- categoria e classificação indicativa;
- e-mail e URL de suporte;
- URLs de privacidade e exclusão de conta;
- instruções e uma conta de demonstração para a equipe de análise;
- credenciais de assinatura gerenciadas pelo EAS;
- respostas de privacidade coerentes com a tabela acima.

O aplicativo usa Expo SDK 54, que gera Android com API 36. Antes de cada envio, confirme os
requisitos vigentes de Android e Xcode nas documentações oficiais:

- https://developer.android.com/google/play/requirements/target-sdk
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/support/offering-account-deletion-in-your-app
- https://developer.apple.com/news/upcoming-requirements/

## Operação em produção

- Manter uma única réplica enquanto o limitador de autenticação estiver em memória.
- Ativar alertas de indisponibilidade e custo no Railway.
- Configurar backup do PostgreSQL e testar restauração antes da publicação.
- Monitorar falhas de envio da Brevo e a fila `storage_deletion_queue`.
- Revisar denúncias e solicitações de suporte diariamente.
- Revisar os alertas do Dependabot. O Expo SDK 54 ainda traz avisos altos em ferramentas
  transitivas; não use `npm audit fix --force`, pois ele troca o SDK. Planeje a atualização
  do Expo e repita toda a validação nativa quando uma versão estável compatível estiver pronta.
- Rotacionar `JWT_SECRET`, `BREVO_API_KEY` e credenciais do bucket em caso de exposição.
- Nunca colocar segredos em `eas.json`, `.env.example`, commits ou screenshots.

Política e Termos devem passar por revisão jurídica antes da publicação comercial.
