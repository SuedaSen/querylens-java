package dev.querylens.agent;

record AgentConfig(String collectorUrl, int nPlusOneThreshold) {
    private static final String DEFAULT_URL = "http://127.0.0.1:4318/traces";

    static AgentConfig parse(String arguments) {
        if (arguments == null || arguments.isBlank()) {
            return new AgentConfig(DEFAULT_URL, 3);
        }
        String collector = DEFAULT_URL;
        int threshold = 3;
        for (String option : arguments.split(",")) {
            String[] pair = option.split("=", 2);
            if (pair.length == 2 && pair[0].trim().equals("collector")) {
                collector = pair[1].trim();
            } else if (pair.length == 2 && pair[0].trim().equals("nplusone")) {
                try {
                    threshold = Math.max(2, Integer.parseInt(pair[1].trim()));
                } catch (NumberFormatException ignored) {
                    threshold = 3;
                }
            }
        }
        return new AgentConfig(collector, threshold);
    }
}
