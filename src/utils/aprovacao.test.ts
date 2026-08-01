import { describe, expect, it } from "vitest";
import { Arquivo } from "@models/models";
import { filtrarRevisoesPorAprovacao } from "./aprovacao";

const revisao = (id: string, status: Arquivo["aprovacao_status"]) =>
  ({ id, aprovacao_status: status }) as Arquivo;

describe("filtrarRevisoesPorAprovacao", () => {
  const revisoes = [
    revisao("1", "PENDING"),
    revisao("2", "APPROVED"),
    revisao("3", null),
  ];

  it("mantém todas ou filtra pelo estado escolhido", () => {
    expect(filtrarRevisoesPorAprovacao(revisoes, "ALL")).toHaveLength(3);
    expect(filtrarRevisoesPorAprovacao(revisoes, "PENDING").map((item) => item.id)).toEqual(["1"]);
  });
});
