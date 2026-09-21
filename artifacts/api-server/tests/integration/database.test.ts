import { it } from "vitest";

const connect = (pool: (typeof import("@workspace/db"))["pool"]) => pool.connect();

it("uses the dedicated database and rolls back temporary-table writes", async () => {
  let pool: (typeof import("@workspace/db"))["pool"] | undefined;
  let client: Awaited<ReturnType<typeof connect>> | undefined;
  let failed = false;
  try {
    ({ pool } = await import("@workspace/db"));
    pool.options.connectionTimeoutMillis = 5_000;
    pool.options.statement_timeout = 5_000;
    client = await connect(pool);
    const identity = await client.query(
      "SELECT current_database() AS database, current_user AS role, session_user AS session_role",
    );
    const row = identity.rows[0];
    if (
      row?.database !== "gymmice_test" ||
      row?.role !== "gymmice_test" ||
      row?.session_role !== "gymmice_test"
    ) throw new Error();

    await client.query("BEGIN");
    await client.query("CREATE TEMPORARY TABLE b02_rollback_probe (value integer NOT NULL)");
    await client.query("INSERT INTO pg_temp.b02_rollback_probe (value) VALUES ($1)", [42]);
    const result = await client.query("SELECT value FROM pg_temp.b02_rollback_probe");
    if (result.rows.length !== 1 || result.rows[0].value !== 42) throw new Error();
    await client.query("ROLLBACK");
    const rolledBack = await client.query(
      "SELECT to_regclass('pg_temp.b02_rollback_probe') AS relation",
    );
    if (rolledBack.rows[0]?.relation !== null) throw new Error();
  } catch {
    // Never pass driver messages, connection strings, or assertion values through.
    failed = true;
  } finally {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        failed = true;
      } finally {
        client.release(true);
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch {
        failed = true;
      }
    }
  }
  if (failed) {
    throw new Error(
      "Dedicated test database verification failed. Check the isolated test service, credentials, and rollback support.",
    );
  }
});