import { getRuntimeDatabase } from "@workspace/db";

export interface Readiness {
  check(): Promise<boolean>;
  beginShutdown(): void;
}

export function createReadiness(
  options: { probe?: () => Promise<unknown> } = {},
): Readiness {
  const probe =
    options.probe ??
    (() => getRuntimeDatabase().pool.query("SELECT 1"));
  let shuttingDown = false;
  let pending: Promise<boolean> | undefined;

  return {
    check() {
      if (shuttingDown) return Promise.resolve(false);
      if (pending) return pending;

      const current: Promise<boolean> = Promise.resolve()
        .then(async () => {
          // Shutdown may begin between check() and this deferred work.
          if (shuttingDown) return false;
          await probe();
          return !shuttingDown;
        })
        .catch(() => false)
        .finally(() => {
          if (pending === current) pending = undefined;
        });
      pending = current;
      return current;
    },
    beginShutdown() {
      shuttingDown = true;
    },
  };
}

export const readiness = createReadiness();