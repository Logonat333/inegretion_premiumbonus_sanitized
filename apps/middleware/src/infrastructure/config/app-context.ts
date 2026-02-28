import { HttpClient } from "@infrastructure/adapters/http/http-client";
import { PremiumBonusAdapter } from "@infrastructure/adapters/premiumbonus/premiumbonus-adapter";
import { YClientsAdapter } from "@infrastructure/adapters/yclients/yclients-adapter";
import { PurchaseQueue } from "@infrastructure/persistence/redis/purchase-queue";
import { AuditLogRepository } from "@infrastructure/persistence/postgres/audit-log-repository";
import { getPostgresPool } from "@infrastructure/persistence/postgres/postgres-client";

import type { AppConfig } from "./config";

export interface AppContext {
  yclientsAdapter: YClientsAdapter;
  premiumBonusAdapter: PremiumBonusAdapter;
  purchaseQueue: PurchaseQueue;
  auditLogRepository: AuditLogRepository;
}

let cachedContext: AppContext | null = null;

export function createAppContext(config: AppConfig): AppContext {
  if (cachedContext) {
    return cachedContext;
  }

  if (config.env === "test") {
    cachedContext = {
      yclientsAdapter: {
        getPurchase: (externalId: string) =>
          Promise.resolve({
            id: externalId,
            externalId,
            amount: 0,
            currency: "RUB",
            buyer: { id: "test-buyer" },
            items: [
              {
                id: "test-item",
                name: "Test Item",
                quantity: 1,
                price: 0,
              },
            ],
            purchasedAt: new Date(),
          }),
      } as unknown as YClientsAdapter,
      premiumBonusAdapter: {
        createPurchase: () => Promise.resolve(),
      } as unknown as PremiumBonusAdapter,
      purchaseQueue: {
        enqueue: () => Promise.resolve(),
      } as unknown as PurchaseQueue,
      auditLogRepository: {
        append: () => Promise.resolve(),
      } as unknown as AuditLogRepository,
    };

    return cachedContext;
  }

  const yclientsClient = new HttpClient({
    baseURL: config.externalApis.yclients.baseUrl,
    timeoutMs: 5_000,
    maxRetries: 3,
  });
  const premiumBonusClient = new HttpClient({
    baseURL: config.externalApis.premiumBonus.baseUrl,
    timeoutMs: 5_000,
    maxRetries: 3,
  });

  const yclientsAdapter = new YClientsAdapter(
    yclientsClient,
    config.externalApis.yclients.userToken,
  );
  const premiumBonusAdapter = new PremiumBonusAdapter(
    premiumBonusClient,
    config.externalApis.premiumBonus.token,
  );
  const purchaseQueue = PurchaseQueue.create(config);
  const pool = getPostgresPool(config);
  const auditLogRepository = new AuditLogRepository(pool, config);

  cachedContext = {
    yclientsAdapter,
    premiumBonusAdapter,
    purchaseQueue,
    auditLogRepository,
  };

  return cachedContext;
}
