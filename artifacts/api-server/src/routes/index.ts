import { Router, type IRouter } from "express";
import { createHealthRouter } from "./health";
import { createWorkoutTemplatesRouter } from "./workout-templates";
import type { Readiness } from "../lib/readiness";

export function createRouter(readiness: Pick<Readiness, "check">): IRouter {
  const router: IRouter = Router();

  router.use(createHealthRouter(readiness));
  router.use("/workout-templates", createWorkoutTemplatesRouter());

  return router;
}
