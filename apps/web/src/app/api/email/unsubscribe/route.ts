import { NextResponse } from "next/server";
import { gatewayBaseUrl } from "@/lib/server/gateway/fetch";

function page(message: string, state: "confirm" | "done" | "error", token: string): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Unsubscribe — QuickStart AI</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #F8F9FB; color: #262626; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 24px; }
  .card { background: #fff; border: 1px solid #ededed; border-radius: 16px; padding: 32px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  h1 { font-size: 18px; margin: 0 0 8px; }
  p { font-size: 13px; color: #71717A; line-height: 1.6; margin: 0 0 20px; }
  button { background: #fa5d19; color: #fff; border: 0; border-radius: 8px; padding: 10px 20px; font-size: 13px; font-weight: 600; cursor: pointer; }
  button.secondary { background: #fff; color: #262626; border: 1px solid #ededed; margin-right: 8px; }
  .ok { color: #027A48; font-weight: 600; }
  .err { color: #B42318; font-weight: 600; }
</style>
</head>
<body>
<div class="card">
  <h1>${state === "done" ? "You're unsubscribed" : state === "error" ? "Unsubscribe failed" : "Unsubscribe from these emails?"}</h1>
  ${
    state === "confirm"
      ? `<p>${message}</p>
<form method="POST">
  <input type="hidden" name="token" value="${token.replace(/"/g, "&quot;")}" />
  <button type="submit">Unsubscribe me</button>
</form>`
      : `<p class="${state === "done" ? "ok" : "err"}">${message}</p>`
  }
</div>
</body>
</html>`;
  return new NextResponse(html, {
    status: state === "error" ? 400 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) {
    return page("This unsubscribe link is invalid.", "error", "");
  }
  return page(
    "You will no longer receive marketing emails from this campaign.",
    "confirm",
    token,
  );
}

export async function POST(request: Request) {
  let token = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    token = body.token ?? "";
  } else {
    const form = await request.formData().catch(() => null);
    token = String(form?.get("token") ?? "");
  }
  if (!token) {
    return page("This unsubscribe link is invalid.", "error", "");
  }

  try {
    const res = await fetch(`${gatewayBaseUrl()}/v1/public/email-campaigns/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!res.ok) {
      return page("This unsubscribe link is invalid or has expired.", "error", "");
    }
    return page("You have been removed from this campaign's list.", "done", "");
  } catch {
    return page("Could not reach the unsubscribe service. Please try again later.", "error", "");
  }
}
