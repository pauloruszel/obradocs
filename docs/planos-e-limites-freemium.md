# Planos e limites do Obradocs

## Objetivo

Estruturar o Obradocs como micro-SaaS com dois planos iniciais, mantendo custos previsíveis e permitindo alterar limites sem reescrever regras de negócio.

A primeira versão não inclui cobrança automática. Ela prepara o domínio, os limites, a medição de uso e a experiência de upgrade para validar o produto com clientes reais antes da integração com gateway de pagamento e lojas.

## Planos iniciais

| Recurso | Gratuito | Profissional |
|---|---:|---:|
| Preço | R$ 0 | R$ 24,90/mês |
| Obras próprias ativas | 1 | Ilimitadas |
| Armazenamento total | 500 MB | 5 GB |
| Colaboradores por obra | 1 | Ilimitados |
| Upload de fotos e PDFs | Sim | Sim |
| Busca e histórico | Sim | Sim |
| Compartilhamento | Básico | Completo |
| Suporte | Comunidade/e-mail | Prioritário futuramente |

### Oferta de fundadores

A oferta de fundadores não deve ser um terceiro plano técnico. Deve ser uma condição comercial associada ao plano Profissional:

- preço sugerido: R$ 14,90/mês;
- quantidade inicial: até 20 ou 30 clientes;
- preservação do preço enquanto a assinatura permanecer ativa;
- mesmos limites e recursos do Profissional.

Assim evitamos duplicar regras, telas e permissões.

## Diretrizes de implementação

1. Os limites devem ser configuráveis no banco ou em configuração versionada, nunca espalhados pelo código.
2. A autorização deve continuar baseada no papel da obra (`OWNER`, `EDITOR`, `VIEWER`). O plano controla capacidade, não permissão de acesso.
3. O uso deve ser calculado pelo proprietário da obra. Arquivos enviados por colaboradores consomem a cota do proprietário.
4. O limite deve ser validado no backend antes de criar obra, adicionar colaborador ou aceitar upload.
5. O frontend deve exibir uso atual e mensagem clara antes de bloquear a ação.
6. Nenhum plano deve prometer armazenamento ilimitado.
7. A primeira entrega não deve depender da App Store, Google Play ou de um gateway de pagamento.

## Modelo de domínio sugerido

### `planos`

- `id`
- `codigo`: `FREE`, `PRO`
- `nome`
- `preco_centavos`
- `moeda`: `BRL`
- `limite_obras` — `NULL` significa ilimitado
- `limite_armazenamento_bytes`
- `limite_colaboradores_por_obra` — `NULL` significa ilimitado
- `ativo`
- `created_at`
- `updated_at`

### `assinaturas`

- `id`
- `usuario_id`
- `plano_id`
- `status`: `ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELED`
- `preco_centavos_contratado`
- `fundador`
- `inicio_em`
- `fim_em`
- `created_at`
- `updated_at`

Para a primeira fase, todo usuário novo recebe automaticamente uma assinatura `ACTIVE` do plano `FREE`.

### Uso de armazenamento

Não é necessário criar uma tabela agregada no primeiro momento. O uso pode ser obtido por soma de `arquivos.tamanho_bytes` das obras cujo usuário é proprietário.

Quando o volume crescer, criar uma tabela de projeção ou contador transacional:

- `usuario_id`
- `armazenamento_usado_bytes`
- `atualizado_em`

## Regras de negócio

### Criar obra

1. Buscar assinatura ativa do usuário.
2. Contar obras em que ele é proprietário e que não estejam excluídas.
3. Se `limite_obras` não for nulo e o total atingir o limite, retornar `409 PLAN_LIMIT_REACHED`.

### Enviar arquivo

1. Validar papel de edição na obra.
2. Identificar o proprietário da obra.
3. Buscar assinatura e uso do proprietário.
4. Somar o tamanho do novo arquivo.
5. Se ultrapassar a cota, rejeitar antes do envio definitivo ao storage com `413 STORAGE_LIMIT_REACHED`.
6. Em falha após envio ao storage, remover o objeto para evitar arquivo órfão.

### Adicionar colaborador

