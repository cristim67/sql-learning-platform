import { useEffect, useState } from "react";
import { getUserDb, saveUserDb, generateUserDb } from "../lib/api";

export default function Settings() {
  const [hasDb, setHasDb] = useState(false);
  const [hasConnectionUrl, setHasConnectionUrl] = useState(false);
  const [hasGenezioToken, setHasGenezioToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    getUserDb()
      .then((data) => {
        setHasDb(data.hasDatabase);
        setHasConnectionUrl(data.hasConnectionUrl ?? !!data.hasDatabase);
        setHasGenezioToken(data.hasGenezioToken);
      })
      .catch(() =>
        setMessage({ type: "err", text: "Could not load settings." }),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const data = await generateUserDb();
      setMessage({
        type: "ok",
        text: data.saved
          ? "Database created and saved."
          : "Database created; paste its URL in Advanced if needed.",
      });
      load();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Error creating database.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!value) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveUserDb(value);
      setHasDb(true);
      setUrl("");
      setMessage({ type: "ok", text: "Connection URL saved (encrypted)." });
      load();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Error saving.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="text-center text-text-muted py-8">Loading...</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-text m-0 mb-1">Settings</h1>
      <p className="text-text-muted text-[0.95rem] m-0 mb-8">
        You have one database per account. It is created automatically when you
        open Lessons.
      </p>

      <section className="bg-bg-card border border-border rounded-card px-8 py-7 mb-6">
        <h2 className="text-lg font-semibold text-text m-0 mb-2">Database</h2>
        {hasDb ? (
          <>
            <p className="text-sm text-success m-0">
              {hasConnectionUrl
                ? "Your database is set up."
                : "Database created; add connection URL in Advanced below to use live view."}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-muted m-0 mb-3">
              No database yet. It is normally created when you open Lessons. You
              can create it here if needed.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !hasGenezioToken}
              className="text-[0.95rem] px-5 py-2.5 rounded-[10px] border-0 bg-accent text-white font-semibold cursor-pointer hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {generating ? "Creating..." : "Create database"}
            </button>
            {!hasGenezioToken && (
              <p className="text-sm text-text-muted mt-3">
                Server not configured (GENEZIO_TOKEN missing in .env).
              </p>
            )}
          </>
        )}
        {message && (
          <p
            className={
              message.type === "ok"
                ? "mt-4 text-sm text-success"
                : "mt-4 text-sm text-error"
            }
          >
            {message.text}
          </p>
        )}
      </section>

      <section className="bg-bg-card border border-border rounded-card px-8 py-7">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-medium text-text-muted hover:text-text cursor-pointer bg-transparent border-0 p-0"
        >
          {showAdvanced ? "−" : "+"} Advanced: set connection URL manually
        </button>
        {showAdvanced && (
          <form
            onSubmit={handleSubmitUrl}
            className="flex flex-col gap-3 max-w-[480px] mt-4"
          >
            <input
              type="password"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="postgresql://..."
              className="font-mono text-sm px-4 py-2.5 rounded-lg border border-border bg-bg text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-[10px] border-0 bg-bg-hover text-text font-medium cursor-pointer self-start hover:brightness-95 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save URL (replaces current)"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
