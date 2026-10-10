export interface GuidePoint { x: number; y: number }
export interface GuideBounds { left: number; right: number; top: number; bottom: number }
export type GuideSide = "left" | "right" | "above" | "below";

/** Leave an 18px clearance around the whole character hit box, including its motion. */
export function placeGuide(
  bounds: GuideBounds,
  width: number,
  height: number,
  viewport: { width: number; height: number },
  obstacles: GuideBounds[] = [],
  preferredSide?: GuideSide,
): GuidePoint & { side: GuideSide } {
  const gap = 18;
  const x = (bounds.left + bounds.right) / 2;
  const y = (bounds.top + bounds.bottom) / 2;
  const halfX = width / 2, halfY = height / 2;
  const outward: GuideSide = x < viewport.width / 2 ? "left" : "right";
  const candidates: Record<GuideSide, GuidePoint> = {
    left: { x: bounds.left - gap - halfX, y },
    right: { x: bounds.right + gap + halfX, y },
    above: { x, y: bounds.top - gap - halfY },
    below: { x, y: bounds.bottom + gap + halfY },
  };
  const sides: GuideSide[] = [...(preferredSide ? [preferredSide] : []), outward, outward === "left" ? "right" : "left", "below", "above"];
  for (const side of sides) {
    const point = candidates[side];
    // Shift only along the parallel axis: never change the clearance from the control.
    if (side === "above" || side === "below")
      point.x = Math.max(halfX + 12, Math.min(viewport.width - halfX - 12, point.x));
    else point.y = Math.max(100 + halfY, Math.min(viewport.height - halfY - 12, point.y));
    if (point.x - halfX >= 12 && point.x + halfX <= viewport.width - 12 &&
        point.y - halfY >= 100 && point.y + halfY <= viewport.height - 12 &&
        !obstacles.some(other => point.x + halfX + 8 > other.left && point.x - halfX - 8 < other.right &&
          point.y + halfY + 8 > other.top && point.y - halfY - 8 < other.bottom))
      return { ...point, side };
  }
  // For a control spanning the visible area, keep the same gap outside its top edge.
  return { ...candidates.above, side: "above" };
}
