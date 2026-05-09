import { Elysia } from "elysia";
import { Client } from "pg";
import { prisma } from "../lib/prisma";
import { decrypt } from "../lib/encryption";
import { config } from "../config";
import { requireAuth } from "../middleware/auth";
import { LESSON_CATALOG, getLesson } from "../lessons/catalog";

async function seedCatalog() {
  for (const l of LESSON_CATALOG) {
    await prisma.lesson.upsert({
      where: { slug: l.slug },
      create: {
        slug: l.slug,
        title: l.title,
        description: l.description,
        content: l.content,
        orderIndex: l.orderIndex,
      },
      update: {
        title: l.title,
        description: l.description,
        content: l.content,
        orderIndex: l.orderIndex,
      },
    });
  }
  // Remove lessons not in the catalog (catalog is source of truth).
  // LessonProgress cascades on delete.
  const slugs = LESSON_CATALOG.map((l) => l.slug);
  await prisma.lesson.deleteMany({ where: { slug: { notIn: slugs } } });
}

let seeded = false;
async function ensureSeed() {
  if (seeded) return;
  await seedCatalog();
  seeded = true;
}

async function getUserDbConnection(userId: string): Promise<Client | null> {
  const row = await prisma.userDatabase.findUnique({ where: { userId } });
  if (!row || !row.encryptedUrl) return null;
  let url: string;
  try {
    url = await decrypt(row.encryptedUrl, config.encryptionKey);
  } catch {
    return null;
  }
  return new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
}

export const lessonsRoutes = new Elysia({ prefix: "/api/lessons" })
  .use(requireAuth)
  .get("/", async ({ userId }) => {
    await ensureSeed();
    const lessons = await prisma.lesson.findMany({
      orderBy: { orderIndex: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        orderIndex: true,
      },
    });
    const progress = await prisma.lessonProgress.findMany({
      where: { userId },
      select: { lessonId: true, completed: true, completedAt: true },
    });
    const progressMap = Object.fromEntries(
      progress.map((p) => [p.lessonId, p]),
    );
    return {
      lessons: lessons.map((l) => ({
        ...l,
        progress: progressMap[l.id] ?? { completed: false, completedAt: null },
      })),
    };
  })
  .get("/:slug", async ({ params: { slug }, userId, set }) => {
    await ensureSeed();
    const lesson = await prisma.lesson.findUnique({ where: { slug } });
    if (!lesson) {
      set.status = 404;
      return { error: "Lesson not found" };
    }
    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });
    const def = getLesson(slug);
    return {
      lesson: {
        ...lesson,
        tables: def?.tables ?? [],
        starterSql: def?.starterSql ?? null,
        progress: progress
          ? {
              completed: progress.completed,
              completedAt: progress.completedAt,
              setupAt: progress.setupAt,
            }
          : { completed: false, completedAt: null, setupAt: null },
      },
    };
  })
  .post(
    "/:slug/setup",
    async ({ params: { slug }, query, userId, set }) => {
      const lesson = await prisma.lesson.findUnique({ where: { slug } });
      if (!lesson) {
        set.status = 404;
        return { error: "Lesson not found" };
      }
      const def = getLesson(slug);
      if (!def || def.setupSql.length === 0) {
        return { ok: true, ranSetup: false, reason: "no-setup" };
      }

      const force = query.force === "1" || query.force === "true";
      const existing = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
      });
      if (existing?.setupAt && !force) {
        return {
          ok: true,
          ranSetup: false,
          reason: "already",
          tables: def.tables,
        };
      }

      const client = await getUserDbConnection(userId);
      if (!client) {
        set.status = 412;
        return {
          error: "User database not configured. Set it up in Settings first.",
        };
      }

      try {
        await client.connect();
        await client.query("BEGIN");
        for (const stmt of def.setupSql) {
          await client.query(stmt);
        }
        await client.query("COMMIT");
      } catch (e) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        set.status = 502;
        return {
          error: e instanceof Error ? e.message : "Setup failed",
        };
      } finally {
        await client.end().catch(() => {});
      }

      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        create: { userId, lessonId: lesson.id, setupAt: new Date() },
        update: { setupAt: new Date() },
      });

      return { ok: true, ranSetup: true, tables: def.tables };
    },
  )
  .post("/:slug/complete", async ({ params: { slug }, userId, set }) => {
    const lesson = await prisma.lesson.findUnique({ where: { slug } });
    if (!lesson) {
      set.status = 404;
      return { error: "Lesson not found" };
    }
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      create: {
        userId,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(),
      },
      update: { completed: true, completedAt: new Date() },
    });
    return { ok: true };
  });
