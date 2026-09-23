import { Router, type IRouter } from "express";
import {
  GetWorkoutTemplateParams,
  GetWorkoutTemplateResponse,
  ListWorkoutTemplatesResponse,
} from "@workspace/api-zod";
import { AppError } from "../lib/errors";
import {
  createWorkoutTemplateRepository,
  type WorkoutTemplateRepository,
} from "../lib/workout-templates";
import { validate } from "../middlewares/validate";

export function createWorkoutTemplatesRouter(
  repository: WorkoutTemplateRepository = createWorkoutTemplateRepository(),
): IRouter {
  const router: IRouter = Router();

  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/", async (_request, response, next) => {
    try {
      const body = ListWorkoutTemplatesResponse.parse({
        items: await repository.list(),
      });
      response.json(body);
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/:id",
    validate("params", GetWorkoutTemplateParams, ["id"]),
    async (request, response, next) => {
      try {
        const id = GetWorkoutTemplateParams.parse(request.params).id;
        const template = await repository.getById(id);
        if (!template) throw new AppError("NOT_FOUND");
        response.json(GetWorkoutTemplateResponse.parse(template));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}