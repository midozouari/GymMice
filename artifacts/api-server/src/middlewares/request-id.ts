import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (request, response, next) => {
  request.id = randomUUID();
  response.setHeader("X-Request-Id", request.id);
  next();
};