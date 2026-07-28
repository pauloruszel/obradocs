import { Arquivo, ArquivoTipo } from "@models/models";
import * as FileSystem from "expo-file-system/legacy";
import { apiRequest } from "./apiClient";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const listarArquivos = async (
  obraId: string,
  tipo?: ArquivoTipo
): Promise<Arquivo[]> => {
  const query = tipo ? `?tipo=${encodeURIComponent(tipo)}` : "";
  return apiRequest<Arquivo[]>(`/v1/obras/${obraId}/arquivos${query}`);
};

export const uploadArquivo = async ({
  obraId,
  tipo,
  uri,
  nomeOriginal,
  userId: _userId,
}: {
  obraId: string;
  tipo: ArquivoTipo;
  uri: string;
  nomeOriginal: string;
  userId: string;
}): Promise<Arquivo> => {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error("Arquivo nao existe no dispositivo.");
  }
  if (info.size && info.size > MAX_SIZE_BYTES) {
    throw new Error("Arquivo muito grande (>10MB).");
  }

  const ext = nomeOriginal.split(".").pop()?.toLowerCase() || "dat";
  const mimeType = ext === "pdf" ? "application/pdf" : "image/jpeg";
  const formData = new FormData();
  formData.append("tipo", tipo);
  formData.append(
    "arquivo",
    { uri, name: nomeOriginal, type: mimeType } as unknown as Blob
  );

  return apiRequest<Arquivo>(`/v1/obras/${obraId}/arquivos`, {
    method: "POST",
    body: formData,
  });
};

export const gerarUrlTemporaria = async (arquivoIdOuPath: string): Promise<string | null> => {
  try {
    const response = await apiRequest<{ url: string }>(
      `/v1/arquivos/${encodeURIComponent(arquivoIdOuPath)}/download-url`
    );
    return response.url;
  } catch {
    return null;
  }
};

export const renomearArquivo = async (
  arquivoId: string,
  novoNome: string
): Promise<Arquivo> =>
  apiRequest<Arquivo>(`/v1/arquivos/${arquivoId}`, {
    method: "PATCH",
    body: JSON.stringify({ nome_original: novoNome.trim() }),
  });
