import { describe, expect, it, vi } from "vitest";

import {
  ProcessPurchaseUseCase,
  type ProcessPurchaseDependencies,
} from "@application/use-cases/process-purchase";
import type { Purchase } from "@domain/entities/purchase";

describe("ProcessPurchaseUseCase", () => {
  it("queues purchase and logs audit entry", async () => {
    const purchase: Purchase = {
      id: "internal-id",
      externalId: "ext-1",
      buyer: { id: "buyer-1" },
      amount: 100,
      currency: "RUB",
      items: [
        {
          id: "item-1",
          name: "Service",
          quantity: 1,
          price: 100,
        },
      ],
      purchasedAt: new Date("2024-01-01T00:00:00.000Z"),
      metadata: {},
    };

    const dependencies: ProcessPurchaseDependencies = {
      yclientsAdapter: {
        getPurchase: vi
          .fn<[string], Promise<Purchase>>()
          .mockResolvedValue(purchase),
      },
      premiumBonusAdapter: {
        createPurchase: vi
          .fn<[Purchase], Promise<void>>()
          .mockResolvedValue(undefined),
      },
      auditLogRepository: {
        append: vi
          .fn<
            [
              Parameters<
                ProcessPurchaseDependencies["auditLogRepository"]["append"]
              >[0],
            ],
            Promise<void>
          >()
          .mockResolvedValue(undefined),
      },
      purchaseQueue: {
        enqueue: vi
          .fn<
            [
              Parameters<
                ProcessPurchaseDependencies["purchaseQueue"]["enqueue"]
              >[0],
            ],
            Promise<void>
          >()
          .mockResolvedValue(undefined),
      },
    };

    const useCase = new ProcessPurchaseUseCase(dependencies);

    const result = await useCase.execute({
      externalPurchaseId: "ext-1",
      buyerId: "buyer-1",
      amount: 100,
      currency: "RUB",
      items: purchase.items,
      purchasedAt: new Date("2024-01-01T00:00:00.000Z"),
      metadata: { channel: "test" },
    });

    expect(result.ok).toBe(true);
    expect(
      dependencies.premiumBonusAdapter.createPurchase,
    ).toHaveBeenCalledWith(expect.objectContaining({ externalId: "ext-1" }));
    expect(dependencies.auditLogRepository.append).toHaveBeenCalled();
    expect(dependencies.purchaseQueue.enqueue).toHaveBeenCalled();
  });
});
