import { AppError, ErrorCode } from "@quickstart/errors";
import type { Logger } from "@quickstart/logging";
import type {
  AvailablePhoneNumber,
  PhoneNumberSearchFilters,
  PhoneNumberSearchResult,
  PurchasePhoneNumberInput,
  UpdatePhoneNumberInput,
  WorkspacePhoneNumber,
} from "@quickstart/contracts";
import {
  toWorkspacePhoneNumber,
  type PhoneNumberRow,
  type PhoneNumbersRepository,
} from "../repository/phone-numbers.repository.js";
import type { SipProvisioner, ProvisionedRoute } from "../telephony/livekit/sip-provisioner.js";
import type { TelnyxNumbersClient, TelnyxOwnedNumber } from "../telephony/telnyx/types.js";

const E164 = /^\+[1-9]\d{6,14}$/;
const CONNECTION_CONFIG_KEY = "telnyx_sip_connection";

export type ReleaseMode = "pool" | "provider";

export type InboundNumberRoute = {
  numberId: string;
  workspaceId: string;
  agentId: string | null;
  e164: string;
  roomPrefix: string;
};

export type PhoneNumbersServiceDeps = {
  repo: PhoneNumbersRepository;
  telnyx: TelnyxNumbersClient;
  provisioner: SipProvisioner;
  connectionName: string;
  configuredConnectionId?: string;
  logger: Logger;
  orderPollAttempts?: number;
  orderPollIntervalMs?: number;
};

export class PhoneNumbersService {
  private connectionId?: string;
  private readonly pollAttempts: number;
  private readonly pollIntervalMs: number;

  constructor(private readonly deps: PhoneNumbersServiceDeps) {
    this.connectionId = deps.configuredConnectionId;
    this.pollAttempts = deps.orderPollAttempts ?? 10;
    this.pollIntervalMs = deps.orderPollIntervalMs ?? 1000;
  }

