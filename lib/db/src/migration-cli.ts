import { assertMigrationEnvironment, checkMigrations, migrationStatus, runMigrations } from "./migration-runner.js";

async function main(): Promise<void> {
  const [command, flag, environment, ...extra] = process.argv.slice(2);
  if (command === "check" && !flag) {
    const result = await checkMigrations();
    console.log(`Validated ${result.total} migration files offline.`);
    return;
  }
  if (!command || !["check", "status", "run"].includes(command) ||
      flag !== "--environment" || !environment || extra.length) {
    throw new Error("Usage: migrations:check [--environment <test|development|preview>] or migrations:<status|run> --environment <test|development|preview>");
  }
  assertMigrationEnvironment(environment);
  const action = command === "check" ? checkMigrations : command === "status" ? migrationStatus : runMigrations;
  const result = await action({ environment });
  console.log(command === "check"
    ? `Validated ${result.total} migration files offline.`
    : `Migrations: ${result.applied} applied, ${result.pending} pending.`);
}

main().catch((error: unknown) => {
  // All public runner errors are deliberately sanitized.
  console.error(error instanceof Error ? error.message : "Migration command failed.");
  process.exitCode = 1;
});