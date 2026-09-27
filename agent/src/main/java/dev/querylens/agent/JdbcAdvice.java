package dev.querylens.agent;

import net.bytebuddy.asm.Advice;

public final class JdbcAdvice {
    private JdbcAdvice() {}

    @Advice.OnMethodEnter
    public static long enter() {
        return System.nanoTime();
    }

    @Advice.OnMethodExit(onThrowable = Throwable.class, suppress = Throwable.class)
    public static void exit(
            @Advice.Enter long started,
            @Advice.This Object statement,
            @Advice.AllArguments Object[] arguments) {
        String sql = arguments.length > 0 && arguments[0] instanceof String value
                ? value : statement.toString();
        TraceCollector.query(sql, System.nanoTime() - started);
    }
}
