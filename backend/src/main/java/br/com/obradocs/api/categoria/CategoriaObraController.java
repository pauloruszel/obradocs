package br.com.obradocs.api.categoria;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.obradocs.api.arquivo.ArquivoTipo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/v1/obras/{obraId}/categorias")
@RequiredArgsConstructor
class CategoriaObraController {

    private final CategoriaObraService service;

    @GetMapping
    List<CategoriaResponse> listar(
            @PathVariable UUID obraId,
            @AuthenticationPrincipal Jwt jwt) {
        List<CategoriaObra> categorias = service.listar(obraId, usuarioId(jwt));
        Map<UUID, Long> uso = service.contarDocumentos(obraId);
        return categorias.stream()
                .map(categoria -> CategoriaResponse.from(
                        categoria, uso.getOrDefault(categoria.getId(), 0L)))
                .toList();
    }

    @PostMapping
    ResponseEntity<CategoriaResponse> adicionar(
            @PathVariable UUID obraId,
            @Valid @RequestBody CriarCategoriaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        CategoriaObra categoria =
                service.adicionar(obraId, request.nome(), request.tipo(), usuarioId(jwt));
        return ResponseEntity.status(HttpStatus.CREATED).body(CategoriaResponse.from(categoria));
    }

    @PatchMapping("/{categoriaId}")
    CategoriaResponse atualizar(
            @PathVariable UUID obraId,
            @PathVariable UUID categoriaId,
            @Valid @RequestBody AtualizarCategoriaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CategoriaResponse.from(service.atualizar(
                obraId, categoriaId, request.nome(), request.ordem(), usuarioId(jwt)));
    }

    private UUID usuarioId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    record CriarCategoriaRequest(
            @NotBlank @Size(min = 2, max = 80) String nome,
            @NotNull ArquivoTipo tipo) {
    }

    record AtualizarCategoriaRequest(
            @Size(min = 2, max = 80) String nome,
            Integer ordem) {
    }

    record CategoriaResponse(
            UUID id,
            UUID obraId,
            String nome,
            ArquivoTipo tipo,
            int ordem,
            boolean padrao,
            long documentos) {

        static CategoriaResponse from(CategoriaObra categoria, long documentos) {
            return new CategoriaResponse(
                    categoria.getId(),
                    categoria.getObraId(),
                    categoria.getNome(),
                    categoria.getTipo(),
                    categoria.getOrdem(),
                    categoria.isPadrao(),
                    documentos);
        }

        static CategoriaResponse from(CategoriaObra categoria) {
            return from(categoria, 0);
        }
    }
}
