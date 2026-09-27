package dev.querylens.agent;

import java.util.Map;
import java.util.LinkedHashMap;

final class TraceJson {
    private TraceJson() {}

    static String encode(RequestTrace trace, long durationMs, Map<String, Integer> repeated) {
        StringBuilder json = new StringBuilder("{");
        field(json, "id", trace.id).append(',');
        field(json, "method", trace.method).append(',');
        field(json, "path", trace.path).append(',');
        json.append("\"durationMs\":").append(durationMs).append(',');
        field(json, "timestamp", trace.startedAt.toString()).append(',');
        json.append("\"queries\":[");
        Map<String, QuerySummary> summaries = new LinkedHashMap<>();
        for (QueryEvent query : trace.queries) {
            summaries.compute(query.normalizedSql(), (sql, current) -> current == null
                    ? new QuerySummary(query, query.durationNanos(), 1)
                    : new QuerySummary(current.first(), current.durationNanos() + query.durationNanos(), current.count() + 1));
        }
        int i = 0;
        for (QuerySummary summary : summaries.values()) {
            QueryEvent query = summary.first();
            if (i > 0) json.append(',');
            i++;
            json.append('{');
            field(json, "sql", query.normalizedSql()).append(',');
            json.append("\"durationMs\":").append(summary.durationNanos() / 1_000_000);
            Integer count = repeated.get(query.normalizedSql());
            if (count != null) json.append(",\"repetitions\":").append(count);
            if (query.sourceClass() != null) {
                json.append(",\"source\":{");
                field(json, "file", query.sourceClass().replace('.', '/') + ".java").append(',');
                json.append("\"line\":").append(query.sourceLine()).append('}');
            }
            json.append('}');
        }
        return json.append("]}").toString();
    }

    private record QuerySummary(QueryEvent first, long durationNanos, int count) {}

    private static StringBuilder field(StringBuilder json, String name, String value) {
        return json.append('\"').append(name).append("\":\"").append(escape(value)).append('\"');
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r");
    }
}
