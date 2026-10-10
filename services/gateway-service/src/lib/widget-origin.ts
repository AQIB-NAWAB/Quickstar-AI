export function requestOrigin(originHeader: string | undefined, refererHeader: string | undefined): string | undefined {
  if (originHeader?.trim()) {
    try {
      return new URL(originHeader.trim()).origin;
    } catch {
      return undefined;
    }
  }
  if (refererHeader?.trim()) {
    try {
      return new URL(refererHeader.trim()).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function isOriginAllowed(requestOriginValue: string | undefined, allowed: string[]): boolean {
  if (!requestOriginValue) {
    return false;
  }
  return allowed.some((entry) => entry === requestOriginValue || entry === "*");
}
