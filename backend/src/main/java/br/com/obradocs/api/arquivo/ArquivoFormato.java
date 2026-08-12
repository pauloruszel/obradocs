package br.com.obradocs.api.arquivo;

import lombok.Getter;

import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Getter
public enum ArquivoFormato {

    JPEG(Set.of("jpg", "jpeg"), "image/jpeg", AssinaturaEsperada.JPEG_SOI, megabytes(15), true, "JPEG"),
    PNG(Set.of("png"), "image/png", AssinaturaEsperada.PNG_SIGNATURE, megabytes(15), true, "PNG"),
    WEBP(Set.of("webp"), "image/webp", AssinaturaEsperada.RIFF_WEBP, megabytes(15), true, "WEBP"),
    HEIC(Set.of("heic"), "image/heic", AssinaturaEsperada.ISO_BMFF_HEIF, megabytes(15), false, "HEIF"),
    HEIF(Set.of("heif"), "image/heif", AssinaturaEsperada.ISO_BMFF_HEIF, megabytes(15), false, "HEIF"),
    PDF(Set.of("pdf"), "application/pdf", AssinaturaEsperada.PDF_HEADER, megabytes(50), true, "PDF"),
    DOCX(
            Set.of("docx"),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            AssinaturaEsperada.OOXML_DOCX_PACKAGE,
            megabytes(25),
            false,
            "DOCX"
    ),
    XLSX(
            Set.of("xlsx"),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            AssinaturaEsperada.OOXML_XLSX_PACKAGE,
            megabytes(25),
            false,
            "XLSX"
    ),
    CSV(Set.of("csv"), "text/csv", AssinaturaEsperada.CSV_TEXT, megabytes(25), false, "CSV"),
    DWG(Set.of("dwg"), "image/vnd.dwg", AssinaturaEsperada.DWG_VERSION_CODE, megabytes(100), false, "DWG"),
    DXF(Set.of("dxf"), "image/vnd.dxf", AssinaturaEsperada.DXF_SECTION_MARKER, megabytes(100), false, "DXF");

    private static final Map<String, ArquivoFormato> POR_EXTENSAO = criarIndicePorExtensao();
    private static final Map<String, ArquivoFormato> POR_MIME = criarIndicePorMime();

    private final Set<String> extensoes;
    private final String mimeCanonico;
    private final AssinaturaEsperada assinaturaEsperada;
    private final long limiteBytes;
    private final boolean visualizavel;
    private final String familiaRevisao;

    ArquivoFormato(
            Set<String> extensoes,
            String mimeCanonico,
            AssinaturaEsperada assinaturaEsperada,
            long limiteBytes,
            boolean visualizavel,
            String familiaRevisao
    ) {
        this.extensoes = extensoes;
        this.mimeCanonico = mimeCanonico;
        this.assinaturaEsperada = assinaturaEsperada;
        this.limiteBytes = limiteBytes;
        this.visualizavel = visualizavel;
        this.familiaRevisao = familiaRevisao;
    }

    public static Optional<ArquivoFormato> porNomeArquivo(String nomeArquivo) {
        if (nomeArquivo == null || nomeArquivo.isBlank()) {
            return Optional.empty();
        }

        int ultimoPonto = nomeArquivo.lastIndexOf('.');
        if (ultimoPonto < 0 || ultimoPonto == nomeArquivo.length() - 1) {
            return Optional.empty();
        }

        String extensao = nomeArquivo.substring(ultimoPonto + 1).toLowerCase(Locale.ROOT);
        return Optional.ofNullable(POR_EXTENSAO.get(extensao));
    }

    public static Optional<ArquivoFormato> porMimeCanonico(String mime) {
        if (mime == null || mime.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(POR_MIME.get(mime.toLowerCase(Locale.ROOT)));
    }

    public boolean compativelComRevisao(ArquivoFormato outro) {
        return outro != null && familiaRevisao.equals(outro.familiaRevisao);
    }

    private static Map<String, ArquivoFormato> criarIndicePorExtensao() {
        Map<String, ArquivoFormato> formatos = new HashMap<>();
        for (ArquivoFormato formato : values()) {
            for (String extensao : formato.extensoes) {
                formatos.put(extensao, formato);
            }
        }
        return Collections.unmodifiableMap(formatos);
    }

    private static Map<String, ArquivoFormato> criarIndicePorMime() {
        Map<String, ArquivoFormato> formatos = new HashMap<>();
        for (ArquivoFormato formato : values()) {
            formatos.put(formato.mimeCanonico.toLowerCase(Locale.ROOT), formato);
        }
        return Collections.unmodifiableMap(formatos);
    }

    private static long megabytes(long valor) {
        return valor * 1024 * 1024;
    }

    public enum AssinaturaEsperada {
        JPEG_SOI,
        PNG_SIGNATURE,
        RIFF_WEBP,
        ISO_BMFF_HEIF,
        PDF_HEADER,
        OOXML_DOCX_PACKAGE,
        OOXML_XLSX_PACKAGE,
        CSV_TEXT,
        DWG_VERSION_CODE,
        DXF_SECTION_MARKER
    }
}
