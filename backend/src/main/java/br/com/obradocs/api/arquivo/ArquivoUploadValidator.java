package br.com.obradocs.api.arquivo;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

@Component
class ArquivoUploadValidator {

    private static final byte[] PDF_HEADER = {'%', 'P', 'D', 'F', '-'};
    private static final byte[] JPEG_HEADER = {(byte) 0xff, (byte) 0xd8, (byte) 0xff};
    private static final byte[] PNG_HEADER = {
            (byte) 0x89, 'P', 'N', 'G', (byte) 0x0d, (byte) 0x0a, (byte) 0x1a, (byte) 0x0a
    };
    private static final byte[] BINARY_DXF_HEADER = "AutoCAD Binary DXF\r\n\u001a\0"
            .getBytes(StandardCharsets.US_ASCII);
    private static final Set<String> HEIF_BRANDS = Set.of(
            "heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1");
    private static final Set<String> DWG_VERSIONS = Set.of(
            "AC1006", "AC1009", "AC1012", "AC1014", "AC1015", "AC1018",
            "AC1021", "AC1024", "AC1027", "AC1032");
    private static final int MAX_ZIP_ENTRIES = 10_000;
    private static final long MAX_ZIP_EXPANDED_BYTES = 250L * 1024 * 1024;
    private static final int MAX_OFFICE_XML_BYTES = 1024 * 1024;
    private static final String CONTENT_TYPES_NAMESPACE =
            "http://schemas.openxmlformats.org/package/2006/content-types";
    private static final String RELATIONSHIPS_NAMESPACE =
            "http://schemas.openxmlformats.org/package/2006/relationships";
    private static final String OFFICE_RELATIONSHIPS_NAMESPACE =
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private static final String WORD_NAMESPACE =
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    private static final String SPREADSHEET_NAMESPACE =
            "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static final Set<String> EXTENSOES_COMPACTADAS = Set.of(
            "zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz");
    private static final Set<String> EXTENSOES_EXECUTAVEIS = Set.of(
            "exe", "dll", "so", "dylib", "com", "scr", "sys", "msi", "msp", "msix",
            "appx", "appxbundle", "dmg", "pkg", "deb", "rpm", "apk", "jar");
    private static final Set<String> EXTENSOES_SCRIPTS = Set.of(
            "bat", "cmd", "ps1", "sh", "bash", "zsh", "js", "mjs", "cjs", "vbs", "vbe",
            "wsf", "wsh", "php", "py", "rb", "pl", "groovy");
    private static final Set<String> EXTENSOES_COM_MACRO = Set.of(
            "docm", "dotm", "xlsm", "xlam", "xlsb", "xltm", "pptm", "potm", "ppam", "sldm");
    private static final Set<String> EXTENSOES_CONHECIDAS = criarExtensoesConhecidas();

    ArquivoValidado validar(MultipartFile multipart) {
        if (multipart == null || multipart.isEmpty() || multipart.getSize() <= 0) {
            throw new IllegalArgumentException("Arquivo vazio");
        }

        String nome = validarNome(multipart.getOriginalFilename());
        ArquivoFormato formato = ArquivoFormato.porNomeArquivo(nome)
                .orElseThrow(() -> extensaoNaoPermitida(nome));
        if (multipart.getSize() > formato.getLimiteBytes()) {
            throw new IllegalArgumentException(
                    "Arquivo muito grande; limite de " + formato.getLimiteBytes() / 1024 / 1024 + " MB");
        }

        validarConteudo(multipart, formato);
        return new ArquivoValidado(nome, formato.getMimeCanonico(), formato);
    }

    void validarCompatibilidadeRevisao(
            ArquivoValidado novaRevisao,
            String nomeAnterior,
            String mimeAnterior) {
        ArquivoFormato formatoAnterior = ArquivoFormato.porNomeArquivo(nomeAnterior)
                .or(() -> ArquivoFormato.porMimeCanonico(mimeAnterior))
                .orElseThrow(() -> new IllegalArgumentException("Formato do documento original não reconhecido"));
        if (!formatoAnterior.compativelComRevisao(novaRevisao.formato())) {
            throw new IllegalArgumentException("Nova revisão deve manter o formato do documento");
        }
    }

    String validarNome(String nomeOriginal) {
        if (nomeOriginal == null || nomeOriginal.isBlank()) {
            throw new IllegalArgumentException("Nome do arquivo obrigatório");
        }
        String nome = nomeOriginal.trim();
        if (nome.indexOf('\0') >= 0) {
            throw new IllegalArgumentException("Nome do arquivo contém byte nulo");
        }
        if (nome.length() > 255
                || nome.equals(".")
                || nome.equals("..")
                || nome.indexOf('/') >= 0
                || nome.indexOf('\\') >= 0
                || nome.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Nome do arquivo inválido");
        }
        validarExtensaoDupla(nome);
        return nome;
    }

    void validarExtensao(String nome, String mimeCanonico) {
        ArquivoFormato esperado = ArquivoFormato.porMimeCanonico(mimeCanonico)
                .orElseThrow(() -> new IllegalArgumentException("Formato do documento não reconhecido"));
        ArquivoFormato informado = ArquivoFormato.porNomeArquivo(validarNome(nome))
                .orElseThrow(() -> extensaoNaoPermitida(nome));
        if (!esperado.compativelComRevisao(informado)) {
            throw new IllegalArgumentException("Extensão do arquivo não corresponde ao conteúdo");
        }
    }

    private void validarConteudo(MultipartFile multipart, ArquivoFormato formato) {
        try {
            switch (formato) {
                case PDF -> exigirPrefixo(multipart, PDF_HEADER);
                case JPEG -> exigirPrefixo(multipart, JPEG_HEADER);
                case PNG -> exigirPrefixo(multipart, PNG_HEADER);
                case WEBP -> validarWebp(multipart);
                case HEIC, HEIF -> validarHeif(multipart);
                case DOCX, XLSX -> validarOoxml(multipart, formato);
                case CSV -> validarCsv(multipart);
                case DWG -> validarDwg(multipart);
                case DXF -> validarDxf(multipart);
            }
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new IllegalArgumentException("Arquivo inválido ou corrompido", exception);
        }
    }

    private void exigirPrefixo(MultipartFile multipart, byte[] esperado) throws IOException {
        try (InputStream input = multipart.getInputStream()) {
            if (!Arrays.equals(input.readNBytes(esperado.length), esperado)) {
                throw assinaturaInvalida();
            }
        }
    }

    private void validarWebp(MultipartFile multipart) throws IOException {
        byte[] header = lerCabecalho(multipart, 12);
        if (header.length < 12
                || !ascii(header, 0, 4).equals("RIFF")
                || !ascii(header, 8, 4).equals("WEBP")) {
            throw assinaturaInvalida();
        }
    }

    private void validarHeif(MultipartFile multipart) throws IOException {
        byte[] header = lerCabecalho(multipart, 64);
        if (header.length < 12 || !ascii(header, 4, 4).equals("ftyp")) {
            throw assinaturaInvalida();
        }
        for (int offset = 8; offset + 4 <= header.length; offset += 4) {
            if (HEIF_BRANDS.contains(ascii(header, offset, 4).toLowerCase(Locale.ROOT))) {
                return;
            }
        }
        throw assinaturaInvalida();
    }

    private void validarOoxml(MultipartFile multipart, ArquivoFormato formato) throws IOException {
        int entradas = 0;
        long totalExpandido = 0;
        Set<String> nomes = new HashSet<>();
        byte[] contentTypes = null;
        byte[] relacionamentos = null;
        byte[] documentoPrincipal = null;
        byte[] relacionamentosWorkbook = null;
        byte[] buffer = new byte[8192];

        try (ZipInputStream zip = new ZipInputStream(multipart.getInputStream())) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (++entradas > MAX_ZIP_ENTRIES) {
                    throw new IllegalArgumentException("Pacote Office possui entradas demais");
                }
                String nome = entry.getName().replace('\\', '/');
                if (caminhoInternoInvalido(nome)) {
                    throw new IllegalArgumentException("Pacote Office contém caminho inválido");
                }
                if (!nomes.add(nome)) {
                    throw new IllegalArgumentException("Pacote Office contém entradas duplicadas");
                }
                if (entradaComMacro(nome)) {
                    throw new IllegalArgumentException("Arquivos com macros não são permitidos");
                }
                if (entradaOfficeComConteudoAtivo(nome)) {
                    throw new IllegalArgumentException("Pacote Office contém conteúdo ativo não permitido");
                }

                boolean xmlNecessario = "[Content_Types].xml".equals(nome)
                        || "_rels/.rels".equals(nome)
                        || (formato == ArquivoFormato.DOCX && "word/document.xml".equals(nome))
                        || (formato == ArquivoFormato.XLSX && "xl/workbook.xml".equals(nome))
                        || (formato == ArquivoFormato.XLSX && "xl/_rels/workbook.xml.rels".equals(nome));
                ByteArrayOutputStream xml = xmlNecessario ? new ByteArrayOutputStream() : null;

                int lidos;
                while ((lidos = zip.read(buffer)) != -1) {
                    totalExpandido += lidos;
                    if (totalExpandido > MAX_ZIP_EXPANDED_BYTES) {
                        throw new IllegalArgumentException("Pacote Office excede o limite de conteúdo interno");
                    }
                    if (xml != null) {
                        if (xml.size() + lidos > MAX_OFFICE_XML_BYTES) {
                            throw new IllegalArgumentException("XML interno do pacote Office é muito grande");
                        }
                        xml.write(buffer, 0, lidos);
                    }
                }
                if (xml != null) {
                    byte[] valor = xml.toByteArray();
                    switch (nome) {
                        case "[Content_Types].xml" -> contentTypes = valor;
                        case "_rels/.rels" -> relacionamentos = valor;
                        case "word/document.xml", "xl/workbook.xml" -> documentoPrincipal = valor;
                        case "xl/_rels/workbook.xml.rels" -> relacionamentosWorkbook = valor;
                        default -> { }
                    }
                }
                zip.closeEntry();
            }
        }
        if (entradas == 0 || contentTypes == null || relacionamentos == null || documentoPrincipal == null
                || (formato == ArquivoFormato.XLSX && relacionamentosWorkbook == null)) {
            throw new IllegalArgumentException("Estrutura interna do pacote Office inválida");
        }
        validarTiposOffice(contentTypes, formato);
        validarRelacionamentoPrincipal(relacionamentos, formato);
        String relacionamentoPlanilha = validarDocumentoPrincipal(documentoPrincipal, formato);
        if (formato == ArquivoFormato.XLSX) {
            validarPlanilhas(relacionamentosWorkbook, nomes, relacionamentoPlanilha);
        }
    }

    private void validarTiposOffice(byte[] xml, ArquivoFormato formato) {
        Document document = lerXmlSeguro(xml);
        if (!elementoRaiz(document, CONTENT_TYPES_NAMESPACE, "Types")) {
            throw estruturaOfficeInvalida();
        }
        String parte = formato == ArquivoFormato.DOCX ? "/word/document.xml" : "/xl/workbook.xml";
        String tipo = formato == ArquivoFormato.DOCX
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
                : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
        boolean encontrado = false;
        NodeList tiposDeclarados = document.getElementsByTagNameNS(CONTENT_TYPES_NAMESPACE, "*");
        for (int i = 0; i < tiposDeclarados.getLength(); i++) {
            Element declaracao = (Element) tiposDeclarados.item(i);
            String contentType = declaracao.getAttribute("ContentType");
            String tipoNormalizado = contentType.toLowerCase(Locale.ROOT);
            if (tipoNormalizado.contains("macroenabled")
                    || tipoNormalizado.contains("vbaproject")
                    || tipoNormalizado.contains("macrosheet")) {
                throw new IllegalArgumentException("Arquivos com macros não são permitidos");
            }
            encontrado |= "Override".equals(declaracao.getLocalName())
                    && parte.equals(declaracao.getAttribute("PartName"))
                    && tipo.equals(contentType);
        }
        if (!encontrado) {
            throw estruturaOfficeInvalida();
        }
    }

    private void validarRelacionamentoPrincipal(byte[] xml, ArquivoFormato formato) {
        Document document = lerXmlSeguro(xml);
        if (!elementoRaiz(document, RELATIONSHIPS_NAMESPACE, "Relationships")) {
            throw estruturaOfficeInvalida();
        }
        String alvo = formato == ArquivoFormato.DOCX ? "word/document.xml" : "xl/workbook.xml";
        NodeList relacionamentos = document.getElementsByTagNameNS(RELATIONSHIPS_NAMESPACE, "Relationship");
        for (int i = 0; i < relacionamentos.getLength(); i++) {
            Element relacionamento = (Element) relacionamentos.item(i);
            if (relacionamento.getAttribute("Type").endsWith("/officeDocument")
                    && alvo.equals(relacionamento.getAttribute("Target"))) {
                return;
            }
        }
        throw estruturaOfficeInvalida();
    }

    private String validarDocumentoPrincipal(byte[] xml, ArquivoFormato formato) {
        Document document = lerXmlSeguro(xml);
        String namespace = formato == ArquivoFormato.DOCX ? WORD_NAMESPACE : SPREADSHEET_NAMESPACE;
        String raiz = formato == ArquivoFormato.DOCX ? "document" : "workbook";
        String filho = formato == ArquivoFormato.DOCX ? "body" : "sheet";
        NodeList filhos = document.getElementsByTagNameNS(namespace, filho);
        if (!elementoRaiz(document, namespace, raiz) || filhos.getLength() == 0) {
            throw estruturaOfficeInvalida();
        }
        if (formato == ArquivoFormato.DOCX) {
            return null;
        }
        String relacionamento = ((Element) filhos.item(0))
                .getAttributeNS(OFFICE_RELATIONSHIPS_NAMESPACE, "id");
        if (relacionamento.isBlank()) {
            throw estruturaOfficeInvalida();
        }
        return relacionamento;
    }

    private void validarPlanilhas(byte[] xml, Set<String> entradas, String relacionamentoEsperado) {
        Document document = lerXmlSeguro(xml);
        if (!elementoRaiz(document, RELATIONSHIPS_NAMESPACE, "Relationships")) {
            throw estruturaOfficeInvalida();
        }
        NodeList relacionamentos = document.getElementsByTagNameNS(RELATIONSHIPS_NAMESPACE, "Relationship");
        for (int i = 0; i < relacionamentos.getLength(); i++) {
            Element relacionamento = (Element) relacionamentos.item(i);
            String alvo = relacionamento.getAttribute("Target").replace('\\', '/');
            if (relacionamentoEsperado.equals(relacionamento.getAttribute("Id"))
                    && relacionamento.getAttribute("Type").endsWith("/worksheet")
                    && alvo.startsWith("worksheets/")
                    && entradas.contains("xl/" + alvo)) {
                return;
            }
        }
        throw estruturaOfficeInvalida();
    }

    private Document lerXmlSeguro(byte[] xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
        } catch (ParserConfigurationException | SAXException | IOException exception) {
            throw estruturaOfficeInvalida();
        }
    }

    private boolean elementoRaiz(Document document, String namespace, String nome) {
        Element raiz = document.getDocumentElement();
        return raiz != null && namespace.equals(raiz.getNamespaceURI()) && nome.equals(raiz.getLocalName());
    }

    private boolean entradaComMacro(String nome) {
        String normalizado = nome.toLowerCase(Locale.ROOT);
        return normalizado.endsWith("/vbaproject.bin")
                || normalizado.endsWith("/vbadata.xml")
                || normalizado.contains("/macrosheets/")
                || normalizado.contains("/xl4macros/");
    }

    private boolean entradaOfficeComConteudoAtivo(String nome) {
        String normalizado = nome.toLowerCase(Locale.ROOT);
        String arquivo = normalizado.substring(normalizado.lastIndexOf('/') + 1);
        int ponto = arquivo.lastIndexOf('.');
        String extensao = ponto >= 0 ? arquivo.substring(ponto + 1) : "";
        return normalizado.contains("/embeddings/")
                || normalizado.contains("/activex/")
                || EXTENSOES_EXECUTAVEIS.contains(extensao)
                || EXTENSOES_SCRIPTS.contains(extensao)
                || EXTENSOES_COM_MACRO.contains(extensao);
    }

    private boolean caminhoInternoInvalido(String nome) {
        return nome.isBlank()
                || nome.startsWith("/")
                || nome.matches("^[A-Za-z]:.*")
                || Arrays.stream(nome.split("/", -1)).anyMatch(".."::equals);
    }

    private void validarExtensaoDupla(String nome) {
        String[] partes = nome.toLowerCase(Locale.ROOT).split("\\.");
        for (int i = 1; i < partes.length - 1; i++) {
            if (EXTENSOES_CONHECIDAS.contains(partes[i])) {
                throw new IllegalArgumentException("Extensões duplas não são permitidas");
            }
        }
    }

    private IllegalArgumentException extensaoNaoPermitida(String nome) {
        String extensao = nome.substring(nome.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (EXTENSOES_COMPACTADAS.contains(extensao)) {
            return new IllegalArgumentException("Arquivos compactados não são permitidos");
        }
        if (EXTENSOES_COM_MACRO.contains(extensao)) {
            return new IllegalArgumentException("Arquivos com macros não são permitidos");
        }
        if (EXTENSOES_SCRIPTS.contains(extensao)) {
            return new IllegalArgumentException("Scripts não são permitidos");
        }
        if (EXTENSOES_EXECUTAVEIS.contains(extensao)) {
            return new IllegalArgumentException("Executáveis, bibliotecas e instaladores não são permitidos");
        }
        return new IllegalArgumentException("Extensão de arquivo não permitida");
    }

    private static Set<String> criarExtensoesConhecidas() {
        Set<String> extensoes = new HashSet<>();
        for (ArquivoFormato formato : ArquivoFormato.values()) {
            extensoes.addAll(formato.getExtensoes());
        }
        extensoes.addAll(EXTENSOES_COMPACTADAS);
        extensoes.addAll(EXTENSOES_EXECUTAVEIS);
        extensoes.addAll(EXTENSOES_SCRIPTS);
        extensoes.addAll(EXTENSOES_COM_MACRO);
        return Set.copyOf(extensoes);
    }

    private IllegalArgumentException estruturaOfficeInvalida() {
        return new IllegalArgumentException("Estrutura interna do pacote Office inválida");
    }

    private void validarCsv(MultipartFile multipart) throws IOException {
        long total = 0;
        long controles = 0;
        byte[] buffer = new byte[8192];
        try (InputStream input = multipart.getInputStream()) {
            int lidos;
            while ((lidos = input.read(buffer)) != -1) {
                for (int i = 0; i < lidos; i++) {
                    int valor = Byte.toUnsignedInt(buffer[i]);
                    if (valor == 0) {
                        throw new IllegalArgumentException("CSV contém bytes nulos");
                    }
                    if ((valor < 32 && valor != '\t' && valor != '\n' && valor != '\r') || valor == 127) {
                        controles++;
                    }
                    total++;
                }
            }
        }
        if (controles > Math.max(4, total / 100)) {
            throw new IllegalArgumentException("CSV não contém texto válido");
        }
    }

    private void validarDwg(MultipartFile multipart) throws IOException {
        String versao = ascii(lerCabecalho(multipart, 6), 0, 6);
        if (!DWG_VERSIONS.contains(versao)) {
            throw assinaturaInvalida();
        }
    }

    private void validarDxf(MultipartFile multipart) throws IOException {
        byte[] header = lerCabecalho(multipart, 8192);
        if (comecaCom(header, BINARY_DXF_HEADER)) {
            return;
        }
        if (Arrays.equals(Arrays.copyOf(header, Math.min(4, header.length)), new byte[] {'A', 'C', '1', '0'})) {
            throw assinaturaInvalida();
        }
        String texto = new String(header, StandardCharsets.ISO_8859_1)
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replace("\ufeff", "");
        String[] linhas = texto.lines().map(String::trim).filter(linha -> !linha.isEmpty()).limit(2)
                .toArray(String[]::new);
        if (linhas.length < 2 || !linhas[0].equals("0") || !linhas[1].equalsIgnoreCase("SECTION")) {
            throw assinaturaInvalida();
        }
    }

    private byte[] lerCabecalho(MultipartFile multipart, int tamanho) throws IOException {
        try (InputStream input = multipart.getInputStream()) {
            return input.readNBytes(tamanho);
        }
    }

    private boolean comecaCom(byte[] valor, byte[] prefixo) {
        return valor.length >= prefixo.length
                && Arrays.equals(Arrays.copyOf(valor, prefixo.length), prefixo);
    }

    private String ascii(byte[] bytes, int offset, int tamanho) {
        if (bytes.length < offset + tamanho) {
            return "";
        }
        return new String(bytes, offset, tamanho, StandardCharsets.US_ASCII);
    }

    private IllegalArgumentException assinaturaInvalida() {
        return new IllegalArgumentException("Conteúdo do arquivo não corresponde à extensão");
    }

    record ArquivoValidado(String nome, String contentType, ArquivoFormato formato) {
    }
}
