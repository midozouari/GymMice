import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRuntimeDatabase } from "@workspace/db";
import request from "supertest";
import { createApp } from "../../src/app";
import { createReadiness } from "../../src/lib/readiness";

vi.mock("@workspace/db", () => ({
  getRuntimeDatabase: vi.fn(),
}));

describe("readiness lifecycle", () => {
  beforeEach(() => {
    vi.mocked(getRuntimeDatabase).mockReset();
  });

  it("coalesces overlapping probes but retries after a settled failure", async () => {
    let finish: ((value: unknown) => void) | undefined;
    const probe = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const state = createReadiness({ probe });

    const first = state.check();
    const second = state.check();
    await Promise.resolve();
    expect(probe).toHaveBeenCalledTimes(1);
    finish?.(undefined);
    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);

    probe.mockRejectedValueOnce(new Error("sentinel database secret"));
    await expect(state.check()).resolves.toBe(false);
    expect(probe).toHaveBeenCalledTimes(2);

    probe.mockResolvedValueOnce(undefined);
    await expect(state.check()).resolves.toBe(true);
    expect(probe).toHaveBeenCalledTimes(3);
  });

  it("permanently fails readiness during shutdown, including an active probe", async () => {
    let finish: (() => void) | undefined;
    const probe = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const state = createReadiness({ probe });
    const pending = state.check();

    await Promise.resolve();
    state.beginShutdown();
    finish?.();
    await expect(pending).resolves.toBe(false);
    await expect(state.check()).resolves.toBe(false);
    expect(probe).toHaveBeenCalledOnce();
  });

  it("does not start a deferred probe when shutdown wins the race", async () => {
    const probe = vi.fn().mockResolvedValue(undefined);
    const state = createReadiness({ probe });

    const pending = state.check();
    state.beginShutdown();

    await expect(pending).resolves.toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("uses the B03 pool for SELECT 1 and recovers from sync and query failures", async () => {
    const query = vi
      .fn()
      .mockRejectedValueOnce(new Error("query timeout"))
      .mockResolvedValue(undefined);
    vi.mocked(getRuntimeDatabase)
      .mockImplementationOnce(() => {
        throw new Error("invalid safe configuration");
      })
      .mockReturnValue({ pool: { query } } as never);
    const state = createReadiness();

    await expect(state.check()).resolves.toBe(false);
    await expect(state.check()).resolves.toBe(false);
    await expect(state.check()).resolves.toBe(true);

    expect(getRuntimeDatabase).toHaveBeenCalledTimes(3);
    expect(query).toHaveBeenNthCalledWith(1, "SELECT 1");
    expect(query).toHaveBeenNthCalledWith(2, "SELECT 1");
  });

  it("maps a mocked query timeout to 503 and recovers on the next request", async () => {
    const query = vi
      .fn()
      .mockRejectedValueOnce(new Error("query timeout"))
      .mockResolvedValueOnce(undefined);
    vi.mocked(getRuntimeDatabase).mockReturnValue({
      pool: { query },
    } as never);
    const state = createReadiness();
    const app = createApp({ readiness: state });

    const unavailable = await request(app).get("/api/readyz");
    expect(unavailable.status).toBe(503);
    expect(unavailable.body.error.code).toBe("SERVICE_UNAVAILABLE");

    const recovered = await request(app).get("/api/readyz");
    expect(recovered.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });
});