import { mkdtemp, readFile, writeFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { assertTransactionalSql, defaultMigrationsFolder, readMigrationHistory, verifyMigrationHistory } from "../src/migration-history.js";
import { checkMigrations, migrationStatus } from "../src/migration-runner.js";

const folders: string[] = [];
async function fixture() {
  const folder = await mkdtemp(join(tmpdir(), "b03-history-"));
  folders.push(folder);
  await cp(defaultMigrationsFolder, folder, { recursive: true });
  return folder;
}
afterEach(async () => { await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true }))); });

describe("offline migration history", () => {
  it("validates the no-op foundation without any database configuration", async () => {
    expect(await checkMigrations()).toEqual({ applied: 0, pending: 1, total: 1 });
    expect(await checkMigrations({ environment: "test", env: {} })).toEqual({ applied: 0, pending: 1, total: 1 });
    const files = await readMigrationHistory();
    expect(files[0]?.tag).toBe("0000_foundation");
    expect(files[0]?.hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("refuses production even for offline checks", async () => {
    await expect(checkMigrations({ environment: "production", env: {} })).rejects.toThrow("production");
  });
  it.each(["version", "dialect", "idx", "time", "tag", "breakpoints"])("rejects invalid journal %s", async field => {
    const folder = await fixture();
    const path = join(folder, "meta/_journal.json");
    const journal = JSON.parse(await readFile(path, "utf8"));
    if (field === "version") journal.version = "6";
    if (field === "dialect") journal.dialect = "sqlite";
    if (field === "idx") journal.entries[0].idx = 1;
    if (field === "time") journal.entries[0].when = -1;
    if (field === "tag") journal.entries[0].tag = "../escape";
    if (field === "breakpoints") journal.entries[0].breakpoints = false;
    await writeFile(path, JSON.stringify(journal));
    await expect(readMigrationHistory(folder)).rejects.toThrow("invalid");
  });
  it("rejects missing and orphan SQL", async () => {
    const folder = await fixture();
    await writeFile(join(folder, "orphan.sql"), "SELECT 1;");
    await expect(readMigrationHistory(folder)).rejects.toThrow("invalid");
    await rm(join(folder, "orphan.sql"));
    await rm(join(folder, "0000_foundation.sql"));
    await expect(readMigrationHistory(folder)).rejects.toThrow("invalid");
  });
  it("rejects duplicate or unordered timestamps and tags", async () => {
    const folder = await fixture();
    const path = join(folder, "meta/_journal.json");
    const journal = JSON.parse(await readFile(path, "utf8"));
    journal.entries.push({ ...journal.entries[0], idx: 1, tag: "0001_next" });
    await writeFile(join(folder, "0001_next.sql"), "SELECT 2;");
    await writeFile(path, JSON.stringify(journal));
    await expect(readMigrationHistory(folder)).rejects.toThrow("invalid");
    journal.entries[1].when += 1;
    journal.entries[1].tag = journal.entries[0].tag;
    await writeFile(path, JSON.stringify(journal));
    await expect(readMigrationHistory(folder)).rejects.toThrow("invalid");
  });
  it("enforces exact ledger prefix including hashes, ids and timestamps", async () => {
    const files = await readMigrationHistory();
    const row = { id: 1, hash: files[0]!.hash, created_at: String(files[0]!.when) };
    expect(() => verifyMigrationHistory(files, [])).not.toThrow();
    expect(() => verifyMigrationHistory(files, [row])).not.toThrow();
    expect(() => verifyMigrationHistory(files, [{ ...row, id: 2 }])).not.toThrow();
    for (const rows of [[{ ...row, hash: "edited" }], [{ ...row, id: 0 }], [{ ...row, created_at: "1" }], [row, row]]) {
      expect(() => verifyMigrationHistory(files, rows)).toThrow("exact prefix");
    }
    const folder = await fixture();
    await writeFile(join(folder, "0000_foundation.sql"), "SELECT 2;");
    expect(() => verifyMigrationHistory(files, [row])).not.toThrow();
    expect(() => verifyMigrationHistory([], [row])).toThrow("exact prefix");
    expect(() => verifyMigrationHistory([{ ...files[0]!, hash: "changed" }], [row])).toThrow("exact prefix");
    const edited = await readMigrationHistory(folder);
    expect(() => verifyMigrationHistory(edited, [row])).toThrow("exact prefix");
  });
  it("permits sequence gaps but rejects deleted/reordered hashes and nonmonotonic ids", async () => {
    const [first] = await readMigrationHistory();
    const second = { ...first!, idx: 1, tag: "0001_second", when: first!.when + 1, hash: "second" };
    const third = { ...second, idx: 2, tag: "0002_third", when: second.when + 1, hash: "third" };
    const files = [first!, second, third];
    const rows = files.map((file, idx) => ({ id: idx * 3 + 2, hash: file.hash, created_at: String(file.when) }));
    expect(() => verifyMigrationHistory(files, rows)).not.toThrow();
    expect(() => verifyMigrationHistory(files, [rows[0]!, rows[2]!])).toThrow("exact prefix");
    expect(() => verifyMigrationHistory(files, [rows[1]!, rows[0]!])).toThrow("exact prefix");
    expect(() => verifyMigrationHistory(files, [rows[0]!, { ...rows[1]!, id: rows[0]!.id }])).toThrow("exact prefix");
    expect(() => verifyMigrationHistory(files, [rows[0]!, { ...rows[1]!, id: 1 }])).toThrow("exact prefix");
  });
  it.each(["CREATE INDEX CONCURRENTLY i ON x (id)", "VACUUM", "CREATE DATABASE x", "ALTER SYSTEM SET work_mem='1MB'", "COMMIT", "BEGIN", "DROP TABLESPACE x"])("rejects obvious nontransactional SQL: %s", sql => {
    expect(() => assertTransactionalSql(sql)).toThrow("nontransactional");
  });
  it("permits transactional DDL and SQL comments", () => {
    expect(() => assertTransactionalSql("-- COMMIT\nCREATE SCHEMA b03_fixture; SELECT 1;")).not.toThrow();
  });
});

describe("sanitized migration connection cleanup (mocked; no database)", () => {
  const options = {
    environment: "test",
    env: {
      NODE_ENV: "test",
      TEST_DATABASE_URL: "postgresql://gymmice_test:test-password@127.0.0.1:55432/gymmice_test",
      TEST_MIGRATION_DATABASE_URL: "postgresql://gymmice_migrator:test-password@127.0.0.1:55432/gymmice_test",
    },
  };
  afterEach(() => { vi.restoreAllMocks(); });
  function mockClient(failure: "event" | "unlock" | "end" | "deadline" | "prior") {
    const destroy = vi.fn();
    vi.spyOn(pg.Client.prototype, "connect").mockImplementation(async function(this: pg.Client) {
      const internal = this as unknown as { connection: { stream: { destroy(): void } } };
      internal.connection.stream.destroy = destroy;
      return this;
    } as typeof pg.Client.prototype.connect);
    vi.spyOn(pg.Client.prototype, "query").mockImplementation(async function(this: pg.Client, sql: unknown) {
      const text = String(sql);
      if (text.includes("current_user AS username")) {
        return { rows: [{ username: "gymmice_migrator", database: "gymmice_test", unsafe: false }] };
      }
      if (text.includes("pg_try_advisory_lock")) return { rows: [{ locked: failure !== "prior" }] };
      if (text.includes("pg_advisory_unlock")) {
        if (failure === "unlock") throw new Error("secret-unlock");
        return { rows: [{ unlocked: true }] };
      }
      if (failure === "event") this.emit("error", new Error("secret-idle-event"));
      return { rows: [{ ledger: null }] };
    } as typeof pg.Client.prototype.query);
    const end = vi.spyOn(pg.Client.prototype, "end").mockImplementation(() => {
      if (failure === "deadline") return new Promise<void>(() => {});
      if (failure === "end" || failure === "prior") return Promise.reject(new Error("secret-end"));
      return Promise.resolve();
    });
    return { end, destroy };
  }
  it.each(["event", "unlock", "end"] as const)("rejects safely for %s errors and always ends", async failure => {
    const { end } = mockClient(failure);
    const error = await migrationStatus(options).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("secret");
    expect((error as Error).message).toMatch(/Migration (database operation|connection or cleanup) failed/);
    expect(end).toHaveBeenCalledOnce();
  });
  it("rejects on shutdown deadline even if end never settles, and destroys the socket", async () => {
    const { destroy } = mockClient("deadline");
    await expect(migrationStatus(options)).rejects.toThrow("cleanup failed");
    expect(destroy).toHaveBeenCalledOnce();
  });
  it("preserves an earlier sanitized operation failure when cleanup also fails", async () => {
    const { end } = mockClient("prior");
    await expect(migrationStatus(options)).rejects.toThrow("advisory lock");
    expect(end).toHaveBeenCalledOnce();
  });
});