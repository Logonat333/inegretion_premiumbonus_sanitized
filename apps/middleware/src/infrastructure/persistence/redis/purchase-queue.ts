import { Queue } from "bullmq";

import type { Purchase } from "@domain/entities/purchase";
import type { AppConfig } from "@infrastructure/config/config";
import { AppError } from "@shared/errors/app-error";

export interface PurchaseQueueJob {
  purchase: Purchase;
}

export class PurchaseQueue {
  private constructor(private readonly queue: Queue<PurchaseQueueJob>) {}

  static create(config: AppConfig): PurchaseQueue {
    const queue = new Queue<PurchaseQueueJob>(config.queue.name, {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        username: config.redis.username,
        password: config.redis.password,
        tls: config.redis.tls ? {} : undefined,
      },
      prefix: config.redis.keyPrefix,
      defaultJobOptions: {
        attempts: config.queue.attempts,
        backoff: {
          type: "exponential",
          delay: config.queue.backoffDelayMs,
        },
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    });

    return new PurchaseQueue(queue);
  }

  async enqueue(job: PurchaseQueueJob): Promise<void> {
    try {
      await this.queue.add("process-purchase", job, {
        jobId: job.purchase.externalId,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        /jobid|already exists/i.test(error.message)
      ) {
        throw new AppError({
          message: "Purchase already queued",
          code: "VALIDATION",
          statusCode: 409,
          cause: error,
        });
      }

      throw error;
    }
  }
}
