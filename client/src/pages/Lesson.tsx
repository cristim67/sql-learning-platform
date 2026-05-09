import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getLesson, completeLesson, runSql, setupLesson } from "../lib/api";

type RunResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number | null;
  command?: string;
};

type TablePreview = {
  name: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string;
};

const PREVIEW_LIMIT = 50;

function ResultTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="border border-border px-2 py-1 bg-bg-hover font-medium font-mono"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td
                  key={col}
                  className="border border-border px-2 py-1 font-mono text-xs"
                >
                  {row[col] != null ? (
                    String(row[col])
                  ) : (
                    <span className="text-text-muted italic">NULL</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LessonPage() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [completed, setCompleted] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const [setupState, setSetupState] = useState<
    "idle" | "running" | "ready" | "error"
  >("idle");
  const [setupMsg, setSetupMsg] = useState<string | null>(null);

  const [previews, setPreviews] = useState<TablePreview[]>([]);
  const [previewsLoading, setPreviewsLoading] = useState(false);

  const [sqlInput, setSqlInput] = useState("SELECT * FROM employees;");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const tablesRef = useRef<string[]>([]);
  tablesRef.current = tables;

  const sqlTextareaRef = useRef<HTMLTextAreaElement>(null);

  /** If the user highlighted text, run only that (trimmed). Otherwise run the whole editor. */
  const getSqlToRun = (): string => {
    const el = sqlTextareaRef.current;
    const full = sqlInput;
    if (el && el.selectionStart !== el.selectionEnd) {
      return full.slice(el.selectionStart, el.selectionEnd).trim();
    }
    return full.trim();
  };

  const loadPreviews = useCallback(async (tableNames: string[]) => {
    if (tableNames.length === 0) {
      setPreviews([]);
      return;
    }
    setPreviewsLoading(true);
    try {
      const results = await Promise.all(
        tableNames.map(async (t): Promise<TablePreview> => {
          try {
            const r = await runSql(
              `SELECT * FROM "${t}" LIMIT ${PREVIEW_LIMIT}`,
            );
            return {
              name: t,
              columns: r.columns,
              rows: r.rows,
              rowCount: r.rows.length,
            };
          } catch (e) {
            return {
              name: t,
              columns: [],
              rows: [],
              rowCount: 0,
              error: e instanceof Error ? e.message : "Error",
            };
          }
        }),
      );
      setPreviews(results);
    } finally {
      setPreviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSetupState("idle");
    setSetupMsg(null);
    setPreviews([]);
    setRunResult(null);
    setRunError(null);

    (async () => {
      try {
        const data = await getLesson(slug);
        if (cancelled) return;
        setTitle(data.lesson.title);
        setContent(data.lesson.content);
        setCompleted(data.lesson.progress.completed);
        setTables(data.lesson.tables);
        setSqlInput(data.lesson.starterSql ?? "SELECT 1;");

        if (data.lesson.tables.length > 0) {
          setSetupState("running");
          setSetupMsg("Preparing your workspace…");
          try {
            const r = await setupLesson(slug, false);
            if (cancelled) return;
            setSetupState("ready");
            setSetupMsg(
              r.ranSetup
                ? "Workspace tables created."
                : "Workspace tables already set up.",
            );
            await loadPreviews(data.lesson.tables);
          } catch (e) {
            if (cancelled) return;
            setSetupState("error");
            setSetupMsg(e instanceof Error ? e.message : "Setup failed");
          }
        } else {
          setSetupState("ready");
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
  }, [slug, loadPreviews]);

  const handleResetTables = async () => {
    if (!slug) return;
    setSetupState("running");
    setSetupMsg("Resetting tables…");
    try {
      await setupLesson(slug, true);
      setSetupState("ready");
      setSetupMsg("Tables reset to initial state.");
      await loadPreviews(tablesRef.current);
    } catch (e) {
      setSetupState("error");
      setSetupMsg(e instanceof Error ? e.message : "Reset failed");
    }
  };

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

  const handleRunSql = async () => {
    const q = getSqlToRun();
    if (!q) return;
    setRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const data = await runSql(q);
      setRunResult(data);
      // Refresh previews so the user sees the effect of INSERT/UPDATE/DELETE.
      loadPreviews(tablesRef.current);
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
    return <div className="text-center text-error py-8">Error: {error}</div>;
  if (!content) return null;

  return (
    <div className="animate-fade-in flex flex-col lg:h-full lg:min-h-0">
      <Link
        to="/"
        className="inline-block mb-3 text-sm text-text-muted no-underline hover:text-accent hover:no-underline shrink-0"
      >
        ← Back to lessons
      </Link>

      {/* Split view: each column scrolls independently on lg+; on small screens
          we fall back to normal page scroll (each column auto-height). */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:flex-1 lg:min-h-0 lg:pb-4">
        {/* LEFT: lesson markdown — own scroll on lg+ */}
        <article className="bg-bg-card border border-border rounded-card px-7 py-7 min-w-0 lg:min-h-0 lg:overflow-y-auto">
          <h1 className="text-2xl font-bold text-text m-0 mb-5 pb-4 border-b border-border">
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

        {/* RIGHT: workspace — own scroll on lg+ */}
        <aside className="flex flex-col gap-5 min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          {/* SQL editor first so users see it without scrolling */}
          <div className="bg-bg-card border border-border rounded-card px-5 py-5">
            <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-text m-0">Run SQL</h2>
              <span className="text-xs text-text-muted">
                ⌘/Ctrl+Enter — runs selection if highlighted, else all
              </span>
            </div>
            <textarea
              ref={sqlTextareaRef}
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder="SELECT * FROM employees;"
              rows={5}
              className="w-full font-mono text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text placeholder:text-text-muted focus:outline-none focus:border-accent resize-y min-h-[110px]"
              spellCheck={false}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleRunSql();
                }
              }}
            />
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <button
                type="button"
                onClick={handleRunSql}
                disabled={running || !getSqlToRun() || setupState === "running"}
                className="text-sm px-4 py-2 rounded-[10px] border-0 bg-accent text-white font-medium cursor-pointer hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {running ? "Running…" : "Run"}
              </button>
            </div>

            {runError && (
              <pre className="mt-3 text-sm text-error m-0 whitespace-pre-wrap break-words">
                {runError}
              </pre>
            )}
            {runResult && !runError && (
              <div className="mt-3">
                {runResult.columns.length > 0 ? (
                  <>
                    <p className="text-xs text-text-muted m-0 mb-2">
                      {runResult.rows.length} row
                      {runResult.rows.length === 1 ? "" : "s"} returned
                    </p>
                    <ResultTable
                      columns={runResult.columns}
                      rows={runResult.rows}
                    />
                  </>
                ) : (
                  <p className="text-sm text-success m-0">
                    Done.
                    {runResult.rowCount != null && runResult.rowCount >= 0
                      ? ` ${runResult.rowCount} row(s) affected.`
                      : ""}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-bg-card border border-border rounded-card px-5 py-5">
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <h2 className="text-lg font-semibold text-text m-0">
                Lesson tables
              </h2>
              <button
                type="button"
                onClick={handleResetTables}
                disabled={setupState === "running"}
                className="text-xs px-3 py-1.5 rounded-[10px] border-0 bg-bg-hover text-text font-medium cursor-pointer hover:brightness-95 disabled:opacity-60"
                title="Drop and recreate the lesson tables with the original data"
              >
                {setupState === "running" ? "Working…" : "Reset tables"}
              </button>
            </div>

            {setupMsg && (
              <p
                className={
                  setupState === "error"
                    ? "text-xs text-error m-0 mb-2"
                    : "text-xs text-text-muted m-0 mb-2"
                }
              >
                {setupMsg}
              </p>
            )}

            {tables.length === 0 && setupState === "ready" && (
              <p className="text-sm text-text-muted m-0">
                This lesson has no setup tables.
              </p>
            )}

            {previewsLoading && previews.length === 0 && (
              <p className="text-sm text-text-muted m-0">Loading tables…</p>
            )}

            <div className="space-y-4">
              {previews.map((p) => (
                <div key={p.name}>
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-sm font-semibold text-text m-0 font-mono">
                      {p.name}
                    </h3>
                    {!p.error && (
                      <span className="text-xs text-text-muted">
                        {p.rowCount} row{p.rowCount === 1 ? "" : "s"}
                        {p.rowCount === PREVIEW_LIMIT ? " (max preview)" : ""}
                      </span>
                    )}
                  </div>
                  {p.error ? (
                    <p className="text-sm text-error m-0">{p.error}</p>
                  ) : p.rows.length === 0 ? (
                    <p className="text-sm text-text-muted m-0">empty</p>
                  ) : (
                    <ResultTable columns={p.columns} rows={p.rows} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
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
    return s.replace(
      /\*\*(.+?)\*\*/g,
      (_, g) => `<strong>${escapeHtml(g)}</strong>`,
    );
  }
  function inlineCode(s: string) {
    return s.replace(/`([^`]+)`/g, (_, g) => `<code>${escapeHtml(g)}</code>`);
  }
  function inline(s: string) {
    // bold first, then inline code on the rest. To avoid escaping codes twice,
    // escape -> bold (already escapes its arg) -> we manually do code spans
    // on the escaped string for simplicity.
    return inlineCode(bold(escapeHtml(s)));
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
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    if (line.trim() === "") {
      closeList();
      out.push("<br />");
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
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
