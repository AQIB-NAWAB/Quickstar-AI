export type TurnDetectorConfig = {
  /** Silence after speech before end-of-turn (ms). Lower = more eager. */
  silenceMs: number;
  minUtteranceMs: number;
  /** Window where barge-in is accepted while TTS plays. */
  interruptWindowMs: number;
  eager: boolean;
};

export const DEFAULT_TURN_DETECTOR: TurnDetectorConfig = {
  silenceMs: 400,
  minUtteranceMs: 200,
  interruptWindowMs: 250,
  eager: true,
};

export type FrameEnergy = {
  /** Relative energy 0..1 */
  energy: number;
  durationMs: number;
};

export type TurnDetectorEvent =
  | { type: "speech_start" }
  | { type: "end_of_turn" }
  | { type: "barge_in" };

export interface TurnDetector {
  readonly profileId: string;
  reset(): void;
  /** Feed frame energies; returns events for this frame. */
  push(frame: FrameEnergy, ttsPlaying: boolean): TurnDetectorEvent[];
}
