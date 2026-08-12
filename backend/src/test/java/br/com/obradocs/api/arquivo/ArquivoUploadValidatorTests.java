package br.com.obradocs.api.arquivo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

class ArquivoUploadValidatorTests {

    private final ArquivoUploadValidator validator = new ArquivoUploadValidator();

    @ParameterizedTest
    @MethodSource("arquivosValidos")
    void aceitaConteudoValidoEIgnoraMimeInformado(
            String nome,
            byte[] conteudo,
            ArquivoFormato formato) {
        MockMultipartFile arquivo = arquivo(nome, "application/x-mime-incorreto", conteudo);

        ArquivoUploadValidator.ArquivoValidado validado = validator.validar(arquivo);

        assertThat(validado.nome()).isEqualTo(nome);
        assertThat(validado.formato()).isEqualTo(formato);
        assertThat(validado.contentType()).isEqualTo(formato.getMimeCanonico());
    }

    @ParameterizedTest
    @MethodSource("arquivosInvalidos")
    void rejeitaConteudoQueNaoCorrespondeAoFormato(String nome, byte[] conteudo) {
        assertThatThrownBy(() -> validator.validar(arquivo(nome, "application/octet-stream", conteudo)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejeitaPacoteOfficeComEstruturaErradaOuCaminhoPerigoso() throws IOException {
        byte[] docxComXl = pacoteOffice("xl/workbook.xml");
        byte[] docxComTraversal = pacoteOffice("word/../../arquivo.xml");

        assertThatThrownBy(() -> validator.validar(arquivo("documento.docx", null, docxComXl)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Estrutura interna");
        assertThatThrownBy(() -> validator.validar(arquivo("documento.docx", null, docxComTraversal)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("caminho inválido");
    }

    @Test
    void rejeitaNomeInseguroEExtensaoNaoPermitida() {
        assertThatThrownBy(() -> validator.validar(arquivo("../projeto.pdf", null, pdf())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Nome do arquivo inválido");
        assertThatThrownBy(() -> validator.validar(arquivo("projeto.exe", null, pdf())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Extensão de arquivo não permitida");
        assertThatThrownBy(() -> validator.validar(arquivo("documentos.zip", null, new byte[] {'P', 'K', 3, 4})))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Extensão de arquivo não permitida");
    }

    @Test
    void rejeitaArquivoAcimaDoLimiteAntesDeLerConteudo() throws IOException {
        MultipartFile arquivo = mock(MultipartFile.class);
        when(arquivo.isEmpty()).thenReturn(false);
        when(arquivo.getSize()).thenReturn(ArquivoFormato.JPEG.getLimiteBytes() + 1);
        when(arquivo.getOriginalFilename()).thenReturn("foto.jpg");

        assertThatThrownBy(() -> validator.validar(arquivo))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("limite de 15 MB");
        verify(arquivo, never()).getInputStream();
    }

    @Test
    void permiteRevisaoDaMesmaFamiliaERejeitaFormatoDiferente() {
        ArquivoUploadValidator.ArquivoValidado heif = validator.validar(
                arquivo("foto.heif", null, heif("mif1")));
        ArquivoUploadValidator.ArquivoValidado pdf = validator.validar(
                arquivo("projeto.pdf", null, pdf()));

        validator.validarCompatibilidadeRevisao(heif, "foto.heic", "image/heic");
        assertThatThrownBy(() -> validator.validarCompatibilidadeRevisao(
                pdf,
                "foto.jpg",
                "image/jpeg"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("manter o formato");
    }

    @Test
    void validaExtensaoAoRenomearSemConfiarEmMaiusculas() {
        validator.validarExtensao("PLANTA.DWG", "image/vnd.dwg");

        assertThatThrownBy(() -> validator.validarExtensao("planta.pdf", "image/vnd.dwg"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("não corresponde");
    }

    private static Stream<Arguments> arquivosValidos() throws IOException {
        return Stream.of(
                Arguments.of("projeto.pdf", pdf(), ArquivoFormato.PDF),
                Arguments.of("foto.jpg", jpeg(), ArquivoFormato.JPEG),
                Arguments.of("imagem.png", png(), ArquivoFormato.PNG),
                Arguments.of("imagem.webp", webp(), ArquivoFormato.WEBP),
                Arguments.of("foto.heic", heif("heic"), ArquivoFormato.HEIC),
                Arguments.of("foto.heif", heif("mif1"), ArquivoFormato.HEIF),
                Arguments.of("memorial.docx", pacoteOffice("word/document.xml"), ArquivoFormato.DOCX),
                Arguments.of("orcamento.xlsx", pacoteOffice("xl/workbook.xml"), ArquivoFormato.XLSX),
                Arguments.of("itens.csv", "item,valor\nCimento,42\n".getBytes(StandardCharsets.UTF_8), ArquivoFormato.CSV),
                Arguments.of("planta.dwg", "AC1032dados".getBytes(StandardCharsets.US_ASCII), ArquivoFormato.DWG),
                Arguments.of("planta.dxf", "0\nSECTION\n2\nHEADER\n0\nEOF\n".getBytes(StandardCharsets.US_ASCII), ArquivoFormato.DXF),
                Arguments.of("planta-binaria.dxf", "AutoCAD Binary DXF\r\n\u001a\0dados".getBytes(StandardCharsets.US_ASCII), ArquivoFormato.DXF));
    }

    private static Stream<Arguments> arquivosInvalidos() {
        return Stream.of(
                Arguments.of("projeto.pdf", "nao-pdf".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("foto.jpg", png()),
                Arguments.of("imagem.png", jpeg()),
                Arguments.of("imagem.webp", "RIFF1234ERRO".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("foto.heic", heif("xxxx")),
                Arguments.of("memorial.docx", "nao-zip".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("orcamento.xlsx", "nao-zip".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("itens.csv", new byte[] {'a', 0, 'b'}),
                Arguments.of("planta.dwg", "AC1099dados".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("planta.dxf", "conteudo qualquer".getBytes(StandardCharsets.US_ASCII)));
    }

    private static MockMultipartFile arquivo(String nome, String mime, byte[] conteudo) {
        return new MockMultipartFile("arquivo", nome, mime, conteudo);
    }

    private static byte[] pdf() {
        return "%PDF-1.7\nconteudo".getBytes(StandardCharsets.US_ASCII);
    }

    private static byte[] jpeg() {
        return new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 0, 1};
    }

    private static byte[] png() {
        return new byte[] {
                (byte) 0x89, 'P', 'N', 'G', (byte) 0x0d, (byte) 0x0a, (byte) 0x1a, (byte) 0x0a, 0
        };
    }

    private static byte[] webp() {
        return new byte[] {'R', 'I', 'F', 'F', 4, 0, 0, 0, 'W', 'E', 'B', 'P'};
    }

    private static byte[] heif(String brand) {
        byte[] header = new byte[24];
        header[3] = 24;
        System.arraycopy("ftyp".getBytes(StandardCharsets.US_ASCII), 0, header, 4, 4);
        System.arraycopy(brand.getBytes(StandardCharsets.US_ASCII), 0, header, 8, 4);
        return header;
    }

    private static byte[] pacoteOffice(String entradaObrigatoria) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            adicionarEntrada(zip, "[Content_Types].xml", "<Types/>");
            adicionarEntrada(zip, entradaObrigatoria, "conteudo");
        }
        return bytes.toByteArray();
    }

    private static void adicionarEntrada(ZipOutputStream zip, String nome, String conteudo)
            throws IOException {
        zip.putNextEntry(new ZipEntry(nome));
        zip.write(conteudo.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }
}
