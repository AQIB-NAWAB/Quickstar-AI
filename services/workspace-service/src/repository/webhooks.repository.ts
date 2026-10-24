import type { Pool } from "pg";

export type WebhookEndpointRow = {
  id: string;
  workspace_id: string;
  url: string;
  events: string[];
  status: string;
  signing_secret: string;
  last_delivery_at: Date | null;
  last_delivery_status: number | null;
  consecutive_failures: number;
  created_at: Date;
  updated_at: Date;
};

export type WebhookDeliveryRow = {
  id: string;
  webhook_id: string;
  workspace_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts_count: number;
  last_http_status: number | null;
  last_latency_ms: number | null;
  last_error: string | null;
  created_at: Date;
};

export type WebhookDeliveryAttemptRow = {
  id: string;
  delivery_id: string;
  attempt_number: number;
  http_status: number | null;
  latency_ms: number;
  outcome: string;
  error: string | null;
  request_headers: Record<string, string> | null;
  response_headers: Record<string, string> | null;
  response_body: string | null;
  occurred_at: Date;
};

export class WebhooksRepository {
  constructor(private readonly pool: Pool) {}

  async listEndpoints(workspaceId: string): Promise<WebhookEndpointRow[]> {
    const res = await this.pool.query<WebhookEndpointRow>(
      `SELECT * FROM webhook_endpoints
       WHERE workspace_id = $1
       ORDER BY created_at DESC`,
      [workspaceId],
    );
    return res.rows;
  }

  async getEndpoint(workspaceId: string, endpointId: string): Promise<WebhookEndpointRow | null> {
    const res = await this.pool.query<WebhookEndpointRow>(
      `SELECT * FROM webhook_endpoints
       WHERE workspace_id = $1 AND id = $2
       LIMIT 1`,
      [workspaceId, endpointId],
    );
    return res.rows[0] ?? null;
  }

