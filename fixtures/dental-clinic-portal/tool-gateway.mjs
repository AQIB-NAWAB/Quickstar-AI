import crypto from "node:crypto";
import http from "node:http";

const port = Number(process.env.DENTAL_TOOL_GATEWAY_PORT ?? 4001);
const token = process.env.DENTAL_DEMO_TOOL_TOKEN?.trim();
if (!token || token.length < 32) {
  throw new Error("DENTAL_DEMO_TOOL_TOKEN must be set to a random value of at least 32 characters");
}

function tokenMatches(value) {
  if (!value) return false;
  const provided = Buffer.from(value);
  const expected = Buffer.from(token);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  const quickstartLlm = req.method === "POST" && pathname === "/v1/chat/completions";
  const allowed =
    quickstartLlm ||
    (req.method === "GET" && pathname === "/api/slots") ||
    (req.method === "POST" && (pathname === "/api/book" || pathname === "/api/inquiry"));
  if (!allowed) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "NOT_FOUND" }));
    return;
  }
  if (quickstartLlm && !String(req.headers.authorization ?? "").startsWith("Bearer ")) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }));
    return;
  }
  if (!quickstartLlm && !tokenMatches(req.headers["x-dentalstrivers-demo-token"])) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }));
    return;
  }

  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > (quickstartLlm ? 131_072 : 16_384)) {
        res.writeHead(413, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "PAYLOAD_TOO_LARGE" }));
        return;
      }
      chunks.push(chunk);
    }
    const response = await fetch(quickstartLlm
      ? "http://127.0.0.1:3000/v1/chat/completions"
      : `http://127.0.0.1:4000${pathname}`, {
      method: req.method,
      headers: req.method === "POST"
        ? {
            "content-type": "application/json",
            ...(quickstartLlm ? {
              authorization: String(req.headers.authorization),
              accept: String(req.headers.accept ?? "application/json"),
            } : {}),
          }
        : undefined,
      body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
      signal: AbortSignal.timeout(quickstartLlm ? 60_000 : 10_000),
    });
    if (quickstartLlm) {
      res.writeHead(response.status, {
        "content-type": response.headers.get("content-type") ?? "application/json",
        "cache-control": response.headers.get("cache-control") ?? "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });
      res.flushHeaders?.();
      if (!response.body) {
        res.end();
        return;
      }
      try {
        for await (const chunk of response.body) {
          if (!res.write(Buffer.from(chunk))) {
            await new Promise((resolve) => res.once("drain", resolve));
          }
        }
        res.end();
      } catch {
        res.destroy();
      }
      return;
    }
    res.writeHead(response.status, {
      "content-type": response.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "INQUIRY_SERVICE_UNAVAILABLE" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Dental Strivers tool gateway listening on 127.0.0.1:${port}`);
});
