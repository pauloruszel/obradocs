package br.com.obradocs.api.arquivo;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionTemplate;

import br.com.obradocs.api.obra.HistoricoService;
import br.com.obradocs.api.obra.ObraAuthorizationService;
import br.com.obradocs.api.plano.PlanoLimiteService;
import br.com.obradocs.api.categoria.CategoriaObraService;

@ExtendWith(MockitoExtension.class)
class ArquivoServiceListagemTests {

    @Mock
    private ArquivoRepository arquivos;

    @Mock
    private DocumentoRepository documentos;

    @Mock
    private ObraAuthorizationService authorization;

    @Mock
    private HistoricoService historico;

    @Mock
    private S3Storage storage;

    @Mock
    private TransactionTemplate transactions;

    @Mock
    private PlanoLimiteService limites;

    @Mock
    private CategoriaObraService categorias;

    private ArquivoService service;

    private final UUID obraId = UUID.randomUUID();
    private final UUID usuarioId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new ArquivoService(
                arquivos,
                documentos,
                authorization,
                historico,
                storage,
                transactions,
                limites,
                categorias);
    }

    @Test
    void listaTodosQuandoTipoEBuscaNaoForamInformados() {
        when(arquivos.listarTodos(obraId)).thenReturn(List.of());

        service.listar(obraId, null, null, null, null, usuarioId);

        verify(authorization).exigirLeitura(obraId, usuarioId);
        verify(arquivos).listarTodos(obraId);
        verify(arquivos, never()).listarPorTipo(obraId, null);
        verifyNoMoreInteractions(arquivos);
    }

    @Test
    void listaPorTipoSemEnviarBuscaNulaAoRepository() {
        when(arquivos.listarPorTipo(obraId, ArquivoTipo.PROJETO)).thenReturn(List.of());

        service.listar(obraId, null, ArquivoTipo.PROJETO, null, null, usuarioId);

        verify(authorization).exigirLeitura(obraId, usuarioId);
        verify(arquivos).listarPorTipo(obraId, ArquivoTipo.PROJETO);
        verifyNoMoreInteractions(arquivos);
    }

    @Test
    void pesquisaPorNomeSemEnviarTipoNuloAoRepository() {
        when(arquivos.pesquisarPorNome(obraId, "estrutural")).thenReturn(List.of());

        service.listar(obraId, null, null, "  estrutural  ", null, usuarioId);

        verify(authorization).exigirLeitura(obraId, usuarioId);
        verify(arquivos).pesquisarPorNome(obraId, "estrutural");
        verifyNoMoreInteractions(arquivos);
    }

    @Test
    void pesquisaPorTipoENomeQuandoAmbosForamInformados() {
        when(arquivos.pesquisarPorTipoENome(obraId, ArquivoTipo.NOTA_FISCAL, "plano"))
                .thenReturn(List.of());

        service.listar(obraId, null, ArquivoTipo.NOTA_FISCAL, " plano ", null, usuarioId);

        verify(authorization).exigirLeitura(obraId, usuarioId);
        verify(arquivos).pesquisarPorTipoENome(obraId, ArquivoTipo.NOTA_FISCAL, "plano");
        verifyNoMoreInteractions(arquivos);
    }

    @Test
    void trataBuscaEmBrancoComoAusente() {
        when(arquivos.listarPorTipo(obraId, ArquivoTipo.FOTO)).thenReturn(List.of());

        service.listar(obraId, null, ArquivoTipo.FOTO, "   ", null, usuarioId);

        verify(authorization).exigirLeitura(obraId, usuarioId);
        verify(arquivos).listarPorTipo(obraId, ArquivoTipo.FOTO);
        verifyNoMoreInteractions(arquivos);
    }

    @Test
    void rejeitaBuscaAcimaDoLimiteSemConsultarArquivos() {
        String busca = "a".repeat(101);

        assertThatThrownBy(() -> service.listar(obraId, null, null, busca, null, usuarioId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Busca muito longa; limite de 100 caracteres");

        verify(authorization).exigirLeitura(obraId, usuarioId);
        verifyNoMoreInteractions(arquivos);
    }
}
