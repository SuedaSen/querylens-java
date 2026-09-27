package dev.querylens.agent;

import java.lang.reflect.Method;
import net.bytebuddy.asm.Advice;

public final class SpringRequestAdvice {
    private SpringRequestAdvice() {}

    @Advice.OnMethodEnter(suppress = Throwable.class)
    public static void enter(@Advice.Argument(0) Object request) throws Exception {
        Method getMethod = request.getClass().getMethod("getMethod");
        Method getRequestUri = request.getClass().getMethod("getRequestURI");
        TraceCollector.begin((String) getMethod.invoke(request), (String) getRequestUri.invoke(request));
    }

    @Advice.OnMethodExit(onThrowable = Throwable.class, suppress = Throwable.class)
    public static void exit() {
        TraceCollector.finish();
    }
}
