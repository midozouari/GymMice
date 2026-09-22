import type { ErrorRequestHandler, RequestHandler } from "express";
import type { Logger } from "pino";
import {
  API_ERROR_CODES,
  AppError,
  errorBody,
  normalizeError,
} from "../lib/errors";

export const notFound: RequestHandler = (_request, _response, next) => {
  next(new AppError("NOT_FOUND"));
};

export function errorHandler(log: Logger): ErrorRequestHandler {
  return (value, request, response, next) => {
    if (response.headersSent) {
      next(value);
      return;
    }

    const error = normalizeError(value);
    const status = API_ERROR_CODES[error.code].status;
    const metadata = {
      requestId: request.id,
      code: error.code,
      status,
    };
    if (error.code === "INTERNAL_ERROR") {
      log.error(metadata, "Request failed unexpectedly.");
    } else {
      log.warn(metadata, "Request rejected.");
    }
    response.status(status).json(errorBody(error, request));
  };
}