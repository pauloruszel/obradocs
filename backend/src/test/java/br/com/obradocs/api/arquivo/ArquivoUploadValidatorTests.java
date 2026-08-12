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
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

class ArquivoUploadValidatorTests {

    private final ArquivoUploadValidator validator = new ArquivoUploadValidator(true);

    @Test
    void flagDesligadaMantemPdfEJpegEBloqueiaFormatosExpandidos() {
        ArquivoUploadValidator legado = new ArquivoUploadValidator(false);

        assertThat(legado.validar(arquivo("projeto.pdf", null, pdf())).formato())
                .isEqualTo(ArquivoFormato.PDF);
        assertThat(legado.validar(arquivo("foto.jpg", null, jpeg())).formato())
                .isEqualTo(ArquivoFormato.JPEG);
        assertThatThrownBy(() -> legado.validar(arquivo("imagem.png", null, png())))
                .isInstanceOf(FormatosExpandidosDesabilitadosException.class);
    }

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
        byte[] docxComXl = pacoteOffice(ArquivoFormato.XLSX);
        byte[] docxComTraversal = pacoteOffice(ArquivoFormato.DOCX, "word/../../arquivo.xml");
        byte[] xlsxComRelacionamentoIncorreto = pacoteXlsxComRelacionamento("rIdInexistente");

