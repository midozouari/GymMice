import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const defaultMigrationsFolder = fileURLToPath(new URL("../migrations/", import.meta.url));
export interface MigrationFile {
  idx: number;
  tag: string;
  when: number;
  hash: string;
}
export interface LedgerRow {
  id: number;
  hash: string;
  created_at: string | number;
}

function invalid(): never {
  throw new Error("Migration files or journal are invalid; inspect the committed migration history.");
}

/** Conservative guard, not an SQL security boundary. Migration files are trusted reviewed code. */
export function assertTransactionalSql(sql: string): void {
  const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
  if (/\b(?:CONCURRENTLY|VACUUM|CHECKPOINT|DISCARD\s+ALL|REINDEX\s+(?:DATABASE|SYSTEM)|ALTER\s+SYSTEM|(?:CREATE|DROP)\s+(?:DATABASE|TABLESPACE|SUBSCRIPTION)|(?:BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION|END|ABORT|PREPARE\s+TRANSACTION))\b/i.test(cleaned)) {
    throw new Error("Migration contains an unsupported nontransactional operation or transaction boundary.");
  }
}

export async function readMigrationHistory(folder = defaultMigrationsFolder): Promise<MigrationFile[]> {
  try {
    const journal = JSON.parse(await readFile(`${folder}/meta/_journal.json`, "utf8"));
    if (journal.version !== "7" || journal.dialect !== "postgresql" ||
        !Array.isArray(journal.entries) || journal.entries.length === 0) invalid();
    const sqlFiles = (await readdir(folder)).filter(name => name.endsWith(".sql")).sort();
    const tags = new Set<string>();
    let previousTime = 0;
    const files: MigrationFile[] = [];
    for (const [idx, entry] of journal.entries.entries()) {
      if (entry.idx !== idx || entry.version !== "7" ||
          !Number.isSafeInteger(entry.when) || entry.when <= previousTime ||
          typeof entry.tag !== "string" || !/^\d{4}_[a-zA-Z0-9_-]+$/.test(entry.tag) ||
          !entry.tag.startsWith(`${String(idx).padStart(4, "0")}_`) ||
          tags.has(entry.tag) || entry.breakpoints !== true) invalid();
      tags.add(entry.tag);
      previousTime = entry.when;
      const sql = await readFile(`${folder}/${entry.tag}.sql`, "utf8");
      if (!sql.trim()) invalid();
      assertTransactionalSql(sql);
      files.push({ idx, tag: entry.tag, when: entry.when, hash: createHash("sha256").update(sql).digest("hex") });
    }
    if (sqlFiles.length !== files.length || files.some(file => !sqlFiles.includes(`${file.tag}.sql`))) invalid();
    return files;
  } catch {
    // Never return filesystem paths or untrusted SQL/journal contents to CLI callers.
    return invalid();
  }
}

/** Drizzle checks timestamps only; enforce immutable, gap-free SHA-256 history ourselves. */
export function verifyMigrationHistory(files: MigrationFile[], rows: LedgerRow[]): void {
  if (rows.length > files.length || rows.some((row, idx) => {
    const file = files[idx];
    return !file || !Number.isSafeInteger(row.id) || row.id <= 0 ||
      (idx > 0 && row.id <= rows[idx - 1]!.id) || row.hash !== file.hash ||
      String(row.created_at) !== String(file.when);
  })) {
    throw new Error("Migration ledger is not an exact prefix of committed history; refusing to continue.");
  }
}