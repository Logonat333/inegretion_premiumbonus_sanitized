import { Router } from "express";

import { ProcessPurchaseUseCase } from "@application/use-cases/process-purchase";
import type { AppConfig } from "@infrastructure/config/config";
import { createAppContext } from "@infrastructure/config/app-context";
import { PurchaseController } from "@interfaces/http/controllers/purchase-controller";

export function purchasesRouter(config: AppConfig): Router {
  const router = Router();

  const context = createAppContext(config);
  const processPurchase = new ProcessPurchaseUseCase({
    premiumBonusAdapter: context.premiumBonusAdapter,
    auditLogRepository: context.auditLogRepository,
    purchaseQueue: context.purchaseQueue,
  });
  const controller = new PurchaseController(processPurchase);

  router.post("/", (req, res, next) => {
    void controller.create(req, res, next);
  });

  return router;
}