        assertThatThrownBy(() -> validator.validar(arquivo("documento.docx", null, docxComXl)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Estrutura interna");
        assertThatThrownBy(() -> validator.validar(arquivo("documento.docx", null, docxComTraversal)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("caminho inválido");
        assertThatThrownBy(() -> validator.validar(arquivo("planilha.xlsx", null, xlsxComRelacionamentoIncorreto)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Estrutura interna");
    }

    @Test
    void rejeitaZipComumRenomeadoParaOfficeEMacroOculta() throws IOException {
        byte[] zipDisfarcado = pacoteZipGenerico();
        byte[] docxComMacro = pacoteOffice(ArquivoFormato.DOCX, "word/vbaProject.bin");
        byte[] docxComVbaDeclarado = pacoteOfficeComContentType(
                ArquivoFormato.DOCX,
                "application/vnd.ms-office.vbaProject");

        assertThatThrownBy(() -> validator.validar(arquivo("documento.docx", null, zipDisfarcado)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Estrutura interna");
        assertThatThrownBy(() -> validator.validar(arquivo("documento.docx", null, docxComMacro)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("macros");
        assertThatThrownBy(() -> validator.validar(arquivo("documento.docx", null, docxComVbaDeclarado)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("macros");
    }

    @Test
    void rejeitaConteudoAtivoDentroDoPacoteOffice() throws IOException {
        byte[] docxComExecutavel = pacoteOffice(ArquivoFormato.DOCX, "word/embeddings/programa.exe");

        assertThatThrownBy(() -> validator.validar(arquivo("documento.docx", null, docxComExecutavel)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("conteúdo ativo");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "arquivo.zip", "arquivo.rar", "arquivo.7z", "arquivo.tar", "arquivo.gz",
            "arquivo.exe", "arquivo.dll", "arquivo.msi", "arquivo.apk", "arquivo.jar",
            "arquivo.bat", "arquivo.ps1", "arquivo.sh", "arquivo.js",
            "arquivo.docm", "arquivo.xlsm"
    })
    void rejeitaExplicitamenteExtensoesPerigosas(String nome) {
        assertThatThrownBy(() -> validator.validar(arquivo(nome, null, pdf())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("não são permitidos");
    }

    @Test
    void rejeitaExtensaoDuplaEByteNuloSemBloquearNomeComPontos() {
        assertThatThrownBy(() -> validator.validar(arquivo("projeto.jpg.pdf", null, pdf())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Extensões duplas");
        assertThatThrownBy(() -> validator.validar(arquivo("programa.exe.final.pdf", null, pdf())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Extensões duplas");
        assertThatThrownBy(() -> validator.validar(arquivo("projeto\0.pdf", null, pdf())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("byte nulo");

        assertThat(validator.validar(arquivo("projeto.final.pdf", null, pdf())).nome())
                .isEqualTo("projeto.final.pdf");
    }

    @Test
    void rejeitaNomeInseguroEExtensaoNaoPermitida() {
        assertThatThrownBy(() -> validator.validar(arquivo("../projeto.pdf", null, pdf())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Nome do arquivo inválido");
        assertThatThrownBy(() -> validator.validar(arquivo("projeto.exe", null, pdf())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Executáveis");
        assertThatThrownBy(() -> validator.validar(arquivo("documentos.zip", null, new byte[] {'P', 'K', 3, 4})))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("compactados");
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
    void comparaRevisaoPeloFormatoCanonicoDetectado() {
        ArquivoUploadValidator.ArquivoValidado heif = validator.validar(
                arquivo("foto.heif", null, heif("mif1")));
        ArquivoUploadValidator.ArquivoValidado pdf = validator.validar(
                arquivo("projeto.pdf", "image/jpeg", pdf()));

        validator.validarCompatibilidadeRevisao(pdf, "application/pdf");
        assertThatThrownBy(() -> validator.validarCompatibilidadeRevisao(
                heif,
                "image/heic"))
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
                Arguments.of("memorial.docx", pacoteOffice(ArquivoFormato.DOCX), ArquivoFormato.DOCX),
                Arguments.of("orcamento.xlsx", pacoteOffice(ArquivoFormato.XLSX), ArquivoFormato.XLSX),
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

    private static byte[] pacoteOffice(ArquivoFormato formato, String... entradasExtras) throws IOException {
        return pacoteOffice(formato, null, "rId1", entradasExtras);
    }

    private static byte[] pacoteOfficeComContentType(ArquivoFormato formato, String contentTypeExtra)
            throws IOException {
        return pacoteOffice(formato, contentTypeExtra, "rId1", new String[0]);
    }

    private static byte[] pacoteXlsxComRelacionamento(String relacionamento) throws IOException {
        return pacoteOffice(ArquivoFormato.XLSX, null, relacionamento, new String[0]);
    }

    private static byte[] pacoteOffice(
            ArquivoFormato formato,
            String contentTypeExtra,
            String relacionamentoPlanilha,
            String... entradasExtras) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            String contentType = formato == ArquivoFormato.DOCX
                    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
                    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
            String parte = formato == ArquivoFormato.DOCX ? "/word/document.xml" : "/xl/workbook.xml";
            String alvo = formato == ArquivoFormato.DOCX ? "word/document.xml" : "xl/workbook.xml";
            adicionarEntrada(zip, "[Content_Types].xml", """
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                      <Override PartName="%s" ContentType="%s"/>
                      %s
                    </Types>
                    """.formatted(
                            parte,
                            contentType,
                            contentTypeExtra == null
                                    ? ""
                                    : "<Override PartName=\"/conteudo.bin\" ContentType=\"%s\"/>"
                                            .formatted(contentTypeExtra)));
            adicionarEntrada(zip, "_rels/.rels", """
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1"
                        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
                        Target="%s"/>
                    </Relationships>
                    """.formatted(alvo));
            if (formato == ArquivoFormato.DOCX) {
                adicionarEntrada(zip, "word/document.xml", """
                        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                          <w:body><w:p/></w:body>
                        </w:document>
                        """);
            } else {
                adicionarEntrada(zip, "xl/workbook.xml", """
                        <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
                                  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                          <sheets><sheet name="Planilha1" sheetId="1" r:id="%s"/></sheets>
                        </workbook>
                        """.formatted(relacionamentoPlanilha));
                adicionarEntrada(zip, "xl/_rels/workbook.xml.rels", """
                        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                          <Relationship Id="rId1"
                            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
                            Target="worksheets/sheet1.xml"/>
                        </Relationships>
                        """);
                adicionarEntrada(zip, "xl/worksheets/sheet1.xml", """
                        <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>
                        """);
            }
            for (String entrada : entradasExtras) {
                adicionarEntrada(zip, entrada, "conteudo");
            }
        }
        return bytes.toByteArray();
    }

    private static byte[] pacoteZipGenerico() throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            adicionarEntrada(zip, "[Content_Types].xml", "<Types/>");
            adicionarEntrada(zip, "word/arquivo.txt", "não é um documento Office");
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
