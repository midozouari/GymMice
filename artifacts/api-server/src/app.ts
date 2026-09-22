import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import type { Logger } from "pino";
import { createRouter } from "./routes";
import { logger } from "./lib/logger";
import { readiness as defaultReadiness, type Readiness } from "./lib/readiness";
import { requestId } from "./middlewares/request-id";
import { requireSupportedContentType } from "./middlewares/content-type";
import { errorHandler, notFound } from "./middlewares/errors";

export interface CreateAppOptions {
  readiness?: Pick<Readiness, "check">;
  logger?: Logger;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app: Express = express();
  const log = options.logger ?? logger;
  const readiness = options.readiness ?? defaultReadiness;

  app.use(requestId);
  app.use(
    pinoHttp({
      logger: log,
      customLogLevel(_request, response) {
        return response.statusCode >= 400 ? "silent" : "info";
      },
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
        err() {
          return { type: "request_error" };
        },
      },
    }),
  );
  app.use(cors({ exposedHeaders: ["X-Request-Id"] }));
  app.use(requireSupportedContentType);
  app.use(express.json({ limit: "100kb" }));
  const urlencodedOptions: Parameters<typeof express.urlencoded>[0] & {
    depth: number;
  } = {
    extended: true,
    limit: "100kb",
    parameterLimit: 100,
    depth: 5,
  };
  app.use(express.urlencoded(urlencodedOptions));

  app.use("/api", createRouter(readiness));
  app.use(notFound);
  app.use(errorHandler(log));

  return app;
}

const app = createApp();
export default app;
