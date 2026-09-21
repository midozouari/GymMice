export const UNSAFE_TEST_ENVIRONMENT =
  "API tests refused: require NODE_ENV=test and TEST_DATABASE_URL targeting role gymmice_test at 127.0.0.1:55432/gymmice_test without query or fragment.";

type Environment = Record<string, string | undefined>;

// Pure validation: no app, database driver, dotenv, or network imports.
export function validateTestDatabaseUrl(env: Environment): string {
  const value = env.TEST_DATABASE_URL;
  if (
    env.NODE_ENV !== "test" ||
    !value ||
    /[\s\u0000-\u001f\u007f]/u.test(value) ||
    !/^postgres(?:ql)?:\/\/gymmice_test(?::[^@/?#]*)?@127\.0\.0\.1:55432\/gymmice_test$/u.test(value)
  ) {
    throw new Error(UNSAFE_TEST_ENVIRONMENT);
  }

  try {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== "127.0.0.1" ||
      url.port !== "55432" ||
      url.pathname !== "/gymmice_test" ||
      url.username !== "gymmice_test" ||
      url.search ||
      url.hash
    ) {
      throw new Error();
    }
    // Also reject malformed percent encoding without exposing URL-parser errors.
    decodeURIComponent(url.password);
  } catch {
    throw new Error(UNSAFE_TEST_ENVIRONMENT);
  }
  return value;
}

export function prepareTestEnvironment(env: Environment): void {
  // Remove any production/development fallback even when validation fails.
  delete env.DATABASE_URL;
  env.LOG_LEVEL = "silent";
  const safeUrl = validateTestDatabaseUrl(env);
  // lib/db consumes DATABASE_URL; only the validated test value may reach it.
  // Prevent ambient libpq options/passwords/service settings affecting tests.
  for (const key of Object.keys(env)) {
    if (key.startsWith("PG")) delete env[key];
  }
  env.DATABASE_URL = safeUrl;
}