  async createEndpoint(params: {
    workspaceId: string;
    url: string;
    events: string[];
    signingSecret: string;
  }): Promise<WebhookEndpointRow> {
    const res = await this.pool.query<WebhookEndpointRow>(
      `INSERT INTO webhook_endpoints (
        workspace_id,
        url,
        events,
        signing_secret
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [params.workspaceId, params.url, params.events, params.signingSecret],
    );
    return res.rows[0];
  }

  async updateEndpoint(
    workspaceId: string,
    endpointId: string,
    data: { url?: string; events?: string[]; status?: string },
  ): Promise<WebhookEndpointRow | null> {
    const updates: string[] = ["updated_at = now()"];
    const values: unknown[] = [workspaceId, endpointId];

    if (data.url !== undefined) {
      values.push(data.url);
      updates.push(`url = $${values.length}`);
    }
    if (data.events !== undefined) {
      values.push(data.events);
      updates.push(`events = $${values.length}`);
    }
    if (data.status !== undefined) {
      values.push(data.status);
      updates.push(`status = $${values.length}`);
    }

    const res = await this.pool.query<WebhookEndpointRow>(
      `UPDATE webhook_endpoints
       SET ${updates.join(", ")}
       WHERE workspace_id = $1 AND id = $2
       RETURNING *`,
      values,
    );
    return res.rows[0] ?? null;
  }

  async updateSigningSecret(
    workspaceId: string,
    endpointId: string,
    signingSecret: string,
  ): Promise<WebhookEndpointRow | null> {
    const res = await this.pool.query<WebhookEndpointRow>(
      `UPDATE webhook_endpoints
       SET signing_secret = $3, updated_at = now()
       WHERE workspace_id = $1 AND id = $2
       RETURNING *`,
      [workspaceId, endpointId, signingSecret],
    );
    return res.rows[0] ?? null;
  }

  async deleteEndpoint(workspaceId: string, endpointId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM webhook_endpoints WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, endpointId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listDeliveries(
    workspaceId: string,
    webhookId?: string,
    limit: number = 50,
  ): Promise<WebhookDeliveryRow[]> {
    const params: unknown[] = [workspaceId];
    let whereClause = "WHERE workspace_id = $1";

    if (webhookId) {
      params.push(webhookId);
      whereClause += ` AND webhook_id = $2`;
    }

    params.push(Math.min(Math.max(limit, 1), 100));
    const limitParam = params.length;

    const res = await this.pool.query<WebhookDeliveryRow>(
      `SELECT * FROM webhook_deliveries
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam}`,
      params,
    );
    return res.rows;
  }

  async getDelivery(
    workspaceId: string,
    deliveryId: string,
  ): Promise<(WebhookDeliveryRow & { attempts: WebhookDeliveryAttemptRow[] }) | null> {
    const delRes = await this.pool.query<WebhookDeliveryRow>(
      `SELECT * FROM webhook_deliveries
       WHERE workspace_id = $1 AND id = $2
       LIMIT 1`,
      [workspaceId, deliveryId],
    );
    if (!delRes.rows[0]) return null;

    const attemptsRes = await this.pool.query<WebhookDeliveryAttemptRow>(
      `SELECT * FROM webhook_delivery_attempts
       WHERE delivery_id = $1
       ORDER BY attempt_number ASC`,
      [deliveryId],
    );

    return {
      ...delRes.rows[0],
      attempts: attemptsRes.rows,
    };
  }

  async createDelivery(params: {
    webhookId: string;
    workspaceId: string;
    eventType: string;
    payload: Record<string, unknown>;
    status?: string;
    lastHttpStatus?: number | null;
    lastLatencyMs?: number | null;
    lastError?: string | null;
  }): Promise<WebhookDeliveryRow> {
    const res = await this.pool.query<WebhookDeliveryRow>(
      `INSERT INTO webhook_deliveries (
        webhook_id,
        workspace_id,
        event_type,
        payload,
        status,
        last_http_status,
        last_latency_ms,
        last_error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        params.webhookId,
        params.workspaceId,
        params.eventType,
        params.payload,
        params.status ?? "failed",
        params.lastHttpStatus ?? null,
        params.lastLatencyMs ?? null,
        params.lastError ?? null,
      ],
    );
    return res.rows[0];
  }

  async createAttempt(params: {
    deliveryId: string;
    attemptNumber: number;
    httpStatus?: number | null;
    latencyMs: number;
    outcome: string;
    error?: string | null;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    responseBody?: string | null;
  }): Promise<WebhookDeliveryAttemptRow> {
    const res = await this.pool.query<WebhookDeliveryAttemptRow>(
      `INSERT INTO webhook_delivery_attempts (
        delivery_id,
        attempt_number,
        http_status,
        latency_ms,
        outcome,
        error,
        request_headers,
        response_headers,
        response_body
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        params.deliveryId,
        params.attemptNumber,
        params.httpStatus ?? null,
        params.latencyMs,
        params.outcome,
        params.error ?? null,
        params.requestHeaders ?? null,
        params.responseHeaders ?? null,
        params.responseBody ?? null,
      ],
    );
    return res.rows[0];
  }

  async incrementDeliveryAttempt(
    deliveryId: string,
    data: {
      status: string;
      lastHttpStatus?: number | null;
      lastLatencyMs?: number | null;
      lastError?: string | null;
    },
  ): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_deliveries
       SET attempts_count = attempts_count + 1,
           status = $2,
           last_http_status = $3,
           last_latency_ms = $4,
           last_error = $5
       WHERE id = $1`,
      [
        deliveryId,
        data.status,
        data.lastHttpStatus ?? null,
        data.lastLatencyMs ?? null,
        data.lastError ?? null,
      ],
    );
  }

  async findActiveEndpointsForEvent(workspaceId: string, eventType: string): Promise<WebhookEndpointRow[]> {
    const res = await this.pool.query<WebhookEndpointRow>(
      `SELECT * FROM webhook_endpoints
       WHERE workspace_id = $1
         AND status = 'active'
         AND ($2 = ANY(events) OR '*' = ANY(events))`,
      [workspaceId, eventType],
    );
    return res.rows;
  }

  async enqueueDelivery(params: {
    webhookId: string;
    workspaceId: string;
    eventType: string;
    payload: Record<string, unknown>;
    canonicalEventId?: string | null;
    nextAttemptAt?: Date;
  }): Promise<WebhookDeliveryRow | null> {
    const res = await this.pool.query<WebhookDeliveryRow>(
      `INSERT INTO webhook_deliveries (
         webhook_id, workspace_id, event_type, payload, canonical_event_id,
         status, attempts_count, next_attempt_at, fencing_token, created_at
       ) VALUES ($1, $2, $3, $4, $5, 'pending', 0, $6, 1, now())
       ON CONFLICT (webhook_id, canonical_event_id) WHERE canonical_event_id IS NOT NULL DO NOTHING
       RETURNING *`,
      [
        params.webhookId,
        params.workspaceId,
        params.eventType,
        params.payload,
        params.canonicalEventId ?? null,
        params.nextAttemptAt ?? new Date(),
      ],
    );
    return res.rows[0] ?? null;
  }

  async claimDeliveries(
    limit: number,
    workerId: string,
    leaseDurationSeconds = 30,
  ): Promise<Array<WebhookDeliveryRow & { url: string; signing_secret: string }>> {
    const res = await this.pool.query<WebhookDeliveryRow & { url: string; signing_secret: string }>(
      `WITH claimable AS (
         SELECT d.id, e.url, e.signing_secret
         FROM webhook_deliveries d
         JOIN webhook_endpoints e ON d.webhook_id = e.id
         WHERE (d.status = 'pending' OR (d.status = 'running' AND d.lease_expires_at < now()))
           AND d.next_attempt_at <= now()
           AND e.status != 'disabled'
         ORDER BY d.next_attempt_at ASC
         LIMIT $1
         FOR UPDATE OF d SKIP LOCKED
       )
       UPDATE webhook_deliveries d
       SET status = 'running',
           lease_owner = $2,
           lease_expires_at = now() + make_interval(secs => $3),
           fencing_token = d.fencing_token + 1
       FROM claimable c
       WHERE d.id = c.id
       RETURNING d.*, c.url, c.signing_secret`,
      [limit, workerId, leaseDurationSeconds],
    );
    return res.rows;
  }

  async updateEndpointHealth(
    endpointId: string,
    httpStatus: number | null,
    isFailure: boolean,
  ): Promise<void> {
    if (isFailure) {
      await this.pool.query(
        `UPDATE webhook_endpoints
         SET last_delivery_at = now(),
             last_delivery_status = $2,
             consecutive_failures = consecutive_failures + 1,
             status = CASE WHEN consecutive_failures + 1 >= 10 THEN 'failing' ELSE status END,
             updated_at = now()
         WHERE id = $1`,
        [endpointId, httpStatus],
      );
    } else {
      await this.pool.query(
        `UPDATE webhook_endpoints
         SET last_delivery_at = now(),
             last_delivery_status = $2,
             consecutive_failures = 0,
             status = 'active',
             updated_at = now()
         WHERE id = $1`,
        [endpointId, httpStatus],
      );
    }
  }

  async completeDelivery(
    deliveryId: string,
    httpStatusOrFencing: number,
    latencyMsOrStatus?: number,
    latencyMs?: number,
  ): Promise<boolean> {
    let httpStatus: number;
    let latency: number;

    if (latencyMs !== undefined) {
      // 4 args: deliveryId, fencingToken, httpStatus, latencyMs
      httpStatus = latencyMsOrStatus ?? 200;
      latency = latencyMs;
    } else {
      // 3 args: deliveryId, httpStatus, latencyMs
      httpStatus = httpStatusOrFencing;
      latency = latencyMsOrStatus ?? 0;
    }

    const res = await this.pool.query(
      `UPDATE webhook_deliveries
       SET status = 'success',
           completed_at = now(),
           last_http_status = $2,
           last_latency_ms = $3,
           last_error = NULL,
           lease_owner = NULL,
           lease_expires_at = NULL,
           attempts_count = attempts_count + 1
       WHERE id = $1`,
      [deliveryId, httpStatus, latency],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async retryDelivery(
    deliveryId: string,
    retryDelayOrFencing: number,
    nextAttemptOrStatus: Date | number | null,
    httpStatusOrLatency?: number | null,
    latencyMsOrError?: number | string,
    errorMessage?: string,
  ): Promise<boolean> {
    let nextAttemptAt: Date;
    let httpStatus: number | null = null;
    let latency = 0;
    let err = "";

    if (typeof nextAttemptOrStatus === "number" || nextAttemptOrStatus === null) {
      // 5 args: deliveryId, retryAfterSeconds, httpStatus, latencyMs, error
      const retryDelaySec = retryDelayOrFencing;
      nextAttemptAt = new Date(Date.now() + retryDelaySec * 1000);
      httpStatus = nextAttemptOrStatus;
      latency = typeof httpStatusOrLatency === "number" ? httpStatusOrLatency : 0;
      err = typeof latencyMsOrError === "string" ? latencyMsOrError : (errorMessage ?? "");
    } else {
      // 6 args: deliveryId, fencingToken, nextAttemptAt, httpStatus, latencyMs, error
      nextAttemptAt = nextAttemptOrStatus;
      httpStatus = typeof httpStatusOrLatency === "number" ? httpStatusOrLatency : null;
      latency = typeof latencyMsOrError === "number" ? latencyMsOrError : 0;
      err = errorMessage ?? "";
    }

    const res = await this.pool.query(
      `UPDATE webhook_deliveries
       SET status = 'pending',
           next_attempt_at = $2,
           last_http_status = $3,
           last_latency_ms = $4,
           last_error = $5,
           lease_owner = NULL,
           lease_expires_at = NULL,
           attempts_count = attempts_count + 1
       WHERE id = $1`,
      [deliveryId, nextAttemptAt, httpStatus, latency, err],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async deadLetterDelivery(
    deliveryId: string,
    reasonOrFencing: string | number,
    reasonOrStatus?: string | number | null,
    httpStatusOrLatency?: number | null,
    latencyMsOrError?: number | string,
    errorMessage?: string,
  ): Promise<boolean> {
    let reason = "Delivery failed";
    let httpStatus: number | null = null;
    let latency = 0;
    let err: string | null = null;

    if (typeof reasonOrFencing === "string") {
      // 2 or 5 args: deliveryId, reason, [httpStatus, latencyMs, error]
      reason = reasonOrFencing;
      if (typeof reasonOrStatus === "number") httpStatus = reasonOrStatus;
      if (typeof httpStatusOrLatency === "number") latency = httpStatusOrLatency;
      if (typeof latencyMsOrError === "string") err = latencyMsOrError;
    } else {
      // 6 args: deliveryId, fencingToken, reason, httpStatus, latencyMs, error
      reason = typeof reasonOrStatus === "string" ? reasonOrStatus : "Delivery failed";
      httpStatus = typeof httpStatusOrLatency === "number" ? httpStatusOrLatency : null;
      latency = typeof latencyMsOrError === "number" ? latencyMsOrError : 0;
      err = errorMessage ?? null;
    }

    const res = await this.pool.query(
      `UPDATE webhook_deliveries
       SET status = 'failed',
           dead_letter_reason = $2,
           last_http_status = $3,
           last_latency_ms = $4,
           last_error = $5,
           completed_at = now(),
           lease_owner = NULL,
           lease_expires_at = NULL,
           attempts_count = attempts_count + 1
       WHERE id = $1`,
      [deliveryId, reason, httpStatus, latency, err],
    );
    return (res.rowCount ?? 0) > 0;
  }
}

