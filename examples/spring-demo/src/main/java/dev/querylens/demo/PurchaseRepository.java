package dev.querylens.demo;

import org.springframework.data.jpa.repository.JpaRepository;

interface PurchaseRepository extends JpaRepository<Purchase, Long> {}
