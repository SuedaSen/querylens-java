import { QueryTrace, RequestTrace } from "./trace";

export interface TraceAnalysis {
  score: number;
  grade: "Excellent" | "Good" | "Needs attention" | "Critical";
  totalQueries: number;
  repeatedQueries: number;
  slowQueries: number;
  findings: Finding[];
}

export interface Finding {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  recommendation: string;
}

export function queryExecutions(query: QueryTrace): number {
  return Math.max(1, query.repetitions ?? 1);
}

export function analyzeTrace(trace: RequestTrace, slowQueryMs = 100): TraceAnalysis {
  const totalQueries = trace.queries.reduce((sum, query) => sum + queryExecutions(query), 0);
  const repeated = trace.queries.filter((query) => queryExecutions(query) > 1);
  const slow = trace.queries.filter((query) => query.durationMs >= slowQueryMs);
  const findings: Finding[] = [];

  for (const query of repeated) {
    const count = queryExecutions(query);
    findings.push({
      severity: count >= 20 ? "critical" : "warning",
      title: `Possible N+1: query executed ${count} times`,
      detail: compactSql(query.sql),
      recommendation: "Load the relation in one query with JOIN FETCH, an EntityGraph, or a DTO projection."
    });
  }
  for (const query of slow) {
    findings.push({
      severity: query.durationMs >= slowQueryMs * 5 ? "critical" : "warning",
      title: `Slow query: ${query.durationMs} ms`,
      detail: compactSql(query.sql),
      recommendation: "Inspect the execution plan and verify indexes for filter, join, and sort columns."
    });
  }
  if (totalQueries >= 50 && repeated.length === 0) {
    findings.push({
      severity: "warning",
      title: `High query volume: ${totalQueries} statements`,
      detail: "This request makes many database round trips even though no repeated fingerprint crossed the N+1 threshold.",
      recommendation: "Consider batching, projections, pagination, or combining dependent reads."
    });
  }

  const nPlusOnePenalty = repeated.reduce((sum, query) => sum + Math.min(45, 8 + queryExecutions(query)), 0);
  const slowPenalty = slow.reduce((sum, query) => sum + Math.min(25, Math.ceil(query.durationMs / slowQueryMs) * 5), 0);
  const volumePenalty = Math.max(0, Math.min(20, Math.floor((totalQueries - 15) / 5) * 2));
  const score = Math.max(0, 100 - nPlusOnePenalty - slowPenalty - volumePenalty);
  const grade = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Needs attention" : "Critical";
  return { score, grade, totalQueries, repeatedQueries: repeated.length, slowQueries: slow.length, findings };
}

export function compactSql(sql: string, maxLength = 110): string {
  const normalized = sql.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}
