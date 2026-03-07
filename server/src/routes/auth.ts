import { Elysia } from "elysia";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { config } from "../config";

const googleClient = new OAuth2Client(config.googleClientId);

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .post("/google", async ({ body, set, jwt }) => {
    const { credential } = body as { credential?: string };
    if (!credential) {
      set.status = 400;
      return { error: "Missing credential" };
    }
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) {
        set.status = 401;
        return { error: "Invalid token" };
      }
      const user = await prisma.user.upsert({
        where: { googleId: payload.sub },
        create: {
          googleId: payload.sub,
          email: payload.email ?? "",
          name: payload.name ?? null,
          picture: payload.picture ?? null,
        },
        update: {
          email: payload.email ?? undefined,
          name: payload.name ?? undefined,
          picture: payload.picture ?? undefined,
        },
      });
      const token = await jwt.sign({
        sub: user.id,
        email: user.email,
      });
      return { token, user: { id: user.id, email: user.email, name: user.name, picture: user.picture } };
    } catch (e) {
      set.status = 401;
      return { error: "Invalid Google token" };
    }
  })
  .get("/me", async ({ set, jwt, headers }) => {
    const auth = headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!auth) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    try {
      const payload = await jwt.verify(auth);
      if (!payload?.sub) {
        set.status = 401;
        return { error: "Invalid token" };
      }
      const user = await prisma.user.findUnique({
        where: { id: payload.sub as string },
        select: { id: true, email: true, name: true, picture: true },
      });
      if (!user) {
        set.status = 401;
        return { error: "User not found" };
      }
      return { user };
    } catch {
      set.status = 401;
      return { error: "Invalid token" };
    }
  });
