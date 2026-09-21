import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { getDatabaseConfig } from "./config";
import * as schema from "./schema";

export interface DatabaseClientOptions {
  env?: Record<string, string | undefined>;
  createPool?: (config: pg.PoolConfig) => pg.Pool;
  onIdleError?: (message: string) => void;
  closeTimeoutMs?: number;
}

export function createDatabaseClient(options: DatabaseClientOptions = {}) {
  let database: { pool: pg.Pool; db: ReturnType<typeof makeDatabase> } | undefined;
  let closing: Promise<void> | undefined;
  let closed = false;
  function makeDatabase(pool: pg.Pool) {
    return drizzle(pool, { schema });
  }

  function getRuntimeDatabase() {
    if (closed) throw new Error("Database client is closed.");
    if (!database) {
      const env = options.env ?? process.env;
      const environment = env.DB_ENV ?? (env.NODE_ENV === "test" ? "test" : "");
      const config = getDatabaseConfig("runtime", environment, env);
      try {
        const pool = (options.createPool ?? ((value) => new pg.Pool(value)))(config);
        pool.on("error", () => {
          (options.onIdleError ?? console.error)("Database idle connection failed.");
        });
        database = { pool, db: makeDatabase(pool) };
      } catch {
        throw new Error("Database client initialization failed.");
      }
    }
    return database;
  }

  function closeDatabase(): Promise<void> {
    if (closing) return closing;
    closed = true;
    if (!database) return (closing = Promise.resolve());
    const pool = database.pool;
    closing = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Database shutdown timed out.")), options.closeTimeoutMs ?? 5_000);
      Promise.resolve().then(() => pool.end()).then(
        () => { clearTimeout(timer); resolve(); },
        () => { clearTimeout(timer); reject(new Error("Database shutdown failed.")); },
      );
    });
    return closing;
  }
  return { getRuntimeDatabase, closeDatabase };
}

const runtime = createDatabaseClient();
export const getRuntimeDatabase = runtime.getRuntimeDatabase;
export const closeDatabase = runtime.closeDatabase;