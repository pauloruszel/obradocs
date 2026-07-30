package br.com.obradocs.api.categoria;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.obradocs.api.arquivo.ArquivoTipo;

interface CategoriaObraRepository extends JpaRepository<CategoriaObra, UUID> {

    List<CategoriaObra> findAllByObraIdOrderByOrdemAsc(UUID obraId);

    Optional<CategoriaObra> findByIdAndObraId(UUID id, UUID obraId);

    Optional<CategoriaObra> findFirstByObraIdAndTipoOrderByOrdemAsc(UUID obraId, ArquivoTipo tipo);

    long countByObraId(UUID obraId);

    boolean existsByObraIdAndNomeIgnoreCase(UUID obraId, String nome);

    @Query(value = """
            select c.id as categoriaId, count(d.id) as documentos
            from categorias_obra c
            left join documentos d on d.categoria_id = c.id
            where c.obra_id = :obraId
            group by c.id
            """, nativeQuery = true)
    List<CategoriaUso> contarDocumentos(@Param("obraId") UUID obraId);

    interface CategoriaUso {
        UUID getCategoriaId();
        long getDocumentos();
    }
}
