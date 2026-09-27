package dev.querylens.agent;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

public final class TraceCollector {
    private static final ThreadLocal<RequestTrace> CURRENT = new ThreadLocal<>();
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(500)).build();
    private static volatile String collectorUrl = "http://127.0.0.1:4318/traces";
    private static volatile int nPlusOneThreshold = 3;

    private TraceCollector() {}

    public static void configure(String url, int threshold) {
        collectorUrl = url;
        nPlusOneThreshold = threshold;
    }

    public static void begin(String method, String path) {
        CURRENT.set(new RequestTrace(method, path));
    }

    public static void query(String sql, long durationNanos) {
        RequestTrace trace = CURRENT.get();
        if (trace == null) return;
        StackTraceElement source = findSource();
        trace.queries.add(new QueryEvent(trace.id, normalize(sql), durationNanos,
                source == null ? null : source.getClassName(),
                source == null ? -1 : source.getLineNumber(), Instant.now()));
    }

    public static void finish() {
        RequestTrace trace = CURRENT.get();
        CURRENT.remove();
        if (trace == null) return;
        long durationMs = (System.nanoTime() - trace.startedNanos) / 1_000_000;
        String body = TraceJson.encode(trace, durationMs,
                new NPlusOneDetector(nPlusOneThreshold).detect(trace.queries));
        HttpRequest request = HttpRequest.newBuilder(URI.create(collectorUrl))
                .timeout(Duration.ofSeconds(1))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        CLIENT.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                .exceptionally(error -> null);
    }

    private static String normalize(String sql) {
        if (sql == null || sql.isBlank()) return "<prepared statement>";
        return sql.replaceFirst("^prep\\d+:\\s*", "")
                .replaceFirst("\\s+\\{.*}$", "")
                .replaceAll("\\s+", " ").trim();
    }

    private static StackTraceElement findSource() {
        for (StackTraceElement frame : Thread.currentThread().getStackTrace()) {
            String name = frame.getClassName();
            if (!name.startsWith("dev.querylens.") && !name.startsWith("java.")
                    && !name.startsWith("jdk.") && !name.startsWith("org.hibernate.")
                    && !name.startsWith("com.zaxxer.hikari.")
                    && !name.startsWith("org.h2.") && !name.startsWith("org.springframework.")
                    && !name.startsWith("jakarta.") && !name.startsWith("org.apache.")
                    && !name.startsWith("org.eclipse.") && !name.startsWith("sun.")
                    && !name.startsWith("com.sun.")) {
                return frame;
            }
        }
        return null;
    }
}
