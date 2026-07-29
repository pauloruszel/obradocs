export const validateEmail = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Informe seu e-mail.";
  return /\S+@\S+\.\S+/.test(trimmed) ? "" : "E-mail inválido.";
};

export const validateNewPassword = (value: string) => {
  if (value.length < 8 || value.length > 72) {
    return "Use entre 8 e 72 caracteres.";
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    return "Inclua letra maiúscula, minúscula e número.";
  }
  return "";
};
