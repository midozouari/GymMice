import { describe, expect, it } from "vitest";
import { getDatabaseConfig } from "../src/config";

const testEnv = {
  NODE_ENV: "test",
  TEST_DATABASE_URL: "postgresql://gymmice_test:secret@127.0.0.1:55432/gymmice_test",
  TEST_MIGRATION_DATABASE_URL: "postgresql://gymmice_migrator:secret@127.0.0.1:55432/gymmice_test",
};
const remote = {
  DATABASE_URL: "postgresql://gymmice_app:secret@db.example:5432/gymmice",
  MIGRATION_DATABASE_URL: "postgresql://gymmice_migrator:secret@db.example:5432/gymmice",
  DB_ALLOWED_TARGET: "db.example:5432/gymmice",
};

describe("database configuration boundary", () => {
  it("uses explicit test credentials and bounded settings without DATABASE_URL fallback", () => {
    expect(getDatabaseConfig("runtime", "test", { ...testEnv, DATABASE_URL: remote.DATABASE_URL })).toMatchObject({
      host: "127.0.0.1", port: 55432, database: "gymmice_test", user: "gymmice_test",
      ssl: false, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
      query_timeout: 10_000, statement_timeout: 10_000,
    });
    expect(() => getDatabaseConfig("runtime", "test", { NODE_ENV: "test", DATABASE_URL: testEnv.TEST_DATABASE_URL })).toThrow();
  });
  it("validates both test URLs and separates roles", () => {
    expect(getDatabaseConfig("migration", "test", testEnv).user).toBe("gymmice_migrator");
    for (const env of [
      { ...testEnv, TEST_DATABASE_URL: undefined },
      { ...testEnv, TEST_MIGRATION_DATABASE_URL: undefined },
      { ...testEnv, TEST_DATABASE_URL: testEnv.TEST_MIGRATION_DATABASE_URL },
      { ...testEnv, TEST_MIGRATION_DATABASE_URL: testEnv.TEST_DATABASE_URL },
      { ...testEnv, TEST_MIGRATION_DATABASE_URL: testEnv.TEST_MIGRATION_DATABASE_URL.replace("55432", "5432") },
    ]) expect(() => getDatabaseConfig("migration", "test", env)).toThrow();
  });
  it("requires exact test mode and prevents test escape", () => {
    expect(() => getDatabaseConfig("runtime", "test", { ...testEnv, NODE_ENV: "development" })).toThrow();
    for (const mode of ["development", "preview", "production", "", "unknown"]) {
      expect(() => getDatabaseConfig("runtime", mode, { ...remote, NODE_ENV: "test" })).toThrow();
    }
  });
  it("requires explicit target, separate restricted roles, and verified remote TLS", () => {
    expect(getDatabaseConfig("runtime", "production", remote).ssl).toEqual({ rejectUnauthorized: true });
    expect(getDatabaseConfig("migration", "preview", remote).user).toBe("gymmice_migrator");
    expect(() => getDatabaseConfig("migration", "production", remote)).toThrow();
    expect(() => getDatabaseConfig("runtime", "preview", { ...remote, DB_ALLOWED_TARGET: undefined })).toThrow();
    expect(() => getDatabaseConfig("runtime", "preview", { ...remote, DB_ALLOWED_TARGET: "other:5432/gymmice" })).toThrow();
    expect(() => getDatabaseConfig("migration", "preview", { ...remote, MIGRATION_DATABASE_URL: undefined })).toThrow();
    expect(() => getDatabaseConfig("runtime", "preview", { ...remote, DATABASE_URL: remote.MIGRATION_DATABASE_URL })).toThrow();
  });
  it.each([
    "?sslmode=disable", "?", "#fragment", "#", "/../gymmice_test",
  ])("rejects URL parameters, fragments and normalization: %s", (suffix) => {
    expect(() => getDatabaseConfig("runtime", "test", { ...testEnv, TEST_DATABASE_URL: testEnv.TEST_DATABASE_URL + suffix })).toThrow();
  });
  it.each([
    "postgresql://gymmice_test@127.0.0.1:55432/gymmice_test",
    "postgresql://gymmice_test:secret@127.0.0.1/gymmice_test",
    "postgresql://gymmice_test:secret@localhost:55432/gymmice_test",
    "postgresql://gymmice_test:%ZZ@127.0.0.1:55432/gymmice_test",
    "postgresql://gymmice_test:%2540@127.0.0.1:55432/gymmice_test",
    "postgresql://gymmice%5ftest:secret@127.0.0.1:55432/gymmice_test",
  ])("rejects unsafe credentials/targets without leaking them", (value) => {
    try {
      getDatabaseConfig("runtime", "test", { ...testEnv, TEST_DATABASE_URL: value });
      expect.fail("Expected rejection");
    } catch (error) {
      expect((error as Error).message).toBe("Database configuration rejected. Check the environment, explicit target, credentials, role, and TLS policy.");
    }
  });
});