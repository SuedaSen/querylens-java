package dev.querylens.agent;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class RequestTrace {
    final String id = UUID.randomUUID().toString();
    final String method;
    final String path;
    final Instant startedAt = Instant.now();
    final long startedNanos = System.nanoTime();
    final List<QueryEvent> queries = new ArrayList<>();

    RequestTrace(String method, String path) {
        this.method = method;
        this.path = path;
    }
}
