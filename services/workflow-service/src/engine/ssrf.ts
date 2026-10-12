import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export async function assertSafeWebhookUrl(
  rawUrl: string,
  options: { allowHttp: boolean },
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Webhook URL is invalid");
  }

  if (parsed.protocol === "http:") {
    if (!options.allowHttp) {
      throw new Error("Webhook URL must use HTTPS");
    }
  } else if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL protocol must be HTTP or HTTPS");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Webhook URL must not include credentials");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Webhook host is not allowed");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error("Webhook host resolves to a private address");
    }
    return parsed;
  }

  const records = await lookup(hostname, { all: true });
  if (records.length === 0) {
    throw new Error("Webhook host could not be resolved");
  }
  for (const record of records) {
    if (isBlockedIp(record.address)) {
      throw new Error("Webhook host resolves to a private address");
    }
  }
  return parsed;
}
