import {
  DEFAULT_TURN_DETECTOR,
  type FrameEnergy,
  type TurnDetector,
  type TurnDetectorConfig,
  type TurnDetectorEvent,
} from "./types.js";

const SPEECH_THRESHOLD = 0.15;

export class SilenceTurnDetector implements TurnDetector {
  readonly profileId: string;
  private readonly config: TurnDetectorConfig;
  private speaking = false;
  private speechMs = 0;
  private silenceMs = 0;

  constructor(profileId = "default", config: Partial<TurnDetectorConfig> = {}) {
    this.profileId = profileId;
    this.config = { ...DEFAULT_TURN_DETECTOR, ...config };
  }

  reset(): void {
    this.speaking = false;
    this.speechMs = 0;
    this.silenceMs = 0;
  }

  push(frame: FrameEnergy, ttsPlaying: boolean): TurnDetectorEvent[] {
    const events: TurnDetectorEvent[] = [];
    const isSpeech = frame.energy >= SPEECH_THRESHOLD;

    if (ttsPlaying && isSpeech && this.config.interruptWindowMs > 0) {
      events.push({ type: "barge_in" });
      this.reset();
      this.speaking = true;
      this.speechMs = frame.durationMs;
      return events;
    }

    if (isSpeech) {
      if (!this.speaking) {
        events.push({ type: "speech_start" });
        this.speaking = true;
      }
      this.speechMs += frame.durationMs;
      this.silenceMs = 0;
      return events;
    }

    if (!this.speaking) {
      return events;
    }

    this.silenceMs += frame.durationMs;
    const silenceTarget = this.config.eager
      ? Math.max(150, Math.floor(this.config.silenceMs * 0.75))
      : this.config.silenceMs;

    if (this.speechMs >= this.config.minUtteranceMs && this.silenceMs >= silenceTarget) {
      events.push({ type: "end_of_turn" });
      this.reset();
    }
    return events;
  }
}
