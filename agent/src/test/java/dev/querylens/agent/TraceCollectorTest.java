package dev.querylens.agent;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

class TraceCollectorTest {
    @Test
    void normalizesH2PreparedStatementNamesAndBindings() throws Exception {
        Method normalize = TraceCollector.class.getDeclaredMethod("normalize", String.class);
        normalize.setAccessible(true);

        String first = (String) normalize.invoke(null,
                "prep21: select * from customer where id=? {1: CAST(1 AS BIGINT)}");
        String second = (String) normalize.invoke(null,
                "prep28: select * from customer where id=? {1: CAST(8 AS BIGINT)}");

        assertEquals("select * from customer where id=?", first);
        assertEquals(first, second);
    }
}
