import type { Request } from "express";

export const API_ERROR_CODES = {
  INVALID_REQUEST: { status: 400, message: "The request is invalid." },
  INVALID_JSON: { status: 400, message: "The request body contains invalid JSON." },
  PAYLOAD_TOO_LARGE: { status: 413, message: "The request body is too large." },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: "The request content type is not supported." },
  VALIDATION_ERROR: { status: 422, message: "Request validation failed." },
  NOT_FOUND: { status: 404, message: "The requested resource was not found." },
  INTERNAL_ERROR: { status: 500, message: "An unexpected error occurred." },
  SERVICE_UNAVAILABLE: { status: 503, message: "The service is temporarily unavailable." },
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_CODES;
export interface ApiErrorDetail {
  field: string;
  code: string;
}

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetail[];

  constructor(code: ApiErrorCode, details?: ApiErrorDetail[]) {
    super(API_ERROR_CODES[code].message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

type ParserError = {
  type?: unknown;
};

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const type =
    typeof error === "object" && error !== null
      ? (error as ParserError).type
      : undefined;
  if (type === "entity.parse.failed") return new AppError("INVALID_JSON");
  if (type === "entity.too.large" || type === "parameters.too.many") {
    return new AppError("PAYLOAD_TOO_LARGE");
  }
  if (type === "encoding.unsupported" || type === "charset.unsupported") {
    return new AppError("UNSUPPORTED_MEDIA_TYPE");
  }
  if (
    type === "request.aborted" ||
    type === "request.size.invalid" ||
    type === "querystring.parse.rangeError"
  ) {
    return new AppError("INVALID_REQUEST");
  }
  return new AppError("INTERNAL_ERROR");
}

export function errorBody(error: AppError, request: Request) {
  return {
    error: {
      code: error.code,
      message: error.message,
      requestId: request.id,
      ...(error.details ? { details: error.details } : {}),
    },
  };
}