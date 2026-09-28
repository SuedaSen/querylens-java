import * as vscode from "vscode";
import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import * as path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { demoTrace, QueryTrace, RequestTrace } from "./trace";
import { analyzeTrace, compactSql, queryExecutions } from "./analysis";

class TraceItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children: TraceItem[] = []
  ) {
    super(label, collapsibleState);
  }
}

class TraceProvider implements vscode.TreeDataProvider<TraceItem> {
  private readonly changed = new vscode.EventEmitter<TraceItem | undefined>();
  readonly onDidChangeTreeData = this.changed.event;
  private traces: RequestTrace[] = [];

  getTreeItem(element: TraceItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TraceItem): TraceItem[] {
    if (element) {
      return element.children;
    }
    if (this.traces.length === 0) {
      return [];
    }
    return this.traces.map((trace) => this.requestItem(trace));
  }

  add(trace: RequestTrace): void {
    this.traces.unshift(trace);
    this.changed.fire(undefined);
  }

  clear(): void {
    this.traces = [];
    this.changed.fire(undefined);
  }

  getTraces(): readonly RequestTrace[] {
    return this.traces;
  }

  private requestItem(trace: RequestTrace): TraceItem {
    const queries = trace.queries.map((query) => this.queryItem(query));
    const item = new TraceItem(
      `${trace.method} ${trace.path}`,
      vscode.TreeItemCollapsibleState.Expanded,
      queries
    );
    item.description = `${trace.durationMs} ms · ${this.queryCount(trace)} queries`;
    const nPlusOneCount = trace.queries.filter((query) => (query.repetitions ?? 1) > 1).length;
    item.tooltip = nPlusOneCount > 0
      ? `${nPlusOneCount} possible N+1 pattern · Captured ${new Date(trace.timestamp).toLocaleString()}`
      : `No repeated query pattern · Captured ${new Date(trace.timestamp).toLocaleString()}`;
    item.iconPath = new vscode.ThemeIcon(
      nPlusOneCount > 0 ? "warning" : "pass-filled",
      nPlusOneCount > 0 ? new vscode.ThemeColor("list.warningForeground") : undefined
    );
    item.command = {
      command: "queryLens.showTrace",
      title: "Show request details",
      arguments: [trace]
    };
    return item;
  }

  private queryItem(query: QueryTrace): TraceItem {
    const repetitions = query.repetitions ?? 1;
    const prefix = repetitions > 1 ? `N+1 · ×${repetitions}` : "SQL";
    const item = new TraceItem(
      `${prefix} · ${this.compact(query.sql)}`,
      vscode.TreeItemCollapsibleState.None
    );
    item.description = `${query.durationMs} ms`;
    item.tooltip = [
      query.sql,
      query.source ? `${query.source.file}:${query.source.line}` : undefined,
      repetitions > 1 ? "Possible N+1 query detected" : undefined
    ].filter(Boolean).join("\n");
    item.iconPath = new vscode.ThemeIcon(
      repetitions > 1 ? "warning" : "database",
      repetitions > 1 ? new vscode.ThemeColor("list.warningForeground") : undefined
    );
    if (query.source) {
      item.command = {
        command: "queryLens.openSource",
        title: "Open query source",
        arguments: [query.source]
      };
      item.contextValue = "queryLensQueryWithSource";
    }
    return item;
  }

  private compact(sql: string): string {
    const normalized = sql.replace(/\s+/g, " ").trim();
    return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
  }

  private queryCount(trace: RequestTrace): number {
    return trace.queries.reduce((sum, query) => sum + queryExecutions(query), 0);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  })[character] ?? character);
}

function slowQueryThreshold(): number {
  return vscode.workspace.getConfiguration("queryLens").get<number>("slowQueryThresholdMs", 100);
}

