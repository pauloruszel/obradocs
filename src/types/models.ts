export type Papel = 'OWNER' | 'EDITOR' | 'VIEWER';
export type ArquivoTipo = 'ORCAMENTO' | 'NOTA_FISCAL' | 'PROJETO' | 'FOTO';

export type Profile = {
  id: string;
  nome: string;
  created_at?: string;
  email?: string;
  ativo?: boolean;
};

export type AuthUser = Profile & {
  email: string;
  ativo: boolean;
};

export type Session = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

export type Obra = {
  id: string;
  nome: string;
  codigo_compartilhamento: string;
  created_by: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
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
  content_type: string;
  tamanho_bytes: number;
  enviado_por: string | null;
  created_at?: string;
};

export type Historico = {
  id: string;
  obra_id: string;
  user_id: string | null;
  acao: string;
  detalhes: Record<string, unknown> | null;
  created_at?: string;
  profiles?: Profile | null;
};
