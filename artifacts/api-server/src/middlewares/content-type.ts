import type { RequestHandler } from "express";
import { AppError } from "../lib/errors";

export const requireSupportedContentType: RequestHandler = (
  request,
  _response,
  next,
) => {
  const hasBody =
    request.headers["transfer-encoding"] !== undefined ||
    (Number(request.headers["content-length"]) || 0) > 0;
  if (
    hasBody &&
    !request.is("application/json") &&
    !request.is("application/x-www-form-urlencoded")
  ) {
    next(new AppError("UNSUPPORTED_MEDIA_TYPE"));
    return;
  }
  next();
};