import { createHmac, timingSafeEqual } from "node:crypto";

export interface SignatureValidationOptions {
  secret: string;
  payload: string;
  receivedSignature: string;
  algorithm?: "sha256" | "sha512";
}

export function isValidSignature({
  secret,
  payload,
  receivedSignature,
  algorithm = "sha256",
}: SignatureValidationOptions): boolean {
  const computed = createHmac(algorithm, secret)
    .update(payload, "utf8")
    .digest("hex");
  const bufferA = Buffer.from(computed, "hex");
  const bufferB = Buffer.from(receivedSignature, "hex");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
