package dev.querylens.demo;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/purchases")
class PurchaseController {
    private final PurchaseRepository purchases;

    PurchaseController(PurchaseRepository purchases) {
        this.purchases = purchases;
    }

    @GetMapping
    List<PurchaseResponse> all() {
        return purchases.findAll().stream()
                .map(purchase -> new PurchaseResponse(
                        purchase.getId(), purchase.getCustomer().getName(), purchase.getTotal()))
                .toList();
    }

    record PurchaseResponse(Long id, String customer, int total) {}
}
