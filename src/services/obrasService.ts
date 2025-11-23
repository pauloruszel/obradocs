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
    .from("permissoes")
    .select("obras(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((row: any) => row.obras) as Obra[];
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

export const entrarPorCodigo = async (codigo: string, userId: string) => {
  const normalized = normalizarCodigoEntrada(codigo);
  const { data: obra, error } = await supabase
    .from("obras")
    .select("*")
    .eq("codigo_compartilhamento", normalized)
    .single();

  if (error || !obra) throw new Error("Obra nao encontrada");

  await supabase
    .from("permissoes")
    .upsert({ obra_id: obra.id, user_id: userId, papel: "EDITOR" }, { onConflict: "obra_id,user_id" });
  await supabase
    .from("historico")
    .insert({ obra_id: obra.id, user_id: userId, acao: "ENTROU_OBRA", detalhes: { codigo } });
  return obra as Obra;
};

export const fetchObra = async (id: string): Promise<Obra | null> => {
  const { data, error } = await supabase.from("obras").select("*").eq("id", id).single();
  if (error) return null;
  return data as Obra;
};
