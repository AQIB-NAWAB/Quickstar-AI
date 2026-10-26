import { createPublicKey, verify as verifySignature, type KeyObject } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AvailablePhoneNumber, PhoneNumberType } from "@quickstart/contracts";
import type {
  TelnyxFqdn,
  TelnyxFqdnConnection,
  TelnyxNumberOrder,
  TelnyxNumbersClient,
  TelnyxOwnedNumber,
  TelnyxOrderStatus,
  TelnyxSearchNumbersInput,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.telnyx.com/v2";
const DEFAULT_TIMEOUT_MS = 20_000;

type TelnyxClientOptions = {
  apiKey: string;
  publicKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  webhookToleranceSec?: number;
  now?: () => number;
};

type TelnyxErrorBody = {
  errors?: Array<{ code?: string; title?: string; detail?: string }>;
};

type SearchNumberRaw = {
  phone_number?: string;
  phone_number_type?: string;
  national_destination_code?: string;
  locality?: string;
  region_information?: Array<{ region_name?: string; region_type?: string }>;
  cost_information?: {
    upfront_cost?: string;
    monthly_cost?: string;
    currency?: string;
  };
  features?: Array<{ name?: string }>;
};

type OwnedNumberRaw = {
  id?: string;
  phone_number?: string;
  connection_id?: string | null;
  status?: string;
  country_code?: string;
  phone_number_type?: string;
  number_type?: string;
  region?: { region_name?: string } | string | null;
  locality?: string | null;
  cost_information?: {
    monthly_cost?: string;
    currency?: string;
  };
  features?: Array<{ name?: string }>;
};

type OrderRaw = {
  id?: string;
  status?: string;
  phone_numbers?: Array<{ id?: string; phone_number?: string }>;
  error?: string;
  errors?: Array<{ detail?: string; title?: string }>;
};

function asNumberType(raw: string | null | undefined): PhoneNumberType {
  const value = (raw ?? "").toLowerCase();
  if (value === "local" || value === "national" || value === "toll_free" || value === "mobile") {
    return value;
  }
  return "local";
}

function money(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function regionOf(value: OwnedNumberRaw["region"]): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.region_name ?? null;
}

function errorDetail(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as TelnyxErrorBody;
    const first = parsed.errors?.[0];
    if (first) {
      return [first.title, first.detail].filter(Boolean).join(": ") || `HTTP ${status}`;
    }
  } catch {
    // fall through
  }
  return body.trim().slice(0, 240) || `HTTP ${status}`;
}

/**
 * Minimal purpose-built Telnyx v2 client for the numbers API.
 *
 * We deliberately keep this as injectable fetch + plain objects instead of the
 * vendor SDK: the voice service only needs number search/order/FQDN provisioning,
 * and tests must run without network access.
 */
export class TelnyxClient implements TelnyxNumbersClient {
  readonly kind = "telnyx" as const;
  readonly apiKey: string;
  private readonly publicKey?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly webhookToleranceSec: number;
  private readonly now: () => number;

  constructor(options: TelnyxClientOptions) {
    this.apiKey = options.apiKey;
    this.publicKey = options.publicKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.webhookToleranceSec = options.webhookToleranceSec ?? 300;
    this.now = options.now ?? Date.now;
  }

