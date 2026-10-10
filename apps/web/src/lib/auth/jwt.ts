export function getJwtExpiryUnix(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf8"),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function accessTokenNeedsRefresh(token: string, thresholdSec: number): boolean {
  const exp = getJwtExpiryUnix(token);
  if (exp === null) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return exp - now < thresholdSec;
}
