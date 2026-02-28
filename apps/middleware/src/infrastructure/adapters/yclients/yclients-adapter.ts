import type { AxiosRequestConfig } from "axios";

import type { Purchase } from "@domain/entities/purchase";
import { HttpClient } from "@infrastructure/adapters/http/http-client";
import { AppError } from "@shared/errors/app-error";

export interface YClientsPurchaseResponse {
  id: string;
  total_sum: number;
  currency: string;
  client_id: string;
  items: Array<{
    id: string;
    goods_title: string;
    quantity: number;
    price: number;
  }>;
  date: string;
  metadata?: Record<string, unknown>;
}

export class YClientsAdapter {
  private readonly token: string;

  constructor(
    private readonly http: HttpClient,
    token: string,
  ) {
    this.token = token;
  }

  async getPurchase(externalPurchaseId: string): Promise<Purchase> {
    const request: AxiosRequestConfig = {
      method: "GET",
      url: `/purchases/${externalPurchaseId}`,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };

    const data = await this.http.request<YClientsPurchaseResponse>(request);

    if (!data) {
      throw new AppError({
        message: "Purchase not found in YClients",
        code: "UPSTREAM_4XX",
        statusCode: 404,
      });
    }

    return {
      id: data.id,
      externalId: externalPurchaseId,
      buyer: {
        id: data.client_id,
      },
      amount: data.total_sum,
      currency: data.currency,
      items: data.items.map((item) => ({
        id: item.id,
        name: item.goods_title,
        quantity: item.quantity,
        price: item.price,
      })),
      purchasedAt: new Date(data.date),
      metadata: data.metadata,
    };
  }
}
