import { AprovacaoStatus, Arquivo, ArquivoTipo } from "@models/models";
import { Platform } from "react-native";
import { apiRequest, PageResponse } from "./apiClient";

const arquivosQuery = (
  tipo?: ArquivoTipo,
  busca?: string,
  categoriaId?: string,
  ambiente?: string,
) => [
  categoriaId && `categoriaId=${encodeURIComponent(categoriaId)}`,
  tipo && `tipo=${encodeURIComponent(tipo)}`,
  busca?.trim() && `busca=${encodeURIComponent(busca.trim())}`,
  ambiente?.trim() && `ambiente=${encodeURIComponent(ambiente.trim())}`,
].filter(Boolean);

export const listarArquivos = (
  obraId: string,
  tipo?: ArquivoTipo,
  busca?: string,
  categoriaId?: string,
  ambiente?: string,
): Promise<Arquivo[]> => {
  const query = arquivosQuery(tipo, busca, categoriaId, ambiente).join("&");
  return apiRequest(`/v1/obras/${obraId}/arquivos${query ? `?${query}` : ""}`);
};

export const listarArquivosPagina = (
  obraId: string,
  page: number,
  tipo?: ArquivoTipo,
  busca?: string,
  categoriaId?: string,
  ambiente?: string,
): Promise<PageResponse<Arquivo>> => {
  const query = [...arquivosQuery(tipo, busca, categoriaId, ambiente), `page=${page}`, "size=20"];
  return apiRequest(`/v1/obras/${obraId}/arquivos/pagina?${query.join("&")}`);
};

export const buscarArquivo = (arquivoId: string): Promise<Arquivo> =>
  apiRequest(`/v1/arquivos/${arquivoId}`);

export const listarRevisoes = (arquivoId: string): Promise<Arquivo[]> =>
  apiRequest(`/v1/arquivos/${arquivoId}/revisoes`);

export const solicitarAprovacao = (arquivoId: string): Promise<Arquivo> =>
  apiRequest(`/v1/arquivos/${arquivoId}/aprovacao/solicitar`, { method: "POST" });

export const decidirAprovacao = (
  arquivoId: string,
  decisao: Exclude<AprovacaoStatus, "PENDING">,
  comentario?: string,
): Promise<Arquivo> =>
  apiRequest(`/v1/arquivos/${arquivoId}/aprovacao/decidir`, {
    method: "POST",
    body: JSON.stringify({ decisao, comentario: comentario?.trim() || null }),
  });

const uploadMultipart = async ({
  path,
  uri,
  nomeOriginal,
  contentType,
}: {
  path: string;
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
  return apiRequest(path, {
    method: "POST",
    body: form,
    timeoutMs: 120_000,
  });
};

export const uploadArquivo = ({
  obraId,
  categoriaId,
  tipo,
  uri,
  nomeOriginal,
  contentType,
  ambiente,
}: {
  obraId: string;
  categoriaId?: string;
  tipo: ArquivoTipo;
  uri: string;
  nomeOriginal: string;
  contentType: string;
  ambiente?: string;
}): Promise<Arquivo> =>
  uploadMultipart({
    path: `/v1/obras/${obraId}/arquivos?${
      categoriaId
        ? `categoriaId=${encodeURIComponent(categoriaId)}`
        : `tipo=${encodeURIComponent(tipo)}`
    }${ambiente?.trim() ? `&ambiente=${encodeURIComponent(ambiente.trim())}` : ""}`,
    uri,
    nomeOriginal,
    contentType,
  });

export const uploadRevisao = ({
  arquivoId,
  uri,
  nomeOriginal,
  contentType,
}: {
  arquivoId: string;
  uri: string;
  nomeOriginal: string;
  contentType: string;
}): Promise<Arquivo> =>
  uploadMultipart({
    path: `/v1/arquivos/${arquivoId}/revisoes`,
    uri,
    nomeOriginal,
    contentType,
  });

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
