package br.com.obradocs.api.obra;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ObraRepository extends JpaRepository<Obra, UUID> {

	@Query("""
			select o from Obra o
			where o.deletedAt is null
			  and exists (
			    select p.id from Permissao p
			    where p.obraId = o.id and p.userId = :usuarioId
			  )
			order by o.createdAt desc
			""")
	List<Obra> listarAtivasDoUsuario(@Param("usuarioId") UUID usuarioId);

	Optional<Obra> findByIdAndDeletedAtIsNull(UUID id);

	Optional<Obra> findByCodigoCompartilhamentoAndDeletedAtIsNull(String codigoCompartilhamento);

	boolean existsByCodigoCompartilhamento(String codigoCompartilhamento);
}

interface PermissaoRepository extends JpaRepository<Permissao, UUID> {

	Optional<Permissao> findByObraIdAndUserId(UUID obraId, UUID userId);

	Optional<Permissao> findByIdAndObraId(UUID id, UUID obraId);

	List<Permissao> findAllByObraIdOrderByCreatedAtAsc(UUID obraId);

	long countByObraIdAndPapel(UUID obraId, Papel papel);

	@Query(value = """
			select id from usuarios
			where email = lower(:email) and ativo = true
			""", nativeQuery = true)
	Optional<UUID> buscarUsuarioIdPorEmail(@Param("email") String email);

	@Query(value = "select id, nome, email from usuarios where id = :id", nativeQuery = true)
	Optional<UsuarioResumo> buscarUsuario(@Param("id") UUID id);

	interface UsuarioResumo {
		UUID getId();
		String getNome();
		String getEmail();
	}
}

interface HistoricoRepository extends JpaRepository<Historico, UUID> {

	List<Historico> findAllByObraIdOrderByCreatedAtDesc(UUID obraId);
}

interface NotificacaoRepository extends JpaRepository<Notificacao, UUID> {

	List<Notificacao> findTop50ByUsuarioIdOrderByCreatedAtDesc(UUID usuarioId);

	Optional<Notificacao> findByIdAndUsuarioId(UUID id, UUID usuarioId);

	long countByUsuarioIdAndLidaAtIsNull(UUID usuarioId);

	@Modifying
	@Query("update Notificacao n set n.lidaAt = current_timestamp where n.usuarioId = :usuarioId and n.lidaAt is null")
	int marcarTodasComoLidas(@Param("usuarioId") UUID usuarioId);
}
