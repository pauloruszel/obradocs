package br.com.obradocs.api.plano;

import java.util.UUID;

import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;

@Aspect
@Component
@RequiredArgsConstructor
class PlanoLimiteAspect {

    private final PlanoLimiteService limites;

    @Before("execution(* br.com.obradocs.api.obra.ObraService.criar(..)) && args(nome, usuarioId)")
    void antesDeCriarObra(String nome, UUID usuarioId) {
        limites.validarCriacaoObra(usuarioId);
    }

    @Before("execution(* br.com.obradocs.api.arquivo.ArquivoService.enviar(..)) && args(obraId, tipo, multipart, usuarioId)")
    void antesDeEnviarArquivo(UUID obraId, Object tipo, MultipartFile multipart, UUID usuarioId) {
        limites.validarUpload(obraId, multipart == null ? 0 : multipart.getSize());
    }

    @Before("execution(* br.com.obradocs.api.obra.ObraService.entrarPorCodigo(..)) && args(codigo, usuarioId)")
    void antesDeEntrarPorCodigo(String codigo, UUID usuarioId) {
        limites.validarEntradaPorCodigo(codigo, usuarioId);
    }

    @Before("execution(* br.com.obradocs.api.obra.ObraService.adicionarPermissao(..)) && args(obraId, email, papel, usuarioId)")
    void antesDeAdicionarPermissao(UUID obraId, String email, Object papel, UUID usuarioId) {
        UUID convidadoId = limites.buscarUsuarioIdPorEmail(email);
        limites.validarNovoColaborador(obraId, convidadoId);
    }
}
