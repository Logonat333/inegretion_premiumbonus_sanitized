import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosRequestHeaders,
} from "axios";
import CircuitBreaker from "opossum";

import { AppError } from "@shared/errors/app-error";
import { getRequestId, getTraceId } from "@shared/tracing/async-context";

export interface HttpClientOptions {
  baseURL: string;
  timeoutMs: number;
  maxRetries: number;
  retryableStatusCodes?: number[];
}

interface RetryMetadata {
  retryCount: number;
  exhausted?: boolean;
}

export interface HttpRequestExecutor {
  request<T>(config: AxiosRequestConfig): Promise<T>;
}

function createDelay(attempt: number): number {
  const baseDelay = 2 ** attempt * 100;
  const jitter = Math.floor(Math.random() * 100);
  return baseDelay + jitter;
}

export class HttpClient implements HttpRequestExecutor {
  private readonly instance: AxiosInstance;
  private readonly breaker: CircuitBreaker<[AxiosRequestConfig], unknown>;

  constructor(private readonly options: HttpClientOptions) {
    this.instance = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeoutMs,
    });

    this.instance.interceptors.request.use((config) => {
      const traceId = getTraceId();
      const requestId = getRequestId();

      config.headers = {
        ...(config.headers ?? {}),
        ...(traceId ? { "x-trace-id": traceId } : {}),
        ...(requestId ? { "x-request-id": requestId } : {}),
      } as AxiosRequestHeaders;

      const metadata = (
        config as AxiosRequestConfig & { metadata?: RetryMetadata }
      ).metadata;
      if (!metadata) {
        (config as AxiosRequestConfig & { metadata: RetryMetadata }).metadata =
          { retryCount: 0, exhausted: false };
      }

      return config;
    });

    this.instance.interceptors.response.use(
      undefined,
      async (error: AxiosError) => {
        const config = error.config as
          | (AxiosRequestConfig & { metadata?: RetryMetadata })
          | undefined;
        if (!config) {
          throw error;
        }

        if (!config.metadata) {
          config.metadata = { retryCount: 0, exhausted: false };
        }
        const metadata = config.metadata;
        const status = error.response?.status;

        const shouldRetry =
          metadata.retryCount < this.options.maxRetries &&
          (!status ||
            (
              this.options.retryableStatusCodes ?? [
                408, 429, 500, 502, 503, 504,
              ]
            ).includes(status));

        if (!shouldRetry) {
          metadata.exhausted = metadata.retryCount >= this.options.maxRetries;
          throw error;
        }

        metadata.retryCount += 1;

        const delay = createDelay(metadata.retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.instance.request(config);
      },
    );

    this.breaker = new CircuitBreaker<[AxiosRequestConfig], unknown>(
      (config: AxiosRequestConfig) => this.instance.request(config),
      {
        errorThresholdPercentage: 50,
        timeout: options.timeoutMs + 500,
        resetTimeout: 30_000,
        volumeThreshold: 1,
        rollingCountTimeout: 10_000,
        rollingCountBuckets: 1,
      },
    );

    this.breaker.fallback(() => {
      throw new AppError({
        message: "Circuit breaker open",
        code: "RETRY_EXHAUSTED",
        statusCode: 503,
      });
    });
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.breaker.fire(config);
      return (response as { data: T }).data;
    } catch (error) {
      throw this.toAppError(error, config);
    }
  }

  private toAppError(error: unknown, config: AxiosRequestConfig): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const metadata = (
        error.config as AxiosRequestConfig & { metadata?: RetryMetadata }
      )?.metadata;
      const upstreamDetails = {
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        status,
      };

      if (metadata?.exhausted) {
        return new AppError({
          message: "Retry attempts exhausted",
          code: "RETRY_EXHAUSTED",
          statusCode: status ?? 503,
          details: upstreamDetails,
          cause: error,
        });
      }

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return new AppError({
          message: "Request to upstream service timed out",
          code: "TIMEOUT",
          statusCode: 504,
          details: upstreamDetails,
          cause: error,
        });
      }

      if (status === 429) {
        return new AppError({
          message: "Upstream service rate limited the request",
          code: "RATE_LIMIT",
          statusCode: 429,
          details: upstreamDetails,
          cause: error,
        });
      }

      if (status && status >= 500) {
        return new AppError({
          message: "Upstream service responded with 5xx",
          code: "UPSTREAM_5XX",
          statusCode: status,
          details: upstreamDetails,
          cause: error,
        });
      }

      if (status && status >= 400) {
        return new AppError({
          message: "Upstream service responded with 4xx",
          code: "UPSTREAM_4XX",
          statusCode: status,
          details: upstreamDetails,
          cause: error,
        });
      }

      return new AppError({
        message: "Unexpected upstream error",
        code: "INTERNAL_ERROR",
        statusCode: status ?? 500,
        details: upstreamDetails,
        cause: error,
      });
    }

    return new AppError({
      message: "Unhandled error when calling upstream service",
      code: "INTERNAL_ERROR",
      statusCode: 500,
      details: {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
      },
      cause: error,
    });
  }
}
