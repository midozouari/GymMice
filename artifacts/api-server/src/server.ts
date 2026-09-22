import { createServer, type RequestListener, type Server } from "node:http";
import { createShutdown } from "./shutdown";

interface SignalSource {
  on(event: string, listener: () => void): unknown;
  removeListener(event: string, listener: () => void): unknown;
}

interface ServerOptions {
  app: RequestListener;
  rawPort: string | undefined;
  logger: { info(message: string): void; error(message: string): void };
  closeDatabase: () => Promise<void>;
  beginShutdown: () => void;
  signals: SignalSource;
  exit: (code: number) => void;
  createHttpServer?: (app: RequestListener) => Server;
}

export function parsePort(rawPort: string | undefined): number {
  if (!rawPort || !/^\d+$/.test(rawPort)) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return port;
}

/** Startup never acquires a database connection; B03 owns resource teardown. */
export async function startServer(options: ServerOptions) {
  let server: Server;
  try {
    const port = parsePort(options.rawPort);
    server = (options.createHttpServer ?? createServer)(options.app);
    await new Promise<void>((resolve, reject) => {
      const failed = (error: Error) => reject(error);
      server.once("error", failed);
      server.listen(port, () => {
        server.removeListener("error", failed);
        resolve();
      });
    });
  } catch {
    options.beginShutdown();
    options.logger.error("Server startup failed.");
    options.exit(1);
    return undefined;
  }

  const drain = createShutdown({
    server,
    closeDatabase: options.closeDatabase,
    logger: options.logger,
  });
  let stopping: Promise<boolean> | undefined;
  const shutdown = () => {
    if (!stopping) {
      options.beginShutdown();
      stopping = drain().then((success) => {
        options.signals.removeListener("SIGTERM", onSignal);
        options.signals.removeListener("SIGINT", onSignal);
        return success;
      });
    }
    return stopping;
  };
  let exiting = false;
  const stopAndExit = (failed: boolean) => {
    if (exiting) return;
    exiting = true;
    void shutdown().then((success) => options.exit(!failed && success ? 0 : 1));
  };
  const onSignal = () => stopAndExit(false);
  server.on("error", () => {
    options.logger.error("HTTP server failed.");
    stopAndExit(true);
  });
  options.signals.on("SIGTERM", onSignal);
  options.signals.on("SIGINT", onSignal);
  options.logger.info("Server listening.");
  return { server, shutdown };
}