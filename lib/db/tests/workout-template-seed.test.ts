import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDatabaseConfig } from "../src/config.js";
import { seedWorkoutTemplates } from "../src/workout-template-seed.js";

const slugs = [
  "bench-press", "incline-db-press", "h2l-cable-flies", "lateral-raises",
  "german-raises", "cable-tricep-extension", "skull-crusher",
];

describe("controlled workout template seed", () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool(getDatabaseConfig("migration", "test", process.env));
  });
  async function clearCatalog() {
    await pool.query(`
      DELETE FROM public.workout_template_exercises
      WHERE template_id IN (SELECT id FROM public.workout_templates WHERE slug = 'push-day')
    `);
    await pool.query("DELETE FROM public.workout_templates WHERE slug = 'push-day'");
    await pool.query("DELETE FROM public.exercises WHERE slug = ANY($1::varchar[])", [slugs]);
  }
  async function resetCatalog() {
    await clearCatalog();
    await seedWorkoutTemplates(pool);
  }
  afterEach(resetCatalog);
  afterAll(async () => {
    await resetCatalog();
    await pool.end();
  });

  it("is idempotent and safe under concurrent invocations", async () => {
    await clearCatalog();
    await Promise.all([seedWorkoutTemplates(pool), seedWorkoutTemplates(pool), seedWorkoutTemplates(pool)]);
    const counts = await pool.query<{ exercises: number; templates: number; memberships: number }>(`
      SELECT
        (SELECT count(*)::int FROM public.exercises WHERE slug = ANY($1::varchar[])) AS exercises,
        (SELECT count(*)::int FROM public.workout_templates WHERE slug = 'push-day') AS templates,
        (SELECT count(*)::int FROM public.workout_template_exercises wte
          JOIN public.workout_templates wt ON wt.id = wte.template_id
          WHERE wt.slug = 'push-day') AS memberships
    `, [slugs]);
    expect(counts.rows[0]).toEqual({ exercises: 7, templates: 1, memberships: 7 });
  });

  it("preserves existing names, duration, and manually edited membership", async () => {
    await pool.query("UPDATE public.exercises SET name = 'Operator name' WHERE slug = 'bench-press'");
    await pool.query("UPDATE public.workout_templates SET name = 'Operator template', duration_seconds = 1200 WHERE slug = 'push-day'");
    await pool.query(`
      DELETE FROM public.workout_template_exercises
      WHERE template_id = (SELECT id FROM public.workout_templates WHERE slug = 'push-day')
        AND position = 6
    `);

    await seedWorkoutTemplates(pool);
    expect((await pool.query(
      "SELECT name FROM public.exercises WHERE slug = 'bench-press'",
    )).rows[0].name).toBe("Operator name");
    expect((await pool.query(
      "SELECT name, duration_seconds FROM public.workout_templates WHERE slug = 'push-day'",
    )).rows[0]).toEqual({ name: "Operator template", duration_seconds: 1200 });
    expect((await pool.query(`
      SELECT count(*)::int AS count
      FROM public.workout_template_exercises wte
      JOIN public.workout_templates wt ON wt.id = wte.template_id
      WHERE wt.slug = 'push-day'
    `)).rows[0].count).toBe(6);
  });

  it("does not modify unrelated public catalog rows", async () => {
    const exercise = await pool.query<{ id: string }>(
      "INSERT INTO public.exercises(slug, name, muscle_group) VALUES ('manual-exercise', 'Manual', 'Other') RETURNING id",
    );
    try {
      await seedWorkoutTemplates(pool);
      expect((await pool.query(
        "SELECT name, muscle_group FROM public.exercises WHERE id = $1",
        [exercise.rows[0]!.id],
      )).rows[0]).toEqual({ name: "Manual", muscle_group: "Other" });
    } finally {
      await pool.query("DELETE FROM public.exercises WHERE id = $1", [exercise.rows[0]!.id]);
    }
  });
});