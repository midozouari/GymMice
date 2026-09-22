import { afterAll, expect, it } from "vitest";
import request from "supertest";
import { closeDatabase } from "@workspace/db";

afterAll(async () => {
  await closeDatabase();
});

it("GET /api/readyz probes the disposable runtime database", async () => {
  const { default: app } = await import("../../src/app");
  const response = await request(app).get("/api/readyz");

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
  expect(response.headers["x-request-id"]).toBeTypeOf("string");
});