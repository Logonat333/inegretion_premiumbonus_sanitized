import { z } from "zod";

export const purchaseItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const createPurchaseSchema = z.object({
  externalPurchaseId: z.string().min(1),
  buyerId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  items: z.array(purchaseItemSchema).min(1),
  purchasedAt: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreatePurchaseRequestDto = z.infer<typeof createPurchaseSchema>;

export const createPurchaseResponseSchema = z.object({
  status: z.literal("queued"),
  traceId: z.string().uuid(),
  requestId: z.string().uuid(),
});

export type CreatePurchaseResponseDto = z.infer<
  typeof createPurchaseResponseSchema
>;
