import { describe, expect, it } from "vitest";
import {
  UPLOAD_FORMATS_DESCRIPTION,
  canPreviewUpload,
  uploadErrorFeedback,
  uploadFormatFor,
  uploadLimitLabel,
} from "./uploadFormats";

describe("uploadFormats", () => {
  it("mapeia formatos e limites aceitos", () => {
    expect(uploadFormatFor("foto.HEIC")).toMatchObject({
      mime: "image/heic",
      maxBytes: 15 * 1024 * 1024,
      previewImage: false,
    });
    expect(uploadFormatFor("projeto.pdf")).toMatchObject({ mime: "application/pdf", maxBytes: 50 * 1024 * 1024 });
    expect(uploadFormatFor("planta.dwg")).toMatchObject({ mime: "image/vnd.dwg", maxBytes: 100 * 1024 * 1024 });
    expect(uploadLimitLabel(uploadFormatFor("planilha.xlsx")!)).toBe("25 MB");
  });

  it("rejeita extensoes fora do catalogo", () => {
    expect(uploadFormatFor("arquivo.zip")).toBeUndefined();
    expect(uploadFormatFor("programa.exe")).toBeUndefined();
  });

  it("explica todos os formatos e limites ao usuario", () => {
    expect(UPLOAD_FORMATS_DESCRIPTION).toContain("HEIC e HEIF: até 15 MB");
    expect(UPLOAD_FORMATS_DESCRIPTION).toContain("PDF: até 50 MB");
    expect(UPLOAD_FORMATS_DESCRIPTION).toContain("DWG e DXF: até 100 MB");
  });

  it("traduz erros de upload exclusivamente pelo code", () => {
    expect(uploadErrorFeedback("UPLOAD_TOO_LARGE")).toMatchObject({
      title: "Arquivo muito grande",
    });
    expect(uploadErrorFeedback("INVALID_REQUEST", "Conteúdo incompatível")).toEqual({
      title: "Arquivo não aceito",
      message: "Conteúdo incompatível",
    });
    expect(uploadErrorFeedback(undefined, "Arquivo muito grande")).toBeUndefined();
  });

  it("libera preview somente para PDF e imagens compativeis", () => {
    expect(canPreviewUpload("planta.pdf")).toBe(true);
    expect(canPreviewUpload("foto.webp")).toBe(true);
    expect(canPreviewUpload("foto.heic")).toBe(false);
    expect(canPreviewUpload("planilha.xlsx")).toBe(false);
    expect(canPreviewUpload("projeto.dwg")).toBe(false);
  });
});
