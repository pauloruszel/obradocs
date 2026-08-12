package br.com.obradocs.api.arquivo;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

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

    ArquivoValidado validar(MultipartFile multipart) {
        if (multipart == null || multipart.isEmpty() || multipart.getSize() <= 0) {
            throw new IllegalArgumentException("Arquivo vazio");
        }

        String nome = validarNome(multipart.getOriginalFilename());
        ArquivoFormato formato = ArquivoFormato.porNomeArquivo(nome)
                .orElseThrow(() -> new IllegalArgumentException("Extensão de arquivo não permitida"));
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
        if (nome.length() > 255
                || nome.equals(".")
                || nome.equals("..")
                || nome.indexOf('/') >= 0
                || nome.indexOf('\\') >= 0
                || nome.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Nome do arquivo inválido");
        }
        return nome;
    }

    void validarExtensao(String nome, String mimeCanonico) {
        ArquivoFormato esperado = ArquivoFormato.porMimeCanonico(mimeCanonico)
                .orElseThrow(() -> new IllegalArgumentException("Formato do documento não reconhecido"));
        ArquivoFormato informado = ArquivoFormato.porNomeArquivo(validarNome(nome))
                .orElseThrow(() -> new IllegalArgumentException("Extensão de arquivo não permitida"));
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
                case DOCX -> validarOoxml(multipart, "word/");
                case XLSX -> validarOoxml(multipart, "xl/");
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

    private void validarOoxml(MultipartFile multipart, String pastaObrigatoria) throws IOException {
        int entradas = 0;
        long totalExpandido = 0;
        boolean contentTypes = false;
        boolean pastaEncontrada = false;
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
                contentTypes |= "[Content_Types].xml".equals(nome);
                pastaEncontrada |= nome.startsWith(pastaObrigatoria);

                int lidos;
                while ((lidos = zip.read(buffer)) != -1) {
                    totalExpandido += lidos;
                    if (totalExpandido > MAX_ZIP_EXPANDED_BYTES) {
                        throw new IllegalArgumentException("Pacote Office excede o limite de conteúdo interno");
                    }
                }
                zip.closeEntry();
            }
        }
        if (entradas == 0 || !contentTypes || !pastaEncontrada) {
            throw new IllegalArgumentException("Estrutura interna do pacote Office inválida");
        }
    }

    private boolean caminhoInternoInvalido(String nome) {
        return nome.isBlank()
                || nome.startsWith("/")
                || nome.matches("^[A-Za-z]:.*")
                || Arrays.stream(nome.split("/", -1)).anyMatch(".."::equals);
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
