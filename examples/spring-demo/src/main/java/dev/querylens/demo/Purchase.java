package dev.querylens.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

@Entity
public class Purchase {
    @Id @GeneratedValue
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    private Customer customer;
    private int total;

    protected Purchase() {}
    Purchase(Customer customer, int total) {
        this.customer = customer;
        this.total = total;
    }
    public Long getId() { return id; }
    public Customer getCustomer() { return customer; }
    public int getTotal() { return total; }
}
