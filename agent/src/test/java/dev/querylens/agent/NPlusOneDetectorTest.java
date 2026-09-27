package dev.querylens.agent;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class NPlusOneDetectorTest {
    @Test
    void reportsRepeatedQueriesAtTheConfiguredThreshold() {
        QueryEvent repeated = new QueryEvent(
                "request-1", "select * from users where id = ?", 10, "OrderMapper", 27, Instant.now());
        QueryEvent other = new QueryEvent(
                "request-1", "select * from orders", 10, "OrderService", 32, Instant.now());

        var result = new NPlusOneDetector(3).detect(List.of(repeated, repeated, repeated, other));

        assertEquals(3, result.get(repeated.normalizedSql()));
        assertEquals(1, result.size());
    }
}
