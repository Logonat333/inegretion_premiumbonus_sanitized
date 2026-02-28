import type { Request, Response } from "express";

import { logger } from "@infrastructure/observability/logger";

export class HealthController {
  public static liveness(_req: Request, res: Response): void {
    res.status(200).json({ status: "ok" });
  }

  public static readiness(_req: Request, res: Response): void {
    logger.debug("Readiness probe invoked");
    res.status(200).json({ status: "ready" });
  }
}
