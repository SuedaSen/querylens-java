package dev.querylens.agent;

import java.lang.instrument.Instrumentation;
import net.bytebuddy.agent.builder.AgentBuilder;
import net.bytebuddy.asm.Advice;

import static net.bytebuddy.matcher.ElementMatchers.hasSuperType;
import static net.bytebuddy.matcher.ElementMatchers.isAbstract;
import static net.bytebuddy.matcher.ElementMatchers.isInterface;
import static net.bytebuddy.matcher.ElementMatchers.isMethod;
import static net.bytebuddy.matcher.ElementMatchers.nameStartsWith;
import static net.bytebuddy.matcher.ElementMatchers.named;
import static net.bytebuddy.matcher.ElementMatchers.not;

public final class QueryLensAgent {
    private QueryLensAgent() {}

    public static void premain(String arguments, Instrumentation instrumentation) {
        start("startup", arguments, instrumentation);
    }

    public static void agentmain(String arguments, Instrumentation instrumentation) {
        start("attach", arguments, instrumentation);
    }

    private static void start(String mode, String arguments, Instrumentation instrumentation) {
        AgentConfig config = AgentConfig.parse(arguments);
        TraceCollector.configure(config.collectorUrl(), config.nPlusOneThreshold());

        AgentBuilder builder = new AgentBuilder.Default()
                .ignore(nameStartsWith("net.bytebuddy.")
                        .or(nameStartsWith("dev.querylens.agent."))
                        .or(nameStartsWith("com.zaxxer.hikari."))
                        .or(nameStartsWith("java."))
                        .or(nameStartsWith("jdk.")))
                .with(AgentBuilder.RedefinitionStrategy.RETRANSFORMATION)
                .type(named("org.springframework.web.servlet.DispatcherServlet"))
                .transform((dynamicBuilder, type, classLoader, module, protectionDomain) ->
                        dynamicBuilder.visit(Advice.to(SpringRequestAdvice.class)
                                .on(named("doDispatch").and(isMethod()))))
                .type(hasSuperType(named("java.sql.Statement"))
                        .and(not(isInterface())).and(not(isAbstract())))
                .transform((dynamicBuilder, type, classLoader, module, protectionDomain) ->
                        dynamicBuilder.visit(Advice.to(JdbcAdvice.class)
                                .on(isMethod().and(named("execute")
                                        .or(named("executeQuery"))
                                        .or(named("executeUpdate"))
                                        .or(named("executeLargeUpdate"))
                                        .or(named("executeBatch"))))));

        builder.installOn(instrumentation);
        System.out.printf("[QueryLens] Agent started (%s), collector=%s%n", mode, config.collectorUrl());
    }
}
