import type pg from "pg";

const exercises = [
  ["bench-press", "Bench press", "Chest"],
  ["incline-db-press", "Incline DB press", "Chest"],
  ["h2l-cable-flies", "H2L cable flies", "Chest"],
  ["lateral-raises", "Lateral raises", "Shoulders"],
  ["german-raises", "German raises", "Shoulders"],
  ["cable-tricep-extension", "Cable tricep extension", "Triceps"],
  ["skull-crusher", "Skull crusher", "Triceps"],
] as const;

/**
 * Adds only the controlled public workout catalog. Stable-key conflicts are
 * deliberately left untouched so reruns preserve operator edits.
 */
export async function seedWorkoutTemplates(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // GRANT updates PostgreSQL catalog tuples even when permissions already exist.
    // Serialize the complete seed so concurrent invocations cannot race on grants.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('gymmice:workout-template-seed', 0))",
    );
    const values: unknown[] = [];
    const rows = exercises.map((exercise, index) => {
      values.push(...exercise);
      const offset = index * 3;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    });
    await client.query(
      `INSERT INTO public.exercises (slug, name, muscle_group)
       VALUES ${rows.join(", ")}
       ON CONFLICT (slug) DO NOTHING`,
      values,
    );

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO public.workout_templates (slug, name, duration_seconds)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      ["push-day", "Push Day", 3300],
    );

    const templateId = inserted.rows[0]?.id;
    if (templateId) {
      const slugs = exercises.map(([slug]) => slug);
      const catalog = await client.query<{ id: string; slug: string }>(
        `SELECT id, slug
         FROM public.exercises
         WHERE slug = ANY($1::varchar[])
         ORDER BY slug`,
        [slugs],
      );
      const ids = new Map(catalog.rows.map(row => [row.slug, row.id]));
      if (ids.size !== exercises.length) throw new Error("Controlled exercise catalog is incomplete.");
      await client.query(
        `INSERT INTO public.workout_template_exercises (template_id, exercise_id, position)
         SELECT $1::uuid, seeded.exercise_id::uuid, seeded.position
         FROM unnest($2::text[], $3::integer[]) AS seeded(exercise_id, position)`,
        [templateId, slugs.map(slug => ids.get(slug)), slugs.map((_, position) => position)],
      );
    }

    const approvedRoles = await client.query<{ rolname: string }>(
      "SELECT rolname FROM pg_roles WHERE rolname IN ('gymmice_test', 'gymmice_app')",
    );
    const existingRoles = new Set(approvedRoles.rows.map(row => row.rolname));
    if (existingRoles.has("gymmice_test")) {
      await client.query(
        'GRANT SELECT ON TABLE public.exercises, public.workout_templates, public.workout_template_exercises TO "gymmice_test"',
      );
    }
    if (existingRoles.has("gymmice_app")) {
      await client.query(
        'GRANT SELECT ON TABLE public.exercises, public.workout_templates, public.workout_template_exercises TO "gymmice_app"',
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      throw new Error("Workout template seed rollback failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}