import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const external = args.includes("--external-disposable");
const api = args.includes("--api");
if (args.some((arg) => !["--external-disposable", "--api"].includes(arg))) {
  console.error("Unknown disposable-database test option.");
  process.exit(1);
}

// Never inherit application connection settings into the test harness.
const env = { ...process.env, NODE_ENV: "test", DB_ENV: "test" };
delete env.DATABASE_URL;
delete env.MIGRATION_DATABASE_URL;
delete env.DB_ALLOWED_TARGET;
for (const key of Object.keys(env)) {
  if (key.startsWith("PG")) delete env[key];
}

function run(command, argv, options = {}) {
  const result = spawnSync(command, argv, {
    cwd: root,
    env,
    encoding: "utf8",
    timeout: 300_000,
    stdio: "inherit",
    ...options,
  });
  if (result.error || result.status !== 0) {
    // Never forward database bootstrap output, arguments, or credentials.
    throw new Error(`${command} failed during disposable database validation.`);
  }
}

let directory;
let started = false;
try {
  if (external) {
    if (process.env.CI !== "true") {
      throw new Error("External disposable mode is restricted to CI.");
    }
    // The database test configuration validates both strict test URLs before use.
    if (!env.TEST_DATABASE_URL || !env.TEST_MIGRATION_DATABASE_URL) {
      throw new Error("Both test-specific URLs are required; no fallback is permitted.");
    }
  } else {
    delete env.TEST_DATABASE_URL;
    delete env.TEST_MIGRATION_DATABASE_URL;
    directory = mkdtempSync(join(tmpdir(), "gymmice-b03-"));
    const data = join(directory, "data");
    run("initdb", [
      "-D", data, "--username=b03_bootstrap",
      "--auth-local=trust", "--auth-host=scram-sha-256",
    ], { stdio: "pipe" });
    run("pg_ctl", [
      "-D", data, "-l", join(directory, "server.log"),
      "-o", `-h 127.0.0.1 -p 55432 -k ${directory}`, "-w", "start",
    ], { stdio: "pipe" });
    started = true;
    const runtimePassword = randomBytes(32).toString("hex");
    const migrationPassword = randomBytes(32).toString("hex");
    // This private socket belongs to the cluster just created above.
    run("psql", [
      "-X", "-h", directory, "-p", "55432", "-U", "b03_bootstrap", "-d", "postgres",
      "-v", "ON_ERROR_STOP=1",
    ], {
      stdio: "pipe",
      input: `
        CREATE DATABASE gymmice_test;
        CREATE ROLE gymmice_test LOGIN PASSWORD '${runtimePassword}'
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        CREATE ROLE gymmice_migrator LOGIN PASSWORD '${migrationPassword}'
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        REVOKE ALL ON DATABASE gymmice_test FROM PUBLIC;
        GRANT CONNECT, TEMPORARY ON DATABASE gymmice_test TO gymmice_test;
        GRANT CONNECT, TEMPORARY, CREATE ON DATABASE gymmice_test TO gymmice_migrator;
      `,
    });
    run("psql", [
      "-X", "-h", directory, "-p", "55432", "-U", "b03_bootstrap", "-d", "gymmice_test",
      "-v", "ON_ERROR_STOP=1",
    ], {
      stdio: "pipe",
      input: `
        REVOKE ALL ON SCHEMA public FROM PUBLIC;
        GRANT USAGE ON SCHEMA public TO gymmice_test;
        GRANT USAGE, CREATE ON SCHEMA public TO gymmice_migrator;
      `,
    });
    env.TEST_DATABASE_URL = `postgres://gymmice_test:${runtimePassword}@127.0.0.1:55432/gymmice_test`;
    env.TEST_MIGRATION_DATABASE_URL = `postgres://gymmice_migrator:${migrationPassword}@127.0.0.1:55432/gymmice_test`;
    console.log("Created a fresh disposable PostgreSQL cluster with separate restricted roles.");
  }
  run("pnpm", ["--filter", "@workspace/db", "run", "migrations:check"]);
  for (const command of ["migrations:status", "migrations:run", "migrations:run", "migrations:status"]) {
    run("pnpm", ["--filter", "@workspace/db", "run", command, "--environment", "test"]);
  }
  run("pnpm", ["--filter", "@workspace/db", "run", "test"]);
  if (api) run("pnpm", ["run", "test:api"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Disposable database validation failed.");
  process.exitCode = 1;
} finally {
  if (started || (directory && existsSync(join(directory, "data", "postmaster.pid")))) {
    started = true;
    try {
      run("pg_ctl", ["-D", join(directory, "data"), "-m", "immediate", "-w", "stop"], {
        stdio: "pipe",
      });
      started = false;
      console.log("Stopped the disposable PostgreSQL cluster.");
    } catch {
      console.error("Disposable cluster cleanup failed; inspect the local test process.");
      process.exitCode = 1;
    }
  }
  if (directory && !started) rmSync(directory, { recursive: true, force: true });
}