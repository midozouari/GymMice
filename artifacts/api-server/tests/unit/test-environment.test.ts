import { describe, expect, it, vi } from "vitest";
import {
  prepareTestEnvironment,
  UNSAFE_TEST_ENVIRONMENT,
  validateTestDatabaseUrl,
} from "../test-environment";

const imports = vi.hoisted(() => ({
  db: vi.fn(() => { throw new Error("Unexpected database import"); }),
  pg: vi.fn(() => { throw new Error("Unexpected driver import"); }),
  app: vi.fn(() => { throw new Error("Unexpected app import"); }),
}));
vi.mock("@workspace/db", imports.db);
vi.mock("pg", imports.pg);
vi.mock("../../src/app", imports.app);

const safe = "postgresql://gymmice_test:test-only@127.0.0.1:55432/gymmice_test";

describe("isolated test database guard (no database required)", () => {
  it.each(["postgresql", "postgres"])("accepts the exact %s target", (protocol) => {
    expect(validateTestDatabaseUrl({
      NODE_ENV: "test",
      TEST_DATABASE_URL: safe.replace("postgresql", protocol),
    })).toBe(safe.replace("postgresql", protocol));
  });

  it.each([
    undefined, "", "not a URL", "postgresql://",
    safe.replace("postgresql:", "https:"),
    safe.replace("127.0.0.1", "localhost"),
    safe.replace("127.0.0.1", "[::1]"),
    safe.replace("127.0.0.1", "127.1"),
    safe.replace("127.0.0.1", "2130706433"),
    safe.replace("127.0.0.1", "db.example.com"),
    safe.replace("127.0.0.1", "127.0.0.1.evil.example"),
    safe.replace(":55432", ":5432"),
    safe.replace(":55432", ""),
    safe.replace("gymmice_test:test-only", "postgres:test-only"),
    safe.replace("gymmice_test:test-only", "gymmice%5ftest:test-only"),
    safe.replace("/gymmice_test", "/production"),
    safe.replace("/gymmice_test", "/gymmice%5ftest"),
    `${safe}/`, `${safe}?`, `${safe}#`,
    `${safe}?host=production`, `${safe}?options=-csearch_path=public`,
    `${safe}#ignored`, ` ${safe}`, `${safe}\n`,
    safe.replace("test-only", "%ZZ"),
    safe.replace("127.0.0.1", "127.0.0.1\n"),
  ])("rejects unsafe target case %# without leaking input", (url) => {
    const env = {
      NODE_ENV: "test",
      TEST_DATABASE_URL: url,
      DATABASE_URL: "postgresql://private-secret@production/private",
      LOG_LEVEL: "debug",
    };
    expect(() => prepareTestEnvironment(env)).toThrow(UNSAFE_TEST_ENVIRONMENT);
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.LOG_LEVEL).toBe("silent");
  });

  it.each([undefined, "", "development", "production", "TEST"])(
    "requires explicit test mode case %#",
    (mode) => {
      expect(() => validateTestDatabaseUrl({
        NODE_ENV: mode, TEST_DATABASE_URL: safe,
      })).toThrow(UNSAFE_TEST_ENVIRONMENT);
    },
  );

  it("uses only the validated test URL and clears ambient pg settings", () => {
    const env = {
      NODE_ENV: "test", TEST_DATABASE_URL: safe,
      DATABASE_URL: "do-not-use", LOG_LEVEL: "trace",
      PGHOST: "production", PGOPTIONS: "-c role=postgres",
    };
    prepareTestEnvironment(env);
    expect(env.DATABASE_URL).toBe(safe);
    expect(env.LOG_LEVEL).toBe("silent");
    expect(env.PGHOST).toBeUndefined();
    expect(env.PGOPTIONS).toBeUndefined();
  });

  it("never imports app or database code for guard validation", () => {
    expect(imports.db).not.toHaveBeenCalled();
    expect(imports.pg).not.toHaveBeenCalled();
    expect(imports.app).not.toHaveBeenCalled();
  });
});