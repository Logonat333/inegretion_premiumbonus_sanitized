import { HttpClient } from "@infrastructure/adapters/http/http-client";
import { PremiumBonusAdapter } from "@infrastructure/adapters/premiumbonus/premiumbonus-adapter";
import { PurchaseQueue } from "@infrastructure/persistence/redis/purchase-queue";
import { AuditLogRepository } from "@infrastructure/persistence/postgres/audit-log-repository";
import { getPostgresPool } from "@infrastructure/persistence/postgres/postgres-client";

import type { AppConfig } from "./config";

export interface AppContext {
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

  const premiumBonusClient = new HttpClient({
    baseURL: config.externalApis.premiumBonus.baseUrl,
    timeoutMs: 5_000,
    maxRetries: 3,
  });

  const premiumBonusAdapter = new PremiumBonusAdapter(
    premiumBonusClient,
    config.externalApis.premiumBonus.token,
  );
  const purchaseQueue = PurchaseQueue.create(config);
  const pool = getPostgresPool(config);
  const auditLogRepository = new AuditLogRepository(pool, config);

  cachedContext = {
    premiumBonusAdapter,
    purchaseQueue,
    auditLogRepository,
  };

  return cachedContext;
}
