const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeTrace } = require("../out/analysis.js");

function trace(queries) {
  return { id: "test", method: "GET", path: "/test", durationMs: 120, timestamp: new Date(0).toISOString(), queries };
}

test("healthy request receives an excellent score", () => {
  const result = analyzeTrace(trace([{ sql: "select * from customer", durationMs: 4 }]));
  assert.equal(result.score, 100);
  assert.equal(result.grade, "Excellent");
  assert.equal(result.findings.length, 0);
});

test("N+1 executions are counted and prioritized", () => {
  const result = analyzeTrace(trace([{ sql: "select * from customer where id=?", durationMs: 2, repetitions: 25 }]));
  assert.equal(result.totalQueries, 25);
  assert.equal(result.repeatedQueries, 1);
  assert.equal(result.findings[0].severity, "critical");
  assert.match(result.findings[0].recommendation, /JOIN FETCH/);
});

test("slow queries reduce health and produce index advice", () => {
  const result = analyzeTrace(trace([{ sql: "select * from purchase", durationMs: 650 }]));
  assert.equal(result.slowQueries, 1);
  assert.ok(result.score < 100);
  assert.match(result.findings[0].recommendation, /execution plan/);
});
