package br.com.obradocs.api.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

	Optional<RefreshToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

	List<RefreshToken> findAllByUsuarioIdAndRevokedAtIsNull(UUID usuarioId);
}

interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

	Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

	List<PasswordResetToken> findAllByUsuarioIdAndUsedAtIsNull(UUID usuarioId);
}
