import app from "./app";
import { logger } from "./lib/logger";
import { closeDatabase } from "@workspace/db";
import { readiness } from "./lib/readiness";
import { startServer } from "./server";

void startServer({
  app,
  rawPort: process.env["PORT"],
  logger,
  closeDatabase,
  beginShutdown: readiness.beginShutdown,
  signals: process,
  exit: (code) => process.exit(code),
});
