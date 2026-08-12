package br.com.obradocs.api.arquivo;

public class FormatosExpandidosDesabilitadosException extends RuntimeException {

    public FormatosExpandidosDesabilitadosException() {
        super("Este formato ainda não está disponível");
    }
}
