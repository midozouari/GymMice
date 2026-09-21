import type { Server } from "node:http";
import { afterEach, expect, it, vi } from "vitest";
import { createShutdown } from "../../src/shutdown";

function fixture(close = vi.fn((callback: (error?: Error) => void) => callback())) {
  const server = { close, closeAllConnections: vi.fn() };
  const closeDatabase = vi.fn().mockResolvedValue(undefined);
  const logger = { info: vi.fn(), error: vi.fn() };
  const shutdown = createShutdown({
    server: server as unknown as Server, closeDatabase, logger, graceMs: 100, databaseGraceMs: 50,
  });
  return { server, closeDatabase, logger, shutdown };
}
afterEach(() => vi.useRealTimers());

it("stops HTTP before closing the database and is idempotent", async () => {
  const { server, closeDatabase, shutdown } = fixture();
  const first = shutdown();
  expect(shutdown()).toBe(first);
  await expect(first).resolves.toBe(true);
  expect(server.close).toHaveBeenCalledTimes(1);
  expect(closeDatabase).toHaveBeenCalledTimes(1);
  expect(server.close.mock.invocationCallOrder[0]).toBeLessThan(closeDatabase.mock.invocationCallOrder[0]!);
});
it("allows requests to drain before DB cleanup", async () => {
  let drained: (() => void) | undefined;
  const { shutdown, closeDatabase } = fixture(vi.fn((callback) => { drained = callback; }));
  const pending = shutdown();
  expect(closeDatabase).not.toHaveBeenCalled();
  drained!();
  await expect(pending).resolves.toBe(true);
});
it("forces HTTP connections closed after bounded grace then closes DB", async () => {
  vi.useFakeTimers();
  const { shutdown, server, closeDatabase } = fixture(vi.fn());
  const pending = shutdown();
  await vi.advanceTimersByTimeAsync(100);
  await expect(pending).resolves.toBe(false);
  expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
  expect(closeDatabase).toHaveBeenCalledTimes(1);
});
it("bounds a hanging DB close", async () => {
  vi.useFakeTimers();
  const { shutdown, closeDatabase } = fixture();
  closeDatabase.mockImplementation(() => new Promise(() => {}));
  const pending = shutdown();
  await vi.advanceTimersByTimeAsync(50);
  await expect(pending).resolves.toBe(false);
});
it("continues cleanup and logs no driver or server secrets", async () => {
  const { shutdown, closeDatabase, logger } = fixture(vi.fn((callback) => callback(new Error("http secret"))));
  closeDatabase.mockRejectedValue(new Error("postgresql://secret"));
  await expect(shutdown()).resolves.toBe(false);
  expect(closeDatabase).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(logger.error.mock.calls)).not.toContain("secret");
});