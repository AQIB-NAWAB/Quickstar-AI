export type GuideSurface = "plain" | "orange" | "dark" | "grey";
const colors: Record<GuideSurface, string> = { plain: "#fa5d19", orange: "#262626", dark: "#ffffff", grey: "#262626" };
export const guideSurfaceColor = (surface: GuideSurface) => colors[surface];

export function classifyBackground(color: string): GuideSurface {
  const values = color.match(/[\d.]+/g)?.map(Number);
  if (!values || values.length < 3 || (values[3] ?? 1) < .8) return "plain";
  const [red, green, blue] = values;
  if (red >= 200 && green >= 35 && green <= 175 && blue <= 110 && red > green * 1.4) return "orange";
  const channels = [red, green, blue].map(value => {
    const v = value / 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  // White on dark/medium grey; black on lighter grey where white loses contrast.
  if (luminance < .3) return "dark";
  if (luminance < .65) return "grey";
  return "plain";
}

/** Ignore the companion itself and transparent layers when reading the painted background. */
export function backgroundAt(x: number, y: number): GuideSurface {
  if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return "plain";
  const behind = document.elementsFromPoint(x, y).find(element =>
    !element.closest(".spark-guide, .spark-guide-connector"));
  for (let element = behind; element; element = element.parentElement ?? undefined) {
    const color = getComputedStyle(element).backgroundColor;
    const values = color.match(/[\d.]+/g)?.map(Number);
    if (!values || values.length < 3 || (values[3] ?? 1) < .8) continue;
    return classifyBackground(color);
  }
  return "plain";
}

/** A boundary touching any dark or orange panel must remain readable on that panel too. */
export function footprintSurface(x: number, y: number, radius: number): GuideSurface {
  const samples = [[0, 0], [-radius, 0], [radius, 0], [0, -radius], [0, radius]]
    .map(([dx, dy]) => backgroundAt(x + dx, y + dy));
  if (samples.includes("dark")) return "dark";
  if (samples.includes("orange")) return "orange";
  if (samples.includes("grey")) return "grey";
  return "plain";
}
