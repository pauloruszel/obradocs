export type Papel = 'OWNER' | 'EDITOR' | 'VIEWER';
export type ArquivoTipo = 'ORCAMENTO' | 'NOTA_FISCAL' | 'PROJETO' | 'FOTO';
export type AprovacaoStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';
export type ObraTemplate =
  | 'GERAL'
  | 'ARQUITETURA'
  | 'INTERIORES'
  | 'ENGENHARIA'
  | 'REFORMA';

export type CategoriaObra = {
  id: string;
  obra_id: string;
  nome: string;
  tipo: ArquivoTipo;
  ordem: number;
  padrao: boolean;
  documentos: number;
};

export type ModeloCategoria = {
  id: string;
  nome: string;
  categorias: {
    nome: string;
    tipo: ArquivoTipo;
    ordem: number;
  }[];
};

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
  terms_accepted: boolean;
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
  template_codigo?: ObraTemplate;
  codigo_compartilhamento_ativo: boolean;
  codigo_compartilhamento_expira_em?: string | null;
  codigo_compartilhamento_papel: Exclude<Papel, "OWNER">;
};

export type Permissao = {
  id: string;
  obra_id: string;
  user_id: string;
  papel: Papel;
  created_at?: string;
  profiles?: Profile;
};

export type ObraConvite = {
  id: string;
  obra_id: string;
  email: string;
  papel: Exclude<Papel, "OWNER">;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expires_at: string;
  invited_by: string;
  accepted_by?: string | null;
  created_at: string;
  accepted_at?: string | null;
};

export type Arquivo = {
  id: string;
  documento_id: string;
  categoria_id: string;
  categoria_nome: string;
  ambiente?: string | null;
  documento_nome: string;
  obra_id: string;
  tipo: ArquivoTipo;
  nome_original: string;
  revisao: number;
  revisao_atual: number;
  atual: boolean;
  revisao_aprovada?: number | null;
  oficial_aprovada: boolean;
  aprovacao_status?: AprovacaoStatus | null;
  aprovacao_solicitada_por?: string | null;
  aprovacao_solicitada_at?: string | null;
  aprovacao_decidida_por?: string | null;
  aprovacao_decidida_at?: string | null;
  aprovacao_comentario?: string | null;
  storage_path: string;
  content_type: string;
  tamanho_bytes: number;
  enviado_por: string | null;
  enviado_por_nome?: string | null;
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
