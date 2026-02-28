import { Pool } from "pg";
import type { PoolConfig } from "pg";

import type { AppConfig } from "@infrastructure/config/config";

let pool: Pool | null = null;

export function getPostgresPool(config: AppConfig): Pool {
  if (pool) {
    return pool;
  }

  const poolConfig: PoolConfig = {
    connectionString: config.postgres.connectionString,
    max: 10,
    statement_timeout: 5_000,
    idleTimeoutMillis: 30_000,
    application_name: config.serviceName,
  };

  pool = new Pool(poolConfig);

  return pool;
}
