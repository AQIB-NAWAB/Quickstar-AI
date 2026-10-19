import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { publicAddress } from "@quickstart/utilities";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "169.254.169.254"]);

export function isBlockedIp(ip: string): boolean {
  return !publicAddress(ip);
}

export async function assertSafeWebhookUrl(
  rawUrl: string,
  options: { allowHttp?: boolean } = {},
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Webhook URL is invalid");
  }

  if (parsed.protocol === "http:") {
    if (!options.allowHttp && process.env.NODE_ENV === "production") {
      throw new Error("Webhook URL must use HTTPS in production");
    }
  } else if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL protocol must be HTTP or HTTPS");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Webhook URL must not include credentials");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Webhook host is blocked");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error("Webhook host resolves to a private or reserved address");
    }
    return parsed;
  }

  const records = await lookup(hostname, { all: true });
  if (records.length === 0) {
    throw new Error("Webhook host could not be resolved");
  }
  for (const record of records) {
    if (isBlockedIp(record.address)) {
      throw new Error("Webhook host resolves to a private or reserved address");
    }
  }
  return parsed;
}

export async function sendSafeWebhook(
  url: URL,
  options: { method?: string; headers: Record<string, string>; body?: string; timeoutMs?: number },
): Promise<{ status: number; statusText: string; text: string; headers: Record<string, string> }> {
  const method = options.method || "POST";
  const timeoutMs = options.timeoutMs ?? 10_000;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true });

  if (!addresses.length || addresses.some((r) => isBlockedIp(r.address))) {
    throw new Error("Webhook destination is not a public address");
  }

  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).request(
      url,
      {
        method,
        headers: { ...options.headers, "Accept-Encoding": "identity" },
        signal: AbortSignal.timeout(timeoutMs),
        lookup: (_host, opts, callback) => {
          if (opts.all) callback(null, addresses as never);
          else callback(null, addresses[0].address, addresses[0].family);
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const respHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(response.headers)) {
          if (v !== undefined) respHeaders[k] = Array.isArray(v) ? v.join(", ") : v;
        }

        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 65536) {
            response.destroy(new Error("Webhook response exceeds 64 KiB limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 500,
            statusText: response.statusMessage ?? "",
            text: Buffer.concat(chunks).toString("utf8"),
            headers: respHeaders,
          });
        });
      },
    );

    request.on("error", reject);
    if (options.body && method !== "GET" && method !== "HEAD") {
      request.write(options.body);
    }
    request.end();
  });
}
