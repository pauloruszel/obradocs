import { supabase } from "./supabase";
import { Obra } from "@models/models";

const codigoChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const gerarCodigoCompartilhamento = () => {
  let codigo = "";
  for (let i = 0; i < 8; i++) {
    codigo += codigoChars.charAt(Math.floor(Math.random() * codigoChars.length));
    if (i === 3) codigo += "-";
  }
  return codigo;
};

const normalizarCodigoEntrada = (codigo: string) => {
  const cleaned = codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }

  return codigo.trim().toUpperCase();
};

export const listObrasDoUsuario = async (userId: string): Promise<Obra[]> => {
  const { data, error } = await supabase
    .from("obras")
    .select("*, permissoes!inner(user_id)")
    .eq("permissoes.user_id", userId)
    .is("deleted_at", null);
  if (error) throw error;
  return (data || []) as Obra[];
};

export const criarObra = async (nome: string, userId: string): Promise<Obra> => {
  const codigo = gerarCodigoCompartilhamento();

  const { data, error } = await supabase
    .from("obras")
    .insert({ nome, codigo_compartilhamento: codigo, created_by: userId })
    .select()
    .single();

  if (error) throw error;

  await supabase.from("permissoes").insert({ obra_id: data.id, user_id: userId, papel: "OWNER" });
  await supabase
    .from("historico")
    .insert({ obra_id: data.id, user_id: userId, acao: "CRIACAO_OBRA", detalhes: { nome } });

  return data as Obra;
};

export const entrarPorCodigo = async (codigo: string) => {
  const normalized = normalizarCodigoEntrada(codigo);
  const { data, error } = await supabase.rpc("entrar_por_codigo", { p_codigo: normalized });

  if (error || !data) {
    throw new Error(error?.message || "Obra nao encontrada");
  }

  return data as Obra;
};

export const fetchObra = async (id: string): Promise<Obra | null> => {
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) return null;
  return data as Obra;
};

export const renomearObra = async (obraId: string, novoNome: string) => {
  const trimmed = novoNome.trim();
  const { data, error } = await supabase
    .from("obras")
    .update({ nome: trimmed })
    .eq("id", obraId)
    .is("deleted_at", null)
    .select()
    .single();
  if (error) throw error;
  await supabase.from("historico").insert({
    obra_id: obraId,
    acao: "RENOMEAR_OBRA",
    detalhes: { novoNome: trimmed },
  });
  return data as Obra;
};

export const excluirObra = async (obraId: string) => {
  const { error } = await supabase.rpc("soft_delete_obra", { p_obra_id: obraId });
  if (error) throw error;
};
