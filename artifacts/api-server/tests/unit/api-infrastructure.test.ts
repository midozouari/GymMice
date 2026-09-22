import { Writable } from "node:stream";
import express, { type ErrorRequestHandler } from "express";
import pino from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { HealthCheckResponse } from "@workspace/api-zod";
import { createApp } from "../../src/app";
import { requestId } from "../../src/middlewares/request-id";
import { errorHandler } from "../../src/middlewares/errors";
import { validate } from "../../src/middlewares/validate";

function captureLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { logger: pino({ level: "info" }, stream), lines };
}

describe("API request infrastructure", () => {
  it("uses one server-generated UUID in the response header and success log", async () => {
    const capture = captureLogger();
    const response = await request(
      createApp({
        logger: capture.logger,
        readiness: { check: async () => true },
      }),
    ).get("/api/healthz");

    const id = response.headers["x-request-id"];
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(capture.lines.join("")).toContain(id);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns safe JSON errors for malformed JSON, unsupported media, and unknown routes", async () => {
    const capture = captureLogger();
    const app = createApp({
      logger: capture.logger,
      readiness: { check: async () => true },
    });

    const malformed = await request(app)
      .post("/api/missing")
      .set("Content-Type", "application/json")
      .send('{"secret":"sentinel-parser-secret"');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toMatchObject({
      code: "INVALID_JSON",
      message: "The request body contains invalid JSON.",
      requestId: malformed.headers["x-request-id"],
    });

    const unsupported = await request(app)
      .post("/api/missing")
      .set("Content-Type", "text/plain")
      .send("sentinel-media-secret");
    expect(unsupported.status).toBe(415);
    expect(unsupported.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");

    const missing = await request(app).delete("/api/healthz");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const deleteBody = await request(app)
      .delete("/api/healthz")
      .set("Content-Type", "text/plain")
      .send("sentinel-delete-secret");
    expect(deleteBody.status).toBe(415);
    expect(deleteBody.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(capture.lines.join("")).not.toMatch(
      /sentinel-parser-secret|sentinel-media-secret|sentinel-delete-secret/u,
    );
  });

  it("enforces the 100 KiB request limit", async () => {
    const response = await request(
      createApp({ readiness: { check: async () => true } }),
    )
      .post("/api/missing")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ value: "x".repeat(101 * 1024) }));

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("keeps liveness independent and lets readiness recover after failure", async () => {
    const check = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const app = createApp({ readiness: { check } });

    const health = await request(app).get("/api/healthz");
    expect(health.status).toBe(200);
    expect(health.headers["cache-control"]).toBe("no-store");
    expect(check).not.toHaveBeenCalled();

    const unavailable = await request(app).get("/api/readyz");
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers["cache-control"]).toBe("no-store");
    expect(unavailable.body.error).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "The service is temporarily unavailable.",
      requestId: unavailable.headers["x-request-id"],
    });

    const recovered = await request(app).get("/api/readyz");
    expect(recovered.status).toBe(200);
    expect(recovered.headers["cache-control"]).toBe("no-store");
    expect(recovered.body).toEqual({ status: "ok" });
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("returns only allowlisted validation fields and issue codes", async () => {
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.post(
      "/validate",
      validate(
        "body",
        {
          safeParse(value) {
            const body = value as Record<string, unknown>;
            return {
              success: false as const,
              error: {
                issues: [
                  { path: ["displayName"], code: "too_small" },
                  {
                    path: [Object.keys(body)[1] ?? "unknown"],
                    code: "unrecognized_keys",
                  },
                ],
              },
            };
          },
        },
        ["displayName"],
      ),
      (_request, response) => response.sendStatus(204),
    );
    app.use(errorHandler(captureLogger().logger));

    const response = await request(app)
      .post("/validate")
      .send({ displayName: "", "sentinel-private-field": "secret-value" });

    expect(response.status).toBe(422);
    expect(response.body.error.details).toEqual([
      { field: "displayName", code: "too_small" },
      { field: "body", code: "unrecognized_keys" },
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /sentinel-private-field|secret-value/u,
    );
  });

  it("accepts generated Zod schemas through the validation contract", async () => {
    const app = express();
    app.use(express.json());
    app.post(
      "/validate",
      validate("body", HealthCheckResponse, ["status"]),
      (incoming, response) => response.json(incoming.body),
    );

    const response = await request(app)
      .post("/validate")
      .send({ status: "ok" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("does not trust or expose arbitrary thrown error properties", async () => {
    const capture = captureLogger();
    const app = express();
    app.use(requestId);
    app.get("/failure", () => {
      const error = new Error("sentinel exception message") as Error & {
        status: number;
        expose: boolean;
      };
      error.status = 418;
      error.expose = true;
      throw error;
    });
    app.use(errorHandler(capture.logger) as ErrorRequestHandler);

    const response = await request(app).get("/failure");
    expect(response.status).toBe(500);
    expect(response.body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      requestId: response.headers["x-request-id"],
    });
    expect(JSON.stringify(response.body) + capture.lines.join("")).not.toMatch(
      /sentinel exception message|api-infrastructure\.test/u,
    );
  });

  it("handles rejected async handlers with the same safe 500 response", async () => {
    const capture = captureLogger();
    const app = express();
    app.use(requestId);
    app.get("/failure", async () => {
      throw new Error("sentinel async exception");
    });
    app.use(errorHandler(capture.logger));

    const response = await request(app).get("/failure");
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(response.body) + capture.lines.join("")).not.toContain(
      "sentinel async exception",
    );
  });

  it("delegates without writing when response headers were already sent", () => {
    const next = vi.fn();
    const handler = errorHandler(captureLogger().logger);
    const failure = new Error("already streaming");

    handler(
      failure,
      { id: "request-id" } as never,
      { headersSent: true } as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(failure);
  });
});