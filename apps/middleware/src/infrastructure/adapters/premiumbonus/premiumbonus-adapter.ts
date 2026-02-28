import type { AxiosRequestConfig } from "axios";

import type { Purchase } from "@domain/entities/purchase";
import type { HttpRequestExecutor } from "@infrastructure/adapters/http/http-client";

interface BuyerInfoResponse {
  success: boolean;
  is_register?: boolean;
  is_registered?: boolean;
  blocked?: boolean;
  phone?: string;
  external_id?: string;
}

export interface RegisterBuyerPayload {
  phone?: string;
  referralCode?: string;
  cardNumber?: string;
  surname?: string;
  name?: string;
  middleName?: string;
  birthDate?: string;
  gender?: "male" | "female";
  email?: string;
  child1BirthDate?: string;
  child1Name?: string;
  child1Gender?: "male" | "female";
  child2BirthDate?: string;
  child2Name?: string;
  child2Gender?: "male" | "female";
  child3BirthDate?: string;
  child3Name?: string;
  child3Gender?: "male" | "female";
  child4BirthDate?: string;
  child4Name?: string;
  child4Gender?: "male" | "female";
  registrationChannel?: string;
  registrationPoint?: string;
  groupId?: string;
  cityId?: string;
  phoneChecked?: boolean;
  refusedReceiveMessages?: boolean;
  refusedReceiveEmails?: boolean;
  agreedReceiveElectronicReceipt?: boolean;
  initPurchaseCount?: number;
  initPaymentAmount?: number;
  cashierName?: string;
  externalId?: string;
  promocode?: string;
}

interface RegisterBuyerResponse {
  success: boolean;
  is_register?: boolean;
  is_registered?: boolean;
  phone?: string;
  external_id?: string;
}

export class PremiumBonusAdapter {
  private readonly token: string;

  constructor(
    private readonly http: HttpRequestExecutor,
    token: string,
  ) {
    this.token = token;
  }

  async createPurchase(purchase: Purchase): Promise<void> {
    const payload = {
      externalPurchaseId: purchase.externalId,
      amount: purchase.amount,
      currency: purchase.currency,
      buyerId: purchase.buyer.id,
      purchasedAt: purchase.purchasedAt.toISOString(),
      items: purchase.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      metadata: purchase.metadata ?? {},
    };

    const request: AxiosRequestConfig = {
      method: "POST",
      url: "/purchases",
      headers: {
        Authorization: this.token,
      },
      data: payload,
    };

    await this.http.request(request);
  }

  async isBuyerRegistered(buyerId: string): Promise<boolean> {
    const request: AxiosRequestConfig = {
      method: "POST",
      url: "/buyer-info",
      headers: {
        Authorization: this.token,
      },
      data: {
        identificator: this.normalizePhone(buyerId),
      },
    };

    const response = await this.http.request<BuyerInfoResponse | null>(request);

    return Boolean(response?.is_register ?? response?.is_registered);
  }

  async registerBuyer(
    payload: RegisterBuyerPayload,
  ): Promise<RegisterBuyerResponse> {
    const request: AxiosRequestConfig = {
      method: "POST",
      url: "/buyer-register",
      headers: {
        Authorization: this.token,
      },
      data: this.buildRegisterBody(payload),
    };

    return this.http.request<RegisterBuyerResponse>(request);
  }

  private buildRegisterBody(
    payload: RegisterBuyerPayload,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    const normalizedPhone = payload.phone
      ? this.normalizePhone(payload.phone)
      : undefined;
    if (normalizedPhone) {
      body.phone = normalizedPhone;
    }

    const mapping: Partial<Record<keyof RegisterBuyerPayload, string>> = {
      referralCode: "referral_code",
      cardNumber: "card_number",
      surname: "surname",
      name: "name",
      middleName: "middle_name",
      birthDate: "birth_date",
      gender: "gender",
      email: "email",
      child1BirthDate: "child1_birth_date",
      child1Name: "child1_name",
      child1Gender: "child1_gender",
      child2BirthDate: "child2_birth_date",
      child2Name: "child2_name",
      child2Gender: "child2_gender",
      child3BirthDate: "child3_birth_date",
      child3Name: "child3_name",
      child3Gender: "child3_gender",
      child4BirthDate: "child4_birth_date",
      child4Name: "child4_name",
      child4Gender: "child4_gender",
      registrationChannel: "registration_channel",
      registrationPoint: "registration_point",
      groupId: "group_id",
      cityId: "city_id",
      phoneChecked: "phone_checked",
      refusedReceiveMessages: "is_refused_receive_messages",
      refusedReceiveEmails: "is_refused_receive_emails",
      agreedReceiveElectronicReceipt: "is_agreed_receive_electronic_receipt",
      initPurchaseCount: "init_purchase_count",
      initPaymentAmount: "init_payment_amount",
      cashierName: "cashier_name",
      externalId: "external_id",
      promocode: "promocode",
    };

    (Object.keys(mapping) as Array<keyof RegisterBuyerPayload>).forEach(
      (key) => {
        const value = payload[key];
        const field = mapping[key];
        if (value !== undefined && field) {
          body[field] = value;
        }
      },
    );

    return body;
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("8")) {
      return `7${digits.slice(1)}`;
    }

    if (digits.length === 11 && digits.startsWith("7")) {
      return digits;
    }

    return digits || phone;
  }
}