1. Validar que o solicitante é proprietário.
2. Buscar limite do plano do proprietário.
3. Contar colaboradores não proprietários da obra.
4. Quando o limite for atingido, retornar `409 COLLABORATOR_LIMIT_REACHED`.

### Exclusão

Ao excluir definitivamente um arquivo ou uma obra, o espaço deve ser liberado. Se a exclusão for lógica, o produto deve definir se arquivos na lixeira continuam consumindo cota. Recomendação inicial: continuam consumindo até a remoção definitiva.

## API proposta

### Consultar plano e uso

`GET /v1/minha-assinatura`

Resposta sugerida:

```json
{
  "plano": {
    "codigo": "FREE",
    "nome": "Gratuito",
    "preco_centavos": 0
  },
  "uso": {
    "obras": 1,
    "limite_obras": 1,
    "armazenamento_bytes": 104857600,
    "limite_armazenamento_bytes": 524288000
  }
}
```

### Erro padronizado de limite

```json
{
  "code": "STORAGE_LIMIT_REACHED",
  "message": "Você atingiu o limite de armazenamento do plano Gratuito.",
  "details": {
    "used_bytes": 500000000,
    "limit_bytes": 524288000,
    "requested_bytes": 30000000
  }
}
```

## Experiência no aplicativo

### Tela "Plano e uso"

Adicionar em "Minha conta":

- nome do plano atual;
- armazenamento utilizado em MB/GB;
- quantidade de obras usadas;
- barra de progresso;
- limites do plano;
- botão `Conhecer o Profissional`.

### Bloqueios

- criação da segunda obra no plano gratuito;
- upload que ultrapassa 500 MB;
- inclusão do segundo colaborador na mesma obra.

A mensagem deve explicar o motivo e preservar o trabalho do usuário. O botão de upgrade inicialmente pode abrir uma tela de interesse ou contato, sem cobrança automática.

## Métricas necessárias para validar preço e limites

Registrar ou consultar mensalmente:

- usuários ativos;
- usuários do plano gratuito;
- clientes profissionais;
- conversão de gratuito para profissional;
- obras por proprietário;
- armazenamento por proprietário;
- uploads por mês;
- média e percentis de tamanho dos arquivos;
- colaboradores por obra;
- custo total do Railway;
- custo médio de infraestrutura por usuário ativo e por cliente pagante.

## Estratégia de fases

### Fase 1 — Fundação de planos

- migrations de `planos` e `assinaturas`;
- seed dos planos `FREE` e `PRO`;
- atribuição automática do `FREE` a novos usuários;
- serviço central de limites;
- endpoint de plano e uso;
- testes unitários e de integração.

### Fase 2 — Aplicação dos limites

- limitar criação de obras;
- limitar armazenamento no upload;
- limitar colaboradores;
- respostas de erro padronizadas;
- testes regressivos para proprietário, editor e viewer.

### Fase 3 — UX e validação comercial

- tela "Plano e uso";
- barras de consumo;
- modais de limite atingido;
- captura de interesse no plano Profissional;
- condição comercial de fundador sem terceiro plano técnico.

### Fase 4 — Cobrança

Somente após conversão manual dos primeiros clientes:

- escolher gateway para web;
- implementar webhooks e idempotência;
- controlar renovação, inadimplência e cancelamento;
- avaliar regras de compra dentro dos aplicativos antes de publicar nas lojas.

### Fase 5 — Expansão

Criar plano Plus ou add-on de armazenamento somente quando os dados mostrarem demanda real. Opção preferencial inicial:

- Profissional: 5 GB;
- add-on de +5 GB;
- add-on de +10 GB.

## Critérios de aceite da primeira entrega

- usuário novo recebe plano Gratuito automaticamente;
- usuário Gratuito não cria mais de uma obra própria;
- usuário Gratuito não ultrapassa 500 MB;
- usuário Gratuito não adiciona mais de um colaborador por obra;
- usuário Profissional não sofre esses limites de quantidade e possui cota de 5 GB;
- colaboradores consomem a cota do proprietário;
- limites são lidos de configuração persistida;
- respostas de limite são distinguíveis de erros técnicos;
- todos os cenários possuem testes regressivos;
- nenhuma regra atual de acesso ou documentos é alterada fora dos pontos de limite.
