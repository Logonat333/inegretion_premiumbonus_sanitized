import pino from "pino";

import { getRequestId, getTraceId } from "@shared/tracing/async-context";

const serviceName = process.env.SERVICE_NAME ?? "middleware-service";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: serviceName },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  mixin() {
    const traceId = getTraceId();
    const requestId = getRequestId();

    return {
      ...(traceId ? { traceId } : {}),
      ...(requestId ? { requestId } : {}),
    };
  },
});
