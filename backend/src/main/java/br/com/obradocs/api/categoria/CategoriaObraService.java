package br.com.obradocs.api.categoria;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.obradocs.api.arquivo.ArquivoTipo;
import br.com.obradocs.api.obra.ObraAuthorizationService;
import br.com.obradocs.api.plano.PlanoLimiteService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoriaObraService {

    private final CategoriaObraRepository categorias;
    private final ObraAuthorizationService authorization;
    private final PlanoLimiteService limitesPlano;

    @Transactional
    public void criarCategoriasIniciais(UUID obraId, ObraTemplate template) {
        int ordem = 0;
        for (ObraTemplate.DefinicaoCategoria definicao : template.categorias()) {
            categorias.save(new CategoriaObra(
                    obraId, definicao.nome(), definicao.tipo(), ordem++, true));
        }
    }

    @Transactional
    public void criarCategoriasIniciais(
            UUID obraId, List<ModeloCategoriaService.Definicao> definicoes) {
        for (ModeloCategoriaService.Definicao definicao : definicoes) {
            categorias.save(new CategoriaObra(
                    obraId, definicao.nome(), definicao.tipo(), definicao.ordem(), false));
        }
    }

    @Transactional(readOnly = true)
    public List<CategoriaObra> listar(UUID obraId, UUID usuarioId) {
        authorization.exigirLeitura(obraId, usuarioId);
        return categorias.findAllByObraIdOrderByOrdemAsc(obraId);
    }

    @Transactional(readOnly = true)
    public Map<UUID, Long> contarDocumentos(UUID obraId) {
        return categorias.contarDocumentos(obraId).stream()
                .collect(Collectors.toMap(
                        CategoriaObraRepository.CategoriaUso::getCategoriaId,
                        CategoriaObraRepository.CategoriaUso::getDocumentos));
    }

    @Transactional(readOnly = true)
    public CategoriaObra buscar(UUID obraId, UUID categoriaId) {
        return categorias.findByIdAndObraId(categoriaId, obraId)
                .orElseThrow(() -> new NoSuchElementException("Categoria não encontrada"));
    }

    @Transactional(readOnly = true)
    public CategoriaObra buscarLegada(UUID obraId, ArquivoTipo tipo) {
        return categorias.findFirstByObraIdAndTipoOrderByOrdemAsc(obraId, tipo)
                .orElseThrow(() -> new NoSuchElementException("Categoria não encontrada"));
    }

    @Transactional
    public CategoriaObra adicionar(
            UUID obraId, String nome, ArquivoTipo tipo, UUID usuarioId) {
        authorization.exigirEdicao(obraId, usuarioId);
        limitesPlano.validarNovaCategoria(obraId);
        String nomeNormalizado = validarNome(nome);
        validarNomeDisponivel(obraId, nomeNormalizado);
        int ordem = Math.toIntExact(categorias.countByObraId(obraId));
        return categorias.save(new CategoriaObra(obraId, nomeNormalizado, tipo, ordem, false));
    }

    @Transactional
    public CategoriaObra atualizar(
            UUID obraId, UUID categoriaId, String nome, Integer ordem, UUID usuarioId) {
        authorization.exigirEdicao(obraId, usuarioId);
        CategoriaObra categoria = buscar(obraId, categoriaId);
        String nomeNormalizado = nome == null ? null : validarNome(nome);
        if (nomeNormalizado != null
                && !categoria.getNome().equalsIgnoreCase(nomeNormalizado)) {
            validarNomeDisponivel(obraId, nomeNormalizado);
        }
        long quantidade = categorias.countByObraId(obraId);
        if (ordem != null && (ordem < 0 || ordem >= quantidade)) {
            throw new IllegalArgumentException("Posição da categoria inválida");
        }
        if (ordem != null && ordem != categoria.getOrdem()) {
            reordenar(obraId, categoria, ordem);
        }
        categoria.atualizar(nomeNormalizado, ordem);
        return categoria;
    }

    private void reordenar(UUID obraId, CategoriaObra categoria, int novaOrdem) {
        List<CategoriaObra> lista = categorias.findAllByObraIdOrderByOrdemAsc(obraId);
        lista.removeIf(item -> item.getId().equals(categoria.getId()));
        lista.add(novaOrdem, categoria);
        for (int indice = 0; indice < lista.size(); indice++) {
            lista.get(indice).atualizar(null, indice);
        }
    }

    private String validarNome(String nome) {
        String normalizado = nome == null ? "" : nome.trim();
        if (normalizado.length() < 2 || normalizado.length() > 80) {
            throw new IllegalArgumentException("O nome da categoria deve ter entre 2 e 80 caracteres");
        }
        return normalizado;
    }

    private void validarNomeDisponivel(UUID obraId, String nome) {
        if (categorias.existsByObraIdAndNomeIgnoreCase(obraId, nome)) {
            throw new IllegalArgumentException("Já existe uma categoria com esse nome");
        }
    }
}