  async searchAvailableNumbers(input: TelnyxSearchNumbersInput): Promise<AvailablePhoneNumber[]> {
    const query: Record<string, string> = {
      "filter[country_code]": (input.countryCode ?? "US").toUpperCase(),
      "page[size]": String(Math.min(Math.max(input.limit ?? 20, 1), 100)),
    };
    if (input.areaCode) query["filter[national_destination_code]"] = input.areaCode;
    if (input.locality) query["filter[locality]"] = input.locality;
    if (input.state) query["filter[administrative_area]"] = input.state;
    if (input.numberType) query["filter[phone_number_type]"] = input.numberType;

    const data = await this.request<SearchNumberRaw[]>("GET", "/available_phone_numbers", {
      query,
    });
    return data
      .filter((item): item is SearchNumberRaw & { phone_number: string } =>
        Boolean(item.phone_number),
      )
      .map((item) => ({
        phone_number: item.phone_number,
        country_code: (input.countryCode ?? "US").toUpperCase(),
        number_type: asNumberType(item.phone_number_type),
        region: item.region_information?.[0]?.region_name ?? null,
        locality: item.locality ?? null,
        area_code: item.national_destination_code ?? null,
        monthly_cost: money(item.cost_information?.monthly_cost),
        upfront_cost: money(item.cost_information?.upfront_cost),
        currency: item.cost_information?.currency ?? "USD",
        features: (item.features ?? []).map((feature) => feature.name ?? "").filter(Boolean),
      }));
  }

  async listOwnedNumbers(): Promise<TelnyxOwnedNumber[]> {
    const data = await this.request<OwnedNumberRaw[]>("GET", "/phone_numbers", {
      query: { "page[size]": "250" },
    });
    return data
      .filter((item): item is OwnedNumberRaw & { id: string; phone_number: string } =>
        Boolean(item.id && item.phone_number),
      )
      .map((item) => ({
        id: item.id,
        phoneNumber: item.phone_number,
        connectionId: item.connection_id ?? null,
        status: item.status ?? "active",
        countryCode: item.country_code ?? null,
        numberType: asNumberType(item.phone_number_type ?? item.number_type),
        region: regionOf(item.region),
        locality: item.locality ?? null,
        monthlyCost: money(item.cost_information?.monthly_cost),
        currency: item.cost_information?.currency ?? null,
        features: (item.features ?? []).map((feature) => feature.name ?? "").filter(Boolean),
      }));
  }

  async createNumberOrder(
    e164s: string[],
    connectionId?: string,
    customerReference?: string,
  ): Promise<TelnyxNumberOrder> {
    const body: Record<string, unknown> = {
      phone_numbers: e164s.map((phone_number) => ({ phone_number })),
    };
    if (connectionId) body.connection_id = connectionId;
    if (customerReference) body.customer_reference = customerReference;

    const data = await this.request<OrderRaw>("POST", "/number_orders", { body });
    return this.mapOrder(data);
  }

  async getNumberOrder(orderId: string): Promise<TelnyxNumberOrder> {
    const data = await this.request<OrderRaw>(
      "GET",
      `/number_orders/${encodeURIComponent(orderId)}`,
    );
    return this.mapOrder(data);
  }

