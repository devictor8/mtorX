const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Variável de ambiente ausente: ${key}`);
  }
  return value;
};

const getNumberEnv = (key: string, defaultValue: string): number => {
  const rawValue = getEnv(key, defaultValue);
  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`Variável de ambiente invalida: ${key}=${rawValue}`);
  }

  return value;
};

export const envVariables = {
  PORT: getNumberEnv("PORT", "8080"),
  DNS_HOST: getEnv("DNS_HOST", "127.0.0.1"),
  DNS_PORT: getNumberEnv("DNS_PORT", "5300"),
  DNS_TIMEOUT_MS: getNumberEnv("DNS_TIMEOUT_MS", "2000"),
  DNS_REFRESH_INTERVAL_MS: getNumberEnv("DNS_REFRESH_INTERVAL_MS", "10000"),
  DNS_RESOLVE_NAME: getEnv("DNS_RESOLVE_NAME", "api.local"),
};
