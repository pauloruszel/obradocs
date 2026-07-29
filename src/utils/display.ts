import { ArquivoTipo, Papel } from "@models/models";

export const papelLabel: Record<Papel, string> = {
  OWNER: "Proprietário",
  EDITOR: "Editor",
  VIEWER: "Visualizador",
};

export const arquivoTipoLabel: Record<ArquivoTipo, string> = {
  ORCAMENTO: "Orçamento",
  NOTA_FISCAL: "Nota fiscal",
  PROJETO: "Projeto",
  FOTO: "Foto",
};

export const formatFileName = (name: string): string => {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

export const formatDateTime = (value?: string): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const formatTime = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
