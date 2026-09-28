# Changelog

## 0.2.0

- Added a session-wide Database Health dashboard with endpoint comparisons.
- Added a deterministic 0–100 health score for each request and session.
- Added prioritized N+1, slow-query, and high-query-volume recommendations.
- Added Markdown health report export for sharing findings with a team.
- Kept all analysis local and compatible with the existing Java agent.

## 0.1.2

- Added an actionable empty state with run, preview, and tutorial links.
- Opening the demo trace now immediately displays the visual dashboard.
- Prevented the request-details command from failing when no request is selected.
- Avoided inheriting stale `JAVA_TOOL_OPTIONS` when Maven starts the application.

## 0.1.1

- Added a visual request dashboard with duration, query count, and N+1 summary cards.
- Added a local collector status indicator to the VS Code status bar.
- Added an interactive Getting Started walkthrough.
- Improved request severity icons and N+1 visibility in the trace tree.
- Expanded Marketplace documentation with a step-by-step tutorial.

## 0.1.0

- Capture JDBC and Hibernate queries per Spring MVC request.
- Detect repeated queries and possible N+1 patterns.
- Open query source locations from the QueryLens tree.
- Start Maven and Gradle Spring Boot projects with the bundled Java agent.
- Keep all trace processing local to the developer machine.

## 0.0.3

- Added Marketplace documentation and a real-world demo screenshot.

## 0.0.2

- Added automatic Spring Boot project detection.
- Bundled the QueryLens Java agent in the extension.

## 0.0.1

- Initial development preview.
