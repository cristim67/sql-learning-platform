-- Track per-user lesson workspace setup time so we don't recreate tables on every visit
ALTER TABLE "LessonProgress" ADD COLUMN IF NOT EXISTS "setupAt" TIMESTAMP(3);
