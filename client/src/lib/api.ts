const API = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function authGoogle(credential: string) {
  const res = await fetch(`${API}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Auth failed");
  return data as { token: string; user: { id: string; email: string; name: string | null; picture: string | null } };
}

export async function getMe() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as { id: string; email: string; name: string | null; picture: string | null };
}

export async function getLessons() {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const res = await fetch(`${API}/lessons`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load lessons");
  return data as {
    lessons: Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      orderIndex: number;
      progress: { completed: boolean; completedAt: string | null };
    }>;
  };
}

export async function getLesson(slug: string) {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const res = await fetch(`${API}/lessons/${slug}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Lesson not found");
  return data as {
    lesson: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      content: string;
      tables: string[];
      starterSql: string | null;
      progress: {
        completed: boolean;
        completedAt: string | null;
        setupAt: string | null;
      };
    };
  };
}

export async function setupLesson(slug: string, force = false) {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const url = force
    ? `${API}/lessons/${slug}/setup?force=1`
    : `${API}/lessons/${slug}/setup`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Setup failed");
  return data as {
    ok: boolean;
    ranSetup: boolean;
    reason?: string;
    tables?: string[];
  };
}

export async function completeLesson(slug: string) {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const res = await fetch(`${API}/lessons/${slug}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data as { ok: boolean };
}

export async function getUserDb() {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const res = await fetch(`${API}/user-db`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data as {
    hasDatabase: boolean;
    hasConnectionUrl?: boolean;
    hasGenezioToken: boolean;
    url: string | null;
  };
}

export async function getUserDbUrl() {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const res = await fetch(`${API}/user-db/decrypted`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data as { url: string };
}

export async function saveUserDb(connectionUrl: string) {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const res = await fetch(`${API}/user-db`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ connectionUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data as { ok: boolean };
}

export async function generateUserDb() {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const res = await fetch(`${API}/user-db/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data as { ok: boolean; name?: string; saved?: boolean };
}

export async function getLiveDb(table?: string) {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const url = table
    ? `${API}/user-db/live?table=${encodeURIComponent(table)}`
    : `${API}/user-db/live`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data as
    | { tables: Array<{ schema: string; name: string }> }
    | { table: string; columns: string[]; rows: Record<string, unknown>[] };
}

export async function runSql(sql: string) {
  const token = getToken();
  if (!token) throw new Error("Unauthorized");
  const res = await fetch(`${API}/user-db/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sql }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data as {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number | null;
    command?: string;
  };
}