function showTraceDetails(trace: RequestTrace | undefined): void {
  if (!trace || typeof trace.method !== "string" || !Array.isArray(trace.queries)) {
    void vscode.window.showInformationMessage(
      "No request is selected yet. Run your Spring Boot app and call an endpoint, or load the demo trace."
    );
    return;
  }
  const panel = vscode.window.createWebviewPanel(
    "queryLens.traceDetails",
    `${trace.method} ${trace.path}`,
    vscode.ViewColumn.Active,
    { enableScripts: false }
  );
  const analysis = analyzeTrace(trace, slowQueryThreshold());
  const queryCount = analysis.totalQueries;
  const repeated = trace.queries.filter((query) => (query.repetitions ?? 1) > 1);
  const rows = trace.queries.map((query) => {
    const repetitions = query.repetitions ?? 1;
    const severity = repetitions > 1 ? "warning" : "healthy";
    const badge = repetitions > 1 ? `Possible N+1 · ×${repetitions}` : "SQL";
    const source = query.source
      ? `${escapeHtml(query.source.file)}:${query.source.line}`
      : "Source unavailable";
    return `<article class="query ${severity}">
      <div class="query-head"><span class="badge">${badge}</span><span>${query.durationMs} ms</span></div>
      <pre>${escapeHtml(query.sql)}</pre>
      <div class="source">${source}</div>
    </article>`;
  }).join("");
  const captured = new Date(trace.timestamp).toLocaleString();
  panel.webview.html = `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root{color-scheme:light dark}body{padding:28px;max-width:1100px;margin:auto;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}
    h1{font-size:26px;margin:0}.eyebrow{color:var(--vscode-descriptionForeground);margin:6px 0 24px}.cards{display:grid;grid-template-columns:repeat(3,minmax(140px,1fr));gap:12px;margin-bottom:24px}
    .card,.query{border:1px solid var(--vscode-widget-border);border-radius:10px;background:var(--vscode-sideBar-background)}.card{padding:16px}.metric{font-size:26px;font-weight:700;margin-top:6px}.label{color:var(--vscode-descriptionForeground)}
    .query{padding:16px;margin:12px 0;border-left:4px solid var(--vscode-charts-green)}.query.warning{border-left-color:var(--vscode-charts-yellow)}.query-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.badge{font-weight:700}
    pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--vscode-textCodeBlock-background);padding:13px;border-radius:7px;line-height:1.45}.source{font-size:12px;color:var(--vscode-descriptionForeground)}
    .alert{padding:13px 15px;border-radius:8px;margin-bottom:20px;background:var(--vscode-inputValidation-warningBackground);border:1px solid var(--vscode-inputValidation-warningBorder)}
    @media(max-width:650px){.cards{grid-template-columns:1fr}}
  </style></head><body>
    <h1>${escapeHtml(trace.method)} ${escapeHtml(trace.path)}</h1><p class="eyebrow">Captured ${escapeHtml(captured)} · Database health: ${analysis.score}/100 (${analysis.grade})</p>
    <section class="cards"><div class="card"><div class="label">Health score</div><div class="metric">${analysis.score}</div></div><div class="card"><div class="label">Request duration</div><div class="metric">${trace.durationMs} ms</div></div><div class="card"><div class="label">SQL executions</div><div class="metric">${queryCount}</div></div></section>
    ${repeated.length > 0 ? `<div class="alert">QueryLens found ${repeated.length} repeated query pattern${repeated.length === 1 ? "" : "s"}. Inspect the highlighted statements below.</div>` : ""}
    <h2>Query timeline</h2>${rows || "<p>No SQL query was captured for this request.</p>"}
  </body></html>`;
}

