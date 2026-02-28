import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { logger } from "@infrastructure/observability/logger";
import { AppError } from "@shared/errors/app-error";
import { getRequestId } from "@shared/tracing/async-context";

interface ErrorHandlerOptions {
  maskErrorDetails: boolean;
}

export function createErrorHandler({ maskErrorDetails }: ErrorHandlerOptions) {
  return (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    void _next;
    if (res.headersSent) {
      return;
    }

    const requestId = getRequestId();

    if (error instanceof ZodError) {
      res.status(400).json({
        code: "VALIDATION",
        message: "Request validation failed",
        issues: error.issues,
        requestId,
      });
      return;
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error(
          { err: error, code: error.code, requestId },
          error.message,
        );
      } else {
        logger.warn({ err: error, code: error.code, requestId }, error.message);
      }

      const exposeDetails = !maskErrorDetails || error.statusCode < 500;

      res.status(error.statusCode).json({
        code: error.code,
        message:
          maskErrorDetails && error.statusCode >= 500
            ? "Internal server error"
            : error.message,
        ...(exposeDetails ? { details: error.details ?? null } : {}),
        requestId,
      });
      return;
    }

    logger.error({ err: error, requestId }, "Unhandled error");

    const fallbackMessage = maskErrorDetails
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : "Internal server error";

    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: fallbackMessage,
      ...(maskErrorDetails || !(error instanceof Error)
        ? {}
        : {
            details: {
              message: error.message,
              stack: error.stack,
            },
          }),
      requestId,
    });
  };
}
