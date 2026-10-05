"use client";

// Merged into the editorial playground component in code-playground.tsx
export type ModeType = "support" | "search" | "api";

export interface InteractiveUrlBarProps {
  onRun?: (mode: ModeType, prompt: string) => void;
  isLoading?: boolean;
}

export function InteractiveUrlBar({ onRun, isLoading }: InteractiveUrlBarProps) {
  // Backwards compatibility stub; playground controls are integrated into CodePlayground
  return null;
}
