import { ZodError } from "zod";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SUBSCRIPTION_REQUIRED"
  | "LIMIT_REACHED"
  | "STORE_RESTRICTED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { status?: number; details?: unknown; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? defaultStatus(code);
    this.details = options?.details;
  }
}

function defaultStatus(code: ErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
    case "SUBSCRIPTION_REQUIRED":
    case "STORE_RESTRICTED":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION":
      return 400;
    case "CONFLICT":
    case "LIMIT_REACHED":
      return 409;
    case "RATE_LIMITED":
      return 429;
    default:
      return 500;
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof ZodError) {
    const first = error.issues[0];
    if (!first) return "Please check the form and try again.";
    const path = first.path.filter(Boolean).join(".");
    return path ? `${path}: ${first.message}` : first.message;
  }
  return "Something went wrong. Please try again.";
}
