import { Papel, Permissao } from '@models/models';
import { supabase } from './supabase';

export const listarPermissoes = async (obraId: string): Promise<Permissao[]> => {
  const { data, error } = await supabase
    .from('permissoes')
    .select('*, profiles:profiles(id, nome, email)')
    .eq('obra_id', obraId);
  if (error) throw error;
  return data as any;
};

export const adicionarPermissao = async (obraId: string, userId: string, papel: Papel) => {
  const { error } = await supabase
    .from('permissoes')
    .upsert({ obra_id: obraId, user_id: userId, papel }, { onConflict: 'obra_id,user_id' });
  if (error) throw error;
};

export const atualizarPermissao = async (permissaoId: string, papel: Papel) => {
  const { error } = await supabase.from('permissoes').update({ papel }).eq('id', permissaoId);
  if (error) throw error;
};

export const removerPermissao = async (permissaoId: string) => {
  const { error } = await supabase.from('permissoes').delete().eq('id', permissaoId);
  if (error) throw error;
};

export const buscarUsuarioPorEmail = async (email: string) => {
  const { data, error } = await supabase.from('profiles').select('*').ilike('email', email);
  if (error) throw error;
  return data?.[0];
};
