import express from "express";
import pino from "pino";
import request from "supertest";
import {
  getDatabaseConfig,
  getRuntimeDatabase,
} from "@workspace/db";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApp } from "../../src/app";
import { AppError } from "../../src/lib/errors";
import type { WorkoutTemplateRepository } from "../../src/lib/workout-templates";
import { errorHandler, notFound } from "../../src/middlewares/errors";
import { requestId } from "../../src/middlewares/request-id";
import { createWorkoutTemplatesRouter } from "../../src/routes/workout-templates";

const summary = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "full-body",
  name: "Full Body",
  durationSeconds: 1800,
  exerciseCount: 1,
};
const detail = {
  id: summary.id,
  slug: summary.slug,
  name: summary.name,
  durationSeconds: summary.durationSeconds,
  exercises: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      name: "Goblet Squat",
      muscleGroup: "Legs",
      position: 0,
    },
  ],
};

function createTestApp(repository: WorkoutTemplateRepository) {
  const app = express();
  app.use(requestId);
  app.use("/api/workout-templates", createWorkoutTemplatesRouter(repository));
  app.use(notFound);
  app.use(errorHandler(pino({ enabled: false })));
  return app;
}

interface MigratorPool {
  query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
  end(): Promise<void>;
}

describe("workout template API against the disposable database", () => {
  let app: ReturnType<typeof createApp>;
  let migrator: MigratorPool;

  beforeAll(() => {
    // Validate the dedicated migration URL and role before constructing a pool.
    const config = getDatabaseConfig("migration", "test", process.env);
    const Pool = getRuntimeDatabase().pool.constructor as unknown as new (
      value: typeof config,
    ) => MigratorPool;
    migrator = new Pool(config);
    app = createApp();
  });

  afterAll(async () => {
    await migrator.end();
  });

  it("reads the real seeded Push Day list and ordered detail", async () => {
    const list = await request(app).get("/api/workout-templates");
    expect(list.status).toBe(200);
    expect(list.headers["cache-control"]).toBe("no-store");
    const pushDays = list.body.items.filter(
      (item: { slug: string }) => item.slug === "push-day",
    );
    expect(pushDays).toHaveLength(1);
    expect(pushDays[0]).toMatchObject({
      name: "Push Day",
      durationSeconds: 3300,
      exerciseCount: 7,
    });

    const response = await request(app).get(
      `/api/workout-templates/${pushDays[0].id}`,
    );
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toMatchObject({
      slug: "push-day",
      name: "Push Day",
      durationSeconds: 3300,
    });
    expect(response.body.exercises).toHaveLength(7);
    expect(
      response.body.exercises.map(
        (exercise: { position: number }) => exercise.position,
      ),
    ).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("observes a committed migrator edit on the next real GET", async () => {
    await migrator.query(
      "UPDATE public.workout_templates SET name = $1 WHERE slug = $2",
      ["Push Day Edited", "push-day"],
    );
    try {
      const response = await request(app).get("/api/workout-templates");
      expect(response.status).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(
        response.body.items.find(
          (item: { slug: string }) => item.slug === "push-day",
        )?.name,
      ).toBe("Push Day Edited");
    } finally {
      await migrator.query(
        "UPDATE public.workout_templates SET name = $1 WHERE slug = $2",
        ["Push Day", "push-day"],
      );
    }
  });

  it("returns an empty real catalog and restores committed fixtures", async () => {
    const templates = await migrator.query<{
      id: string;
      slug: string;
      name: string;
      duration_seconds: number;
    }>(
      "SELECT id, slug, name, duration_seconds FROM public.workout_templates ORDER BY slug",
    );
    const links = await migrator.query<{
      template_id: string;
      exercise_id: string;
      position: number;
    }>(
      "SELECT template_id, exercise_id, position FROM public.workout_template_exercises ORDER BY template_id, position",
    );

    try {
      await migrator.query("BEGIN");
      await migrator.query("DELETE FROM public.workout_template_exercises");
      await migrator.query("DELETE FROM public.workout_templates");
      await migrator.query("COMMIT");

      const response = await request(app).get("/api/workout-templates");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [] });
    } catch (error) {
      await migrator.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      await migrator.query("BEGIN");
      try {
        for (const template of templates.rows) {
          await migrator.query(
            `INSERT INTO public.workout_templates
              (id, slug, name, duration_seconds)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING`,
            [
              template.id,
              template.slug,
              template.name,
              template.duration_seconds,
            ],
          );
        }
        for (const link of links.rows) {
          await migrator.query(
            `INSERT INTO public.workout_template_exercises
              (template_id, exercise_id, position)
             VALUES ($1, $2, $3)
             ON CONFLICT (template_id, exercise_id) DO NOTHING`,
            [link.template_id, link.exercise_id, link.position],
          );
        }
        await migrator.query("COMMIT");
      } catch (error) {
        await migrator.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    }
  });
});

describe("workout template API", () => {
  let repository: WorkoutTemplateRepository;

  beforeEach(() => {
    repository = {
      list: vi.fn().mockResolvedValue([summary]),
      getById: vi.fn().mockResolvedValue(detail),
    };
  });

  it("lists summaries and returns ordered detail exercises", async () => {
    const app = createTestApp(repository);
    const list = await request(app).get("/api/workout-templates");
    expect(list.status).toBe(200);
    expect(list.headers["cache-control"]).toBe("no-store");
    expect(list.body).toEqual({ items: [summary] });

    const response = await request(app).get(
      `/api/workout-templates/${summary.id}`,
    );
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual(detail);
  });

  it("returns an empty list", async () => {
    vi.mocked(repository.list).mockResolvedValue([]);
    const response = await request(createTestApp(repository)).get(
      "/api/workout-templates",
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });

  it("returns safe missing and malformed-id errors", async () => {
    vi.mocked(repository.getById).mockResolvedValue(undefined);
    const app = createTestApp(repository);
    const missing = await request(app).get(
      "/api/workout-templates/10000000-0000-4000-8000-000000000099",
    );
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const malformed = await request(app).get(
      "/api/workout-templates/not-a-uuid",
    );
    expect(malformed.status).toBe(422);
    expect(malformed.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: [{ field: "id", code: "invalid_string" }],
    });
    expect(repository.getById).toHaveBeenCalledTimes(1);
  });

  it("returns a sanitized 503 when the database is unavailable", async () => {
    vi.mocked(repository.list).mockRejectedValue(
      new AppError("SERVICE_UNAVAILABLE"),
    );
    const response = await request(createTestApp(repository)).get(
      "/api/workout-templates",
    );
    expect(response.status).toBe(503);
    expect(response.body.error).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "The service is temporarily unavailable.",
    });
    expect(JSON.stringify(response.body)).not.toContain("postgres");
  });

  it("does not cache results, so a later request observes edits", async () => {
    vi.mocked(repository.list)
      .mockResolvedValueOnce([summary])
      .mockResolvedValueOnce([{ ...summary, name: "Updated Full Body" }]);
    const app = createTestApp(repository);
    const before = await request(app).get("/api/workout-templates");
    const after = await request(app).get("/api/workout-templates");
    expect(before.body.items[0].name).toBe("Full Body");
    expect(after.body.items[0].name).toBe("Updated Full Body");
    expect(repository.list).toHaveBeenCalledTimes(2);
  });

  it.each(["post", "put", "patch", "delete"] as const)(
    "does not expose %s mutations",
    async (method) => {
      const response = await request(createTestApp(repository))
        [method]("/api/workout-templates")
        .send({});
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    },
  );
});