import type { NextFunction, Request, Response } from "express";

import { ProcessPurchaseUseCase } from "@application/use-cases/process-purchase";
import { createPurchaseSchema } from "@interfaces/http/dto/purchase.dto";
import { getRequestId, getTraceId } from "@shared/tracing/async-context";

export class PurchaseController {
  constructor(private readonly processPurchase: ProcessPurchaseUseCase) {}

  public create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const parsed = createPurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }

    const payload = parsed.data;

    try {
      const result = await this.processPurchase.execute({
        externalPurchaseId: payload.externalPurchaseId,
        buyerId: payload.buyerId,
        amount: payload.amount,
        currency: payload.currency,
        items: payload.items,
        purchasedAt: new Date(payload.purchasedAt),
        metadata: payload.metadata,
      });

      if (!result.ok) {
        next(result.error);
        return;
      }

      res.status(202).json({
        status: result.value.status,
        traceId: getTraceId() ?? undefined,
        requestId: getRequestId() ?? undefined,
      });
    } catch (error) {
      next(error);
    }
  };
}
