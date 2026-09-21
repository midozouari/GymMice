import { EventEmitter } from "node:events";
import type pg from "pg";
import { afterEach, expect, it, vi } from "vitest";
import { createDatabaseClient } from "../src/client";

const env = { NODE_ENV: "test", TEST_DATABASE_URL: "postgresql://gymmice_test:secret@127.0.0.1:55432/gymmice_test" };
function fixture(end = vi.fn().mockResolvedValue(undefined)) {
  const pool = Object.assign(new EventEmitter(), { end });
  const createPool = vi.fn(() => pool as unknown as pg.Pool);
  const onIdleError = vi.fn();
  return { pool, createPool, onIdleError, client: createDatabaseClient({ env, createPool, onIdleError, closeTimeoutMs: 50 }) };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

it("imports without configuration or pool creation", async () => {
  vi.stubEnv("DATABASE_URL", undefined);
  vi.stubEnv("TEST_DATABASE_URL", undefined);
  vi.stubEnv("DB_ENV", undefined);
  await expect(import("../src/index")).resolves.toBeDefined();
});
it("initializes only on first access and caches the result", async () => {
  const { client, createPool, pool } = fixture();
  expect(createPool).not.toHaveBeenCalled();
  expect(client.getRuntimeDatabase()).toBe(client.getRuntimeDatabase());
  expect(createPool).toHaveBeenCalledTimes(1);
  const first = client.closeDatabase();
  expect(client.closeDatabase()).toBe(first);
  await first;
  expect(pool.end).toHaveBeenCalledTimes(1);
  expect(() => client.getRuntimeDatabase()).toThrow("closed");
});
it("closing an unused client never initializes it", async () => {
  const createPool = vi.fn();
  const client = createDatabaseClient({ env: {}, createPool });
  await client.closeDatabase();
  expect(createPool).not.toHaveBeenCalled();
});
it("requires DB_ENV lazily outside test mode", () => {
  const createPool = vi.fn();
  const client = createDatabaseClient({ env: {}, createPool });
  expect(() => client.getRuntimeDatabase()).toThrow("configuration rejected");
  expect(createPool).not.toHaveBeenCalled();
});
it("sanitizes idle errors", async () => {
  const { client, pool, onIdleError } = fixture();
  client.getRuntimeDatabase();
  pool.emit("error", new Error("password=private"));
  expect(onIdleError).toHaveBeenCalledExactlyOnceWith("Database idle connection failed.");
  await client.closeDatabase();
});
it("sanitizes construction and end failures", async () => {
  const bad = createDatabaseClient({ env, createPool: () => { throw new Error("secret"); } });
  expect(() => bad.getRuntimeDatabase()).toThrow("Database client initialization failed.");
  const { client } = fixture(vi.fn().mockRejectedValue(new Error("secret")));
  client.getRuntimeDatabase();
  await expect(client.closeDatabase()).rejects.toThrow("Database shutdown failed.");
});
it("bounds pool shutdown without retrying", async () => {
  vi.useFakeTimers();
  const { client, pool } = fixture(vi.fn(() => new Promise(() => {})));
  client.getRuntimeDatabase();
  const assertion = expect(client.closeDatabase()).rejects.toThrow("Database shutdown timed out.");
  await vi.advanceTimersByTimeAsync(50);
  await assertion;
  expect(pool.end).toHaveBeenCalledTimes(1);
});