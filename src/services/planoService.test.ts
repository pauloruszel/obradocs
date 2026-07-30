import { describe, expect, it } from "vitest";
import { normalizarMinhaAssinatura } from "./planoMapper";

describe("normalizarMinhaAssinatura", () => {
  it("mapeia os campos snake_case retornados pelo backend", () => {
    const assinatura = normalizarMinhaAssinatura({
      plano: {
        codigo: "FREE",
        nome: "Gratuito",
        preco_centavos: 0,
        moeda: "BRL",
        fundador: false,
      },
      uso: {
        obras: 2,
        limite_obras: 1,
        armazenamento_bytes: 135 * 1024 * 1024,
        limite_armazenamento_bytes: 500 * 1024 * 1024,
        limite_colaboradores_por_obra: 1,
      },
    });

    expect(assinatura).toEqual({
      plano: {
        codigo: "FREE",
        nome: "Gratuito",
        precoCentavos: 0,
        moeda: "BRL",
        fundador: false,
      },
      uso: {
        obras: 2,
        limiteObras: 1,
        armazenamentoBytes: 135 * 1024 * 1024,
        limiteArmazenamentoBytes: 500 * 1024 * 1024,
        limiteColaboradoresPorObra: 1,
      },
    });
  });

  it("preserva limites nulos somente para planos ilimitados", () => {
    const assinatura = normalizarMinhaAssinatura({
      plano: {
        codigo: "PRO",
        nome: "Profissional",
        preco_centavos: 2490,
        moeda: "BRL",
        fundador: false,
      },
      uso: {
        obras: 4,
        limite_obras: null,
        armazenamento_bytes: 0,
        limite_armazenamento_bytes: 5 * 1024 * 1024 * 1024,
        limite_colaboradores_por_obra: null,
      },
    });

    expect(assinatura.uso.limiteObras).toBeNull();
    expect(assinatura.uso.limiteColaboradoresPorObra).toBeNull();
    expect(Number.isNaN(assinatura.uso.armazenamentoBytes)).toBe(false);
    expect(Number.isNaN(assinatura.uso.limiteArmazenamentoBytes)).toBe(false);
  });
});
