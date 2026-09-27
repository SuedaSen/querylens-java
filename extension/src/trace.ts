export interface QueryTrace {
  sql: string;
  durationMs: number;
  source?: { file: string; line: number };
  repetitions?: number;
}

export interface RequestTrace {
  id: string;
  method: string;
  path: string;
  durationMs: number;
  timestamp: string;
  queries: QueryTrace[];
}

export function demoTrace(): RequestTrace {
  return {
    id: "demo-1",
    method: "GET",
    path: "/api/orders",
    durationMs: 143,
    timestamp: new Date().toISOString(),
    queries: [
      {
        sql: "select o.id, o.user_id, o.total from orders o",
        durationMs: 8,
        source: { file: "OrderService.java", line: 32 }
      },
      {
        sql: "select u.id, u.name from users u where u.id = ?",
        durationMs: 91,
        repetitions: 100,
        source: { file: "OrderMapper.java", line: 27 }
      }
    ]
  };
}
