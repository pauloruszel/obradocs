package br.com.obradocs.api.categoria;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import br.com.obradocs.api.arquivo.ArquivoTipo;
import br.com.obradocs.api.plano.PlanoLimiteService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ModeloCategoriaService {

    private static final TypeReference<List<Definicao>> LISTA_DEFINICOES =
            new TypeReference<>() {};

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final PlanoLimiteService limitesPlano;

    @Transactional(readOnly = true)
    public List<Modelo> listar(UUID usuarioId) {
        return jdbc.query("""
                select id, nome, categorias
                from modelos_categoria
                where usuario_id = ?
                order by lower(nome)
                """, (rs, rowNum) -> new Modelo(
                        rs.getObject("id", UUID.class),
                        rs.getString("nome"),
                        lerDefinicoes(rs.getString("categorias"))),
                usuarioId);
    }

    @Transactional
    public Modelo salvar(UUID usuarioId, String nome, List<Definicao> definicoes) {
        limitesPlano.validarRecursoProfissional(usuarioId, "CUSTOM_TEMPLATE_REQUIRES_PRO");
        String nomeNormalizado = validarNome(nome);
        List<Definicao> categorias = validarDefinicoes(definicoes);
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into modelos_categoria (id, usuario_id, nome, categorias)
                values (?, ?, ?, ?::jsonb)
                """, id, usuarioId, nomeNormalizado, escreverDefinicoes(categorias));
        return new Modelo(id, nomeNormalizado, categorias);
    }

    @Transactional(readOnly = true)
    public List<Definicao> buscarParaUso(UUID modeloId, UUID usuarioId) {
        limitesPlano.validarRecursoProfissional(usuarioId, "CUSTOM_TEMPLATE_REQUIRES_PRO");
        return jdbc.query("""
                select categorias
                from modelos_categoria
                where id = ? and usuario_id = ?
                """, rs -> {
                    if (!rs.next()) {
                        throw new NoSuchElementException("Modelo de categorias não encontrado");
                    }
                    return lerDefinicoes(rs.getString("categorias"));
                }, modeloId, usuarioId);
    }

    private String validarNome(String nome) {
        String normalizado = nome == null ? "" : nome.trim();
        if (normalizado.length() < 2 || normalizado.length() > 80) {
            throw new IllegalArgumentException("O nome do modelo deve ter entre 2 e 80 caracteres");
        }
        return normalizado;
    }

    private List<Definicao> validarDefinicoes(List<Definicao> definicoes) {
        if (definicoes == null || definicoes.size() < 2 || definicoes.size() > 12) {
            throw new IllegalArgumentException("O modelo deve ter entre 2 e 12 categorias");
        }
        Set<String> nomes = new HashSet<>();
        List<Definicao> ordenadas = definicoes.stream()
                .sorted(Comparator.comparingInt(Definicao::ordem))
                .map(item -> {
                    String nome = validarNome(item.nome());
                    if (item.tipo() == null
                            || !nomes.add(nome.toLowerCase(Locale.ROOT))) {
                        throw new IllegalArgumentException("Categorias do modelo inválidas");
                    }
                    return new Definicao(nome, item.tipo(), nomes.size() - 1);
                })
                .toList();
        return ordenadas;
    }

    private String escreverDefinicoes(List<Definicao> definicoes) {
        try {
            return objectMapper.writeValueAsString(definicoes);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Não foi possível salvar o modelo", exception);
        }
    }

    private List<Definicao> lerDefinicoes(String json) {
        try {
            return objectMapper.readValue(json, LISTA_DEFINICOES);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Modelo de categorias inválido", exception);
        }
    }

    public record Definicao(String nome, ArquivoTipo tipo, int ordem) {
    }

    public record Modelo(UUID id, String nome, List<Definicao> categorias) {
    }
}
