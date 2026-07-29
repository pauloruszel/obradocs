import { Arquivo, ArquivoTipo } from "@models/models";
import { Platform } from "react-native";
import { apiRequest } from "./apiClient";

export const listarArquivos = (
  obraId: string,
  tipo?: ArquivoTipo,
  busca?: string,
): Promise<Arquivo[]> => {
  const query = [
    tipo && `tipo=${encodeURIComponent(tipo)}`,
    busca?.trim() && `busca=${encodeURIComponent(busca.trim())}`,
  ]
    .filter(Boolean)
    .join("&");
  return apiRequest(`/v1/obras/${obraId}/arquivos${query ? `?${query}` : ""}`);
};

export const buscarArquivo = (arquivoId: string): Promise<Arquivo> =>
  apiRequest(`/v1/arquivos/${arquivoId}`);

export const uploadArquivo = async ({
  obraId,
  tipo,
  uri,
  nomeOriginal,
  contentType,
}: {
  obraId: string;
  tipo: ArquivoTipo;
  uri: string;
  nomeOriginal: string;
  contentType: string;
}): Promise<Arquivo> => {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await fetch(uri).then((response) => response.blob());
    const appendFile = form.append.bind(form) as (
      field: string,
      value: Blob,
      fileName: string,
    ) => void;
    appendFile("arquivo", blob, nomeOriginal);
  } else {
    form.append(
      "arquivo",
      {
        uri,
        name: nomeOriginal,
        type: contentType,
      } as unknown as Blob,
    );
  }
  return apiRequest(
    `/v1/obras/${obraId}/arquivos?tipo=${encodeURIComponent(tipo)}`,
    {
      method: "POST",
      body: form,
      timeoutMs: 120_000,
    },
  );
};

export const gerarUrlTemporaria = async (arquivoId: string): Promise<string> => {
  const response = await apiRequest<{ url: string }>(
    `/v1/arquivos/${arquivoId}/download-url`,
  );
  return response.url;
};

export const renomearArquivo = (arquivoId: string, nome: string): Promise<Arquivo> =>
  apiRequest(`/v1/arquivos/${arquivoId}`, {
    method: "PATCH",
    body: JSON.stringify({ nome: nome.trim() }),
  });
