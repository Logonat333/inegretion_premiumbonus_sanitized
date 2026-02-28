import "dotenv/config";

import axios from "axios";

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

  const payload = {
    phone: "79139393094",
    name: "Дмитрий",
  };

  const paths = [
    "/buyer-register",
    "/pb/buyer-register",
    "/api/buyer-register",
  ];

  for (const path of paths) {
    const url = `${baseUrl.replace(/\/$/, "")}${path}`;
    console.log(`\n➡️  Тестируем ${url}`);
    try {
      const response = await axios.post<unknown>(url, payload, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        timeout: 5000,
        validateStatus: () => true,
      });

      console.log("  ↳ HTTP статус", response.status);
      console.log("  ↳ Ответ:", response.data);
    } catch (error) {
      if (axios.isAxiosError<unknown>(error)) {
        console.error("❌ Axios error", {
          code: error.code,
          message: error.message,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
        });
      } else {
        console.error("❌ Необработанная ошибка", error);
      }
    }
  }
}

void main();
