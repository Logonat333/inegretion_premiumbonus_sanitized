import type { Express } from "express";

import type { AppConfig } from "@infrastructure/config/config";

import { healthRouter } from "./health.routes";
import { purchasesRouter } from "./purchases.routes";

export function registerRoutes(app: Express, config: AppConfig): void {
  app.use("/health", healthRouter);
  app.use("/api/v1/purchases", purchasesRouter(config));
}
