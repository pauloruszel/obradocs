package br.com.obradocs.api.plano;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
class AdminAuthorizationService {

    private final JdbcTemplate jdbc;

    @Value("${app.admin.emails}")
    private String adminEmails;

    void exigirAdministrador(Jwt jwt) {
        if (!isAdministrador(jwt)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso restrito");
        }
    }

    boolean isAdministrador(Jwt jwt) {
        String email = jdbc.query(
                "select email from usuarios where id = ? and ativo = true",
                (rs, rowNum) -> rs.getString("email"),
                UUID.fromString(jwt.getSubject())).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario invalido"));
        return emailsAdministradores().contains(email.toLowerCase(Locale.ROOT));
    }

    private Set<String> emailsAdministradores() {
        return Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }
}
