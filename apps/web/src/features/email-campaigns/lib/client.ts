import type {
  ConnectSmtpMailboxInput,
  CreateSmtpCampaignInput,
  PersonalizedEmail,
  RepositoryResult,
  SmtpCampaign,
  SmtpCampaignDetail,
  SmtpMailbox,
  SmtpRecipientInput,
  SmtpSuppression,
} from "./types";

const BASE = (workspaceId: string) =>
  `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/email-campaigns`;

async function request<T>(path: string, init?: RequestInit): Promise<RepositoryResult<T>> {
  try {
    const res = await fetch(path, {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = (await res.json().catch(() => ({}))) as T & {
      error?: { message?: string };
    };
    if (!res.ok) {
      if (res.status === 403) {
        return { status: "forbidden", message: body.error?.message ?? "Access denied." };
      }
      return {
        status: "unavailable",
        message: body.error?.message ?? "The email campaigns service is unavailable.",
      };
    }
    return { status: "ready", data: body as T };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Network error" };
  }
}

export const smtpEmailCampaignsApi = {
  listMailboxes(workspaceId: string): Promise<RepositoryResult<SmtpMailbox[]>> {
    return request<{ mailboxes: SmtpMailbox[] }>(`${BASE(workspaceId)}/mailboxes`).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.mailboxes } : r,
    );
  },

  connectMailbox(
    workspaceId: string,
    input: ConnectSmtpMailboxInput,
  ): Promise<RepositoryResult<SmtpMailbox>> {
    return request<{ mailbox: SmtpMailbox }>(`${BASE(workspaceId)}/mailboxes`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.mailbox } : r,
    );
  },

  verifyMailbox(
    workspaceId: string,
    mailboxId: string,
  ): Promise<RepositoryResult<{ ok: boolean; message: string }>> {
    return request(`${BASE(workspaceId)}/mailboxes/${encodeURIComponent(mailboxId)}/verify`, {
      method: "POST",
      body: "{}",
    });
  },

  deleteMailbox(
    workspaceId: string,
    mailboxId: string,
  ): Promise<RepositoryResult<{ deleted: boolean }>> {
    return request(`${BASE(workspaceId)}/mailboxes/${encodeURIComponent(mailboxId)}`, {
      method: "DELETE",
    });
  },

  listCampaigns(workspaceId: string): Promise<RepositoryResult<SmtpCampaign[]>> {
    return request<{ campaigns: SmtpCampaign[] }>(`${BASE(workspaceId)}`).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.campaigns } : r,
    );
  },

  getCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<SmtpCampaignDetail>> {
    return request<{ campaign: SmtpCampaignDetail }>(
      `${BASE(workspaceId)}/${encodeURIComponent(campaignId)}`,
    ).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.campaign } : r,
    );
  },

  createCampaign(
    workspaceId: string,
    input: CreateSmtpCampaignInput,
  ): Promise<RepositoryResult<SmtpCampaignDetail>> {
    return request<{ campaign: SmtpCampaignDetail }>(`${BASE(workspaceId)}`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.campaign } : r,
    );
  },

  updateCampaign(
    workspaceId: string,
    campaignId: string,
    input: Partial<CreateSmtpCampaignInput>,
  ): Promise<RepositoryResult<SmtpCampaignDetail>> {
    return request<{ campaign: SmtpCampaignDetail }>(
      `${BASE(workspaceId)}/${encodeURIComponent(campaignId)}`,
      { method: "POST", body: JSON.stringify(input) },
    ).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.campaign } : r,
    );
  },

  generateSample(
    workspaceId: string,
    input: { lead: SmtpRecipientInput; brief: string; fromName: string },
  ): Promise<RepositoryResult<PersonalizedEmail>> {
    return request<PersonalizedEmail>(`${BASE(workspaceId)}/sample`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  activateCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<SmtpCampaignDetail>> {
    return request<{ campaign: SmtpCampaignDetail }>(
      `${BASE(workspaceId)}/${encodeURIComponent(campaignId)}/activate`,
      { method: "POST", body: "{}" },
    ).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.campaign } : r,
    );
  },

  pauseCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<SmtpCampaign>> {
    return request<{ campaign: SmtpCampaign }>(
      `${BASE(workspaceId)}/${encodeURIComponent(campaignId)}/pause`,
      { method: "POST", body: "{}" },
    ).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.campaign } : r,
    );
  },

  resumeCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<SmtpCampaign>> {
    return request<{ campaign: SmtpCampaign }>(
      `${BASE(workspaceId)}/${encodeURIComponent(campaignId)}/resume`,
      { method: "POST", body: "{}" },
    ).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.campaign } : r,
    );
  },

  cancelCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<SmtpCampaign>> {
    return request<{ campaign: SmtpCampaign }>(
      `${BASE(workspaceId)}/${encodeURIComponent(campaignId)}/cancel`,
      { method: "POST", body: "{}" },
    ).then((r) =>
      r.status === "ready" ? { status: "ready", data: r.data.campaign } : r,
    );
  },

  deleteCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ deleted: boolean }>> {
    return request(`${BASE(workspaceId)}/${encodeURIComponent(campaignId)}`, {
      method: "DELETE",
    });
  },

  listSuppressions(workspaceId: string): Promise<RepositoryResult<SmtpSuppression[]>> {
    return request<{ suppressions: SmtpSuppression[] }>(`${BASE(workspaceId)}/suppressions`).then(
      (r) => (r.status === "ready" ? { status: "ready", data: r.data.suppressions } : r),
    );
  },

  deleteSuppression(
    workspaceId: string,
    email: string,
  ): Promise<RepositoryResult<{ deleted: boolean }>> {
    return request(`${BASE(workspaceId)}/suppressions/${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
  },
};
