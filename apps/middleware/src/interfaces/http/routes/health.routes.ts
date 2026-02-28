import { Router } from "express";

import { HealthController } from "@interfaces/http/controllers/health-controller";

export const healthRouter = Router();

healthRouter.get("/live", (req, res) => {
  HealthController.liveness(req, res);
});
healthRouter.get("/ready", (req, res) => {
  HealthController.readiness(req, res);
});
