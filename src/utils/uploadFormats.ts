export type UploadFormat = {
  label: string;
  mime: string;
  maxBytes: number;
  previewImage: boolean;
};

export type UploadErrorFeedback = {
  title: string;
  message: string;
};

const MB = 1024 * 1024;

const FORMATS: Record<string, UploadFormat> = {
  jpg: { label: "JPEG", mime: "image/jpeg", maxBytes: 15 * MB, previewImage: true },
  jpeg: { label: "JPEG", mime: "image/jpeg", maxBytes: 15 * MB, previewImage: true },
  png: { label: "PNG", mime: "image/png", maxBytes: 15 * MB, previewImage: true },
  webp: { label: "WEBP", mime: "image/webp", maxBytes: 15 * MB, previewImage: true },
  heic: { label: "HEIC", mime: "image/heic", maxBytes: 15 * MB, previewImage: false },
  heif: { label: "HEIF", mime: "image/heif", maxBytes: 15 * MB, previewImage: false },
  pdf: { label: "PDF", mime: "application/pdf", maxBytes: 50 * MB, previewImage: false },
  docx: {
    label: "DOCX",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    maxBytes: 25 * MB,
    previewImage: false,
  },
  xlsx: {
    label: "XLSX",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    maxBytes: 25 * MB,
    previewImage: false,
  },
  csv: { label: "CSV", mime: "text/csv", maxBytes: 25 * MB, previewImage: false },
  dwg: { label: "DWG", mime: "image/vnd.dwg", maxBytes: 100 * MB, previewImage: false },
  dxf: { label: "DXF", mime: "image/vnd.dxf", maxBytes: 100 * MB, previewImage: false },
};

export const uploadFormatFor = (name: string): UploadFormat | undefined => {
  const extension = name.toLowerCase().split(".").pop();
  return extension ? FORMATS[extension] : undefined;
};

export const uploadLimitLabel = (format: UploadFormat): string =>
  `${Math.round(format.maxBytes / MB)} MB`;

export const canPreviewUpload = (name: string, mime?: string): boolean => {
  const format = uploadFormatFor(name);
  if (format) return format.previewImage || format.mime === "application/pdf";
  return mime === "application/pdf" || ["image/jpeg", "image/png", "image/webp"].includes(mime || "");
};

export const UPLOAD_FORMATS_DESCRIPTION =
  "JPG, JPEG, PNG, WEBP, HEIC e HEIF: até 15 MB; DOCX, XLSX e CSV: até 25 MB; PDF: até 50 MB; DWG e DXF: até 100 MB.";

export const uploadErrorFeedback = (
  code?: string,
  serverMessage?: string,
): UploadErrorFeedback | undefined => {
  if (code === "UPLOAD_TOO_LARGE") {
    return {
      title: "Arquivo muito grande",
      message: "O arquivo ultrapassa o limite permitido para esse formato.",
    };
  }
  if (code === "INVALID_REQUEST") {
    return {
      title: "Arquivo não aceito",
      message: serverMessage || "Verifique o formato e tente novamente.",
    };
  }
  return undefined;
};
