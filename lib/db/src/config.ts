import type { PoolConfig } from "pg";

type Environment = Record<string, string | undefined>;
const invalid = () => new Error("Database configuration rejected. Check the environment, explicit target, credentials, role, and TLS policy.");

function parse(value: string | undefined): URL {
  try {
    if (!value || value.trim() !== value || /[\s\\]/.test(value)) throw invalid();
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.search || url.hash || value.includes("?") || value.includes("#") ||
      !url.hostname || !url.port || !url.username || !url.password ||
      !/^\/[a-zA-Z0-9_-]+$/.test(url.pathname) ||
      !/^[a-zA-Z0-9_-]+$/.test(url.username) ||
      Number(url.port) < 1 || Number(url.port) > 65535
    ) throw invalid();
    // Only password escaping is supported; forbid URL parser normalization.
    const authority = value.slice(value.indexOf("://") + 3).split("/")[0];
    if (authority !== `${url.username}:${url.password}@${url.host}`) throw invalid();
    if (value !== `${url.protocol}//${authority}${url.pathname}`) throw invalid();
    const password = decodeURIComponent(url.password);
    if (!password || /[\x00-\x1f\x7f]/.test(password) || /%[0-9a-f]{2}/i.test(password)) throw invalid();
    return url;
  } catch {
    throw invalid();
  }
}

const target = (url: URL) => `${url.hostname}:${url.port}${url.pathname}`;

export function getDatabaseConfig(
  kind: "runtime" | "migration",
  environment: string,
  env: Environment = process.env,
): PoolConfig {
  if (
    !["runtime", "migration"].includes(kind) ||
    !["development", "test", "preview", "production"].includes(environment) ||
    (env.NODE_ENV === "test" && environment !== "test") ||
    (kind === "migration" && environment === "production")
  ) throw invalid();

  let url: URL;
  if (environment === "test") {
    if (env.NODE_ENV !== "test") throw invalid();
    const runtime = parse(env.TEST_DATABASE_URL);
    if (target(runtime) !== "127.0.0.1:55432/gymmice_test" || runtime.username !== "gymmice_test") throw invalid();
    url = kind === "runtime" ? runtime : parse(env.TEST_MIGRATION_DATABASE_URL);
    if (target(url) !== target(runtime) || url.username !== (kind === "runtime" ? "gymmice_test" : "gymmice_migrator")) throw invalid();
  } else {
    url = parse(kind === "runtime" ? env.DATABASE_URL : env.MIGRATION_DATABASE_URL);
    if (!env.DB_ALLOWED_TARGET || target(url) !== env.DB_ALLOWED_TARGET) throw invalid();
    if (url.username !== (kind === "runtime" ? "gymmice_app" : "gymmice_migrator")) throw invalid();
  }

  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  return {
    host: url.hostname === "[::1]" ? "::1" : url.hostname,
    port: Number(url.port),
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
    ssl: local ? false : { rejectUnauthorized: true },
    // Explicit values prevent ambient PG* settings from changing connection policy.
    options: "-c client_encoding=UTF8",
    application_name: "gymmice",
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
    lock_timeout: 5_000,
    idle_in_transaction_session_timeout: 10_000,
    keepAlive: true,
  };
}