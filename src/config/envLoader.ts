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
  DNS_HOST: getEnv("DNS_HOST", "127.0.0.1"),
  DNS_PORT: Number(getEnv("DNS_PORT", "5300")),
  DNS_TIMEOUT_MS: Number(getEnv("DNS_TIMEOUT_MS", "2000")),
  DNS_RESOLVE_NAME: getEnv("DNS_RESOLVE_NAME", "api.local"),
};