function showSessionDashboard(traces: readonly RequestTrace[]): void {
  if (traces.length === 0) {
    void vscode.window.showInformationMessage("No requests captured yet. Run your app or preview the demo trace first.");
    return;
  }
  const analyses = traces.map((trace) => ({ trace, analysis: analyzeTrace(trace, slowQueryThreshold()) }));
  const averageScore = Math.round(analyses.reduce((sum, item) => sum + item.analysis.score, 0) / analyses.length);
  const totalQueries = analyses.reduce((sum, item) => sum + item.analysis.totalQueries, 0);
  const issueCount = analyses.reduce((sum, item) => sum + item.analysis.findings.length, 0);
  const endpoints = new Map<string, { calls: number; duration: number; queries: number; score: number; issues: number }>();
  for (const { trace, analysis } of analyses) {
    const key = `${trace.method} ${trace.path}`;
    const current = endpoints.get(key) ?? { calls: 0, duration: 0, queries: 0, score: 0, issues: 0 };
    current.calls += 1;
    current.duration += trace.durationMs;
    current.queries += analysis.totalQueries;
    current.score += analysis.score;
    current.issues += analysis.findings.length;
    endpoints.set(key, current);
  }
  const endpointRows = [...endpoints.entries()].map(([endpoint, stats]) => ({ endpoint, ...stats }))
    .sort((a, b) => (a.score / a.calls) - (b.score / b.calls))
    .map((item) => `<tr><td><strong>${escapeHtml(item.endpoint)}</strong></td><td>${item.calls}</td><td>${Math.round(item.duration / item.calls)} ms</td><td>${Math.round(item.queries / item.calls)}</td><td><span class="score ${Math.round(item.score / item.calls) < 75 ? "risk" : ""}">${Math.round(item.score / item.calls)}</span></td><td>${item.issues}</td></tr>`).join("");
  const findings = analyses.flatMap(({ trace, analysis }) => analysis.findings.map((finding) => ({ trace, finding })))
    .slice(0, 8).map(({ trace, finding }) => `<article class="finding ${finding.severity}"><div><span class="pill">${finding.severity}</span><strong>${escapeHtml(finding.title)}</strong><p>${escapeHtml(trace.method)} ${escapeHtml(trace.path)} · ${escapeHtml(finding.detail)}</p></div><div class="fix"><b>Recommended fix</b><br>${escapeHtml(finding.recommendation)}</div></article>`).join("");
  const panel = vscode.window.createWebviewPanel("queryLens.sessionDashboard", "QueryLens · Database Health", vscode.ViewColumn.Active, { enableScripts: false });
  panel.webview.html = `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  :root{color-scheme:light dark}*{box-sizing:border-box}body{padding:32px;max-width:1200px;margin:auto;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}
  header{padding:26px;border-radius:16px;background:linear-gradient(135deg,#5636d9,#7b61ff);color:white;margin-bottom:20px}h1{margin:0 0 8px;font-size:30px}header p{margin:0;opacity:.85}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.card{padding:17px;border:1px solid var(--vscode-widget-border);border-radius:12px;background:var(--vscode-sideBar-background)}.metric{font-size:28px;font-weight:750;margin-top:5px}.label,p{color:var(--vscode-descriptionForeground)}
  section{margin-top:28px}table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--vscode-widget-border);border-radius:12px;overflow:hidden}th,td{text-align:left;padding:12px;border-bottom:1px solid var(--vscode-widget-border)}th{color:var(--vscode-descriptionForeground);font-size:12px;text-transform:uppercase}tr:last-child td{border:0}.score{font-weight:800;color:var(--vscode-charts-green)}.score.risk{color:var(--vscode-charts-yellow)}
  .finding{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;padding:16px;margin:10px 0;border:1px solid var(--vscode-widget-border);border-left:4px solid var(--vscode-charts-yellow);border-radius:10px;background:var(--vscode-sideBar-background)}.finding.critical{border-left-color:var(--vscode-errorForeground)}.finding p{margin:7px 0 0}.pill{font-size:10px;text-transform:uppercase;padding:3px 7px;border-radius:20px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);margin-right:8px}.fix{line-height:1.45}@media(max-width:760px){.cards{grid-template-columns:1fr 1fr}.finding{grid-template-columns:1fr}}
  </style></head><body><header><h1>Database Health</h1><p>A prioritized view of the database work behind this session.</p></header>
  <div class="cards"><div class="card"><div class="label">Health score</div><div class="metric">${averageScore}/100</div></div><div class="card"><div class="label">Requests</div><div class="metric">${traces.length}</div></div><div class="card"><div class="label">SQL executions</div><div class="metric">${totalQueries}</div></div><div class="card"><div class="label">Findings</div><div class="metric">${issueCount}</div></div></div>
  <section><h2>Endpoint comparison</h2><table><thead><tr><th>Endpoint</th><th>Calls</th><th>Avg duration</th><th>Avg queries</th><th>Score</th><th>Issues</th></tr></thead><tbody>${endpointRows}</tbody></table></section>
  <section><h2>Prioritized recommendations</h2>${findings || "<p>No database risks detected in this session. Nice work.</p>"}</section></body></html>`;
}

