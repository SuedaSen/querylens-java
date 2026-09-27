package dev.querylens.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @Bean
    CommandLineRunner seed(CustomerRepository customers, PurchaseRepository purchases) {
        return args -> {
            for (int i = 1; i <= 8; i++) {
                Customer customer = customers.save(new Customer("Customer " + i));
                purchases.save(new Purchase(customer, i * 25));
            }
        };
    }
}
