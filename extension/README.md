# QueryLens for Java

See the SQL queries your Spring Boot endpoints really execute without leaving
VS Code.

![QueryLens detecting an N+1 query in VS Code](https://raw.githubusercontent.com/SuedaSen/querylens-java/main/docs/images/querylens-vscode-demo.png)

## Features

- Groups Hibernate and JDBC queries by HTTP request
- Detects possible N+1 query patterns
- Displays request duration and query counts
- Scores database health across the entire debugging session
- Compares endpoints and prioritizes N+1, slow-query, and query-volume risks
- Exports a shareable Markdown health report
- Opens the Java source location behind a query
- Starts Maven and Gradle Spring Boot projects with the bundled Java agent
- Keeps trace data entirely on your machine

## Getting started

1. Open a Spring Boot project in VS Code.
2. Select the QueryLens icon in the activity bar.
3. Run **QueryLens: Run Spring Boot with Agent** or use the play button.
4. Send a request to one of your application endpoints.
5. Expand the request in QueryLens to inspect its SQL queries.

Click a query to jump to the Java source location. Repeated queries that meet
the configured threshold appear with an **N+1** warning.

## Tutorial

### 1. Open a supported project

Open the folder that contains your Spring Boot `pom.xml`, `build.gradle`, or
`build.gradle.kts`. QueryLens searches multi-root workspaces and nested modules
for Spring Boot projects.

### 2. Start the application

Open the QueryLens sidebar and select the play button, or run:

```text
QueryLens: Run Spring Boot with Agent
```

If more than one Spring Boot module is present, select the module you want to
run. QueryLens starts Maven or Gradle in a terminal and attaches its bundled
Java agent. The status bar displays **QueryLens ready** when the local collector
is listening.

### 3. Send an HTTP request

Call any Spring MVC endpoint using a browser, curl, Postman, Bruno, or another
REST client. For example:

```bash
curl http://localhost:8080/api/purchases
```

### 4. Read the results

The request appears automatically in the QueryLens sidebar:

- Select the request to open the visual request dashboard.
- Expand the request to inspect individual SQL statements.
- A yellow **N+1** item means the same normalized query crossed the configured
  repetition threshold.
- Select a SQL item to open the Java source line associated with the query.

Run **QueryLens: Open Getting Started** at any time to reopen the interactive
walkthrough inside VS Code.

## Database Health dashboard

After capturing one or more requests, select the graph button in the QueryLens
view or run **QueryLens: Open Database Health Dashboard**. The dashboard ranks
endpoints by a deterministic 0–100 score and turns findings into practical
recommendations. Use **QueryLens: Export Health Report** to save the same
analysis as Markdown for a pull request or team review.

## Settings

- `queryLens.collectorPort` — local trace collector port; default `4318`
- `queryLens.nPlusOneThreshold` — repeated-query warning threshold; default `3`
- `queryLens.slowQueryThresholdMs` — slow-query warning threshold; default `100`

## Current compatibility

- Spring Boot 3
- Spring MVC
- Hibernate/JDBC
- Maven and Gradle projects
- Java 17 or newer

## Privacy

The collector listens only on `127.0.0.1`. QueryLens does not upload source
code, SQL statements, or trace data.

## Project

Source code, issues, and contribution information are available on
[GitHub](https://github.com/SuedaSen/querylens-java).
