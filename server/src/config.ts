export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  jwtSecret: process.env.JWT_SECRET ?? "",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  /** Optional: Bearer token for api.genez.io (create DB). Set in .env as GENEZIO_TOKEN. */
  genezioToken: process.env.GENEZIO_TOKEN ?? "",
  /** Optional: Accept-Version header for api.genez.io. Default 1.0; override if API returns "Please update your client". */
  genezioAcceptVersion: process.env.GENEZIO_ACCEPT_VERSION ?? "genezio-webapp/1.0",
} as const;

function requireEnv(name: string, value: string): asserts value is string {
  if (!value || value.length < 16) {
    throw new Error(`Missing or invalid env: ${name}`);
  }
}

export function validateConfig() {
  requireEnv("JWT_SECRET", config.jwtSecret);
  requireEnv("ENCRYPTION_KEY", config.encryptionKey);
  requireEnv("GOOGLE_CLIENT_ID", config.googleClientId);
}
