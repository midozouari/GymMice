import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabaseConfig } from "../src/config.js";
import { seedWorkoutTemplates } from "../src/workout-template-seed.js";

describe("workout template catalog integration", () => {
  let migrator: pg.Pool;
  let runtime: pg.Pool;

  beforeAll(async () => {
    migrator = new pg.Pool(getDatabaseConfig("migration", "test", process.env));
    runtime = new pg.Pool(getDatabaseConfig("runtime", "test", process.env));
    await seedWorkoutTemplates(migrator);
  });
  afterAll(async () => {
    await Promise.all([migrator.end(), runtime.end()]);
  });

  it("exposes the ordered seeded catalog through the runtime identity", async () => {
    const result = await runtime.query<{
      slug: string;
      name: string;
      duration_seconds: number;
      exercise_id: string;
      exercise_slug: string;
      exercise_name: string;
      muscle_group: string;
      position: number;
    }>(`
      SELECT wt.slug, wt.name, wt.duration_seconds, e.id AS exercise_id,
        e.slug AS exercise_slug, e.name AS exercise_name, e.muscle_group, wte.position
      FROM public.workout_templates wt
      JOIN public.workout_template_exercises wte ON wte.template_id = wt.id
      JOIN public.exercises e ON e.id = wte.exercise_id
      WHERE wt.slug = 'push-day'
      ORDER BY wte.position
    `);
    expect(result.rows.map(row => row.exercise_slug)).toEqual([
      "bench-press", "incline-db-press", "h2l-cable-flies", "lateral-raises",
      "german-raises", "cable-tricep-extension", "skull-crusher",
    ]);
    expect(result.rows.map(row => row.exercise_name)).toEqual([
      "Bench press", "Incline DB press", "H2L cable flies", "Lateral raises",
      "German raises", "Cable tricep extension", "Skull crusher",
    ]);
    expect(result.rows.map(row => row.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(result.rows.every(row => /^[0-9a-f-]{36}$/.test(row.exercise_id))).toBe(true);
    expect(result.rows[0]).toMatchObject({ slug: "push-day", name: "Push Day", duration_seconds: 3300 });
  });

  it("enforces catalog constraints and relationship uniqueness", async () => {
    const client = await migrator.connect();
    try {
      await client.query("BEGIN");
      await expect(client.query(
        "INSERT INTO public.exercises(slug, name, muscle_group) VALUES ('Bad Slug', 'Valid', 'Chest')",
      )).rejects.toMatchObject({ code: "23514" });
      await client.query("ROLLBACK");

      await client.query("BEGIN");
      await expect(client.query(
        "INSERT INTO public.workout_templates(slug, name, duration_seconds) VALUES ('too-long', 'Valid', 86401)",
      )).rejects.toMatchObject({ code: "23514" });
      await client.query("ROLLBACK");

      await client.query("BEGIN");
      const template = await client.query<{ id: string }>(
        "SELECT id FROM public.workout_templates WHERE slug = 'push-day'",
      );
      const exercise = await client.query<{ id: string }>(`
        INSERT INTO public.exercises(slug, name, muscle_group)
        VALUES ('constraint-fixture', 'Fixture', 'Chest') RETURNING id
      `);
      await expect(client.query(
        "INSERT INTO public.workout_template_exercises(template_id, exercise_id, position) VALUES ($1, $2, -1)",
        [template.rows[0]!.id, exercise.rows[0]!.id],
      )).rejects.toMatchObject({ code: "23514" });
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  it("grants runtime SELECT only and denies catalog writes and DDL", async () => {
    expect((await runtime.query("SELECT count(*)::int AS count FROM public.exercises")).rows[0].count).toBeGreaterThan(0);
    await expect(runtime.query(
      "INSERT INTO public.exercises(slug, name, muscle_group) VALUES ('forbidden', 'Forbidden', 'Chest')",
    )).rejects.toMatchObject({ code: "42501" });
    await expect(runtime.query("ALTER TABLE public.exercises ADD COLUMN forbidden integer")).rejects.toMatchObject({ code: "42501" });

    const grants = await migrator.query<{ grantee: string; privilege_type: string }>(`
      SELECT grantee, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN ('exercises', 'workout_templates', 'workout_template_exercises')
        AND grantee IN ('gymmice_test', 'gymmice_app')
      ORDER BY grantee, privilege_type
    `);
    expect(new Set(grants.rows.map(row => row.privilege_type))).toEqual(new Set(["SELECT"]));
    expect(grants.rows.filter(row => row.grantee === "gymmice_test")).toHaveLength(3);
  });
});