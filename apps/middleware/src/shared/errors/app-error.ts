export const APP_ERROR_CODES = [
  "INTERNAL_ERROR",
  "VALIDATION",
  "UPSTREAM_4XX",
  "UPSTREAM_5XX",
  "TIMEOUT",
  "RATE_LIMIT",
  "RETRY_EXHAUSTED",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export interface AppErrorOptions {
  message: string;
  code?: AppErrorCode;
  statusCode?: number;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly cause?: unknown;

  constructor({
    message,
    code = "INTERNAL_ERROR",
    statusCode = 500,
    details,
    cause,
  }: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (cause) {
      this.cause = cause;
    }

    Error.captureStackTrace?.(this, AppError);
  }
}
