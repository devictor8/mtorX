const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Variável de ambiente ausente: ${key}`);
  }
  return value;
};

export const envVariables = {
  PORT: Number(getEnv("PORT", "8080")),
  REGISTRY_PORT: Number(getEnv("REGISTRY_PORT", "9090")),
  REGISTRY_TOKEN: process.env.REGISTRY_TOKEN,
  HEALTH_CHECK_INTERVAL_MS: Number(getEnv("HEALTH_CHECK_INTERVAL_MS", "5000")),
  HEALTH_CHECK_TIMEOUT_MS: Number(getEnv("HEALTH_CHECK_TIMEOUT_MS", "2000")),
  NODE_TTL_MS: Number(getEnv("NODE_TTL_MS", "15000")),
};