async function exportReport(traces: readonly RequestTrace[]): Promise<void> {
  if (traces.length === 0) {
    void vscode.window.showInformationMessage("There are no traces to export yet.");
    return;
  }
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "", "querylens-report.md")),
    filters: { Markdown: ["md"] }, saveLabel: "Export QueryLens report"
  });
  if (!uri) return;
  const lines = ["# QueryLens Database Health Report", "", `Generated: ${new Date().toLocaleString()}`, ""];
  for (const trace of traces) {
    const analysis = analyzeTrace(trace, slowQueryThreshold());
    lines.push(`## ${trace.method} ${trace.path}`, "", `- Health score: **${analysis.score}/100 (${analysis.grade})**`, `- Duration: ${trace.durationMs} ms`, `- SQL executions: ${analysis.totalQueries}`, "");
    for (const finding of analysis.findings) {
      lines.push(`### ${finding.title}`, "", `SQL: \`${compactSql(finding.detail, 180).replace(/`/g, "'")}\``, "", `Recommendation: ${finding.recommendation}`, "");
    }
  }
  await vscode.workspace.fs.writeFile(uri, Buffer.from(lines.join("\n"), "utf8"));
  void vscode.window.showInformationMessage("QueryLens report exported.", "Open report").then((choice) => {
    if (choice === "Open report") void vscode.window.showTextDocument(uri);
  });
}

async function openSource(source: { file: string; line: number }): Promise<void> {
  const normalized = source.file.replace(/\\/g, "/");
  let matches = await vscode.workspace.findFiles(`**/${normalized}`, "**/{target,build,node_modules}/**", 10);
  if (matches.length === 0) {
    matches = await vscode.workspace.findFiles(
      `**/${path.posix.basename(normalized)}`,
      "**/{target,build,node_modules}/**",
      10
    );
  }
  if (matches.length === 0) {
    void vscode.window.showWarningMessage(`QueryLens could not find ${source.file} in this workspace.`);
    return;
  }
  const document = await vscode.workspace.openTextDocument(matches[0]);
  const line = Math.max(0, Math.min(source.line - 1, document.lineCount - 1));
  const editor = await vscode.window.showTextDocument(document);
  const position = new vscode.Position(line, 0);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
}

async function runSpringBoot(context: vscode.ExtensionContext): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    void vscode.window.showWarningMessage("Open a Spring Boot project before starting QueryLens.");
    return;
  }

  const pomFiles = await vscode.workspace.findFiles(
    "**/pom.xml", "**/{target,build,node_modules,.git}/**", 50
  );
  const gradleFiles = [
    ...await vscode.workspace.findFiles("**/build.gradle", "**/{target,node_modules,.git}/**", 50),
    ...await vscode.workspace.findFiles("**/build.gradle.kts", "**/{target,node_modules,.git}/**", 50)
  ];
  const candidates = [
    ...pomFiles
      .filter((uri) => readFileSync(uri.fsPath, "utf8").includes("spring-boot"))
      .map((uri) => ({ root: path.dirname(uri.fsPath), kind: "maven" as const })),
    ...gradleFiles
      .filter((uri) => {
        const content = readFileSync(uri.fsPath, "utf8");
        return content.includes("org.springframework.boot") || content.includes("spring-boot");
      })
      .map((uri) => ({ root: path.dirname(uri.fsPath), kind: "gradle" as const }))
  ];
  if (candidates.length === 0) {
    void vscode.window.showWarningMessage(
      "QueryLens could not find a Spring Boot project. Open the folder containing its pom.xml or build.gradle."
    );
    return;
  }

  let project = candidates[0];
  if (candidates.length > 1) {
    const selected = await vscode.window.showQuickPick(
      candidates.map((candidate) => ({
        label: path.basename(candidate.root),
        description: vscode.workspace.asRelativePath(candidate.root),
        project: candidate
      })),
      { placeHolder: "Select the Spring Boot project to run" }
    );
    if (!selected) return;
    project = selected.project;
  }

  const agentPath = path.join(context.extensionPath, "resources", "querylens-agent.jar");
  if (!existsSync(agentPath)) {
    void vscode.window.showErrorMessage("The bundled QueryLens Java agent is missing. Reinstall the extension.");
    return;
  }
  const port = vscode.workspace.getConfiguration("queryLens").get<number>("collectorPort", 4318);
  const threshold = vscode.workspace.getConfiguration("queryLens").get<number>("nPlusOneThreshold", 3);
  const agentOption = `-javaagent:${agentPath}=collector=http://127.0.0.1:${port}/traces,nplusone=${threshold}`;
  const gradleWrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  const escapedAgentOption = agentOption.replace(/"/g, "\\\"");
  const command = project.kind === "maven"
    ? `mvn spring-boot:run -Dspring-boot.run.jvmArguments="${escapedAgentOption}"`
    : `${gradleWrapper} bootRun`;
  const terminal = vscode.window.createTerminal({
    name: `QueryLens · ${path.basename(project.root)}`,
    cwd: project.root,
    // Avoid accidentally loading an older QueryLens agent inherited by VS Code.
    env: project.kind === "gradle"
      ? { JAVA_TOOL_OPTIONS: agentOption }
      : { JAVA_TOOL_OPTIONS: null }
  });
  terminal.show();
  terminal.sendText(command);
}

