package dev.querylens.agent;

import java.time.Instant;

public record QueryEvent(
        String requestId,
        String normalizedSql,
        long durationNanos,
        String sourceClass,
        int sourceLine,
        Instant capturedAt) {
}
