package br.com.obradocs.api.categoria;

import java.util.List;

import br.com.obradocs.api.arquivo.ArquivoTipo;

public enum ObraTemplate {
    GERAL(List.of(
            categoria("Orçamento", ArquivoTipo.ORCAMENTO),
            categoria("Nota fiscal", ArquivoTipo.NOTA_FISCAL),
            categoria("Projeto", ArquivoTipo.PROJETO),
            categoria("Foto", ArquivoTipo.FOTO))),
    ARQUITETURA(List.of(
            categoria("Projetos", ArquivoTipo.PROJETO),
            categoria("Referências", ArquivoTipo.FOTO),
            categoria("Orçamentos", ArquivoTipo.ORCAMENTO),
            categoria("Registros da obra", ArquivoTipo.FOTO))),
    INTERIORES(List.of(
            categoria("Conceito", ArquivoTipo.FOTO),
            categoria("Layouts", ArquivoTipo.PROJETO),
            categoria("Especificações", ArquivoTipo.PROJETO),
            categoria("Execução", ArquivoTipo.FOTO))),
    ENGENHARIA(List.of(
            categoria("Projetos", ArquivoTipo.PROJETO),
            categoria("Memórias", ArquivoTipo.PROJETO),
            categoria("Relatórios", ArquivoTipo.PROJETO),
            categoria("Registros", ArquivoTipo.FOTO))),
    REFORMA(List.of(
            categoria("Antes", ArquivoTipo.FOTO),
            categoria("Projeto", ArquivoTipo.PROJETO),
            categoria("Compras", ArquivoTipo.NOTA_FISCAL),
            categoria("Durante a obra", ArquivoTipo.FOTO)));

    private final List<DefinicaoCategoria> categorias;

    ObraTemplate(List<DefinicaoCategoria> categorias) {
        this.categorias = categorias;
    }

    public List<DefinicaoCategoria> categorias() {
        return categorias;
    }

    private static DefinicaoCategoria categoria(String nome, ArquivoTipo tipo) {
        return new DefinicaoCategoria(nome, tipo);
    }

    public record DefinicaoCategoria(String nome, ArquivoTipo tipo) {
    }
}
