import { randomUUID } from "node:crypto";

export type EmailLeadForPersonalization = {
  email: string;
  name?: string;
  company?: string;
  website?: string;
  category?: string;
  location?: string;
  summary?: string;
  notes?: string;
  fitReasons?: string[];
  evidence?: Array<{
    field?: string;
    value?: string;
    source_url?: string;
    quote?: string;
  }>;
};

export type PersonalizedEmail = {
  subject: string;
  html: string;
  source: "ai" | "fallback";
};

export type PersonalizeEmailOptions = {
  lead: EmailLeadForPersonalization;
  brief: string;
  fromName: string;
};

function parseGeneratedEmail(content: string): { subject: string; html: string } | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    const subject = typeof parsed.subject === "string" ? parsed.subject.trim() : "";
    const rawHtml =
      typeof parsed.html === "string"
        ? parsed.html
        : typeof parsed.body === "string"
          ? parsed.body
          : "";
    if (!subject || !rawHtml.trim()) return null;
    const html = /<[a-z][\s\S]*>/i.test(rawHtml)
      ? rawHtml.replace(/<script[\s\S]*?<\/script>/gi, "")
      : plainTextHtml(rawHtml);
    return { subject: subject.slice(0, 150), html };
  } catch {
    return null;
  }
}

function plainTextHtml(value: string): string {
  const trimmed = value.trim();
  const escaped = trimmed.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">${escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("")}</div>`;
}

export function fallbackEmailForLead(
  options: PersonalizeEmailOptions,
): PersonalizedEmail {
  const { lead, brief, fromName } = options;
  const recipient = lead.name ? lead.name.split(/\s+/)[0] : "there";
  const context =
    lead.summary ||
    lead.notes ||
    (lead.company
      ? `I came across ${lead.company}${
          lead.category ? ` while looking at ${lead.category} businesses` : ""
        }${lead.location ? ` in ${lead.location}` : ""}.`
      : "");
  const html = plainTextHtml(
    [
      `Hi ${recipient},`,
      brief,
      context,
      "Would you be open to a quick 10-minute call this week?",
      `Best,\n${fromName}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
  return {
    subject: `A quick idea for ${lead.company || "your practice"}`.slice(0, 150),
    html,
    source: "fallback",
  };
}

export async function personalizeEmailForLead(
  workspaceId: string,
  options: PersonalizeEmailOptions,
): Promise<PersonalizedEmail> {
  const { lead, brief, fromName } = options;

  const internalToken = process.env.MODEL_GATEWAY_INTERNAL_TOKEN;
  if (!internalToken) return fallbackEmailForLead(options);
  const baseUrl = (process.env.MODEL_GATEWAY_URL ?? "http://127.0.0.1:3005").replace(/\/$/, "");
  const profile = process.env.EMAIL_CAMPAIGN_MODEL_PROFILE?.trim() || "groq";
  const modelId = process.env.EMAIL_CAMPAIGN_MODEL_ID?.trim() || "openai/gpt-oss-120b";

  try {
    const res = await fetch(`${baseUrl}/internal/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${internalToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        workspace_id: workspaceId,
        request_id: randomUUID(),
        model: { profile, model_id: modelId },
        messages: [
          {
            role: "system",
            content:
              'You write concise, personalized B2B cold emails. Return strict JSON only: {"subject":"...","html":"..."}. Use 80-130 words. Be specific and friendly. Reference the lead\'s company, category, location, and one concrete detail from the summary or evidence. Do not invent facts. Include one clear call to action. Use simple HTML with <p> tags. No markdown fences.',
          },
          {
            role: "user",
            content: `Campaign brief:\n${brief}\n\nSender: ${fromName}\n\nLead details JSON:\n${JSON.stringify({
              email: lead.email,
              name: lead.name ?? "",
              company: lead.company ?? "",
              website: lead.website ?? "",
              category: lead.category ?? "",
              location: lead.location ?? "",
              summary: lead.summary ?? "",
              notes: lead.notes ?? "",
              fitReasons: (lead.fitReasons ?? []).slice(0, 5),
              evidence: (lead.evidence ?? []).slice(0, 5),
            })}`,
          },
        ],
        max_tokens: 900,
        temperature: 0.6,
      }),
    });
    if (!res.ok) return fallbackEmailForLead(options);
    const body = (await res.json()) as { content?: string };
    const parsed = parseGeneratedEmail(String(body.content ?? ""));
    if (parsed) return { ...parsed, source: "ai" };
  } catch {
    // Fall through to the deterministic personalized template.
  }
  return fallbackEmailForLead(options);
}
