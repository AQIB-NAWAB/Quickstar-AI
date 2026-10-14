import { fetchWithPolicy } from "@quickstart/utilities";

export async function postInternalJson<T>(
  baseUrl: string,
  path: string,
  internalToken: string,
  body: unknown,
  requestId: string,
  timeoutMs: number,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; json: T }> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetchWithPolicy(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${internalToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-request-id": requestId,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    },
    { timeoutMs, maxRetries: 0 },
  );
  const json = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, json };
}

export async function getInternalJson<T>(
  baseUrl: string,
  path: string,
  internalToken: string,
  requestId: string,
  timeoutMs: number,
): Promise<{ status: number; json: T }> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetchWithPolicy(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${internalToken}`,
        Accept: "application/json",
        "x-request-id": requestId,
      },
    },
    { timeoutMs, maxRetries: 0 },
  );
  const json = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, json };
}

/** GET and return the raw upstream response (for SSE proxying). */
export async function getInternalRaw(
  baseUrl: string,
  path: string,
  internalToken: string,
  requestId: string,
  timeoutMs: number,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  return fetchWithPolicy(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${internalToken}`,
        "x-request-id": requestId,
        ...extraHeaders,
      },
    },
    { timeoutMs, maxRetries: 0 },
  );
}

/** POST and return the raw upstream response (for SSE proxying). */
export async function postInternalRaw(
  baseUrl: string,
  path: string,
  internalToken: string,
  body: unknown,
  requestId: string,
  timeoutMs: number,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  return fetchWithPolicy(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${internalToken}`,
        "Content-Type": "application/json",
        "x-request-id": requestId,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    },
    { timeoutMs, maxRetries: 0 },
  );
}
