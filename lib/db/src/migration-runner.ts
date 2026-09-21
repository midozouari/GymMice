import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDatabaseConfig } from "./config.js";
import { defaultMigrationsFolder, readMigrationHistory, verifyMigrationHistory, type LedgerRow } from "./migration-history.js";

export type MigrationEnvironment = "test" | "development" | "preview";
export interface MigrationOptions {
  environment: string;
  env?: NodeJS.ProcessEnv;
  /** Intended for isolated integration fixtures; CLI always uses committed migrations. */
  migrationsFolder?: string;
}
export interface MigrationStatus { applied: number; pending: number; total: number }
// Stable database-scoped advisory lock shared by status and run.
export const MIGRATION_LOCK_KEY = 724031902;

export function assertMigrationEnvironment(environment: string): asserts environment is MigrationEnvironment {
  if (!["test", "development", "preview"].includes(environment)) {
    throw new Error("Migration environment must be explicitly test, development, or preview; production is forbidden.");
  }
}

export async function checkMigrations(options: Partial<MigrationOptions> = {}): Promise<MigrationStatus> {
  if (options.environment !== undefined) assertMigrationEnvironment(options.environment);
  const files = await readMigrationHistory(options.migrationsFolder);
  return { applied: 0, pending: files.length, total: files.length };
}

async function ledger(client: pg.Client): Promise<LedgerRow[]> {
  const exists = await client.query<{ ledger: string | null }>(
    "SELECT to_regclass('drizzle.__drizzle_migrations')::text AS ledger",
  );
  if (!exists.rows[0]?.ledger) return [];
  return (await client.query<LedgerRow>(
    'SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY id',
  )).rows;
}

async function execute(mode: "status" | "run", options: MigrationOptions): Promise<MigrationStatus> {
  assertMigrationEnvironment(options.environment);
  const folder = options.migrationsFolder ?? defaultMigrationsFolder;
  const files = await readMigrationHistory(folder);
  // Config errors are intentionally not forwarded: env values may contain credentials.
  let config: pg.ClientConfig;
  try {
    config = getDatabaseConfig("migration", options.environment, options.env ?? process.env);
  } catch {
    throw new Error("Migration database configuration rejected; check the explicit environment and allowed target.");
  }
  const client = new pg.Client({
    ...config,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
    lock_timeout: 3000,
    application_name: "gymmice-migrations",
  });
  let locked = false;
  let connectionFailed = false;
  // Keep this listener attached through shutdown, including late socket events.
  // Never log or propagate the original error (it can contain credentials/SQL).
  client.on("error", () => { connectionFailed = true; });
  let operationFailed = false;
  let safeError = "Migration database operation failed; inspect database diagnostics securely.";
  try {
    await client.connect();
    const identity = await client.query<{ username: string; database: string; unsafe: boolean }>(`
      SELECT current_user AS username, current_database() AS database,
        EXISTS (
          SELECT 1 FROM pg_roles r
          WHERE pg_has_role(current_user, r.oid, 'MEMBER')
          AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls)
        ) AS unsafe
    `);
    const who = identity.rows[0];
    if (!who || who.username !== config.user || who.database !== config.database || who.unsafe) {
      safeError = "Migration identity or privilege verification failed.";
      throw new Error(safeError);
    }
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [MIGRATION_LOCK_KEY]);
    if (!lock.rows[0]?.locked) {
      safeError = "Another migration session holds the advisory lock; retry after it finishes.";
      throw new Error(safeError);
    }
    locked = true;
    const before = await ledger(client);
    try { verifyMigrationHistory(files, before); } catch {
      safeError = "Migration ledger is not an exact prefix of committed history; refusing to continue.";
      throw new Error(safeError);
    }
    if (mode === "run") {
      await migrate(drizzle(client), {
        migrationsFolder: folder,
        migrationsSchema: "drizzle",
        migrationsTable: "__drizzle_migrations",
      });
    }
    const after = mode === "run" ? await ledger(client) : before;
    verifyMigrationHistory(files, after);
    if (connectionFailed) throw new Error(safeError);
    return { applied: after.length, pending: files.length - after.length, total: files.length };
  } catch {
    operationFailed = true;
    throw new Error(safeError);
  } finally {
    let cleanupFailed = false;
    if (locked) {
      try {
        const unlocked = await client.query<{ unlocked: boolean }>(
          "SELECT pg_advisory_unlock($1) AS unlocked", [MIGRATION_LOCK_KEY],
        );
        if (!unlocked.rows[0]?.unlocked) cleanupFailed = true;
      } catch { cleanupFailed = true; }
    }
    // A socket destroy alone does not guarantee pg.end() settles. Race it with
    // an explicit deadline and consume both promises' rejections.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        try {
          const connection = client as unknown as { connection?: { stream?: { destroy(): void } } };
          connection.connection?.stream?.destroy();
        } catch { /* the deadline still rejects */ }
        reject(new Error("Migration connection shutdown timed out."));
      }, 2000);
    });
    try { await Promise.race([client.end(), deadline]); }
    catch { cleanupFailed = true; }
    finally { if (timeout) clearTimeout(timeout); }
    if (!operationFailed && (cleanupFailed || connectionFailed)) {
      throw new Error("Migration connection or cleanup failed; verify database status before retrying.");
    }
  }
}

export const migrationStatus = (options: MigrationOptions) => execute("status", options);
export const runMigrations = (options: MigrationOptions) => execute("run", options);