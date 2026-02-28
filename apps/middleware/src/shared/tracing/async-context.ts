import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  traceId: string;
  requestId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithTrace<T>(traceId: string, callback: () => T): T {
  return storage.run({ traceId }, callback);
}

export function runWithContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return storage.run(context, callback);
}

export function getTraceId(): string | undefined {
  return storage.getStore()?.traceId;
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
