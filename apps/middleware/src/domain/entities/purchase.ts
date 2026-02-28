import type { Buyer } from "@domain/entities/buyer";

export interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Purchase {
  id: string;
  externalId: string;
  buyer: Buyer;
  amount: number;
  currency: string;
  items: PurchaseItem[];
  purchasedAt: Date;
  metadata?: Record<string, unknown>;
}
