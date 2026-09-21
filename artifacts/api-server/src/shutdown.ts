import type { Server } from "node:http";

interface ShutdownOptions {
  server: Pick<Server, "close" | "closeAllConnections">;
  closeDatabase: () => Promise<void>;
  logger: { info: (message: string) => void; error: (message: string) => void };
  graceMs?: number;
  databaseGraceMs?: number;
}

/** Stop intake first, drain HTTP within a deadline, then close existing DB resources. */
export function createShutdown(options: ShutdownOptions): () => Promise<boolean> {
  let pending: Promise<boolean> | undefined;
  return () => {
    if (pending) return pending;
    pending = (async () => {
      options.logger.info("Server shutdown started.");
      let success = true;
      await new Promise<void>((resolve) => {
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(() => {
          success = false;
          options.logger.error("HTTP shutdown grace period expired.");
          try { options.server.closeAllConnections(); } catch { /* Continue DB cleanup. */ }
          finish();
        }, options.graceMs ?? 10_000);
        try {
          options.server.close((error) => {
            if (error) {
              success = false;
              options.logger.error("HTTP shutdown failed.");
            }
            finish();
          });
        } catch {
          success = false;
          options.logger.error("HTTP shutdown failed.");
          finish();
        }
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("timeout")), options.databaseGraceMs ?? 5_000);
          Promise.resolve().then(options.closeDatabase).then(
            () => { clearTimeout(timer); resolve(); },
            () => { clearTimeout(timer); reject(new Error("shutdown")); },
          );
        });
      } catch {
        success = false;
        options.logger.error("Database shutdown failed or timed out.");
      }
      options.logger.info("Server shutdown completed.");
      return success;
    })();
    return pending;
  };
}