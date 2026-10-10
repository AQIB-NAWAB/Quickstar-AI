const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    request_id?: string;
  };
}

export async function fetchGateway<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${GATEWAY_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // For HTTP-only cookies
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        error: {
          code: data.code || `HTTP_${res.status}`,
          message: data.message || res.statusText || "Request failed",
          request_id: data.request_id,
        },
      };
    }

    return { data };
  } catch (err: any) {
    return {
      error: {
        code: "NETWORK_ERROR",
        message: err.message || "Failed to communicate with API Gateway",
      },
    };
  }
}
