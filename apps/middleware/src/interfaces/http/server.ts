import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";

import type { AppConfig } from "@infrastructure/config/config";
import { logger } from "@infrastructure/observability/logger";
import { createErrorHandler } from "@interfaces/http/middlewares/error-handler";
import { traceContextMiddleware } from "@interfaces/http/middlewares/trace-context";
import { loadOpenApiDocument } from "@interfaces/http/openapi/document";
import { registerRoutes } from "@interfaces/http/routes";

interface CreateServerOptions {
  config: AppConfig;
}

export function createServer({ config }: CreateServerOptions): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(traceContextMiddleware);
  app.use(
    pinoHttp({
      logger,
      autoLogging: config.observability.requestLogging === "standard",
      genReqId: (req) => req.requestId ?? randomUUID(),
      customLogLevel: (res, err) => {
        const statusCode = res.statusCode ?? 200;
        if (err || statusCode >= 500) {
          return "error";
        }
        if (statusCode >= 400) {
          return "warn";
        }
        return "info";
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(helmet());

  const limiter = rateLimit({
    windowMs: config.http.rateLimit.windowMs,
    limit: config.http.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.use(
    cors({
      origin:
        config.security.allowedOrigins.length === 0
          ? undefined
          : config.security.allowedOrigins,
      credentials: true,
    }),
  );

  if (config.http.swagger.exposeJson) {
    app.get("/openapi.json", (_req, res) => {
      const openApiDocument = loadOpenApiDocument();
      res.json(openApiDocument);
    });
  }

  if (config.http.swagger.uiEnabled) {
    const openApiDocument = loadOpenApiDocument();
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }

  registerRoutes(app, config);

  app.use(
    createErrorHandler({ maskErrorDetails: config.security.maskErrorDetails }),
  );

  return app;
}
