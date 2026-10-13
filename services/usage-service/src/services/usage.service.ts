import { AppError, ErrorCode } from "@quickstart/errors";
import {
  USAGE_KINDS,
  type UsageEntry,
  type UsageFactIngestBody,
  type UsageKind,
  type UsageListResponse,
} from "@quickstart/contracts";
import type { UsagePriceConfig } from "../config/environment.js";
import type { UsageEntryRow } from "../domain/types.js";
import type { UsageRepository } from "../repository/usage.repository.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toEntry(row: UsageEntryRow): UsageEntry {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    kind: row.kind,
    units: Number(row.units),
    unit_label: row.unit_label,
    provider: row.provider,
    model: row.model,
    price_micros: Number(row.price_micros),
    currency: row.currency,
    idempotency_key: row.idempotency_key,
    request_id: row.request_id,
    source_id: row.source_id,
    detail: row.detail ?? {},
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function isUsageKind(value: string): value is UsageKind {
  return (USAGE_KINDS as readonly string[]).includes(value);
}

export class UsageService {
  constructor(
    private readonly repo: UsageRepository,
    private readonly prices: UsagePriceConfig,
  ) {}

  async ingest(body: UsageFactIngestBody): Promise<{ entry: UsageEntry; inserted: boolean }> {
    if (!body.workspace_id || !UUID_REGEX.test(body.workspace_id)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "workspace_id must be a valid UUID",
      });
    }
    if (!body.kind || !isUsageKind(body.kind)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `kind must be one of: ${USAGE_KINDS.join(", ")}`,
      });
    }
    if (!body.idempotency_key?.trim()) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "idempotency_key is required",
      });
    }
    if (!body.request_id?.trim()) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "request_id is required",
      });
    }
    if (typeof body.units !== "number" || !Number.isFinite(body.units) || body.units < 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "units must be a non-negative number",
      });
    }

    const priceMicros = this.resolvePrice(body);
    const currency = (body.currency?.trim() || "USD").slice(0, 8);

    const { row, inserted } = await this.repo.ingest({
      workspaceId: body.workspace_id,
      kind: body.kind,
      units: body.units,
      unitLabel: body.unit_label ?? null,
      provider: body.provider ?? null,
      model: body.model ?? null,
      priceMicros,
      currency,
      idempotencyKey: body.idempotency_key.trim(),
      requestId: body.request_id.trim(),
      sourceId: body.source_id ?? null,
      detail: body.detail ?? {},
    });

    return { entry: toEntry(row), inserted };
  }

  async list(
    workspaceId: string,
    opts: { limit?: number; kind?: string } = {},
  ): Promise<UsageListResponse> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid workspace UUID required",
      });
    }
    const [entries, sums] = await Promise.all([
      this.repo.listByWorkspace(workspaceId, opts),
      this.repo.sumByWorkspace(workspaceId),
    ]);
    return {
      entries: entries.map(toEntry),
      sum_units: sums.sum_units,
      sum_price_micros: sums.sum_price_micros,
      count: sums.count,
    };
  }

  private resolvePrice(body: UsageFactIngestBody): number {
    if (typeof body.price_micros === "number" && Number.isFinite(body.price_micros)) {
      return Math.max(0, Math.floor(body.price_micros));
    }

    if (body.kind === "model") {
      const tokens = body.units;
      return Math.max(0, Math.round((tokens / 1000) * this.prices.modelMicrosPer1kTokens));
    }

    if (body.kind === "voice") {
      const label = body.unit_label ?? "";
      if (label === "stt" || body.detail?.unit === "stt") {
        return this.prices.speechSttMicros * Math.max(1, Math.floor(body.units));
      }
      if (label === "tts" || body.detail?.unit === "tts") {
        return this.prices.speechTtsMicros * Math.max(1, Math.floor(body.units));
      }
      // telephony minutes
      return Math.round(body.units * this.prices.voiceMinuteMicros);
    }

    // acquisition without estimate → 0
    return 0;
  }
}
