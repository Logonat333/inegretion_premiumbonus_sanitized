import type { Purchase } from "@domain/entities/purchase";
import type { PremiumBonusAdapter } from "@infrastructure/adapters/premiumbonus/premiumbonus-adapter";
import type { PurchaseQueue } from "@infrastructure/persistence/redis/purchase-queue";
import type { AuditLogRepository } from "@infrastructure/persistence/postgres/audit-log-repository";
import { AppError } from "@shared/errors/app-error";
import { err, ok, type Result } from "@shared/result/result";

export interface ProcessPurchaseInput {
  externalPurchaseId: string;
  buyerId: string;
  amount: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  purchasedAt: Date;
  metadata?: Record<string, unknown>;
}

export type PremiumBonusGateway = Pick<PremiumBonusAdapter, "createPurchase">;
export type AuditLogGateway = Pick<AuditLogRepository, "append">;
export type PurchaseQueueGateway = Pick<PurchaseQueue, "enqueue">;

export interface ProcessPurchaseDependencies {
  premiumBonusAdapter: PremiumBonusGateway;
  auditLogRepository: AuditLogGateway;
  purchaseQueue: PurchaseQueueGateway;
}

export class ProcessPurchaseUseCase {
  constructor(private readonly dependencies: ProcessPurchaseDependencies) {}

  async execute(
    input: ProcessPurchaseInput,
  ): Promise<Result<{ status: "queued" }, AppError>> {
    try {
      const purchase = this.resolvePurchase(input);

      await this.dependencies.auditLogRepository.append({
        purchase,
        source: "premiumbonus",
      });

      await this.dependencies.premiumBonusAdapter.createPurchase(purchase);

      await this.dependencies.purchaseQueue.enqueue({ purchase });

      return ok({ status: "queued" });
    } catch (error) {
      return err(
        error instanceof AppError
          ? error
          : new AppError({
              message: "Failed to process purchase",
              code: "INTERNAL_ERROR",
              statusCode: 500,
              cause: error,
            }),
      );
    }
  }

  private resolvePurchase(input: ProcessPurchaseInput): Purchase {
    if (input.items.length === 0) {
      throw new AppError({
        message: "Purchase items required",
        code: "VALIDATION",
        statusCode: 400,
      });
    }

    return {
      id: input.externalPurchaseId,
      externalId: input.externalPurchaseId,
      items: input.items,
      purchasedAt: input.purchasedAt,
      amount: input.amount,
      currency: input.currency,
      buyer: {
        id: input.buyerId,
      },
      metadata: input.metadata,
    };
  }
}
