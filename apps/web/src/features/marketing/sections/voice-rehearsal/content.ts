export interface CaptionSegment {
  start: number;
  end: number;
  speaker: "customer" | "agent";
  text: string;
}

export interface TranscriptEntry {
  id: string;
  speaker: "customer" | "agent";
  timestamp: string;
  seconds: number;
  text: string;
}

export interface RehearsalCall {
  id: string;
  title: string;
  callType: string;
  audioSrc: string | null;
  customerAudioSrc?: string | null;
  agentAudioSrc?: string | null;
  durationSeconds: number | null;
  peaks: number[];
  defaultExcerpt: {
    speaker: "customer" | "agent";
    text: string;
  };
  captions: CaptionSegment[];
  transcript: TranscriptEntry[];
}

/**
 * Deterministic decorative normalized amplitude peaks (0 to 1) calibrated to match
 * the speech rhythm and contour of the approved visual reference.
 */
export const DEFAULT_WAVEFORM_PEAKS: number[] = [
  .14,.25,.41,.55,.37,.48,.42,.65,.91,.98,.79,.62,.43,.28,
  .33,.49,.57,.65,.73,.84,.96,.78,.57,.39,.24,.20,.34,.40,
  .45,.25,.15,.37,.59,.67,.40,.52,.73,.57,.44,.30,.39,.26,
  .44,.32,.20,.38,.58,.66,.75,.98,.83,.63,.46,.31,.29,.45,
  .55,.71,.75,.61,.36,.28,.42,.57,.60,.73,.62,.46,.32,.23,
  .30,.26,.37,.51,.63,.69,.52,.42,.36,.45,.32,.29,.21,.18,
  .23,.18,.14,.11,.07,
];

/**
 * Demonstrates the approved initial test call specification.
 * `audioSrc` is explicitly set to null as no verified production or demo recordings
 * exist in the repository, per Rule 9 and section requirements.
 */
export const REHEARSAL_CALLS: RehearsalCall[] = [
  {
    id: "appointment-booking",
    title: "Appointment booking",
    callType: "Test call",
    audioSrc: null,
    customerAudioSrc: null,
    agentAudioSrc: null,
    durationSeconds: null,
    peaks: DEFAULT_WAVEFORM_PEAKS,
    defaultExcerpt: {
      speaker: "customer",
      text: "Thursday at 3 works for me.",
    },
    captions: [],
    transcript: [],
  },
];
