/** Express route params may be typed as `string | string[]`; we only register single-segment params. */
export function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? (value[0] ?? "") : value;
}
