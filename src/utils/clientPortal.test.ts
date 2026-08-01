import { describe, expect, it } from "vitest";
import { Arquivo } from "@models/models";
import { selecionarRevisaoOficial } from "./clientPortal";

const arquivo = (revisao: number, oficial = false): Arquivo => ({
  id: `arquivo-${revisao}`,
  documento_id: "documento",
  categoria_id: "categoria",
  categoria_nome: "Projetos",
  documento_nome: "projeto.pdf",
  obra_id: "obra",
  tipo: "PROJETO",
  nome_original: "projeto.pdf",
  revisao,
  revisao_atual: 2,
  atual: revisao === 2,
  revisao_aprovada: 1,
  oficial_aprovada: oficial,
  storage_path: `projeto-r${revisao}.pdf`,
  content_type: "application/pdf",
  tamanho_bytes: 100,
  enviado_por: null,
});

describe("selecionarRevisaoOficial", () => {
  it("mantém a revisão aprovada mesmo quando existe uma revisão mais nova", () => {
    expect(selecionarRevisaoOficial(arquivo(2), [arquivo(2), arquivo(1, true)])?.revisao)
      .toBe(1);
  });

  it("não publica documento sem revisão aprovada", () => {
    expect(selecionarRevisaoOficial({ ...arquivo(2), revisao_aprovada: null }, [arquivo(2)]))
      .toBeNull();
  });
});
