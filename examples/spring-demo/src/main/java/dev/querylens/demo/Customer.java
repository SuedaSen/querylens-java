package dev.querylens.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

@Entity
public class Customer {
    @Id @GeneratedValue
    private Long id;
    private String name;

    protected Customer() {}
    Customer(String name) { this.name = name; }
    public String getName() { return name; }
}
