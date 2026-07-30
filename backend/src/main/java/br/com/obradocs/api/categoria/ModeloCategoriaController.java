package br.com.obradocs.api.categoria;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.obradocs.api.arquivo.ArquivoTipo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/v1/modelos-categoria")
@RequiredArgsConstructor
class ModeloCategoriaController {

    private final ModeloCategoriaService service;

    @GetMapping
    List<ModeloCategoriaService.Modelo> listar(@AuthenticationPrincipal Jwt jwt) {
        return service.listar(usuarioId(jwt));
    }

    @PostMapping
    ResponseEntity<ModeloCategoriaService.Modelo> salvar(
            @Valid @RequestBody CriarModeloRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        List<ModeloCategoriaService.Definicao> definicoes = request.categorias().stream()
                .map(item -> new ModeloCategoriaService.Definicao(
                        item.nome(), item.tipo(), item.ordem()))
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.salvar(usuarioId(jwt), request.nome(), definicoes));
    }

    private UUID usuarioId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    record CriarModeloRequest(
            @NotBlank @Size(min = 2, max = 80) String nome,
            @NotEmpty @Size(min = 2, max = 12) List<@Valid CategoriaRequest> categorias) {
    }

    record CategoriaRequest(
            @NotBlank @Size(min = 2, max = 80) String nome,
            @NotNull ArquivoTipo tipo,
            int ordem) {
    }
}
