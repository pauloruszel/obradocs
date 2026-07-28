package br.com.obradocs.api.arquivo;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ArquivoRepository extends JpaRepository<Arquivo, UUID> {

	List<Arquivo> findAllByObraIdOrderByCreatedAtDesc(UUID obraId);

	List<Arquivo> findAllByObraIdAndTipoOrderByCreatedAtDesc(UUID obraId, ArquivoTipo tipo);
}
