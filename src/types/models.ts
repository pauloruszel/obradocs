export type Papel = 'OWNER' | 'EDITOR' | 'VIEWER';
export type ArquivoTipo = 'ORCAMENTO' | 'NOTA_FISCAL' | 'PROJETO' | 'FOTO';

export type Profile = {
  id: string;
  nome: string;
  created_at?: string;
  email?: string;
};

export type Obra = {
  id: string;
  nome: string;
  codigo_compartilhamento: string;
  created_by: string;
  created_at?: string;
};

export type Permissao = {
  id: string;
  obra_id: string;
  user_id: string;
  papel: Papel;
  created_at?: string;
  profiles?: Profile;
};

export type Arquivo = {
  id: string;
  obra_id: string;
  tipo: ArquivoTipo;
  nome_original: string;
  storage_path: string;
  enviado_por: string;
  created_at?: string;
};

export type Historico = {
  id: string;
  obra_id: string;
  user_id: string;
  acao: string;
  detalhes: any;
  created_at?: string;
};
