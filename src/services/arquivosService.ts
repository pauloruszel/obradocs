import { supabase } from "./supabase";
import { Arquivo, ArquivoTipo } from "@models/models";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";

const BUCKET = "obras-files";
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

// Normaliza nome
const sanitizeFileName = (name: string, ext: string) => {
  const base = name.replace(/\.[^.]+$/, "");
  const normalized = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const safe = normalized
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `${safe || "arquivo"}.${ext.toLowerCase()}`;
};

// Lê qualquer URI em base64 (inclui content:// se um dia aparecer)
const readFileAsBase64 = async (uri: string) => {
  console.log("readFileAsBase64 -> recebida URI:", uri);

  let realUri = uri;

  if (uri.startsWith("content://")) {
    console.log("URI é content:// → convertendo com getContentUriAsync...");
    const converted = await FileSystem.getContentUriAsync(uri);

    console.log("Resultado da conversão content:// →", converted);

    if (!converted) throw new Error("Falha ao converter content://");
    realUri = converted;
  }

  console.log("Lendo arquivo realUri =", realUri);

  const base64 = await FileSystem.readAsStringAsync(realUri, {
    encoding: "base64",
  });

  console.log("Base64 length:", base64?.length);
  return base64;
};

export const listarArquivos = async (
  obraId: string,
  tipo?: ArquivoTipo
): Promise<Arquivo[]> => {
  const query = supabase
    .from("arquivos")
    .select("*")
    .eq("obra_id", obraId)
    .order("created_at", { ascending: false });

  if (tipo) query.eq("tipo", tipo);

  const { data, error } = await query;
  if (error) throw error;
  return data as Arquivo[];
};

export const uploadArquivo = async ({
  obraId,
  tipo,
  uri,
  nomeOriginal,
  userId,
}: {
  obraId: string;
  tipo: ArquivoTipo;
  uri: string;
  nomeOriginal: string;
  userId: string;
}) => {
  console.log("\n\n================ UPLOAD ARQUIVO ================");
  console.log("obraId:", obraId);
  console.log("tipo:", tipo);
  console.log("uri:", uri);
  console.log("nomeOriginal:", nomeOriginal);
  console.log("userId:", userId);

  const ext = nomeOriginal.split(".").pop()?.toLowerCase() || "dat";
  const fileName = sanitizeFileName(nomeOriginal, ext);
  const storagePath = `${obraId}/${Date.now()}-${fileName}`;

  console.log("ext:", ext);
  console.log("fileName:", fileName);
  console.log("storagePath:", storagePath);

  const contentType = ext === "pdf" ? "application/pdf" : "image/jpeg";

  // 1. Info do arquivo
  const info = await FileSystem.getInfoAsync(uri);
  console.log("File info:", info);

  if (!info.exists) {
    throw new Error("Arquivo não existe no dispositivo.");
  }

  if (info.size && info.size > MAX_SIZE_BYTES) {
    throw new Error("Arquivo muito grande (>10MB).");
  }

  // 2. Ler arquivo em base64
  const base64 = await readFileAsBase64(uri);

  // 3. Converter base64 → Buffer (bytes)
  const buffer = Buffer.from(base64, "base64");
  console.log("Buffer length:", buffer.length);

  // 4. Upload ao bucket usando os bytes diretamente
  console.log("Enviando ao Supabase Storage...");
  let storageData;
  let storageError;

  try {
    const result = await supabase.storage
      .from(BUCKET)
      // Buffer é um Uint8Array por baixo; `as any` para agradar o TypeScript
      .upload(storagePath, buffer as any, {
        contentType,
        upsert: true,
      });

    storageData = result.data;
    storageError = result.error;
  } catch (e: any) {
    console.log("❌ EXCEÇÃO NO supabase.storage.upload:", e);
    throw e;
  }

  console.log("Storage data:", storageData);
  console.log("Storage error:", storageError);

  if (storageError) {
    console.log("❌ ERRO NO STORAGE (error property):", storageError);
    throw storageError;
  }

  // 5. Insert na tabela
  console.log("Inserindo no banco...");
  const { data, error } = await supabase
    .from("arquivos")
    .insert({
      obra_id: obraId,
      tipo,
      nome_original: nomeOriginal,
      storage_path: storagePath,
      enviado_por: userId,
    })
    .select()
    .single();

  console.log("Insert error:", error);
  console.log("Insert data:", data);

  if (error) {
    console.log("❌ ERRO AO INSERIR:", error);
    throw error;
  }

  // 6. Histórico
  console.log("Registrando histórico...");
  await supabase.from("historico").insert({
    obra_id: obraId,
    user_id: userId,
    acao: "UPLOAD_ARQUIVO",
    detalhes: { nomeOriginal },
  });

  console.log("✅ Upload concluído com sucesso!");
  console.log("==================================================");

  return data as Arquivo;
};

export const gerarUrlTemporaria = async (path: string) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error) return null;
  return data?.signedUrl ?? null;
};

export const renomearArquivo = async (arquivoId: string, novoNome: string) => {
  const trimmed = novoNome.trim();
  const { data, error } = await supabase
    .from("arquivos")
    .update({ nome_original: trimmed })
    .eq("id", arquivoId)
    .select()
    .single();
  if (error) throw error;
  await supabase.from("historico").insert({
    obra_id: data?.obra_id,
    user_id: data?.enviado_por,
    acao: "RENOMEAR_ARQUIVO",
    detalhes: { arquivoId, novoNome: trimmed },
  });
  return data as Arquivo;
};
