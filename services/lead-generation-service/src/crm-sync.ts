import type { CampaignLeadDelivery } from "@quickstart/contracts";
import type { Config } from "./config.js";
import { ResearchError } from "./research-error.js";
import { responseText } from "./responses.js";

/**
 * Upsert an accepted research prospect into Feature 24 lead-service (CRM).
 * Failures are retryable so the worker can re-run after transient outages.
 */
export async function syncAcceptedLeadToCrm(
  config: Config,
  input: {
    workspaceId: string;
    requestId: string;
    leadId: string;
    lead: CampaignLeadDelivery["lead"];
  },
): Promise<{ crm_lead_id: string; created: boolean }> {
  if (!config.leadInternalToken || config.leadInternalToken.length < 32) {
    throw new ResearchError("LEAD_INTERNAL_TOKEN_MISSING");
  }
  const url = `${config.leadServiceUrl}/internal/v1/workspaces/${encodeURIComponent(input.workspaceId)}/leads/upsert`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.leadInternalToken}`,
        "content-type": "application/json",
        "x-request-id": input.requestId,
      },
      body: JSON.stringify({
        name: input.lead.company_name,
        email: input.lead.email,
        phone: input.lead.phone,
        source: "lead_gen_bot",
        status: "new",
        qualification_score: input.lead.fit_score,
        qualification_max: 100,
        external_id: `lg:${input.leadId}`,
        idempotency_key: `lg-crm:${input.workspaceId}:${input.leadId}`,
        merge_on_conflict: true,
        notes: input.lead.summary || null,
        captured_fields: {
          company: input.lead.company_name,
          website: input.lead.website,
          category: input.lead.category,
          location: input.lead.location ?? "",
          fit_score: String(input.lead.fit_score),
          data_origin: input.lead.data_origin ?? "",
          ...(input.lead.discovered_fields ?? {}),
        },
        tags: ["lead-generation", input.lead.category].filter(Boolean),
      }),
      signal: AbortSignal.timeout(config.requestTimeoutMs),
      redirect: "error",
    });
  } catch {
    throw new ResearchError("LEAD_SERVICE_UNAVAILABLE", true);
  }
  const raw = await responseText(res);
  if (!res.ok) {
    throw new ResearchError(
      `LEAD_SERVICE_HTTP_${res.status}`,
      res.status === 429 || res.status >= 500,
    );
  }
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new ResearchError("LEAD_SERVICE_INVALID_JSON", true);
  }
  const lead = (body.lead ?? {}) as Record<string, unknown>;
  const crmLeadId = typeof lead.id === "string" ? lead.id : "";
  if (!crmLeadId) throw new ResearchError("LEAD_SERVICE_INVALID_ACK", true);
  return { crm_lead_id: crmLeadId, created: body.created === true };
}
