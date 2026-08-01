package br.com.obradocs.api;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

public record PageResponse<T>(
		List<T> items,
		int page,
		int size,
		long totalItems,
		int totalPages,
		boolean hasMore) {

	public static Pageable pageable(int page, int size) {
		if (page < 0) {
			throw new IllegalArgumentException("A pagina deve ser maior ou igual a zero");
		}
		if (size < 1 || size > 50) {
			throw new IllegalArgumentException("O tamanho da pagina deve estar entre 1 e 50");
		}
		return PageRequest.of(page, size);
	}

	public static <T, R> PageResponse<R> from(Page<T> source, Function<T, R> mapper) {
		return new PageResponse<>(
				source.getContent().stream().map(mapper).toList(),
				source.getNumber(),
				source.getSize(),
				source.getTotalElements(),
				source.getTotalPages(),
				source.hasNext());
	}
}
