# Identidade vetorial do Obradocs

## Conceito

O símbolo combina três ideias do produto:

- **obra**: a estrutura principal remete a edifício, planta e construção;
- **documento**: os planos em primeiro plano representam arquivos e registros;
- **organização**: linhas verticais e sobreposição comunicam ordem, histórico e estrutura.

A geometria oficial desta implementação está centralizada em `src/components/brand/ObradocsBrandMark.tsx` e em `assets/brand/obradocs-symbol.svg`.

## Paleta

| Uso | Cor |
|---|---|
| Azul principal | `#0C5BAA` |
| Azul escuro da assinatura | `#0A1F3D` |
| Cinza médio | `#5A6472` |
| Cinza claro | `#E6E9EE` |
| Branco / versão negativa | `#FFFFFF` |

Essas cores também estão centralizadas em `src/theme/index.ts`. O azul principal permanece o mesmo já utilizado pelo aplicativo.

## Variações

- **Principal**: símbolo azul em fundo claro.
- **Monocromática**: símbolo azul-escuro para contextos de uma cor.
- **Negativa**: símbolo branco em fundo azul ou escuro.
- **Lockup horizontal**: símbolo + `OBRADOCS` + assinatura "Documentos de obra, organizados.".

Arquivos prontos para uso externo:

- `assets/brand/obradocs-symbol.svg`
- `assets/brand/obradocs-lockup.svg`
- `assets/brand/obradocs-lockup-monochrome.svg`
- `assets/brand/obradocs-lockup-negative.svg`

## Motion

O símbolo foi separado em duas camadas sem alterar sua geometria:

1. **estrutura** é desenhada progressivamente;
2. **documento** entra em seguida;
3. **revelação** finaliza com pequena expansão.

O loader usa o mesmo símbolo com uma órbita SVG. A animação comunica carregamento sem girar ou deformar a própria marca.

Durante uploads, o documento entra na estrutura. Feedbacks de sucesso usam um check com expansão curta, e o sino balança somente quando a contagem de notificações aumenta.

## Regras de uso

- não esticar o símbolo fora de proporção;
- não alterar individualmente ângulos ou posições das linhas;
- usar a versão negativa sobre o azul principal;
- evitar animação contínua da própria marca fora de estados de loading;
- manter microinterações curtas e funcionais.

## Observação sobre tipografia

O símbolo e os lockups SVG são independentes de fontes instaladas: a assinatura textual dos arquivos externos foi convertida em paths. No aplicativo, o wordmark continua sendo renderizado pelo sistema tipográfico da interface para preservar consistência entre Web, Android e iOS.
