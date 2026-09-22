import { EventEmitter } from "node:events";
import { createServer, type RequestListener, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePort, startServer } from "../../src/server";

afterEach(() => vi.restoreAllMocks());

function fixture() {
  const events: string[] = [];
  const server = new EventEmitter() as Server;
  server.listen = vi.fn((_port, callback) => {
    queueMicrotask(() => callback());
    return server;
  }) as Server["listen"];
  server.close = vi.fn((callback) => {
    events.push("http-close");
    callback?.();
    return server;
  });
  server.closeAllConnections = vi.fn();
  const options = {
    app: vi.fn() as RequestListener,
    rawPort: "8080",
    logger: { info: vi.fn(), error: vi.fn() },
    closeDatabase: vi.fn(async () => { events.push("database-close"); }),
    beginShutdown: vi.fn(() => { events.push("not-ready"); }),
    signals: new EventEmitter(),
    exit: vi.fn(),
    createHttpServer: vi.fn(() => server),
  };
  return { options, server, events };
}

describe("port validation", () => {
  it.each([undefined, "", "secret", "-1", "0", "1.5", "65536", "Infinity", "1e3", " 80 "])(
    "rejects invalid input without echoing it: %s", (value) => {
      expect(() => parsePort(value)).toThrow("PORT must be an integer between 1 and 65535.");
    },
  );
  it.each(["1", "8080", "65535"])("accepts %s", (value) => {
    expect(parsePort(value)).toBe(Number(value));
  });
});

it("starts without opening or closing a database connection", async () => {
  const { options, server } = fixture();
  const result = await startServer(options);
  expect(result?.server).toBe(server);
  expect(options.closeDatabase).not.toHaveBeenCalled();
  expect(options.beginShutdown).not.toHaveBeenCalled();
  expect(options.exit).not.toHaveBeenCalled();
  await result?.shutdown();
});

it("fails before creating a server for invalid configuration", async () => {
  const { options } = fixture();
  options.rawPort = "credential-bearing-secret";
  expect(await startServer(options)).toBeUndefined();
  expect(options.createHttpServer).not.toHaveBeenCalled();
  expect(options.closeDatabase).not.toHaveBeenCalled();
  expect(options.exit).toHaveBeenCalledWith(1);
  expect(options.logger.error).toHaveBeenCalledWith("Server startup failed.");
  expect(JSON.stringify(options.logger.error.mock.calls)).not.toContain("secret");
});

it("sanitizes synchronous server creation failures", async () => {
  const { options } = fixture();
  options.createHttpServer.mockImplementation(() => { throw new Error("postgres://secret"); });
  expect(await startServer(options)).toBeUndefined();
  expect(options.exit).toHaveBeenCalledWith(1);
  expect(options.logger.error.mock.calls).toEqual([["Server startup failed."]]);
});

it("sanitizes synchronous listen failures", async () => {
  const { options, server } = fixture();
  vi.mocked(server.listen).mockImplementation(() => { throw new Error("private-listen-secret"); });
  expect(await startServer(options)).toBeUndefined();
  expect(options.exit).toHaveBeenCalledWith(1);
  expect(options.logger.error.mock.calls).toEqual([["Server startup failed."]]);
});

it("handles an actual occupied port without database access or raw bind errors", async () => {
  const blocker = createServer();
  await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  try {
    const address = blocker.address();
    if (!address || typeof address === "string") throw new Error("Test listener has no port.");
    const { options } = fixture();
    const result = await startServer({
      ...options,
      rawPort: String(address.port),
      createHttpServer: (app) => createServer(app),
    });
    expect(result).toBeUndefined();
    expect(options.exit).toHaveBeenCalledWith(1);
    expect(options.closeDatabase).not.toHaveBeenCalled();
    expect(options.logger.error.mock.calls).toEqual([["Server startup failed."]]);
  } finally {
    await new Promise<void>((resolve, reject) => blocker.close((error) => error ? reject(error) : resolve()));
  }
});

it.each(["SIGTERM", "SIGINT"])("marks readiness down before HTTP and DB shutdown on %s", async (signal) => {
  const { options, events } = fixture();
  const result = await startServer(options);
  options.signals.emit(signal);
  options.signals.emit(signal);
  await result?.shutdown();
  expect(events).toEqual(["not-ready", "http-close", "database-close"]);
  expect(options.beginShutdown).toHaveBeenCalledTimes(1);
  expect(options.closeDatabase).toHaveBeenCalledTimes(1);
  expect(options.exit).toHaveBeenCalledExactlyOnceWith(0);
  expect(options.signals.listenerCount("SIGTERM")).toBe(0);
  expect(options.signals.listenerCount("SIGINT")).toBe(0);
});

it("uses B03 failure results for the process exit code", async () => {
  const { options } = fixture();
  options.closeDatabase.mockRejectedValue(new Error("database-secret"));
  const result = await startServer(options);
  options.signals.emit("SIGTERM");
  await expect(result?.shutdown()).resolves.toBe(false);
  expect(options.exit).toHaveBeenCalledExactlyOnceWith(1);
  expect(JSON.stringify(options.logger.error.mock.calls)).not.toContain("database-secret");
});

it("sanitizes a server error after startup and drains before exiting nonzero", async () => {
  const { options, server, events } = fixture();
  const result = await startServer(options);
  server.emit("error", new Error("runtime-http-secret"));
  await result?.shutdown();
  expect(events).toEqual(["not-ready", "http-close", "database-close"]);
  expect(options.exit).toHaveBeenCalledExactlyOnceWith(1);
  expect(JSON.stringify(options.logger.error.mock.calls)).not.toContain("runtime-http-secret");
});