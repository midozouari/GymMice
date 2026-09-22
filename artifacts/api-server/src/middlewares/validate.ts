import type { RequestHandler } from "express";
import { AppError, type ApiErrorDetail } from "../lib/errors";

type RequestSource = "body" | "params" | "query";
interface ValidationIssue {
  path: PropertyKey[];
  code: string;
}
interface ValidationSchema {
  safeParse(value: unknown):
    | { success: true; data: unknown }
    | { success: false; error: { issues: ValidationIssue[] } };
}

export function validate(
  source: RequestSource,
  schema: ValidationSchema,
  allowedFields: readonly string[],
): RequestHandler {
  const fields = new Set(allowedFields);
  return (request, _response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      const details: ApiErrorDetail[] = result.error.issues.map((issue) => {
        const candidate = issue.path[0];
        return {
          field:
            typeof candidate === "string" && fields.has(candidate)
              ? candidate
              : source,
          code: issue.code,
        };
      });
      next(new AppError("VALIDATION_ERROR", details));
      return;
    }
    Object.defineProperty(request, source, {
      configurable: true,
      writable: true,
      value: result.data,
    });
    next();
  };
}