import { Historico } from '@models/models';
import { supabase } from './supabase';

export const listarHistorico = async (obraId: string): Promise<Historico[]> => {
  const { data, error } = await supabase
    .from('historico')
    .select('*, profiles:profiles(id, nome)')
    .eq('obra_id', obraId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any;
};
