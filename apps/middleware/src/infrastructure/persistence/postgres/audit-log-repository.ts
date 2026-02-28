import type { Pool } from "pg";

import type { Purchase } from "@domain/entities/purchase";
import type { AppConfig } from "@infrastructure/config/config";

export interface AuditLogEntry {
  purchase: Purchase;
  source: "premiumbonus";
}

export class AuditLogRepository {
  private readonly schema: string;

  constructor(
    private readonly pool: Pool,
    config: AppConfig,
  ) {
    this.schema = config.postgres.schema;
  }

  async append(entry: AuditLogEntry): Promise<void> {
    const query = `
      INSERT INTO ${this.schema}.audit_logs (external_purchase_id, payload, source)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (external_purchase_id, source) DO NOTHING
    `;

    await this.pool.query(query, [
      entry.purchase.externalId,
      JSON.stringify(entry.purchase),
      entry.source,
    ]);
  }
}
