import { describe, expect, it, vi } from "vitest";
import type { AxiosRequestConfig } from "axios";

import { PremiumBonusAdapter } from "@infrastructure/adapters/premiumbonus/premiumbonus-adapter";
import type { HttpRequestExecutor } from "@infrastructure/adapters/http/http-client";

function createHttpClientMock<T>(
  implementation: (config: AxiosRequestConfig) => Promise<T>,
): { mock: ReturnType<typeof vi.fn>; httpClient: HttpRequestExecutor } {
  const mock = vi.fn(implementation);
  const httpClient: HttpRequestExecutor = {
    request: <R>(config: AxiosRequestConfig) => mock(config) as Promise<R>,
  };

  return { mock, httpClient };
}

describe("PremiumBonusAdapter#isBuyerRegistered", () => {
  it("возвращает true, если PremiumBonus сообщает о регистрации", async () => {
    const { mock: requestMock, httpClient } = createHttpClientMock((config) => {
      expect(config).toMatchObject({
        method: "POST",
        url: "/buyer-info",
        headers: { Authorization: "test-token" },
        data: { identificator: "79139393094" },
      });

      return Promise.resolve({ success: true, is_register: true });
    });
    const adapter = new PremiumBonusAdapter(httpClient, "test-token");

    const result = await adapter.isBuyerRegistered("89139393094");

    expect(result).toBe(true);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("возвращает true, если PremiumBonus использует поле is_registered", async () => {
    const { httpClient } = createHttpClientMock(() =>
      Promise.resolve({ success: true, is_registered: true }),
    );
    const adapter = new PremiumBonusAdapter(httpClient, "test-token");

    const result = await adapter.isBuyerRegistered("89139393094");

    expect(result).toBe(true);
  });

  it("возвращает false, если PremiumBonus сообщает об отсутствии регистрации", async () => {
    const { httpClient } = createHttpClientMock(() =>
      Promise.resolve({ success: true, is_register: false }),
    );
    const adapter = new PremiumBonusAdapter(httpClient, "test-token");

    const result = await adapter.isBuyerRegistered("89139393094");

    expect(result).toBe(false);
  });

  it("возвращает false, если PremiumBonus вернул пустой ответ", async () => {
    const { httpClient } = createHttpClientMock(() =>
      Promise.resolve(undefined),
    );
    const adapter = new PremiumBonusAdapter(httpClient, "test-token");

    const result = await adapter.isBuyerRegistered("89139393094");

    expect(result).toBe(false);
  });
});

describe("PremiumBonusAdapter#registerBuyer", () => {
  it("отправляет корректные поля и возвращает ответ сервиса", async () => {
    const response = {
      success: true,
      is_register: true,
      phone: "79139393094",
      external_id: "ext-1",
    };
    const { mock: requestMock, httpClient } = createHttpClientMock((config) => {
      expect(config).toMatchObject({
        method: "POST",
        url: "/buyer-register",
        headers: { Authorization: "test-token" },
        data: {
          phone: "79139393094",
          name: "Дмитрий",
          email: "user@example.com",
          external_id: "ext-1",
        },
      });

      return Promise.resolve(response);
    });
    const adapter = new PremiumBonusAdapter(httpClient, "test-token");

    const result = await adapter.registerBuyer({
      phone: "89139393094",
      name: "Дмитрий",
      email: "user@example.com",
      externalId: "ext-1",
    });

    expect(result).toEqual(response);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("применяет нормализацию телефона и заполняет только переданные поля", async () => {
    const { mock: requestMock, httpClient } = createHttpClientMock((config) => {
      expect(config.data).toEqual({ phone: "79139393094" });
      return Promise.resolve({ success: true, is_register: true });
    });
    const adapter = new PremiumBonusAdapter(httpClient, "test-token");

    await adapter.registerBuyer({ phone: "+7 (913) 939-30-94" });

    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});
