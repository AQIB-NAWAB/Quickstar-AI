import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type AccessTokenClaims = {
  sub: string;
  org_id: string;
  sid: string;
  email?: string;
};

export type AccessTokenVerifyResult = AccessTokenClaims & {
  exp: number;
  iat: number;
};

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  claims: AccessTokenClaims,
  options: { secret: string; ttlSeconds: number },
): Promise<string> {
  return new SignJWT(claims as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${options.ttlSeconds}s`)
    .sign(secretKey(options.secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenVerifyResult> {
  const { payload } = await jwtVerify(token, secretKey(secret), {
    algorithms: ["HS256"],
  });

  const sub = payload.sub;
  const org_id = payload.org_id;
  const sid = payload.sid;
  const email = typeof payload.email === "string" ? payload.email : undefined;

  if (typeof sub !== "string" || typeof org_id !== "string" || typeof sid !== "string") {
    throw new Error("invalid access token claims");
  }

  return {
    sub,
    org_id,
    sid,
    email,
    exp: typeof payload.exp === "number" ? payload.exp : 0,
    iat: typeof payload.iat === "number" ? payload.iat : 0,
  };
}

export function bearerTokenFromHeader(authorization: string | string[] | undefined): string | null {
  const raw = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!raw?.startsWith("Bearer ")) {
    return null;
  }
  const token = raw.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}
