# QueryLens Spring demo

Build the agent first, then run this application with it:

```bash
cd agent
mvn -Dmaven.repo.local=.m2 package

cd ../examples/spring-demo
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-javaagent:../../agent/target/querylens-agent-0.0.1-SNAPSHOT-all.jar"
```

With the QueryLens VS Code extension active, request:

```bash
curl http://localhost:8080/api/purchases
```

The endpoint intentionally triggers an N+1 query pattern for demonstration.
