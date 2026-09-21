import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDatabaseConfig } from "../src/config.js";
import { defaultMigrationsFolder } from "../src/migration-history.js";
import { MIGRATION_LOCK_KEY, migrationStatus, runMigrations } from "../src/migration-runner.js";

// No skipping or hosted fallback: full package tests require the strict local harness.
describe("migration integration (isolated localhost test database)", () => {
  const options = { environment: "test", env: process.env };
  let admin: pg.Client;
  const folders: string[] = [];
  beforeAll(async () => {
    admin = new pg.Client({ ...getDatabaseConfig("migration", "test", process.env), connectionTimeoutMillis: 5000, query_timeout: 10000 });
    await admin.connect();
  });
  beforeEach(async () => {
    await admin.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await admin.query("DROP SCHEMA IF EXISTS b03_migration_fixture CASCADE");
  });
  afterAll(async () => {
    try {
      if (admin) {
        await admin.query("DROP SCHEMA IF EXISTS b03_migration_fixture CASCADE");
        await admin.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
        await runMigrations(options);
      }
    } finally {
      if (admin) await admin.end();
      await Promise.all(folders.map(folder => rm(folder, { recursive: true, force: true })));
    }
  });
  async function fixture(sql: string) {
    const folder = await mkdtemp(join(tmpdir(), "b03-migrations-"));
    folders.push(folder);
    await cp(defaultMigrationsFolder, folder, { recursive: true });
    const path = join(folder, "meta/_journal.json");
    const journal = JSON.parse(await readFile(path, "utf8"));
    journal.entries.push({ idx: 1, version: "7", when: journal.entries[0].when + 1, tag: "0001_fixture", breakpoints: true });
    await writeFile(path, JSON.stringify(journal));
    await writeFile(join(folder, "0001_fixture.sql"), sql);
    return { ...options, migrationsFolder: folder };
  }
  it("status is read-only on a fresh database; apply and rerun are idempotent", async () => {
    expect(await migrationStatus(options)).toEqual({ applied: 0, pending: 1, total: 1 });
    expect((await admin.query("SELECT to_regnamespace('drizzle') AS schema")).rows[0].schema).toBeNull();
    expect(await runMigrations(options)).toEqual({ applied: 1, pending: 0, total: 1 });
    expect(await runMigrations(options)).toEqual({ applied: 1, pending: 0, total: 1 });
    expect((await admin.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations")).rows[0].n).toBe(1);
  });
  it.each(["hash", "timestamp", "extra"])("refuses ledger corruption: %s", async kind => {
    await runMigrations(options);
    if (kind === "hash") await admin.query("UPDATE drizzle.__drizzle_migrations SET hash = 'corrupted'");
    if (kind === "timestamp") await admin.query("UPDATE drizzle.__drizzle_migrations SET created_at = 1");
    if (kind === "extra") await admin.query("INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ('extra', 1)");
    await expect(runMigrations(options)).rejects.toThrow("exact prefix");
    await expect(migrationStatus(options)).rejects.toThrow("exact prefix");
  });
  it("refuses edited previously applied SQL", async () => {
    await runMigrations(options);
    const opts = await fixture("SELECT 2;");
    await writeFile(join(opts.migrationsFolder, "0000_foundation.sql"), "SELECT 999;");
    await expect(runMigrations(opts)).rejects.toThrow("exact prefix");
  });
  it("rolls failed DDL back without adding ledger entries and releases the connection", async () => {
    await runMigrations(options);
    const opts = await fixture("CREATE SCHEMA b03_migration_fixture;\n--> statement-breakpoint\nSELECT 1 / 0;");
    await expect(runMigrations(opts)).rejects.toThrow("Migration database operation failed");
    expect((await admin.query("SELECT to_regnamespace('b03_migration_fixture') AS schema")).rows[0].schema).toBeNull();
    expect(await migrationStatus(options)).toEqual({ applied: 1, pending: 0, total: 1 });
    expect((await admin.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = 'gymmice-migrations'")).rows[0].n).toBe(0);
  });
  it("rolls an entire fresh batch back and can retry despite sequence consumption", async () => {
    const opts = await fixture("CREATE SCHEMA b03_migration_fixture;\n--> statement-breakpoint\nSELECT 1 / 0;");
    await expect(runMigrations(opts)).rejects.toThrow("Migration database operation failed");
    expect((await admin.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations")).rows[0].n).toBe(0);
    expect((await admin.query("SELECT to_regnamespace('b03_migration_fixture') AS schema")).rows[0].schema).toBeNull();
    // Only an unapplied temporary fixture is edited, never committed/applied SQL.
    await writeFile(join(opts.migrationsFolder, "0001_fixture.sql"), "CREATE SCHEMA b03_migration_fixture;");
    expect(await runMigrations(opts)).toEqual({ applied: 2, pending: 0, total: 2 });
    expect(await runMigrations(opts)).toEqual({ applied: 2, pending: 0, total: 2 });
    const ids = (await admin.query<{ id: number }>("SELECT id FROM drizzle.__drizzle_migrations ORDER BY id")).rows.map(row => row.id);
    expect(ids.length).toBe(2);
    expect(ids[0]).toBeGreaterThan(1);
    expect(ids[1]).toBeGreaterThan(ids[0]!);
  });
  it("fails clearly on advisory lock contention and succeeds once released", async () => {
    await admin.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    try {
      await expect(runMigrations(options)).rejects.toThrow("advisory lock");
    } finally {
      await admin.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    }
    expect((await runMigrations(options)).applied).toBe(1);
  });
  it("runtime role cannot do DDL, and released pool clients drain", async () => {
    const pool = new pg.Pool({ ...getDatabaseConfig("runtime", "test", process.env), max: 1, connectionTimeoutMillis: 5000, query_timeout: 10000 });
    try {
      const client = await pool.connect();
      try {
        expect((await client.query("SELECT current_user AS role")).rows[0].role).toBe("gymmice_test");
        await expect(client.query("CREATE SCHEMA b03_migration_fixture")).rejects.toMatchObject({ code: "42501" });
        await expect(client.query("CREATE TABLE public.b03_forbidden(id integer)")).rejects.toMatchObject({ code: "42501" });
      } finally { client.release(); }
      expect(pool.idleCount).toBe(1);
      expect(pool.waitingCount).toBe(0);
    } finally { await pool.end(); }
    expect(pool.totalCount).toBe(0);
  });
});