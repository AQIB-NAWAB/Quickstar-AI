import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

type Params = { params: { workspaceId: string; conversationId: string } };

type MessageRow = {
  sender_type?: string;
  text?: string;
};

function envValue(name: string): string {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
  ];
  for (const file of candidates) {
    try {
      const text = readFileSync(file, "utf8");
      const match = text.match(new RegExp(`^${name}=(.*)$`, "m"));
      const value = match?.[1]?.trim();
      if (value) return value;
    } catch {
      /* Next's working directory may not be the repo root. */
    }
  }
  return "";
}

export async function POST(_request: Request, { params }: Params) {
  const { workspaceId, conversationId } = params;
  const listed = await proxyToGateway<{ messages?: MessageRow[] }>(
    `/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/messages?limit=80`,
  );
  if (!listed.ok) return listed.response;

  const lines = (listed.data.messages ?? [])
    .filter((message) => message.text?.trim() && message.sender_type !== "system")
    .map((message) => {
      const who =
        message.sender_type === "user"
          ? "Visitor"
          : message.sender_type === "human"
            ? "Staff"
            : "Bot";
      return `${who}: ${message.text!.trim()}`;
    });

  if (lines.length < 2) {
    return NextResponse.json({
      summary: null,
      ready: false,
    });
  }

  const token = envValue("INTERNAL_TOKEN") || envValue("MODEL_GATEWAY_INTERNAL_TOKEN");
  const base = (envValue("MODEL_GATEWAY_URL") || "http://127.0.0.1:3005").replace(/\/$/, "");
  if (!token) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE", message: "Summary model is not configured" } },
      { status: 503 },
    );
  }

  const transcript = lines.join("\n").slice(0, 8000);
  const res = await fetch(`${base}/internal/complete`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      request_id: crypto.randomUUID(),
      model: {
        profile: envValue("INBOX_SUMMARY_PROFILE") || "groq",
        model_id: envValue("INBOX_SUMMARY_MODEL") || envValue("LEAD_MODEL_ID") || "openai/gpt-oss-120b",
      },
      temperature: 0.2,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "You write a short inbox summary for a support agent. Use 2 or 3 plain sentences. Say what the visitor wanted, what the bot or staff answered, and how the chat stands now. No bullet list and no markdown.",
        },
        { role: "user", content: transcript },
      ],
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    content?: string;
    error?: { message?: string };
  };
  if (!res.ok || !body.content?.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: body.error?.message || "Could not summarize this chat",
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ summary: body.content.trim(), ready: true });
}
