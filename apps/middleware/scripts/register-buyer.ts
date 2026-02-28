import "dotenv/config";

import { HttpClient } from "@infrastructure/adapters/http/http-client";
import { PremiumBonusAdapter } from "@infrastructure/adapters/premiumbonus/premiumbonus-adapter";
import { AppError } from "@shared/errors/app-error";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Переменная окружения ${name} не задана`);
  }
  return value;
}

async function main(): Promise<void> {
  const baseUrl = requireEnv("PREMIUMBONUS_API_BASE_URL");
  const token = requireEnv("PREMIUMBONUS_TOKEN");

  const phone = process.argv[2] ?? "89139393094";
  const name = process.argv[3] ?? "Дмитрий";
  const externalId = process.argv[4];

  const http = new HttpClient({
    baseURL: baseUrl,
    timeoutMs: 5_000,
    maxRetries: 1,
  });

  const adapter = new PremiumBonusAdapter(http, token);

  console.log("➡️  Регистрируем покупателя в PremiumBonus", {
    phone,
    name,
    externalId,
  });
  const registerResult = await adapter.registerBuyer({
    phone,
    name,
    ...(externalId ? { externalId } : {}),
  });

  console.log("✅ Ответ registerBuyer:", registerResult);

  console.log("➡️  Проверяем статус регистрации через buyer-info");
  const registered = await adapter.isBuyerRegistered(phone);

  console.log(
    "ℹ️  Статус регистрации:",
    registered ? "зарегистрирован" : "не найден",
  );
}

main().catch((error) => {
  if (error instanceof AppError) {
    console.error("❌ Ошибка PremiumBonus", {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      cause: error.cause,
    });
  } else {
    console.error("❌ Необработанная ошибка", error);
  }
  process.exit(1);
});
