package br.com.obradocs.api.arquivo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface ArquivoRepository extends JpaRepository<Arquivo, UUID> {

    @Query("""
            select a as arquivo, u.nome as enviadoPorNome
            from Arquivo a
            left join Usuario u on u.id = a.enviadoPor
            where a.obraId = :obraId
              and (:tipo is null or a.tipo = :tipo)
              and (:busca is null or lower(a.nomeOriginal) like lower(concat('%', :busca, '%')))
            order by a.createdAt desc
            """)
    List<ArquivoDetalhado> pesquisar(@Param("obraId") UUID obraId, @Param("tipo") ArquivoTipo tipo, @Param("busca") String busca);

    @Query("""
            select a as arquivo, u.nome as enviadoPorNome
            from Arquivo a
            left join Usuario u on u.id = a.enviadoPor
            where a.id = :arquivoId
            """)
    Optional<ArquivoDetalhado> findDetalhadoById(@Param("arquivoId") UUID arquivoId);
}

interface ArquivoDetalhado {
    Arquivo getArquivo();
    String getEnviadoPorNome();
}
