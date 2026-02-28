import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { runWithContext } from "@shared/tracing/async-context";

const TRACE_HEADER = "x-trace-id";
const REQUEST_ID_HEADER = "x-request-id";

export function traceContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestIdHeader = req.headers[REQUEST_ID_HEADER];
  const incomingRequestId = Array.isArray(requestIdHeader)
    ? requestIdHeader[0]
    : requestIdHeader;
  const normalizedRequestId =
    typeof incomingRequestId === "string" ? incomingRequestId : undefined;
  let requestId = normalizedRequestId ?? "";
  if (requestId.length === 0) {
    requestId = randomUUID();
  }

  const traceIdHeader = req.headers[TRACE_HEADER];
  const incomingTraceId = Array.isArray(traceIdHeader)
    ? traceIdHeader[0]
    : traceIdHeader;
  const normalizedTraceId =
    typeof incomingTraceId === "string" ? incomingTraceId : undefined;
  let traceId = normalizedTraceId ?? "";
  if (traceId.length === 0) {
    traceId = requestId;
  }

  (req as Request & { requestId: string }).requestId = requestId;

  res.setHeader(REQUEST_ID_HEADER, requestId);
  res.setHeader(TRACE_HEADER, traceId);

  runWithContext({ traceId, requestId }, () => {
    next();
  });
}
