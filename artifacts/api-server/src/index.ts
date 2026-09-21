import app from "./app";
import { logger } from "./lib/logger";
import { closeDatabase } from "@workspace/db";
import { createShutdown } from "./shutdown";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

const shutdown = createShutdown({ server, closeDatabase, logger });
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void shutdown().then((success) => process.exit(success ? 0 : 1));
  });
}
