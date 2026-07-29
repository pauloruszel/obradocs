package br.com.obradocs.api.auth;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.obradocs.api.arquivo.StorageDeletionQueue;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
class AccountDeletionService {

	private static final String SOLE_OWNER_WORKS = """
			select owner.obra_id
			from permissoes owner
			where owner.user_id = ?
			  and owner.papel = 'OWNER'
			  and not exists (
			    select 1
			    from permissoes other_owner
			    where other_owner.obra_id = owner.obra_id
			      and other_owner.user_id <> owner.user_id
			      and other_owner.papel = 'OWNER'
			  )
			""";

	private final JdbcTemplate jdbc;
	private final StorageDeletionQueue deletionQueue;

	@Transactional
	void delete(UUID usuarioId) {
		List<String> paths = jdbc.queryForList("""
				select storage_path
				from arquivos
				where obra_id in (%s)
				""".formatted(SOLE_OWNER_WORKS), String.class, usuarioId);
		deletionQueue.enqueue(paths);

		jdbc.update("delete from obras where id in (" + SOLE_OWNER_WORKS + ")", usuarioId);
		if (jdbc.update("delete from usuarios where id = ?", usuarioId) == 0) {
			throw new NoSuchElementException("Usuário não encontrado");
		}
	}
}