class LocalTraceCollector implements vscode.Disposable {
  private server: Server | undefined;

  constructor(
    private readonly onTrace: (trace: RequestTrace) => void,
    private readonly onStatus: (status: "listening" | "error") => void
  ) {}

  start(port: number): void {
    this.server = createServer((request, response) => this.handle(request, response));
    this.server.on("error", (error) => {
      this.onStatus("error");
      void vscode.window.showErrorMessage(`QueryLens collector could not start: ${error.message}`);
    });
    this.server.listen(port, "127.0.0.1", () => {
      this.onStatus("listening");
      console.log(`QueryLens collector listening at http://127.0.0.1:${port}/traces`);
    });
  }

  dispose(): void {
    this.server?.close();
  }

  private handle(request: IncomingMessage, response: ServerResponse): void {
    if (request.method !== "POST" || request.url !== "/traces") {
      response.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1_000_000) {
        request.destroy(new Error("Trace payload exceeds 1 MB"));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        const trace = JSON.parse(Buffer.concat(chunks).toString("utf8")) as RequestTrace;
        if (!this.valid(trace)) throw new Error("Invalid trace payload");
        this.onTrace(trace);
        response.writeHead(202).end();
      } catch (error) {
        response.writeHead(400).end(error instanceof Error ? error.message : "Invalid payload");
      }
    });
  }

  private valid(trace: RequestTrace): boolean {
    return typeof trace.id === "string" && typeof trace.method === "string"
      && typeof trace.path === "string" && typeof trace.durationMs === "number"
      && typeof trace.timestamp === "string" && Array.isArray(trace.queries);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new TraceProvider();
  const port = vscode.workspace.getConfiguration("queryLens").get<number>("collectorPort", 4318);
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20);
  status.name = "QueryLens collector";
  status.command = "queryLens.openTutorial";
  status.text = "$(sync~spin) QueryLens starting";
  status.tooltip = `Starting local collector on 127.0.0.1:${port}`;
  status.show();
  const collector = new LocalTraceCollector(
    (trace) => provider.add(trace),
    (state) => {
      status.text = state === "listening" ? "$(database) QueryLens ready" : "$(error) QueryLens error";
      status.tooltip = state === "listening"
        ? `Listening locally on 127.0.0.1:${port}`
        : `Could not listen on 127.0.0.1:${port}`;
    }
  );
  collector.start(port);
  context.subscriptions.push(
    collector,
    status,
    vscode.window.registerTreeDataProvider("queryLens.requests", provider),
    vscode.commands.registerCommand("queryLens.loadDemo", () => {
      const trace = demoTrace();
      provider.add(trace);
      showTraceDetails(trace);
    }),
    vscode.commands.registerCommand("queryLens.clear", () => provider.clear()),
    vscode.commands.registerCommand("queryLens.openSource", openSource),
    vscode.commands.registerCommand("queryLens.runSpringBoot", () => runSpringBoot(context)),
    vscode.commands.registerCommand("queryLens.showTrace", showTraceDetails),
    vscode.commands.registerCommand("queryLens.openDashboard", () => showSessionDashboard(provider.getTraces())),
    vscode.commands.registerCommand("queryLens.exportReport", () => exportReport(provider.getTraces())),
    vscode.commands.registerCommand("queryLens.openTutorial", () =>
      vscode.commands.executeCommand(
        "workbench.action.openWalkthrough",
        "suedasen.querylens-java#queryLens.gettingStarted",
        false
      ))
  );
}

export function deactivate(): void {}
