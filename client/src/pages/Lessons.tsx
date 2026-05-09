import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLessons, getUserDb, generateUserDb } from "../lib/api";

type LessonItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  orderIndex: number;
  progress: { completed: boolean; completedAt: string | null };
};

export default function Lessons() {
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [hasDb, setHasDb] = useState(true);
  const [hasGenezioToken, setHasGenezioToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lessonsData, dbData] = await Promise.all([
          getLessons(),
          getUserDb(),
        ]);
        if (cancelled) return;
        setLessons(lessonsData.lessons);
        setHasDb(dbData.hasDatabase);
        setHasGenezioToken(dbData.hasGenezioToken);
        if (!dbData.hasDatabase) {
          setGenerating(true);
          try {
            const data = await generateUserDb();
            if (cancelled) return;
            setGenMessage(
              data.saved
                ? "Database created."
                : "Database created; add its URL in Settings if needed.",
            );
            const refetch = await getUserDb();
            if (cancelled) return;
            setHasDb(refetch.hasDatabase);
          } catch (e) {
            if (cancelled) return;
            setGenMessage(
              e instanceof Error ? e.message : "Could not create database.",
            );
          } finally {
            if (!cancelled) setGenerating(false);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading)
    return (
      <div className="text-center text-text-muted py-8">Loading lessons...</div>
    );
  if (error)
    return <div className="text-center text-error py-8">Error: {error}</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-text m-0 mb-1">Your lessons</h1>
      <p className="text-text-muted text-[0.95rem] m-0 mb-4">
        Go through the lessons in order and mark them complete when you're done.
      </p>
      {!hasDb && (
        <div className="mb-8 p-4 bg-bg-card border border-border rounded-card">
          {generating ? (
            <p className="text-sm text-text-muted m-0">
              Setting up your database…
            </p>
          ) : hasGenezioToken ? (
            <>
              <p className="text-sm text-text-muted m-0 mb-2">
                Creating your database…
              </p>
              {genMessage && (
                <p className="text-sm text-success m-0">{genMessage}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted m-0">
              Database could not be created automatically. The server must have{" "}
              <code className="text-xs bg-bg-hover px-1 py-0.5 rounded">
                GENEZIO_TOKEN
              </code>{" "}
              in .env.{" "}
              <Link to="/settings" className="text-accent hover:underline">
                Settings
              </Link>
              .
            </p>
          )}
        </div>
      )}
      <ul className="list-none m-0 p-0 flex flex-col gap-3">
        {lessons.map((l) => (
          <li key={l.id}>
            <Link
              to={`/lesson/${l.slug}`}
              className="flex items-center gap-4 px-5 py-5 bg-bg-card border border-border rounded-card no-underline text-inherit transition-colors hover:border-accent hover:bg-bg-hover hover:no-underline hover:text-inherit"
            >
              <span className="w-10 h-10 flex items-center justify-center bg-accent-dim text-accent font-bold text-base rounded-[10px] shrink-0">
                {l.orderIndex + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-text m-0 mb-1">
                  {l.title}
                </h2>
                {l.description && (
                  <p className="text-sm text-text-muted m-0 leading-snug">
                    {l.description}
                  </p>
                )}
              </div>
              {l.progress.completed ? (
                <span
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-success-bg text-white shrink-0 shadow-sm ring-1 ring-black/10 dark:ring-white/10"
                  title="Completed"
                  aria-label="Completed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {lessons.length === 0 && (
        <p className="text-center text-text-muted py-8">No lessons yet.</p>
      )}
    </div>
  );
}
