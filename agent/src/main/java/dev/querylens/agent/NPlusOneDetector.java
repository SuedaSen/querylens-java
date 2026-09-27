package dev.querylens.agent;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class NPlusOneDetector {
    private final int threshold;

    public NPlusOneDetector(int threshold) {
        if (threshold < 2) {
            throw new IllegalArgumentException("threshold must be at least 2");
        }
        this.threshold = threshold;
    }

    public Map<String, Integer> detect(List<QueryEvent> events) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (QueryEvent event : events) {
            counts.merge(event.normalizedSql(), 1, Integer::sum);
        }
        counts.entrySet().removeIf(entry -> entry.getValue() < threshold);
        return Map.copyOf(counts);
    }
}
