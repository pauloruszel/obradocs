package br.com.obradocs.api.arquivo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface ArquivoRepository extends JpaRepository<Arquivo, UUID> {

    @Query(value = """
            select a as arquivo,
                   u.nome as enviadoPorNome,
                   d.nome as documentoNome,
                   d.categoriaId as categoriaId,
                   c.nome as categoriaNome,
                   d.ambiente as ambiente,
                   d.revisaoAtual as revisaoAtual,
                   d.revisaoAprovada as revisaoAprovada
            from Arquivo a
            join Documento d on d.id = a.documentoId
            join CategoriaObra c on c.id = d.categoriaId
            left join Usuario u on u.id = a.enviadoPor
            where a.obraId = :obraId
              and a.revisao = d.revisaoAtual
              and (:categoriaId is null or d.categoriaId = :categoriaId)
              and (:tipo is null or a.tipo = :tipo)
              and (:busca is null or lower(d.nome) like lower(concat('%', cast(:busca as string), '%')))
              and (:ambiente is null or lower(d.ambiente) = lower(cast(:ambiente as string)))
            order by a.createdAt desc
            """, countQuery = """
            select count(a)
            from Arquivo a
            join Documento d on d.id = a.documentoId
            where a.obraId = :obraId
              and a.revisao = d.revisaoAtual
              and (:categoriaId is null or d.categoriaId = :categoriaId)
              and (:tipo is null or a.tipo = :tipo)
              and (:busca is null or lower(d.nome) like lower(concat('%', cast(:busca as string), '%')))
              and (:ambiente is null or lower(d.ambiente) = lower(cast(:ambiente as string)))
            """)
    Page<ArquivoDetalhado> listarPaginado(
            @Param("obraId") UUID obraId,
            @Param("categoriaId") UUID categoriaId,
            @Param("tipo") ArquivoTipo tipo,
            @Param("busca") String busca,
            @Param("ambiente") String ambiente,
            Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Arquivo a where a.id = :id")
    Optional<Arquivo> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            select a as arquivo,
                   u.nome as enviadoPorNome,
                   d.nome as documentoNome,
                   d.categoriaId as categoriaId,
                   c.nome as categoriaNome,
                   d.ambiente as ambiente,
                   d.revisaoAtual as revisaoAtual,
                   d.revisaoAprovada as revisaoAprovada
            from Arquivo a
            join Documento d on d.id = a.documentoId
            join CategoriaObra c on c.id = d.categoriaId
            left join Usuario u on u.id = a.enviadoPor
            where a.obraId = :obraId
              and a.revisao = d.revisaoAtual
            order by a.createdAt desc
            """)
    List<ArquivoDetalhado> listarTodos(@Param("obraId") UUID obraId);

    @Query("""
            select a as arquivo,
                   u.nome as enviadoPorNome,
                   d.nome as documentoNome,
                   d.categoriaId as categoriaId,
                   c.nome as categoriaNome,
                   d.ambiente as ambiente,
                   d.revisaoAtual as revisaoAtual,
                   d.revisaoAprovada as revisaoAprovada
            from Arquivo a
            join Documento d on d.id = a.documentoId
            join CategoriaObra c on c.id = d.categoriaId
            left join Usuario u on u.id = a.enviadoPor
            where a.obraId = :obraId
              and a.tipo = :tipo
              and a.revisao = d.revisaoAtual
            order by a.createdAt desc
            """)
    List<ArquivoDetalhado> listarPorTipo(
            @Param("obraId") UUID obraId,
            @Param("tipo") ArquivoTipo tipo);

    @Query("""
            select a as arquivo,
                   u.nome as enviadoPorNome,
                   d.nome as documentoNome,
                   d.categoriaId as categoriaId,
                   c.nome as categoriaNome,
                   d.ambiente as ambiente,
                   d.revisaoAtual as revisaoAtual,
                   d.revisaoAprovada as revisaoAprovada
            from Arquivo a
            join Documento d on d.id = a.documentoId
            join CategoriaObra c on c.id = d.categoriaId
            left join Usuario u on u.id = a.enviadoPor
            where a.obraId = :obraId
              and d.categoriaId = :categoriaId
              and a.revisao = d.revisaoAtual
            order by a.createdAt desc
            """)
    List<ArquivoDetalhado> listarPorCategoria(
            @Param("obraId") UUID obraId,
            @Param("categoriaId") UUID categoriaId);

    @Query("""
            select a as arquivo,
                   u.nome as enviadoPorNome,
                   d.nome as documentoNome,
                   d.categoriaId as categoriaId,
                   c.nome as categoriaNome,
                   d.ambiente as ambiente,
                   d.revisaoAtual as revisaoAtual,
                   d.revisaoAprovada as revisaoAprovada
            from Arquivo a
            join Documento d on d.id = a.documentoId
            join CategoriaObra c on c.id = d.categoriaId
            left join Usuario u on u.id = a.enviadoPor
            where a.obraId = :obraId
              and a.revisao = d.revisaoAtual
              and lower(d.nome) like lower(concat('%', :busca, '%'))
            order by a.createdAt desc
            """)
    List<ArquivoDetalhado> pesquisarPorNome(
            @Param("obraId") UUID obraId,
            @Param("busca") String busca);

    @Query("""
            select a as arquivo,
                   u.nome as enviadoPorNome,
                   d.nome as documentoNome,
                   d.categoriaId as categoriaId,
                   c.nome as categoriaNome,
                   d.ambiente as ambiente,
                   d.revisaoAtual as revisaoAtual,
                   d.revisaoAprovada as revisaoAprovada
            from Arquivo a
            join Documento d on d.id = a.documentoId
            join CategoriaObra c on c.id = d.categoriaId
            left join Usuario u on u.id = a.enviadoPor
            where a.obraId = :obraId
              and a.tipo = :tipo
              and a.revisao = d.revisaoAtual
              and lower(d.nome) like lower(concat('%', :busca, '%'))
            order by a.createdAt desc
            """)
    List<ArquivoDetalhado> pesquisarPorTipoENome(
            @Param("obraId") UUID obraId,
            @Param("tipo") ArquivoTipo tipo,
            @Param("busca") String busca);

    @Query("""
            select a as arquivo,
                   u.nome as enviadoPorNome,
                   d.nome as documentoNome,
                   d.categoriaId as categoriaId,
                   c.nome as categoriaNome,
                   d.ambiente as ambiente,
                   d.revisaoAtual as revisaoAtual,
                   d.revisaoAprovada as revisaoAprovada
            from Arquivo a
            join Documento d on d.id = a.documentoId
            join CategoriaObra c on c.id = d.categoriaId
            left join Usuario u on u.id = a.enviadoPor
            where a.obraId = :obraId
              and d.categoriaId = :categoriaId
              and a.revisao = d.revisaoAtual
              and lower(d.nome) like lower(concat('%', :busca, '%'))
            order by a.createdAt desc
            """)
    List<ArquivoDetalhado> pesquisarPorCategoriaENome(
            @Param("obraId") UUID obraId,
            @Param("categoriaId") UUID categoriaId,
            @Param("busca") String busca);

    @Query("""
            select a as arquivo,
                   u.nome as enviadoPorNome,
                   d.nome as documentoNome,
                   d.categoriaId as categoriaId,
                   c.nome as categoriaNome,
                   d.ambiente as ambiente,
                   d.revisaoAtual as revisaoAtual,
                   d.revisaoAprovada as revisaoAprovada
            from Arquivo a
            join Documento d on d.id = a.documentoId
            join CategoriaObra c on c.id = d.categoriaId
            left join Usuario u on u.id = a.enviadoPor
            where a.id = :arquivoId
            """)
    Optional<ArquivoDetalhado> findDetalhadoById(@Param("arquivoId") UUID arquivoId);

    @Query("""
            select a as arquivo,
                   u.nome as enviadoPorNome,
                   d.nome as documentoNome,
                   d.categoriaId as categoriaId,
                   c.nome as categoriaNome,
                   d.ambiente as ambiente,
                   d.revisaoAtual as revisaoAtual,
                   d.revisaoAprovada as revisaoAprovada
            from Arquivo a
            join Documento d on d.id = a.documentoId
            join CategoriaObra c on c.id = d.categoriaId
            left join Usuario u on u.id = a.enviadoPor
            where a.documentoId = :documentoId
            order by a.revisao desc
            """)
    List<ArquivoDetalhado> listarRevisoes(@Param("documentoId") UUID documentoId);
}

interface ArquivoDetalhado {
    Arquivo getArquivo();
    String getEnviadoPorNome();
    String getDocumentoNome();
    UUID getCategoriaId();
    String getCategoriaNome();
    String getAmbiente();
    int getRevisaoAtual();
    Integer getRevisaoAprovada();
}

interface DocumentoRepository extends JpaRepository<Documento, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Documento d where d.id = :id")
    Optional<Documento> findByIdForUpdate(@Param("id") UUID id);
}