  async list(workspaceId: string, options: { sync?: boolean } = {}): Promise<WorkspacePhoneNumber[]> {
    if (options.sync) {
      await this.syncOwnedNumbers().catch((err: unknown) => {
        this.deps.logger.warn("telnyx.numbers.sync_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
    const rows = await this.deps.repo.listForWorkspace(workspaceId);
    return rows.map(toWorkspacePhoneNumber);
  }

  async listPool(): Promise<WorkspacePhoneNumber[]> {
    return (await this.deps.repo.listPool()).map(toWorkspacePhoneNumber);
  }

  async searchAvailable(
    workspaceId: string,
    filters: PhoneNumberSearchFilters,
  ): Promise<PhoneNumberSearchResult> {
    const [numbers, pool] = await Promise.all([
      this.deps.telnyx.searchAvailableNumbers({
        countryCode: filters.country_code,
        areaCode: filters.area_code,
        locality: filters.locality,
        state: filters.state,
        numberType: filters.number_type,
        limit: filters.limit,
      }),
      this.deps.repo.listPool(),
    ]);

    const workspaceNumbers = new Set(
      (await this.deps.repo.listForWorkspace(workspaceId)).map((row) => row.phone_number),
    );
    return {
      configured: this.deps.telnyx.kind === "telnyx",
      numbers: numbers.filter((number) => !workspaceNumbers.has(number.phone_number)),
      pool: pool.map(toWorkspacePhoneNumber),
    };
  }

  async purchase(
    workspaceId: string,
    input: PurchasePhoneNumberInput,
  ): Promise<WorkspacePhoneNumber> {
    const e164 = normalizeE164(input.e164);
    const existing = await this.deps.repo.findActiveByE164(e164);
    if (existing) {
      if (existing.workspace_id === workspaceId) {
        return toWorkspacePhoneNumber(existing);
      }
      if (existing.workspace_id) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: `Phone number ${e164} is already assigned to another workspace`,
        });
      }
    }

    const connectionId =
      existing?.provider_connection_id ?? (await this.ensureConnection());
    let row: PhoneNumberRow;
    let providerNumber: TelnyxOwnedNumber | null = null;
    let orderId: string | null = null;

    if (existing) {
      row = existing;
    } else {
      providerNumber =
        (await this.deps.telnyx.listOwnedNumbers()).find(
          (number) => number.phoneNumber === e164,
        ) ?? null;

      if (providerNumber) {
        if (connectionId && providerNumber.connectionId !== connectionId) {
          providerNumber = await this.deps.telnyx.assignNumberToConnection(
            providerNumber.id,
            connectionId,
          );
        }
      } else {
        const order = await this.deps.telnyx.createNumberOrder(
          [e164],
          connectionId,
          `workspace:${workspaceId}`,
        );
        orderId = order.id;
        if (order.status === "failure" || order.status === "cancelled") {
          throw new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: `Telnyx rejected the number order for ${e164}: ${
              order.error ?? order.status
            }`,
          });
        }
        if (order.status === "pending") {
          await this.waitForOrder(order.id);
        }
        providerNumber =
          (await this.deps.telnyx.listOwnedNumbers()).find(
            (number) => number.phoneNumber === e164,
          ) ?? null;
        if (!providerNumber) {
          throw new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: `Telnyx order ${order.id} has not activated ${e164} yet; retry shortly`,
          });
        }
      }

      row = await this.deps.repo.create({
        workspaceId,
        phoneNumber: e164,
        friendlyName: input.friendly_name ?? null,
        provider: "telnyx",
        providerNumberId: providerNumber.id,
        providerConnectionId: connectionId ?? providerNumber.connectionId,
        assignedAgentId: input.agent_id ?? null,
        status: "provisioning",
        inboundStatus: "provisioning",
        countryCode: providerNumber.countryCode ?? input.country_code ?? "US",
        numberType: providerNumber.numberType ?? input.number_type ?? "local",
        region: providerNumber.region,
        locality: providerNumber.locality,
        monthlyCost: providerNumber.monthlyCost,
        currency: providerNumber.currency ?? "USD",
        capabilities: {
          voice: true,
          sms: providerNumber.features.includes("sms"),
        },
        purchasedAt: new Date(),
        metadata: orderId ? { number_order_id: orderId } : { source: "owned" },
      });
    }

    if (row.workspace_id !== workspaceId) {
      row =
        (await this.deps.repo.update(row.id, {
          workspaceId,
          assignedAgentId: input.agent_id ?? row.assigned_agent_id,
          friendlyName: input.friendly_name ?? row.friendly_name,
          status: "provisioning",
          inboundStatus: "provisioning",
          provisioningError: null,
          purchasedAt: row.purchased_at ?? new Date(),
          releasedAt: null,
        })) ?? row;
    }

    return this.provision(row, {
      agentId: input.agent_id ?? row.assigned_agent_id,
    });
  }

  async assign(
    workspaceId: string,
    numberId: string,
    input: UpdatePhoneNumberInput,
  ): Promise<WorkspacePhoneNumber> {
    const row = await this.requireWorkspaceNumber(workspaceId, numberId);
    const updated = await this.deps.repo.update(row.id, {
      assignedAgentId:
        input.assigned_agent_id === undefined ? undefined : input.assigned_agent_id,
      friendlyName:
        input.friendly_name === undefined ? undefined : input.friendly_name,
    });
    return toWorkspacePhoneNumber(updated ?? row);
  }

  async release(
    workspaceId: string,
    numberId: string,
    mode: ReleaseMode,
  ): Promise<WorkspacePhoneNumber> {
    const row = await this.requireWorkspaceNumber(workspaceId, numberId);
    await this.deps.repo.update(row.id, {
      status: "releasing",
      inboundStatus: "releasing",
    });
    await this.deps.provisioner.deprovisionNumber({
      trunkId: row.livekit_trunk_id,
      dispatchRuleId: row.livekit_dispatch_rule_id,
    });

    if (mode === "provider") {
      if (row.provider_number_id) {
        await this.deps.telnyx.releaseNumber(row.provider_number_id).catch((err: unknown) => {
          this.deps.logger.warn("telnyx.numbers.release_failed", {
            number_id: row.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
      const released = await this.deps.repo.update(row.id, {
        workspaceId: null,
        assignedAgentId: null,
        status: "released",
        inboundStatus: "released",
        livekitTrunkId: null,
        livekitDispatchRuleId: null,
        releasedAt: new Date(),
      });
      return toWorkspacePhoneNumber(released ?? row);
    }

    const pooled = await this.deps.repo.update(row.id, {
      workspaceId: null,
      assignedAgentId: null,
      friendlyName: null,
      status: "active",
      inboundStatus: "pending",
      livekitTrunkId: null,
      livekitDispatchRuleId: null,
      provisioningError: null,
      releasedAt: null,
    });
    return toWorkspacePhoneNumber(pooled ?? row);
  }

  async resolveInbound(e164: string): Promise<InboundNumberRoute | null> {
    const row = await this.deps.repo.findActiveByE164(e164);
    return row ? this.toRoute(row) : null;
  }

  async resolveInboundByNumberId(numberId: string): Promise<InboundNumberRoute | null> {
    const row = await this.deps.repo.getById(numberId);
    if (!row || row.status !== "active" || !row.workspace_id) return null;
    return this.toRoute(row);
  }

  async syncOwnedNumbers(): Promise<void> {
    const owned = await this.deps.telnyx.listOwnedNumbers();
    for (const number of owned) {
      const existing = await this.deps.repo.getByE164(number.phoneNumber);
      if (existing) {
        if (
          existing.provider_number_id !== number.id ||
          existing.provider_connection_id !== number.connectionId
        ) {
          await this.deps.repo.update(existing.id, {
            providerNumberId: number.id,
            providerConnectionId: number.connectionId,
          });
        }
        continue;
      }
      await this.deps.repo.create({
        workspaceId: null,
        phoneNumber: number.phoneNumber,
        provider: "telnyx",
        providerNumberId: number.id,
        providerConnectionId: number.connectionId,
        status: "active",
        inboundStatus: "pending",
        countryCode: number.countryCode,
        numberType: number.numberType,
        region: number.region,
        locality: number.locality,
        monthlyCost: number.monthlyCost,
        currency: number.currency,
        capabilities: { voice: true, sms: number.features.includes("sms") },
        metadata: { source: "telnyx_sync" },
      });
    }
  }

  /**
   * Telnyx number-order webhook fallback. Purchases poll orders synchronously,
   * so this mainly reconciles orders that were pending longer than the poll window.
   */
  async handleTelnyxEvent(body: unknown): Promise<{ handled: boolean }> {
    const envelope = body as {
      data?: {
        event_type?: string;
        payload?: {
          phone_numbers?: Array<{ phone_number?: string }>;
          phone_number?: string;
          errors?: Array<{ detail?: string }>;
        };
      };
    };
    const eventType = envelope.data?.event_type ?? "";
    if (!eventType.startsWith("number_order")) return { handled: false };

    const payload = envelope.data?.payload ?? {};
    const numbers = payload.phone_numbers ?? [];
    const completed = /completed|success/i.test(eventType);
    const failed = /failed|failure|cancel/i.test(eventType);

    for (const item of numbers) {
      const e164 = item.phone_number;
      if (!e164) continue;
      const row = await this.deps.repo.getByE164(e164);
      if (!row) continue;
      if (completed && row.status !== "active") {
        await this.deps.repo.update(row.id, {
          status: "active",
          inboundStatus: "active",
          provisioningError: null,
        });
      } else if (failed) {
        await this.deps.repo.update(row.id, {
          status: "error",
          inboundStatus: "error",
          provisioningError:
            payload.errors?.map((entry) => entry.detail ?? "").filter(Boolean).join("; ") ||
            eventType,
        });
      }
    }
    return { handled: true };
  }

  private async provision(
    row: PhoneNumberRow,
    options: { agentId: string | null },
  ): Promise<WorkspacePhoneNumber> {
    if (!row.workspace_id) {
      throw new AppError({
        code: ErrorCode.INTERNAL,
        message: "Cannot provision a phone number without a workspace",
      });
    }
    let route: ProvisionedRoute;
    try {
      route = await this.deps.provisioner.provisionNumber({
        numberId: row.id,
        e164: row.phone_number,
        workspaceId: row.workspace_id,
        agentId: options.agentId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "LiveKit provisioning failed";
      await this.deps.repo.update(row.id, {
        status: "error",
        inboundStatus: "error",
        provisioningError: message.slice(0, 500),
      });
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Number purchased but inbound routing failed: ${message}`,
      });
    }

    const updated = await this.deps.repo.update(row.id, {
      status: "active",
      inboundStatus: "active",
      livekitTrunkId: route.trunkId,
      livekitDispatchRuleId: route.dispatchRuleId,
      provisioningError: null,
    });
    return toWorkspacePhoneNumber(updated ?? row);
  }

  private async requireWorkspaceNumber(
    workspaceId: string,
    numberId: string,
  ): Promise<PhoneNumberRow> {
    const row = await this.deps.repo.getById(numberId);
    if (!row || row.workspace_id !== workspaceId) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Phone number not found in this workspace",
      });
    }
    return row;
  }

  private toRoute(row: PhoneNumberRow): InboundNumberRoute | null {
    if (!row.workspace_id || row.status !== "active") return null;
    return {
      numberId: row.id,
      workspaceId: row.workspace_id,
      agentId: row.assigned_agent_id,
      e164: row.phone_number,
      roomPrefix: `qs-call-${row.id}-`,
    };
  }

  private async ensureConnection(): Promise<string> {
    if (this.connectionId) return this.connectionId;

    const saved = await this.deps.repo.getConfig(CONNECTION_CONFIG_KEY);
    if (saved?.connection_id) {
      this.connectionId = String(saved.connection_id);
      return this.connectionId;
    }

    const connection = await this.deps.telnyx.createFqdnConnection(this.deps.connectionName);
    const sipEndpoint = this.deps.provisioner.sipEndpoint;
    if (sipEndpoint) {
      await this.deps.telnyx.createFqdn(connection.id, sipEndpoint);
    }
    await this.deps.repo.setConfig(CONNECTION_CONFIG_KEY, {
      connection_id: connection.id,
      fqdn: sipEndpoint ?? null,
      created_at: new Date().toISOString(),
    });
    this.connectionId = connection.id;
    this.deps.logger.info("telnyx.numbers.connection_created", {
      connection_id: connection.id,
      fqdn: sipEndpoint ?? null,
    });
    return connection.id;
  }

  private async waitForOrder(orderId: string): Promise<void> {
    for (let attempt = 0; attempt < this.pollAttempts; attempt += 1) {
      const order = await this.deps.telnyx.getNumberOrder(orderId);
      if (order.status === "success") return;
      if (order.status === "failure" || order.status === "cancelled" || order.status === "deleted") {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: `Telnyx number order ${orderId} ended as ${order.status}: ${
            order.error ?? "no detail"
          }`,
        });
      }
      if (attempt < this.pollAttempts - 1) {
        await delay(this.pollIntervalMs);
      }
    }
    throw new AppError({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
      message: `Telnyx number order ${orderId} is still pending; retry the purchase shortly`,
    });
  }
}

function normalizeE164(input: string): string {
  const value = input.trim();
  if (!E164.test(value)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "e164 must be a valid E.164 number, e.g. +14155550100",
    });
  }
  return value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { AvailablePhoneNumber };
