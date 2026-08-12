package br.com.obradocs.api.arquivo;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ArquivoFormatoTests {

    @Test
    void deveReconhecerExtensoesPermitidasSemDiferenciarMaiusculas() {
        Map<String, ArquivoFormato> casos = Map.ofEntries(
                Map.entry("foto.JPG", ArquivoFormato.JPEG),
                Map.entry("foto.jpeg", ArquivoFormato.JPEG),
                Map.entry("imagem.PNG", ArquivoFormato.PNG),
                Map.entry("imagem.webp", ArquivoFormato.WEBP),
                Map.entry("foto.HEIC", ArquivoFormato.HEIC),
                Map.entry("foto.heif", ArquivoFormato.HEIF),
                Map.entry("projeto.pdf", ArquivoFormato.PDF),
                Map.entry("memorial.docx", ArquivoFormato.DOCX),
                Map.entry("orcamento.xlsx", ArquivoFormato.XLSX),
                Map.entry("itens.csv", ArquivoFormato.CSV),
                Map.entry("planta.dwg", ArquivoFormato.DWG),
                Map.entry("planta.DXF", ArquivoFormato.DXF)
        );

        casos.forEach((nome, esperado) ->
                assertThat(ArquivoFormato.porNomeArquivo(nome)).contains(esperado));
    }

    @Test
    void deveDefinirMimesLimitesEVisualizacaoDoCatalogo() {
        assertThat(ArquivoFormato.JPEG.getMimeCanonico()).isEqualTo("image/jpeg");
        assertThat(ArquivoFormato.HEIC.getMimeCanonico()).isEqualTo("image/heic");
        assertThat(ArquivoFormato.HEIF.getMimeCanonico()).isEqualTo("image/heif");
        assertThat(ArquivoFormato.DWG.getMimeCanonico()).isEqualTo("image/vnd.dwg");
        assertThat(ArquivoFormato.DXF.getMimeCanonico()).isEqualTo("image/vnd.dxf");

        assertThat(ArquivoFormato.JPEG.getLimiteBytes()).isEqualTo(megabytes(15));
        assertThat(ArquivoFormato.HEIC.getLimiteBytes()).isEqualTo(megabytes(15));
        assertThat(ArquivoFormato.PDF.getLimiteBytes()).isEqualTo(megabytes(50));
        assertThat(ArquivoFormato.DOCX.getLimiteBytes()).isEqualTo(megabytes(25));
        assertThat(ArquivoFormato.DWG.getLimiteBytes()).isEqualTo(megabytes(100));

        assertThat(formatosVisualizaveis())
                .containsExactlyInAnyOrder(
                        ArquivoFormato.JPEG,
                        ArquivoFormato.PNG,
                        ArquivoFormato.WEBP,
                        ArquivoFormato.PDF
                );
    }

    @Test
    void devePermitirRevisoesApenasDaMesmaFamilia() {
        assertThat(ArquivoFormato.JPEG.compativelComRevisao(ArquivoFormato.JPEG)).isTrue();
        assertThat(ArquivoFormato.HEIC.compativelComRevisao(ArquivoFormato.HEIF)).isTrue();
        assertThat(ArquivoFormato.HEIF.compativelComRevisao(ArquivoFormato.HEIC)).isTrue();
        assertThat(ArquivoFormato.PDF.compativelComRevisao(ArquivoFormato.DOCX)).isFalse();
        assertThat(ArquivoFormato.PDF.compativelComRevisao(null)).isFalse();
    }

    @Test
    void deveBloquearFormatosForaDoEscopo() {
        Set<String> bloqueados = Set.of(
                "arquivo.zip",
                "macro.docm",
                "macro.xlsm",
                "modelo.rvt",
                "modelo.ifc",
                "modelo.skp",
                "video.mp4",
                "programa.exe"
        );

        bloqueados.forEach(nome -> assertThat(ArquivoFormato.porNomeArquivo(nome)).isEmpty());
        assertThat(ArquivoFormato.porNomeArquivo(null)).isEmpty();
        assertThat(ArquivoFormato.porNomeArquivo("sem-extensao")).isEmpty();
        assertThat(ArquivoFormato.porNomeArquivo("arquivo.")).isEmpty();
    }

    @Test
    void deveManterCatalogoCompleto() {
        for (ArquivoFormato formato : ArquivoFormato.values()) {
            assertThat(formato.getExtensoes()).isNotEmpty();
            assertThat(formato.getMimeCanonico()).isNotBlank();
            assertThat(formato.getAssinaturaEsperada()).isNotNull();
            assertThat(formato.getLimiteBytes()).isPositive();
            assertThat(formato.getFamiliaRevisao()).isNotBlank();
        }
    }

    private static Set<ArquivoFormato> formatosVisualizaveis() {
        return Set.of(ArquivoFormato.values()).stream()
                .filter(ArquivoFormato::isVisualizavel)
                .collect(java.util.stream.Collectors.toSet());
    }

    private static long megabytes(long valor) {
        return valor * 1024 * 1024;
    }
}
