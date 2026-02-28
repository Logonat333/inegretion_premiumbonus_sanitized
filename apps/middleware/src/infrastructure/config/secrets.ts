import axios, { type AxiosInstance } from "axios";

import type { AppConfig } from "@infrastructure/config/config";

export interface SecretProvider {
  getSecret(key: string): Promise<string | undefined>;
}

interface VaultLoginResponse {
  auth?: {
    client_token?: string;
  };
}

class EnvironmentSecretProvider implements SecretProvider {
  getSecret(key: string): Promise<string | undefined> {
    return Promise.resolve(process.env[key]);
  }
}

class VaultSecretProvider implements SecretProvider {
  private readonly client: AxiosInstance;
  private readonly basePath?: string;
  private readonly cache = new Map<string, Record<string, unknown>>();
  private token?: string;
  private authPromise: Promise<void> | null = null;

  private static readonly DEFAULT_TIMEOUT_MS = 5000;

  constructor(
    private readonly options: NonNullable<AppConfig["secrets"]["vault"]>,
  ) {
    const baseUrl = this.normalizeBaseUrl(options.address);
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: VaultSecretProvider.DEFAULT_TIMEOUT_MS,
    });

    if (options.namespace) {
      this.client.defaults.headers.common["X-Vault-Namespace"] =
        options.namespace;
    }

    if (options.token) {
      this.token = options.token;
    }

    this.basePath = options.path;
  }

  private normalizeBaseUrl(address: string): string {
    const trimmed = address.endsWith("/") ? address.slice(0, -1) : address;
    return `${trimmed}/v1/`;
  }

  private async authenticate(): Promise<void> {
    if (this.token) {
      return;
    }

    if (this.authPromise) {
      await this.authPromise;
      return;
    }

    this.authPromise = (async () => {
      const envToken = process.env.VAULT_TOKEN;
      if (envToken) {
        this.token = envToken;
        return;
      }

      const { roleId, secretId } = this.options;
      if (roleId && secretId) {
        const loginClient = axios.create({
          baseURL: this.client.defaults.baseURL,
          timeout: VaultSecretProvider.DEFAULT_TIMEOUT_MS,
          headers: this.options.namespace
            ? { "X-Vault-Namespace": this.options.namespace }
            : undefined,
        });

        const response = await loginClient.post<VaultLoginResponse>(
          "auth/approle/login",
          {
            role_id: roleId,
            secret_id: secretId,
          },
        );

        const token = response.data?.auth?.client_token;
        if (!token) {
          throw new Error(
            "Vault AppRole authentication did not return a client token",
          );
        }

        this.token = token;
        return;
      }

      throw new Error(
        "Vault token is not available. Configure AppRole credentials or VAULT_TOKEN.",
      );
    })();

    await this.authPromise;
  }

  private static unwrapSecretData(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object") {
      return {};
    }

    const data = value as Record<string, unknown>;

    if ("data" in data && typeof data.data === "object" && data.data !== null) {
      return data.data as Record<string, unknown>;
    }

    return data;
  }

  private sanitizePath(path: string): string {
    return path.replace(/^\//, "");
  }

  private async readPath(
    path: string,
    retry = true,
  ): Promise<Record<string, unknown>> {
    const cached = this.cache.get(path);
    if (cached) {
      return cached;
    }

    await this.authenticate();

    try {
      const response = await this.client.get<unknown>(this.sanitizePath(path), {
        headers: this.token ? { "X-Vault-Token": this.token } : undefined,
      });

      const vaultTokenCandidate = response.headers.get?.(
        "x-vault-token",
      ) as unknown;
      if (
        typeof vaultTokenCandidate === "string" &&
        vaultTokenCandidate.length > 0
      ) {
        this.token = vaultTokenCandidate;
      }

      const content = VaultSecretProvider.unwrapSecretData(response.data);
      this.cache.set(path, content);
      return content;
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        retry
      ) {
        this.token = undefined;
        this.authPromise = null;
        return this.readPath(path, false);
      }
      throw error;
    }
  }

  async getSecret(key: string): Promise<string | undefined> {
    const path = this.basePath ? this.basePath : key;
    const entry = await this.readPath(path);

    if (this.basePath) {
      const raw = entry[key];
      return typeof raw === "string"
        ? raw
        : raw
          ? JSON.stringify(raw)
          : undefined;
    }

    const raw = entry.value ?? entry[key];
    return typeof raw === "string"
      ? raw
      : raw
        ? JSON.stringify(raw)
        : undefined;
  }
}

export function createSecretProvider(config: AppConfig): SecretProvider {
  switch (config.secrets.provider) {
    case "vault":
      if (!config.secrets.vault) {
        throw new Error("Vault configuration is missing");
      }
      return new VaultSecretProvider(config.secrets.vault);
    case "aws":
      // TODO: интеграция с AWS Secrets Manager.
      return new EnvironmentSecretProvider();
    case "env":
    default:
      return new EnvironmentSecretProvider();
  }
}
