import type { Purchase } from "@domain/entities/purchase";
import type { PremiumBonusAdapter } from "@infrastructure/adapters/premiumbonus/premiumbonus-adapter";
import type { YClientsAdapter } from "@infrastructure/adapters/yclients/yclients-adapter";
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

export type YClientsGateway = Pick<YClientsAdapter, "getPurchase">;
export type PremiumBonusGateway = Pick<PremiumBonusAdapter, "createPurchase">;
export type AuditLogGateway = Pick<AuditLogRepository, "append">;
export type PurchaseQueueGateway = Pick<PurchaseQueue, "enqueue">;

export interface ProcessPurchaseDependencies {
  yclientsAdapter: YClientsGateway;
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
      const purchase = await this.resolvePurchase(input);

      await this.dependencies.auditLogRepository.append({
        purchase,
        source: "yclients",
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

  private async resolvePurchase(
    input: ProcessPurchaseInput,
  ): Promise<Purchase> {
    if (input.items.length === 0) {
      throw new AppError({
        message: "Purchase items required",
        code: "VALIDATION",
        statusCode: 400,
      });
    }

    const external = await this.dependencies.yclientsAdapter.getPurchase(
      input.externalPurchaseId,
    );

    return {
      ...external,
      amount: input.amount,
      currency: input.currency,
      buyer: {
        id: input.buyerId,
      },
      metadata: {
        ...external.metadata,
        ...input.metadata,
      },
    };
  }
}
