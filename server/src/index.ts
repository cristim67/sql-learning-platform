import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { config, validateConfig } from "./config";
import { authRoutes } from "./routes/auth";
import { lessonsRoutes } from "./routes/lessons";
import { userDbRoutes } from "./routes/user-db";

validateConfig();

const app = new Elysia()
  .use(
    cors({
      origin: config.frontendOrigin,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use(
    jwt({
      name: "jwt",
      secret: config.jwtSecret,
      exp: "7d",
    }),
  )
  .use(authRoutes)
  .use(lessonsRoutes)
  .use(userDbRoutes)
  .get("/api/health", () => ({ ok: true }))
  .listen(config.port);

console.log(`Server running at http://localhost:${config.port}`);

export type App = typeof app;
