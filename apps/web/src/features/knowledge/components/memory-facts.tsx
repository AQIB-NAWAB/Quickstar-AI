"use client";

import { MemoryWorkspace } from "./memory/memory-workspace";

interface MemoryFactsProps {
  workspaceId: string;
}

export function MemoryFacts({ workspaceId }: MemoryFactsProps) {
  return <MemoryWorkspace workspaceId={workspaceId} />;
}
