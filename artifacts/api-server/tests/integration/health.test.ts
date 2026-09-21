import { expect, it } from "vitest";
import request from "supertest";

it("GET /api/healthz returns the health contract without starting index.ts", async () => {
  // Dynamic import also makes the setup-before-app boundary explicit.
  const { default: app } = await import("../../src/app");
  const response = await request(app).get("/api/healthz");
  expect(response.status).toBe(200);
  expect(response.headers["content-type"]).toMatch(/application\/json/);
  expect(response.body).toEqual({ status: "ok" });
});