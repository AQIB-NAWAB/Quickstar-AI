import type { AvailablePhoneNumber } from "@quickstart/contracts";
import type {
  TelnyxFqdn,
  TelnyxFqdnConnection,
  TelnyxNumberOrder,
  TelnyxNumbersClient,
  TelnyxOwnedNumber,
  TelnyxSearchNumbersInput,
} from "./types.js";

type FakeTelnyxOptions = {
  /** Seed platform-owned numbers that already exist in the fake account. */
  ownedNumbers?: Array<Partial<TelnyxOwnedNumber> & { phoneNumber: string }>;
  /** Order status returned by create/get. Defaults to success for deterministic tests. */
  orderStatus?: "pending" | "success" | "failure";
  webhookSecret?: string;
};

/**
 * Deterministic Telnyx stand-in used when TELEPHONY_PROFILE=fake.
 * It lets the number inventory UI and tests run end-to-end without credentials.
 */
export class FakeTelnyxClient implements TelnyxNumbersClient {
  readonly kind = "fake" as const;
  private readonly owned = new Map<string, TelnyxOwnedNumber>();
  private readonly orders = new Map<string, TelnyxNumberOrder>();
  private readonly orderStatus: "pending" | "success" | "failure";
  private readonly webhookSecret: string;
  private nextId = 1;

  constructor(options: FakeTelnyxOptions = {}) {
    this.orderStatus = options.orderStatus ?? "success";
    this.webhookSecret = options.webhookSecret ?? "fake-telnyx-webhook";

    const seeds = options.ownedNumbers ?? [
      { phoneNumber: "+14155550101", region: "California", locality: "San Francisco" },
      { phoneNumber: "+12125550102", region: "New York", locality: "New York" },
      { phoneNumber: "+13125550103", region: "Illinois", locality: "Chicago" },
    ];
    for (const seed of seeds) {
      const id = `fake_num_${this.nextId++}`;
      this.owned.set(id, {
        id,
        phoneNumber: seed.phoneNumber,
        connectionId: seed.connectionId ?? null,
        status: seed.status ?? "active",
        countryCode: seed.countryCode ?? "US",
        numberType: seed.numberType ?? "local",
        region: seed.region ?? null,
        locality: seed.locality ?? null,
        monthlyCost: seed.monthlyCost ?? 1,
        currency: seed.currency ?? "USD",
        features: seed.features ?? ["voice", "sms"],
      });
    }
  }

  async searchAvailableNumbers(input: TelnyxSearchNumbersInput): Promise<AvailablePhoneNumber[]> {
    const areaCode = (input.areaCode ?? "415").padStart(3, "0").slice(0, 3);
    const country = (input.countryCode ?? "US").toUpperCase();
    const limit = Math.min(Math.max(input.limit ?? 6, 1), 20);
    return Array.from({ length: limit }, (_, index) => ({
      phone_number: `+1${areaCode}555${String(100 + index).padStart(4, "0")}`,
      country_code: country,
      number_type: input.numberType ?? "local",
      region: input.state ?? "California",
      locality: input.locality ?? "San Francisco",
      area_code: areaCode,
      monthly_cost: 1,
      upfront_cost: 1,
      currency: "USD",
      features: ["voice", "sms"],
    }));
  }

  async listOwnedNumbers(): Promise<TelnyxOwnedNumber[]> {
    return [...this.owned.values()].map((number) => ({ ...number }));
  }

  async createNumberOrder(
    e164s: string[],
    connectionId?: string,
    customerReference?: string,
  ): Promise<TelnyxNumberOrder> {
    void customerReference;
    const phoneNumberIds = e164s.map((e164) => {
      const id = `fake_num_${this.nextId++}`;
      this.owned.set(id, {
        id,
        phoneNumber: e164,
        connectionId: connectionId ?? null,
        status: this.orderStatus === "success" ? "active" : "pending",
        countryCode: "US",
        numberType: "local",
        region: "California",
        locality: "San Francisco",
        monthlyCost: 1,
        currency: "USD",
        features: ["voice"],
      });
      return id;
    });
    const order: TelnyxNumberOrder = {
      id: `fake_order_${this.nextId++}`,
      status: this.orderStatus,
      phoneNumberIds,
      ...(this.orderStatus === "failure" ? { error: "fake order failure" } : {}),
    };
    this.orders.set(order.id, order);
    return { ...order };
  }

  async getNumberOrder(orderId: string): Promise<TelnyxNumberOrder> {
    return { ...(this.orders.get(orderId) ?? {
      id: orderId,
      status: "failure" as const,
      phoneNumberIds: [],
      error: "unknown fake order",
    }) };
  }

  async createFqdnConnection(name: string): Promise<TelnyxFqdnConnection> {
    return { id: `fake_conn_${this.nextId++}`, connectionName: name };
  }

  async createFqdn(connectionId: string, fqdn: string): Promise<TelnyxFqdn> {
    return { id: `fake_fqdn_${this.nextId++}`, fqdn, connectionId };
  }

  async assignNumberToConnection(
    numberId: string,
    connectionId: string,
  ): Promise<TelnyxOwnedNumber> {
    const existing = this.owned.get(numberId);
    if (!existing) throw new Error(`fake number ${numberId} not found`);
    const next = { ...existing, connectionId };
    this.owned.set(numberId, next);
    return { ...next };
  }

  async releaseNumber(numberId: string): Promise<void> {
    this.owned.delete(numberId);
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean {
    void rawBody;
    const raw = headers["x-fake-telnyx-signature"];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value === this.webhookSecret;
  }
}
