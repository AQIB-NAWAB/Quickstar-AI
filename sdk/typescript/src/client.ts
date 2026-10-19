import { parseEventStream } from "./sse.js";
import type {
  Agent,
  ClientOptions,
  Conversation,
  DialOptions,
  MessageTurn,
  StreamEvent,
  TargetInput,
  TelephonyNumber,
  WebhookSubscription,
} from "./types.js";
import { verifyWebhookSignature } from "./webhook.js";

export class QuickStartError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "QuickStartError";
  }
}

export class QuickStartClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly accessToken?: string;
  private readonly timeoutMs: number;
  private readonly workspaceId?: string;
  private readonly fetchImpl: typeof fetch;

  public readonly webhooks = {
    verifySignature: verifyWebhookSignature,
    list: async (workspaceId?: string): Promise<WebhookSubscription[]> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ webhooks: WebhookSubscription[] }>(
        `/v1/workspaces/${wsId}/webhooks`,
      );
      return res.webhooks;
    },
    create: async (
      input: { url: string; events: string[] },
      workspaceId?: string,
    ): Promise<WebhookSubscription> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ webhook: WebhookSubscription }>(
        `/v1/workspaces/${wsId}/webhooks`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      return res.webhook;
    },
  };

  public readonly agents = {
    list: async (workspaceId?: string): Promise<Agent[]> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ agents: Agent[] }>(`/v1/workspaces/${wsId}/agents`);
      return res.agents;
    },
    get: async (agentId: string, workspaceId?: string): Promise<Agent> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ agent: Agent }>(`/v1/workspaces/${wsId}/agents/${agentId}`);
      return res.agent;
    },
    create: async (
      input: {
        name: string;
        system_prompt: string;
        model?: string;
        description?: string;
        temperature?: number;
      },
      workspaceId?: string,
    ): Promise<Agent> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ agent: Agent }>(`/v1/workspaces/${wsId}/agents`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.agent;
    },
  };

  public readonly conversations = {
    list: async (workspaceId?: string): Promise<Conversation[]> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ conversations: Conversation[] }>(
        `/v1/workspaces/${wsId}/conversations`,
      );
      return res.conversations;
    },
    create: async (
      agentId: string,
      metadata?: Record<string, unknown>,
      workspaceId?: string,
    ): Promise<Conversation> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ conversation: Conversation }>(
        `/v1/workspaces/${wsId}/conversations`,
        {
          method: "POST",
          body: JSON.stringify({ agent_id: agentId, metadata }),
        },
      );
      return res.conversation;
    },
    sendTurn: async (
      conversationId: string,
      content: string,
      workspaceId?: string,
    ): Promise<MessageTurn> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ turn: MessageTurn }>(
        `/v1/workspaces/${wsId}/conversations/${conversationId}/turns`,
        {
          method: "POST",
          body: JSON.stringify({ content, stream: false }),
        },
      );
      return res.turn;
    },
    streamTurn: async function* (
      this: QuickStartClient,
      conversationId: string,
      content: string,
      workspaceId?: string,
    ): AsyncGenerator<StreamEvent, void, undefined> {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.rawRequest(
        `/v1/workspaces/${wsId}/conversations/${conversationId}/turns`,
        {
          method: "POST",
          headers: {
            accept: "text/event-stream",
          },
          body: JSON.stringify({ content, stream: true }),
        },
      );
      if (!res.body) {
        throw new QuickStartError(500, "NO_RESPONSE_BODY", "Streaming response body is null");
      }
      yield* parseEventStream(res.body);
    }.bind(this),
  };

  public readonly telephony = {
    listNumbers: async (workspaceId?: string): Promise<TelephonyNumber[]> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ numbers: TelephonyNumber[] }>(
        `/v1/workspaces/${wsId}/telephony/numbers`,
      );
      return res.numbers;
    },
    bindNumber: async (
      phoneNumber: string,
      agentId: string,
      workspaceId?: string,
    ): Promise<TelephonyNumber> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      const res = await this.request<{ number: TelephonyNumber }>(
        `/v1/workspaces/${wsId}/telephony/numbers`,
        {
          method: "POST",
          body: JSON.stringify({ phone_number: phoneNumber, agent_id: agentId }),
        },
      );
      return res.number;
    },
    dial: async (opts: DialOptions, workspaceId?: string): Promise<Record<string, unknown>> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      return this.request(`/v1/workspaces/${wsId}/telephony/dial`, {
        method: "POST",
        body: JSON.stringify({
          conversation_id: opts.conversationId,
          to_e164: opts.toE164,
          from_e164: opts.fromE164,
          agent_id: opts.agentId,
          utterance_text: opts.utteranceText,
        }),
      });
    },
  };

  public readonly campaigns = {
    addTargets: async (
      campaignId: string,
      targets: TargetInput[],
      workspaceId?: string,
    ): Promise<{ imported: number }> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      return this.request(`/v1/workspaces/${wsId}/campaigns/${campaignId}/targets`, {
        method: "POST",
        body: JSON.stringify({ targets }),
      });
    },
  };

  public readonly knowledge = {
    retrieve: async (
      query: string,
      topK = 5,
      workspaceId?: string,
    ): Promise<{ chunks: Array<{ text: string; score: number }> }> => {
      const wsId = this.requireWorkspaceId(workspaceId);
      return this.request(`/v1/workspaces/${wsId}/knowledge/retrieve`, {
        method: "POST",
        body: JSON.stringify({ query, top_k: topK }),
      });
    },
  };

  public readonly billing = {
    getSummary: async (orgId: string): Promise<Record<string, unknown>> => {
      return this.request(`/v1/organizations/${orgId}/billing`);
    },
  };

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:3000").replace(/\/$/, "");
    this.apiKey = options.apiKey ?? (typeof process !== "undefined" ? process.env.QUICKSTART_API_KEY : undefined);
    this.accessToken = options.accessToken;
    this.workspaceId = options.workspaceId;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private requireWorkspaceId(explicit?: string): string {
    const wsId = explicit ?? this.workspaceId;
    if (!wsId) {
      throw new QuickStartError(
        400,
        "WORKSPACE_ID_REQUIRED",
        "workspaceId must be provided in method parameters or client options",
      );
    }
    return wsId;
  }

  private async rawRequest(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };

    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    } else if (this.accessToken) {
      headers["authorization"] = `Bearer ${this.accessToken}`;
    }

    const res = await this.fetchImpl(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let parsed: { error?: { code?: string; message?: string } } = {};
      try {
        parsed = JSON.parse(text);
      } catch {}

      const code = parsed.error?.code ?? `HTTP_${res.status}`;
      const message = parsed.error?.message ?? text ?? res.statusText;
      const reqId = res.headers.get("x-request-id") ?? undefined;
      throw new QuickStartError(res.status, code, message, reqId);
    }

    return res;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.rawRequest(path, init);
    return res.json() as Promise<T>;
  }
}
