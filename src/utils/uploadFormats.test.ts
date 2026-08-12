import { describe, expect, it } from "vitest";
import { uploadFormatFor, uploadLimitLabel } from "./uploadFormats";

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
});
