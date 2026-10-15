/**
 * Delay before the cascade commits a visitor turn.
 * A finished sentence commits quickly. A trailing conjunction waits, so a pause
 * mid-thought does not start the agent talking.
 */
const OPEN_ENDING =
  /(?:\b(?:and|or|but|so|because|if|when|using|with|of|the|a|an|to|for|by|um|uh|like|aur|lekin|kyunke|کہ|اور|لیکن|تو)\s*)$/iu;

export function eagerCommitDelayMs(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length < 8) return 420;
  if (OPEN_ENDING.test(trimmed)) return 560;
  if (/[.?!۔؟]$/.test(trimmed)) return 40;
  return 180;
}

/** Relative energy 0..1. Frames under the floor are room noise, not a barge-in. */
export function frameEnergy(pcm: Buffer): number {
  if (pcm.length < 2) return 0;
  let sum = 0;
  const samples = pcm.length / 2;
  for (let i = 0; i < pcm.length; i += 2) {
    sum += Math.abs(pcm.readInt16LE(i));
  }
  return Math.min(1, sum / samples / 8000);
}

/** Speech has to clear room noise and paper rustle before it counts as an interruption. */
export const BARGE_IN_ENERGY = 0.2;
