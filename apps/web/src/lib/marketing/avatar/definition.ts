import type { AvatarDefinition, AvatarExpressionDefinition } from "@bible-strong/avatar-core";

export type LogoMood =
  "idle" | "curious" | "working" | "happy" | "thinking" | "pointing" | "excited";

function expression(height = 1, tilt = 0): AvatarExpressionDefinition {
  return {
    head: { x: 0, y: 0, z: tilt },
    eyes: {
      left: { width: 1, height, x: 0, y: 0, angle: 0 },
      right: { width: 1, height, x: 0, y: 0, angle: 0 },
      spacing: 1,
    },
    perspective: 1,
    motion: { eyes: "none", body: "none" },
  };
}

// Avatar Lab supplies interpolation, timelines and blinking. Our renderer applies
// those values to the supplied flame SVG, preserving the original silhouette.
export const logoDefinition: AvatarDefinition = {
  schema: "bible-strong/avatar-definition",
  schemaVersion: 1,
  name: "QuickStart Ignition",
  body: {
    primary: { type: "sphere", width: 120, height: 120, depth: 120, roundness: 1 },
    nodes: [],
  },
  colors: { body: "#fa5d19", eyes: "#262626" },
  expressions: {
    neutral: expression(),
    curious: expression(1.12, -5),
    focused: expression(0.72, 3),
    happy: expression(0.55, -8),
    perk: expression(1.18, 7),
    pondering: {
      ...expression(0.8, -7),
      eyes: {
        left: { width: 1, height: 0.7, x: 0, y: 0, angle: 0 },
        right: { width: 1, height: 1.1, x: 0, y: 0, angle: 0 },
        spacing: 1,
      },
    },
    pointing: expression(1.12, 10),
    delighted: {
      ...expression(1.25, -10),
      motion: { eyes: "none", body: "shake" },
    },
  },
  expressionOrder: [
    "neutral",
    "curious",
    "focused",
    "happy",
    "perk",
    "pondering",
    "pointing",
    "delighted",
  ],
  animations: Object.fromEntries(
    (
      [
        ["idle", "neutral", "curious", 2400],
        ["curious", "curious", "neutral", 1300],
        ["working", "focused", "neutral", 1000],
        ["happy", "happy", "perk", 450],
        ["thinking", "pondering", "focused", 1100],
        ["pointing", "pointing", "curious", 900],
        ["excited", "delighted", "happy", 350],
      ] as const
    ).map(([key, first, second, holdMs]) => [
      key,
      {
        playbackMode: "loop" as const,
        steps: [
          { expression: first, holdMs, transitionMs: 420, transition: "smooth" as const },
          { expression: second, holdMs, transitionMs: 520, transition: "spring" as const },
        ],
        blink: {
          enabled: true,
          initialDelayMs: 1700,
          minIntervalMs: 2600,
          maxIntervalMs: 5200,
          durationMs: 170,
        },
      },
    ]),
  ),
  animationOrder: ["idle", "curious", "working", "happy", "thinking", "pointing", "excited"],
};
