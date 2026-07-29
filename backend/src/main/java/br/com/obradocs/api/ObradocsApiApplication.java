package br.com.obradocs.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ObradocsApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ObradocsApiApplication.class, args);
	}

}
