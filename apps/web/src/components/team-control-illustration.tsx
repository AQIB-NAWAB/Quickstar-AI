"use client";

import { useState } from "react";
import { Branches, Lockers, Vault } from "@lucasmarkes/hairline/react";
import { MousePointer2, Pause, Play } from "lucide-react";
import type { PlatformViewTab } from "./platform-control-demo";

const ILLUSTRATIONS = {
  versions: {
    Component: Branches,
    hint: "Trace a version’s history",
    label: "Illustration of version history. Move over a node to lift its history.",
  },
  workspaces: {
    Component: Lockers,
    hint: "Explore separate spaces",
    label: "Illustration of separate workspaces. Move over a compartment to open it.",
  },
  permissions: {
    Component: Vault,
    hint: "Explore the access dial",
    label: "Illustration of protected access. Circle the dial to turn it.",
  },
};

/** One quiet, contextual object; existing controls remain the functional demo. */
export function TeamControlIllustration({ active }: { active: PlatformViewTab }) {
  const [playing, setPlaying] = useState(false);
  const { Component, hint, label } = ILLUSTRATIONS[active];

  return (
    <figure className="team-control-illustration">
      <Component
        key={active}
        theme="light"
        intensity={0.3}
        play={playing}
        label={label}
        className="team-control-figure"
      />
      <figcaption>
        <span>
          <MousePointer2 aria-hidden="true" />
          {hint}
        </span>
        <button
          type="button"
          aria-pressed={playing}
          aria-label={playing ? "Pause team illustration" : "Preview team illustration motion"}
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {playing ? "Pause" : "Preview"}
        </button>
      </figcaption>
    </figure>
  );
}
