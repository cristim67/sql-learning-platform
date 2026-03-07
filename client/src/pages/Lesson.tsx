import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getLesson, completeLesson, getLiveDb, runSql } from "../lib/api";

type LiveTables = { tables: Array<{ schema: string; name: string }> };
type LiveRows = { table: string; columns: string[]; rows: Record<string, unknown>[] };

const DEFAULT_SQL = "SELECT 'Hello, PostgreSQL!' AS message;";

function getFirstCodeBlock(md: string): string | null {
  const m = md.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

export default function LessonPage() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [liveData, setLiveData] = useState<LiveTables | LiveRows | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sqlInput, setSqlInput] = useState(DEFAULT_SQL);
  const [runResult, setRunResult] = useState<{ columns: string[]; rows: Record<string, unknown>[]; rowCount: number | null; command?: string } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getLesson(slug)
      .then((data) => {
        setTitle(data.lesson.title);
        setContent(data.lesson.content);
        setCompleted(data.lesson.progress.completed);
        setSqlInput(getFirstCodeBlock(data.lesson.content) ?? DEFAULT_SQL);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (selectedTable) {
      setLiveError(null);
      getLiveDb(selectedTable)
        .then((data) => setLiveData(data as LiveRows))
        .catch((e) => setLiveError(e instanceof Error ? e.message : "Error"));
    } else {
      setLiveError(null);
      getLiveDb()
        .then((data) => setLiveData(data as LiveTables))
        .catch((e) => {
          setLiveData(null);
          setLiveError(e instanceof Error ? e.message : "Error");
        });
    }
  }, [selectedTable]);

  const handleComplete = async () => {
    if (!slug || marking || completed) return;
    setMarking(true);
    try {
      await completeLesson(slug);
      setCompleted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setMarking(false);
    }
  };

  const refreshLive = () => {
    setLiveError(null);
    if (selectedTable) {
      getLiveDb(selectedTable).then((data) => setLiveData(data as LiveRows)).catch((e) => setLiveError(e instanceof Error ? e.message : "Error"));
    } else {
      getLiveDb().then((data) => setLiveData(data as LiveTables)).catch((e) => { setLiveData(null); setLiveError(e instanceof Error ? e.message : "Error"); });
    }
  };

  const handleRunSql = async () => {
    const q = sqlInput.trim();
    if (!q) return;
    setRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const data = await runSql(q);
      setRunResult(data);
      refreshLive();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Error");
    } finally {
      setRunning(false);
    }
  };

  if (loading)
    return (
      <div className="text-center text-text-muted py-8">Loading lesson...</div>
    );
  if (error)
    return (
      <div className="text-center text-error py-8">Error: {error}</div>
    );
  if (!content) return null;

  const isTables = liveData && "tables" in liveData;
  const isRows = liveData && "rows" in liveData;

  return (
    <div className="animate-fade-in flex gap-8 flex-wrap">
      <div className="flex-1 min-w-0">
        <Link
          to="/"
          className="inline-block mb-6 text-sm text-text-muted no-underline hover:text-accent hover:no-underline"
        >
          ← Back to lessons
        </Link>
        <article className="bg-bg-card border border-border rounded-card px-8 py-8">
          <h1 className="text-2xl font-bold text-text m-0 mb-6 pb-4 border-b border-border">
            {title}
          </h1>
          <div
            className="lesson-content text-base leading-7"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
          />
          <footer className="mt-8 pt-6 border-t border-border">
            {completed ? (
              <span className="inline-flex items-center gap-2 text-success font-medium">
                ✓ Lesson completed
              </span>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={marking}
                className="text-[0.95rem] px-5 py-2.5 rounded-[10px] border-0 bg-success-bg text-white font-semibold cursor-pointer hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {marking ? "Saving..." : "Mark as completed"}
              </button>
            )}
          </footer>
        </article>
      </div>

      {/* Live DB panel + Run SQL */}
      <aside className="w-full sm:max-w-[420px] shrink-0">
        <div className="bg-bg-card border border-border rounded-card px-5 py-5 sticky top-24 space-y-5">
          <section>
            <h2 className="text-lg font-semibold text-text m-0 mb-2">Run SQL</h2>
            <p className="text-sm text-text-muted m-0 mb-2">Run queries against your database. Try the examples from the lesson.</p>
            <textarea
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder="SELECT 1;"
              rows={4}
              className="w-full font-mono text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text placeholder:text-text-muted focus:outline-none focus:border-accent resize-y min-h-[80px]"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleRunSql}
              disabled={running || !sqlInput.trim()}
              className="mt-2 text-sm px-4 py-2 rounded-[10px] border-0 bg-accent text-white font-medium cursor-pointer hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {running ? "Running…" : "Run"}
            </button>
            {runError && (
              <p className="text-sm text-error mt-2 m-0">{runError}</p>
            )}
            {runResult && !runError && (
              <div className="mt-3">
                {runResult.columns.length > 0 ? (
                  <div className="overflow-x-auto">
                    <p className="text-sm text-text-muted m-0 mb-2">{runResult.rows.length} row(s)</p>
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr>
                          {runResult.columns.map((c) => (
                            <th key={c} className="border border-border px-2 py-1 bg-bg-hover font-medium">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {runResult.rows.map((row, i) => (
                          <tr key={i}>
                            {runResult.columns.map((col) => (
                              <td key={col} className="border border-border px-2 py-1">
                                {row[col] != null ? String(row[col]) : "NULL"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-success m-0">
                    Done.{runResult.rowCount != null && runResult.rowCount >= 0 ? ` ${runResult.rowCount} row(s) affected.` : ""}
                  </p>
                )}
              </div>
            )}
          </section>
          <section>
            <h2 className="text-lg font-semibold text-text m-0 mb-3">Your database (live)</h2>
            {liveError && (
              <p className="text-sm text-error m-0 mb-3">{liveError}</p>
            )}
            {isTables && liveData.tables.length === 0 && !liveError && (
              <p className="text-sm text-text-muted m-0">No tables in public schema yet.</p>
            )}
          {isTables && liveData.tables.length > 0 && (
            <>
              <p className="text-sm text-text-muted m-0 mb-2">Tables:</p>
              <ul className="list-none m-0 p-0 flex flex-wrap gap-2 mb-3">
                <li>
                  <button
                    type="button"
                    onClick={() => setSelectedTable(null)}
                    className={`text-sm px-2 py-1 rounded border cursor-pointer ${
                      !selectedTable
                        ? "bg-accent text-white border-accent"
                        : "bg-bg border-border text-text hover:border-accent"
                    }`}
                  >
                    (list)
                  </button>
                </li>
                {liveData.tables.map((t) => (
                  <li key={`${t.schema}.${t.name}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedTable(t.name)}
                      className={`text-sm px-2 py-1 rounded border cursor-pointer font-mono ${
                        selectedTable === t.name
                          ? "bg-accent text-white border-accent"
                          : "bg-bg border-border text-text hover:border-accent"
                      }`}
                    >
                      {t.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {isRows && (
            <div className="overflow-x-auto">
              <p className="text-sm text-text-muted m-0 mb-2">Table &quot;{liveData.table}&quot; (first 10 rows)</p>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr>
                    {liveData.columns.map((col) => (
                      <th key={col} className="border border-border px-2 py-1 bg-bg-hover font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveData.rows.map((row, i) => (
                    <tr key={i}>
                      {liveData.columns.map((col) => (
                        <td key={col} className="border border-border px-2 py-1">
                          {row[col] != null ? String(row[col]) : "NULL"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;
  let inList = false;
  let codeBuf: string[] = [];

  function bold(s: string) {
    return s.replace(/\*\*(.+?)\*\*/g, (_, g) => `<strong>${escapeHtml(g)}</strong>`);
  }
  function closeList() {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      closeList();
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      out.push(`<h1>${bold(escapeHtml(line.slice(2)))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      out.push(`<h2>${bold(escapeHtml(line.slice(3)))}</h2>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${bold(escapeHtml(line.slice(2)))}</li>`);
      continue;
    }
    if (line.trim() === "") {
      closeList();
      out.push("<br />");
      continue;
    }
    closeList();
    out.push(`<p>${bold(escapeHtml(line))}</p>`);
  }
  closeList();
  if (inCode && codeBuf.length) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }
  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
