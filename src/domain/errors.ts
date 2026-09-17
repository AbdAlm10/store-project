import { ZodError } from "zod";
import { AUTH_AR, localizeAuthMessage } from "@/lib/auth-messages";

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

function isZodLike(
  error: unknown,
): error is { issues: Array<{ message: string; path: PropertyKey[] }> } {
  if (error instanceof ZodError) return true;
  if (!error || typeof error !== "object") return false;
  const issues = (error as { issues?: unknown }).issues;
  return Array.isArray(issues);
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return localizeAuthMessage(error.message);
  }

  if (isZodLike(error)) {
    const first = error.issues[0];
    if (!first) return AUTH_AR.formCheck;
    return localizeAuthMessage(first.message);
  }

  if (error instanceof Error && error.message) {
    return localizeAuthMessage(error.message);
  }

  return AUTH_AR.generic;
}
