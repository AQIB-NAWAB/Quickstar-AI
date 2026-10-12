import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";

/** Reject internal, special-use and IPv4-mapped IPv6 destinations; fail closed. */
export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 192 && b === 0) ||
      (a === 198 && b === 51) ||
      (a === 203 && b === 0)
    );
  }
  if (isIP(address) === 6) {
    const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const first = parseInt(canonical.split(":")[0] || "0", 16);
    // Global-unicast only, excluding documentation and special transition ranges.
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      !/^2001:(db8|0|2|10|20):/i.test(canonical) &&
      !/^2002:/i.test(canonical)
    );
  }
  return false;
}
export async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    (u.port && !["80", "443"].includes(u.port))
  )
    throw new Error("UNSAFE_URL");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (!host.includes(".") && !isIP(host))
  )
    throw new Error("UNSAFE_URL");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("UNSAFE_URL");
  return u;
}
/** Pins validated DNS answers into the socket lookup, revalidates redirects, bounds streaming bytes. */
export async function fetchPublicText(
  raw: string,
  opts: { timeoutMs: number; maxBytes: number; maxRedirects?: number },
): Promise<{ text: string; finalUrl: string; contentType: string }> {
  const deadline = Date.now() + opts.timeoutMs;
  let url = raw;
  for (let redirect = 0; redirect <= (opts.maxRedirects ?? 4); redirect++) {
    const u = await assertPublicUrl(url);
    const host = u.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await lookup(host, { all: true });
    if (addresses.some((a) => !publicAddress(a.address))) throw new Error("UNSAFE_URL");
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("WEB_TIMEOUT");
    const result = await new Promise<{
      text: string;
      status: number;
      location?: string;
      contentType: string;
    }>((resolve, reject) => {
      const req = (u.protocol === "https:" ? https : http).request(
        u,
        {
          method: "GET",
          signal: AbortSignal.timeout(remaining),
          headers: {
            "user-agent": "QuickStart-WebFetch/1.0",
            accept: "text/html,text/plain;q=0.9",
            "accept-encoding": "identity",
          },
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, addresses as never);
            else callback(null, addresses[0].address, addresses[0].family);
          },
        },
        (res) => {
          const status = res.statusCode ?? 500;
          if (status >= 300 && status < 400) {
            res.resume();
            resolve({ status, text: "", location: res.headers.location, contentType: "" });
            return;
          }
          if (status < 200 || status >= 300) {
            res.resume();
            reject(new Error(`WEB_HTTP_${status}`));
            return;
          }
          const chunks: Buffer[] = [];
          let bytes = 0;
          res.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > opts.maxBytes) {
              res.destroy();
              reject(new Error("WEB_TOO_LARGE"));
            } else chunks.push(chunk);
          });
          res.on("error", reject);
          res.on("end", () =>
            resolve({
              status,
              text: Buffer.concat(chunks).toString("utf8"),
              contentType: String(res.headers["content-type"] ?? ""),
            }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    });
    if (result.status >= 300 && result.status < 400) {
      if (!result.location) throw new Error("WEB_INVALID_REDIRECT");
      url = new URL(result.location, u).href;
      continue;
    }
    return { text: result.text, finalUrl: u.href, contentType: result.contentType };
  }
  throw new Error("WEB_REDIRECT_LIMIT");
}
