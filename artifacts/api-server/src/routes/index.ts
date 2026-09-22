import { Router, type IRouter } from "express";
import { createHealthRouter } from "./health";
import type { Readiness } from "../lib/readiness";

export function createRouter(readiness: Pick<Readiness, "check">): IRouter {
  const router: IRouter = Router();

  router.use(createHealthRouter(readiness));

  return router;
}
