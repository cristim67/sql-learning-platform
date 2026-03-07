import { Elysia } from "elysia";
import { Client } from "pg";
import { prisma } from "../lib/prisma";
import { encrypt, decrypt } from "../lib/encryption";
import { config } from "../config";
import { requireAuth } from "../middleware/auth";

const GENEZIO_API = "https://api.genez.io";

function genezioHeaders(): Record<string, string> {
  return {
    accept: "application/json, text/plain, */*",
    "accept-version": config.genezioAcceptVersion,
    "content-type": "application/json",
    authorization: `Bearer ${config.genezioToken}`,
  };
}

function randomDbName(): string {
  const prefix = "learn";
  const part = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}-${part}`;
}

export const userDbRoutes = new Elysia({ prefix: "/api/user-db" })
  .use(requireAuth)
  .get("/", async ({ userId }) => {
    const dbRow = await prisma.userDatabase.findUnique({ where: { userId } });
    return {
      hasDatabase: !!dbRow,
      hasConnectionUrl: !!dbRow?.encryptedUrl,
      hasGenezioToken: !!config.genezioToken,
      url: null,
    };
  })
  .post("/", async ({ body, userId, set }) => {
    const { connectionUrl } = body as { connectionUrl?: string };
    if (!connectionUrl || typeof connectionUrl !== "string") {
      set.status = 400;
      return { error: "Missing connectionUrl" };
    }
    const encryptedUrl = await encrypt(connectionUrl, config.encryptionKey);
    await prisma.userDatabase.upsert({
      where: { userId },
      create: { userId, encryptedUrl },
      update: { encryptedUrl },
    });
    return { ok: true };
  })
  .post("/generate", async ({ userId, set }) => {
    try {
      const existing = await prisma.userDatabase.findUnique({
        where: { userId },
      });
      if (existing) {
        return {
          ok: true,
          name: existing.genezioDbName ?? "existing",
          saved: !!existing.encryptedUrl,
        };
      }
      if (!config.genezioToken) {
        set.status = 503;
        return {
          error:
            "Generate database is not configured (missing GENEZIO_TOKEN in server .env).",
        };
      }
      const name = randomDbName();
      const res = await fetch(`${GENEZIO_API}/databases`, {
        method: "POST",
        headers: genezioHeaders(),
        body: JSON.stringify({
          name,
          type: "postgres-neon",
          region: "aws-eu-central-1",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        connectionUri?: string;
        connectionString?: string;
        connection_url?: string;
        connectionUrl?: string;
        uri?: string;
        id?: string;
        database?: {
          connectionUri?: string;
          connectionString?: string;
          connection_url?: string;
        };
        error?: string | { code?: number; message?: string };
      };
      const errMsg =
        typeof data.error === "string"
          ? data.error
          : (data.error?.message ?? (data.error ? String(data.error) : null));
      if (!res.ok) {
        set.status = res.status >= 400 && res.status < 500 ? res.status : 502;
        return { error: errMsg ?? `Genezio API error: ${res.status}` };
      }
      let connectionUrl: string | null =
        data.connectionUri ??
        data.connectionString ??
        data.connection_url ??
        data.connectionUrl ??
        data.uri ??
        data.database?.connectionUri ??
        data.database?.connectionString ??
        data.database?.connection_url ??
        null;
      if (connectionUrl && typeof connectionUrl !== "string")
        connectionUrl = null;

      if (!connectionUrl) {
        let dbId: string | null =
          data.id && typeof data.id === "string" ? data.id : null;
        if (!dbId) {
          const listRes = await fetch(`${GENEZIO_API}/databases`, {
            method: "GET",
            headers: genezioHeaders(),
          });
          const listData = (await listRes.json().catch(() => null)) as {
            databases?: { id?: string; name?: string }[];
          } | null;
          const list = listData?.databases ?? [];
          const found = list.find((d) => d.name === name);
          if (found?.id) dbId = found.id;
        }
        if (dbId) {
          const detailRes = await fetch(`${GENEZIO_API}/databases/${dbId}`, {
            method: "GET",
            headers: genezioHeaders(),
          });
          const detail = (await detailRes.json().catch(() => null)) as {
            connectionUrl?: string;
            connectionUri?: string;
            connectionString?: string;
          } | null;
          const url =
            detail?.connectionUrl ??
            detail?.connectionUri ??
            detail?.connectionString ??
            null;
          if (url && typeof url === "string") connectionUrl = url;
        }
      }

      const hasUrl = !!connectionUrl;
      let encryptedUrl: string | null = null;
      if (hasUrl) {
        try {
          encryptedUrl = await encrypt(connectionUrl as string, config.encryptionKey);
        } catch (e) {
          set.status = 500;
          return { error: e instanceof Error ? e.message : "Encryption failed" };
        }
      }
      await prisma.userDatabase.upsert({
        where: { userId },
        create: { userId, encryptedUrl, genezioDbName: name },
        update: { encryptedUrl, genezioDbName: name },
      });
      return { ok: true, name, saved: !!encryptedUrl };
    } catch (e) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : "Generate failed" };
    }
  })
  .get("/decrypted", async ({ userId, set }) => {
    const row = await prisma.userDatabase.findUnique({
      where: { userId },
    });
    if (!row || !row.encryptedUrl) {
      set.status = 404;
      return { error: "No database configured or connection URL not set" };
    }
    try {
      const url = await decrypt(row.encryptedUrl, config.encryptionKey);
      return { url };
    } catch {
      set.status = 500;
      return { error: "Failed to decrypt" };
    }
  })
  .get("/live", async ({ userId, query, set }) => {
    const row = await prisma.userDatabase.findUnique({
      where: { userId },
    });
    if (!row || !row.encryptedUrl) {
      set.status = 404;
      return { error: "No database configured or connection URL not set" };
    }
    let url: string;
    try {
      url = await decrypt(row.encryptedUrl, config.encryptionKey);
    } catch {
      set.status = 500;
      return { error: "Failed to decrypt" };
    }
    const tableName = (query.table as string)?.trim() || null;
    const client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      if (tableName) {
        const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, "");
        if (!safeTable) {
          set.status = 400;
          return { error: "Invalid table name" };
        }
        const r = await client.query(`SELECT * FROM "${safeTable}" LIMIT 10`);
        return {
          table: safeTable,
          rows: r.rows,
          columns: r.fields.map((f) => f.name),
        };
      }
      const r = await client.query(
        `SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_schema, table_name`,
      );
      return {
        tables: r.rows.map((row) => ({
          schema: row.table_schema,
          name: row.table_name,
        })),
      };
    } catch (e) {
      set.status = 502;
      return { error: e instanceof Error ? e.message : "Database error" };
    } finally {
      await client.end();
    }
  })
  .post("/run", async ({ userId, body, set }) => {
    const row = await prisma.userDatabase.findUnique({
      where: { userId },
    });
    if (!row || !row.encryptedUrl) {
      set.status = 404;
      return { error: "No database configured or connection URL not set" };
    }
    const sql = (body as { sql?: string })?.sql;
    if (typeof sql !== "string" || !sql.trim()) {
      set.status = 400;
      return { error: "Missing or empty sql" };
    }
    let url: string;
    try {
      url = await decrypt(row.encryptedUrl, config.encryptionKey);
    } catch {
      set.status = 500;
      return { error: "Failed to decrypt" };
    }
    const client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      const r = await client.query(sql.trim());
      const hasRows = r.rows && r.rows.length >= 0;
      return {
        columns: r.fields?.map((f) => f.name) ?? [],
        rows: hasRows ? r.rows : [],
        rowCount: r.rowCount ?? 0,
        command: r.command ?? undefined,
      };
    } catch (e) {
      set.status = 502;
      return { error: e instanceof Error ? e.message : "Database error" };
    } finally {
      await client.end();
    }
  });
