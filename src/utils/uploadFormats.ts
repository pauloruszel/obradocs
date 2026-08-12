export type UploadFormat = {
  label: string;
  mime: string;
  maxBytes: number;
  previewImage: boolean;
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
