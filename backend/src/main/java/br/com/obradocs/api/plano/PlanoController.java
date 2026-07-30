package br.com.obradocs.api.plano;

import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/v1/minha-assinatura")
@RequiredArgsConstructor
class PlanoController {

    private final PlanoService service;

    @GetMapping
    PlanoService.PlanoUso consultar(@AuthenticationPrincipal Jwt jwt) {
        return service.consultar(UUID.fromString(jwt.getSubject()));
    }
}
