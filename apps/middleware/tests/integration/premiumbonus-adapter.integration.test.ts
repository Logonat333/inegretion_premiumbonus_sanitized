import { describe, expect, it, vi } from "vitest";

import type { AxiosRequestConfig } from "axios";

import { PremiumBonusAdapter } from "@infrastructure/adapters/premiumbonus/premiumbonus-adapter";
import type { HttpRequestExecutor } from "@infrastructure/adapters/http/http-client";

describe("PremiumBonusAdapter — интеграция с PremiumBonus API", () => {
  it("регистрирует нового клиента через buyer-register", async () => {
    const response = { success: true, is_register: true, phone: "79139393094" };
    const requestImpl = (config: AxiosRequestConfig) => {
      expect(config).toMatchObject({
        method: "POST",
        url: "/buyer-register",
        headers: { Authorization: "test-token" },
      });

      expect(config?.data).toStrictEqual({
        phone: "79139393094",
        name: "Дмитрий",
      });

      return Promise.resolve(response);
    };
    const requestMock = vi.fn(requestImpl);
    const httpClient: HttpRequestExecutor = {
      request: <T>(config: AxiosRequestConfig) =>
        requestMock(config) as Promise<T>,
    };

    const adapter = new PremiumBonusAdapter(httpClient, "test-token");

    const result = await adapter.registerBuyer({
      phone: "89139393094",
      name: "Дмитрий",
    });

    expect(result).toEqual(response);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("получает информацию по клиенту через buyer-info", async () => {
    const requestImpl = (config: AxiosRequestConfig) => {
      expect(config).toMatchObject({
        method: "POST",
        url: "/buyer-info",
        headers: { Authorization: "test-token" },
        data: { identificator: "79139393094" },
      });

      return Promise.resolve({ success: true, is_register: true });
    };
    const requestMock = vi.fn(requestImpl);
    const httpClient: HttpRequestExecutor = {
      request: <T>(config: AxiosRequestConfig) =>
        requestMock(config) as Promise<T>,
    };

    const adapter = new PremiumBonusAdapter(httpClient, "test-token");

    const registered = await adapter.isBuyerRegistered("89139393094");

    expect(registered).toBe(true);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});
