import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

// Demo lesson: Introduction to PostgreSQL
const DEMO_LESSON = {
  slug: "intro-postgres",
  title: "Introduction to PostgreSQL",
  description: "Learn the basics of the PostgreSQL database.",
  content: `# Introduction to PostgreSQL

PostgreSQL is a powerful, extensible open-source relational database.

## What you'll learn

- **Tables and columns** – data structure
- **INSERT, SELECT, UPDATE, DELETE** – CRUD operations
- **Relations** – foreign keys and JOINs
- **Indexes** – for performance

## Your first query

\`\`\`sql
SELECT 'Hello, PostgreSQL!' AS message;
\`\`\`

## Creating a table

\`\`\`sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL
);
\`\`\`

In the next lessons you'll use your own database for hands-on exercises.`,
  orderIndex: 0,
};

export const lessonsRoutes = new Elysia({ prefix: "/api/lessons" })
  .use(requireAuth)
  .get("/", async ({ userId }) => {
    // Ensure demo lesson exists (seed on first request)
    const existing = await prisma.lesson.findUnique({ where: { slug: DEMO_LESSON.slug } });
    if (!existing) {
      await prisma.lesson.create({ data: DEMO_LESSON });
    }
    const lessons = await prisma.lesson.findMany({
      orderBy: { orderIndex: "asc" },
      select: { id: true, slug: true, title: true, description: true, orderIndex: true },
    });
    const progress = await prisma.lessonProgress.findMany({
      where: { userId },
      select: { lessonId: true, completed: true, completedAt: true },
    });
    const progressMap = Object.fromEntries(progress.map((p) => [p.lessonId, p]));
    return {
      lessons: lessons.map((l) => ({
        ...l,
        progress: progressMap[l.id] ?? { completed: false, completedAt: null },
      })),
    };
  })
  .get("/:slug", async ({ params: { slug }, userId, set }) => {
    const lesson = await prisma.lesson.findUnique({ where: { slug } });
    if (!lesson) {
      set.status = 404;
      return { error: "Lesson not found" };
    }
    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });
    return {
      lesson: {
        ...lesson,
        progress: progress ? { completed: progress.completed, completedAt: progress.completedAt } : { completed: false, completedAt: null },
      },
    };
  })
  .post("/:slug/complete", async ({ params: { slug }, userId, set }) => {
    const lesson = await prisma.lesson.findUnique({ where: { slug } });
    if (!lesson) {
      set.status = 404;
      return { error: "Lesson not found" };
    }
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      create: { userId, lessonId: lesson.id, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() },
    });
    return { ok: true };
  });
