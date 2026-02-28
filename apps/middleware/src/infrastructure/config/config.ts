import "dotenv/config";

import { z } from "zod";

export type RuntimeEnvironment = "development" | "test" | "production";
export type AppEnvironmentProfile = "local" | "dev" | "stage" | "prod";

interface ProfileSettings {
  swaggerUIEnabled: boolean;
  exposeOpenApiJson: boolean;
  maskErrorDetails: boolean;
  requestLogging: "silent" | "standard";
}

const profileSettings: Record<AppEnvironmentProfile, ProfileSettings> = {
  local: {
    swaggerUIEnabled: true,
    exposeOpenApiJson: true,
    maskErrorDetails: false,
    requestLogging: "standard",
  },
  dev: {
    swaggerUIEnabled: true,
    exposeOpenApiJson: true,
    maskErrorDetails: true,
    requestLogging: "standard",
  },
  stage: {
    swaggerUIEnabled: false,
    exposeOpenApiJson: false,
    maskErrorDetails: true,
    requestLogging: "standard",
  },
  prod: {
    swaggerUIEnabled: false,
    exposeOpenApiJson: false,
    maskErrorDetails: true,
    requestLogging: "silent",
  },
};

const configSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: z.enum(["local", "dev", "stage", "prod"]).default("local"),
  SERVICE_NAME: z.string().default("middleware-service"),
  PORT: z.coerce.number().default(3000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(60),
  ALLOWED_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
  TRACING_ENABLED: z.string().optional(),
  YCLIENTS_API_BASE_URL: z.string().url(),
  YCLIENTS_USER_TOKEN: z.string().min(1),
  PREMIUMBONUS_API_BASE_URL: z.string().url(),
  PREMIUMBONUS_TOKEN: z.string().min(1),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  REDIS_KEY_PREFIX: z.string().default("pb:"),
  POSTGRES_CONNECTION_STRING: z
    .string()
    .url("Expected postgres connection string"),
  POSTGRES_SCHEMA: z.string().default("public"),
  QUEUE_NAME: z.string().default("purchases"),
  QUEUE_ATTEMPTS: z.coerce.number().default(3),
  QUEUE_BACKOFF_DELAY_MS: z.coerce.number().default(2000),
  SECRET_PROVIDER: z.enum(["env", "vault", "aws"]).default("env"),
  VAULT_ADDR: z.string().url().optional(),
  VAULT_ROLE_ID: z.string().optional(),
  VAULT_SECRET_ID: z.string().optional(),
  VAULT_SECRET_PATH: z.string().optional(),
  VAULT_TOKEN: z.string().optional(),
  VAULT_NAMESPACE: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_SECRET_ID: z.string().optional(),
});

export interface AppConfig {
  env: RuntimeEnvironment;
  profile: AppEnvironmentProfile;
  serviceName: string;
  http: {
    port: number;
    rateLimit: {
      windowMs: number;
      max: number;
    };
    swagger: {
      uiEnabled: boolean;
      exposeJson: boolean;
    };
  };
  security: {
    allowedOrigins: string[];
    maskErrorDetails: boolean;
  };
  externalApis: {
    yclients: {
      baseUrl: string;
      userToken: string;
    };
    premiumBonus: {
      baseUrl: string;
      token: string;
    };
  };
  redis: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    tls: boolean;
    keyPrefix: string;
  };
  postgres: {
    connectionString: string;
    schema: string;
  };
  queue: {
    name: string;
    attempts: number;
    backoffDelayMs: number;
  };
  secrets: {
    provider: "env" | "vault" | "aws";
    vault?: {
      address: string;
      roleId?: string;
      secretId?: string;
      path?: string;
      namespace?: string;
      token?: string;
    };
    aws?: {
      region?: string;
      secretId?: string;
    };
  };
  observability: {
    logLevel: string;
    tracingEnabled: boolean;
    requestLogging: "silent" | "standard";
  };
}

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = configSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.toString()}`);
  }

  const {
    NODE_ENV,
    APP_ENV,
    SERVICE_NAME,
    PORT,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
    ALLOWED_ORIGINS,
    LOG_LEVEL,
    TRACING_ENABLED,
    YCLIENTS_API_BASE_URL,
    YCLIENTS_USER_TOKEN,
    PREMIUMBONUS_API_BASE_URL,
    PREMIUMBONUS_TOKEN,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_USERNAME,
    REDIS_PASSWORD,
    REDIS_TLS,
    REDIS_KEY_PREFIX,
    POSTGRES_CONNECTION_STRING,
    POSTGRES_SCHEMA,
    QUEUE_NAME,
    QUEUE_ATTEMPTS,
    QUEUE_BACKOFF_DELAY_MS,
    SECRET_PROVIDER,
    VAULT_ADDR,
    VAULT_ROLE_ID,
    VAULT_SECRET_ID,
    VAULT_SECRET_PATH,
    VAULT_TOKEN,
    VAULT_NAMESPACE,
    AWS_REGION,
    AWS_SECRET_ID,
  } = parsed.data;

  if (SECRET_PROVIDER === "vault" && !VAULT_ADDR) {
    throw new Error("VAULT_ADDR must be provided when SECRET_PROVIDER=vault");
  }

  const profile = APP_ENV;
  const settings = profileSettings[profile];

  cachedConfig = {
    env: NODE_ENV,
    profile,
    serviceName: SERVICE_NAME,
    http: {
      port: PORT,
      rateLimit: {
        windowMs: RATE_LIMIT_WINDOW_MS,
        max: RATE_LIMIT_MAX,
      },
      swagger: {
        uiEnabled: settings.swaggerUIEnabled,
        exposeJson: settings.exposeOpenApiJson,
      },
    },
    security: {
      allowedOrigins: ALLOWED_ORIGINS
        ? ALLOWED_ORIGINS.split(",")
            .map((origin) => origin.trim())
            .filter(Boolean)
        : [],
      maskErrorDetails: settings.maskErrorDetails,
    },
    externalApis: {
      yclients: {
        baseUrl: YCLIENTS_API_BASE_URL,
        userToken: YCLIENTS_USER_TOKEN,
      },
      premiumBonus: {
        baseUrl: PREMIUMBONUS_API_BASE_URL,
        token: PREMIUMBONUS_TOKEN,
      },
    },
    redis: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      username: REDIS_USERNAME,
      password: REDIS_PASSWORD,
      tls: Boolean(REDIS_TLS),
      keyPrefix: REDIS_KEY_PREFIX,
    },
    postgres: {
      connectionString: POSTGRES_CONNECTION_STRING,
      schema: POSTGRES_SCHEMA,
    },
    queue: {
      name: QUEUE_NAME,
      attempts: QUEUE_ATTEMPTS,
      backoffDelayMs: QUEUE_BACKOFF_DELAY_MS,
    },
    secrets: {
      provider: SECRET_PROVIDER,
      vault:
        SECRET_PROVIDER === "vault"
          ? {
              address: VAULT_ADDR ?? "",
              roleId: VAULT_ROLE_ID,
              secretId: VAULT_SECRET_ID,
              path: VAULT_SECRET_PATH,
              namespace: VAULT_NAMESPACE,
              token: VAULT_TOKEN,
            }
          : undefined,
      aws:
        SECRET_PROVIDER === "aws"
          ? {
              region: AWS_REGION,
              secretId: AWS_SECRET_ID,
            }
          : undefined,
    },
    observability: {
      logLevel: LOG_LEVEL,
      tracingEnabled: TRACING_ENABLED === "true",
      requestLogging: settings.requestLogging,
    },
  } as const;

  return cachedConfig;
}
