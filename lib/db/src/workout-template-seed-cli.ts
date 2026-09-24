import pg from "pg";
import { getDatabaseConfig } from "./config.js";
import { assertMigrationEnvironment } from "./migration-runner.js";
import { seedWorkoutTemplates } from "./workout-template-seed.js";

async function main(): Promise<void> {
  const [flag, environment, ...extra] = process.argv.slice(2);
  if (flag !== "--environment" || !environment || extra.length) {
    throw new Error("Usage: seed:workout-templates --environment <test|development|preview>");
  }
  assertMigrationEnvironment(environment);

  let config: pg.PoolConfig;
  try {
    config = getDatabaseConfig("migration", environment, process.env);
  } catch {
    throw new Error("Seed database configuration rejected; check the explicit environment and allowed target.");
  }

  const pool = new pg.Pool({
    ...config,
    max: 2,
    application_name: "gymmice-workout-template-seed",
  });
  let failed = false;
  pool.on("error", () => { failed = true; });
  try {
    const identity = await pool.query<{ username: string; database: string; unsafe: boolean }>(`
      SELECT current_user AS username, current_database() AS database,
        EXISTS (
          SELECT 1 FROM pg_roles r
          WHERE pg_has_role(current_user, r.oid, 'MEMBER')
          AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls)
        ) AS unsafe
    `);
    const who = identity.rows[0];
    if (!who || who.username !== config.user || who.database !== config.database || who.unsafe) {
      throw new Error("Seed identity or privilege verification failed.");
    }
    await seedWorkoutTemplates(pool);
    if (failed) throw new Error("Seed connection failed.");
  } catch {
    throw new Error("Workout template seed failed; inspect database diagnostics securely.");
  } finally {
    try {
      await pool.end();
    } catch {
      if (!failed) throw new Error("Workout template seed connection cleanup failed.");
    }
  }
  console.log("Workout template catalog seeded.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Workout template seed failed.");
  process.exitCode = 1;
});