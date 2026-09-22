import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import type { Readiness } from "../lib/readiness";
import { AppError } from "../lib/errors";

export function createHealthRouter(readiness: Pick<Readiness, "check">): IRouter {
  const router: IRouter = Router();

  router.get("/healthz", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  });

  router.get("/readyz", async (_req, res, next) => {
    // Set before the probe so the 503 error response is never cached either.
    res.setHeader("Cache-Control", "no-store");
    let ready = false;
    try {
      ready = await readiness.check();
    } catch {
      // A readiness dependency is unavailable; the error contract remains safe.
    }
    if (!ready) {
      next(new AppError("SERVICE_UNAVAILABLE"));
      return;
    }
    res.json({ status: "ok" });
  });

  return router;
}
