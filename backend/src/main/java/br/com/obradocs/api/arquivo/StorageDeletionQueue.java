package br.com.obradocs.api.arquivo;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class StorageDeletionQueue {

	private final JdbcTemplate jdbc;
	private final S3Storage storage;

	public void enqueue(Collection<String> paths) {
		paths.forEach(path -> jdbc.update("""
				insert into storage_deletion_queue (id, storage_path)
				values (?, ?)
				on conflict (storage_path) do nothing
				""", UUID.randomUUID(), path));
	}

	@Scheduled(
			initialDelayString = "${app.storage.cleanup-initial-delay:PT30S}",
			fixedDelayString = "${app.storage.cleanup-delay:PT1M}")
	void process() {
		List<PendingDeletion> pending = jdbc.query("""
				select id, storage_path
				from storage_deletion_queue
				order by created_at
				limit 100
				""", (result, row) -> new PendingDeletion(
				result.getObject("id", UUID.class),
				result.getString("storage_path")));

		pending.forEach(this::delete);
	}

	private void delete(PendingDeletion pending) {
		try {
			storage.excluir(pending.path());
			jdbc.update("delete from storage_deletion_queue where id = ?", pending.id());
		} catch (RuntimeException exception) {
			String error = exception.getMessage() == null
					? exception.getClass().getSimpleName()
					: exception.getMessage();
			jdbc.update("""
					update storage_deletion_queue
					set attempts = attempts + 1,
					    last_attempt_at = now(),
					    last_error = ?
					where id = ?
					""", error.substring(0, Math.min(error.length(), 1000)), pending.id());
			log.warn("Falha ao excluir objeto pendente {}", pending.id(), exception);
		}
	}

	private record PendingDeletion(UUID id, String path) {
	}
}
