const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${key}`);
  }
  return value;
};

export const envVariables = {
  SERVER_IMAGE_NAME: getEnv("SERVER_IMAGE_NAME"),
  PORT: Number(getEnv("PORT")),
  SERVER_BASE_PORT: Number(getEnv("SERVER_BASE_PORT")),
  SERVERS_HOST: getEnv("SERVERS_HOST"),
  CONTAINER_LOCAL_PORT: getEnv("CONTAINER_LOCAL_PORT"),
};