  async createFqdnConnection(name: string): Promise<TelnyxFqdnConnection> {
    const data = await this.request<{ id?: string; connection_name?: string }>(
      "POST",
      "/fqdn_connections",
      {
        body: {
          active: true,
          anchorsite_override: "Latency",
          connection_name: name,
          inbound: {
            ani_number_format: "+E.164",
            dnis_number_format: "+e164",
          },
          transport_protocol: "TCP",
        },
      },
    );
    if (!data.id) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Telnyx did not return an FQDN connection id",
      });
    }
    return { id: data.id, connectionName: data.connection_name ?? name };
  }

  async createFqdn(connectionId: string, fqdn: string): Promise<TelnyxFqdn> {
    const data = await this.request<{ id?: string; fqdn?: string; connection_id?: string }>(
      "POST",
      "/fqdns",
      {
        body: {
          connection_id: connectionId,
          fqdn,
          port: 5060,
          dns_record_type: "a",
        },
      },
    );
    if (!data.id) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Telnyx did not return an FQDN id",
      });
    }
    return {
      id: data.id,
      fqdn: data.fqdn ?? fqdn,
      connectionId: data.connection_id ?? connectionId,
    };
  }

  async assignNumberToConnection(
    numberId: string,
    connectionId: string,
  ): Promise<TelnyxOwnedNumber> {
    const data = await this.request<OwnedNumberRaw>(
      "PATCH",
      `/phone_numbers/${encodeURIComponent(numberId)}`,
      { body: { id: numberId, connection_id: connectionId } },
    );
    return {
      id: data.id ?? numberId,
      phoneNumber: data.phone_number ?? "",
      connectionId: data.connection_id ?? connectionId,
      status: data.status ?? "active",
      countryCode: data.country_code ?? null,
      numberType: asNumberType(data.phone_number_type ?? data.number_type),
      region: regionOf(data.region),
      locality: data.locality ?? null,
      monthlyCost: money(data.cost_information?.monthly_cost),
      currency: data.cost_information?.currency ?? null,
      features: (data.features ?? []).map((feature) => feature.name ?? "").filter(Boolean),
    };
  }

  async releaseNumber(numberId: string): Promise<void> {
    await this.request<unknown>("DELETE", `/phone_numbers/${encodeURIComponent(numberId)}`);
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean {
    const signature = header(headers, "telnyx-signature-ed25519");
    const timestamp = header(headers, "telnyx-timestamp");
    if (!signature || !timestamp || !this.publicKey) return false;
    return verifyTelnyxWebhookSignature({
      publicKey: this.publicKey,
      signature,
      timestamp,
      rawBody,
      toleranceSec: this.webhookToleranceSec,
      nowMs: this.now(),
    });
  }

  private mapOrder(data: OrderRaw): TelnyxNumberOrder {
    const status = (data.status ?? "pending") as TelnyxOrderStatus;
    const error =
      data.error ??
      data.errors?.map((entry) => entry.detail ?? entry.title ?? "").filter(Boolean).join("; ");
    return {
      id: data.id ?? "",
      status,
      phoneNumberIds: (data.phone_numbers ?? [])
        .map((number) => number.id ?? "")
        .filter(Boolean),
      error: error || undefined,
    };
  }

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: { query?: Record<string, string>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        method,
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          accept: "application/json",
          ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Telnyx request failed (${method} ${path}): ${
          err instanceof Error ? err.message : "network error"
        }`,
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    if (!response.ok) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Telnyx ${method} ${path} failed (${response.status}): ${errorDetail(
          response.status,
          text,
        )}`,
      });
    }
    if (!text) return {} as T;

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Telnyx ${method} ${path} returned invalid JSON`,
      });
    }
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      return (parsed as { data: T }).data;
    }
    return parsed as T;
  }
}

function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Accepts a PEM key or the base64-encoded raw 32-byte Ed25519 key from Mission Control. */
export function parseTelnyxPublicKey(raw: string): KeyObject {
  const value = raw.trim();
  if (value.includes("BEGIN PUBLIC KEY")) {
    return createPublicKey(value);
  }
  const keyBytes = Buffer.from(value, "base64");
  if (keyBytes.length !== 32) {
    throw new Error("TELNYX_PUBLIC_KEY must be PEM or a base64-encoded 32-byte Ed25519 key");
  }
  const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
  return createPublicKey({
    key: Buffer.concat([spkiPrefix, keyBytes]),
    format: "der",
    type: "spki",
  });
}

export function verifyTelnyxWebhookSignature(input: {
  publicKey: string;
  signature: string;
  timestamp: string;
  rawBody: string;
  toleranceSec?: number;
  nowMs?: number;
}): boolean {
  try {
    const timestampSeconds = Number(input.timestamp);
    if (!Number.isFinite(timestampSeconds)) return false;
    const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
    const tolerance = input.toleranceSec ?? 300;
    if (Math.abs(nowSeconds - timestampSeconds) > tolerance) return false;

    const signatureBytes = Buffer.from(input.signature, "base64");
    if (signatureBytes.length === 0) return false;

    const message = Buffer.from(`${input.timestamp}|${input.rawBody}`, "utf8");
    return verifySignature(null, message, parseTelnyxPublicKey(input.publicKey), signatureBytes);
  } catch {
    return false;
  }
}
