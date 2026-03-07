import { Elysia } from "elysia";

export const requireAuth = new Elysia({ name: "requireAuth" })
  .derive({ as: "scoped" }, async ({ headers, jwt }) => {
    const auth = headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!auth) return { userId: null as string | null };
    try {
      const payload = await jwt.verify(auth);
      if (!payload?.sub) return { userId: null as string | null };
      return { userId: payload.sub as string };
    } catch {
      return { userId: null as string | null };
    }
  })
  .onBeforeHandle(({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
  });
