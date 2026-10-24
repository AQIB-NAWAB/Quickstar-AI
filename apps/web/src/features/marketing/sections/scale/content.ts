export interface CallTimelineData {
  id: string;
  name: string;
  initial: string;
  start: number; // in minutes from 9:00
  end: number;   // in minutes from 9:00
  waveformPattern: number[]; // sequence of deterministic amplitude heights (in px)
}

export const TIMELINE_START_TIME = 0; // 9:00
export const TIMELINE_END_TIME = 15;  // 9:15
export const DEFAULT_PLAYHEAD_TIME = 7.85;

export const RULER_TICKS = [
  { time: 0, label: "9:00", pct: 0 },
  { time: 5, label: "9:05", pct: 33.333 },
  { time: 10, label: "9:10", pct: 66.667 },
  { time: 15, label: "9:15", pct: 100 },
];

export const CALLS_DATA: CallTimelineData[] = [
  {
    id: "maya",
    name: "Maya",
    initial: "M",
    start: 1.0,
    end: 8.8,
    waveformPattern: [
      3, 5, 8, 12, 17, 21, 23, 20, 16, 11, 6, 4, 5, 8, 14, 19, 23, 22, 17, 12,
      7, 5, 6, 10, 16, 21, 22, 19, 14, 9, 6, 4, 4, 3,
    ],
  },
  {
    id: "james",
    name: "James",
    initial: "J",
    start: 4.0,
    end: 13.8,
    waveformPattern: [
      4, 6, 9, 14, 18, 22, 21, 17, 11, 6, 5, 7, 12, 17, 22, 23, 19, 13, 8, 5,
      6, 11, 16, 21, 22, 18, 12, 7, 5, 8, 14, 19, 22, 20, 15, 10, 6, 4, 4, 3,
    ],
  },
  {
    id: "alex",
    name: "Alex",
    initial: "A",
    start: 2.8,
    end: 9.9,
    waveformPattern: [
      4, 7, 11, 16, 21, 23, 20, 15, 9, 5, 4, 6, 10, 16, 21, 23, 22, 18, 12, 7,
      5, 4, 8, 13, 18, 20, 16, 11, 6, 4, 3,
    ],
  },
  {
    id: "sara",
    name: "Sara",
    initial: "S",
    start: 3.9,
    end: 15.0,
    waveformPattern: [
      4, 6, 10, 15, 20, 23, 21, 17, 11, 6, 5, 8, 14, 20, 23, 21, 16, 10, 6, 5,
      9, 15, 21, 23, 20, 15, 9, 5, 7, 13, 19, 22, 20, 14, 9, 5, 7, 13, 18, 21,
      17, 12, 7, 5, 4, 3,
    ],
  },
  {
    id: "daniel",
    name: "Daniel",
    initial: "D",
    start: 5.1,
    end: 11.1,
    waveformPattern: [
      3, 5, 9, 14, 19, 23, 21, 16, 11, 6, 4, 6, 11, 17, 22, 22, 18, 12, 7, 5,
      8, 14, 19, 21, 17, 11, 6, 4, 3,
    ],
  },
  {
    id: "nina",
    name: "Nina",
    initial: "N",
    start: 8.2,
    end: 14.6,
    waveformPattern: [
      4, 6, 10, 16, 21, 23, 19, 14, 8, 5, 5, 9, 15, 20, 23, 21, 16, 10, 6, 5,
      8, 14, 19, 21, 17, 11, 6, 4, 3,
    ],
  },
];

export function isCallActive(call: CallTimelineData, time: number): boolean {
  return call.start <= time && time < call.end;
}

export function getActiveCallsCount(calls: CallTimelineData[], time: number): number {
  return calls.filter((c) => isCallActive(c, time)).length;
}

export function formatActiveCallsLabel(count: number): string {
  if (count === 0) return "No calls at this moment";
  if (count === 1) return "1 call at once";
  return `${count} calls at once`;
}

export function formatAriaValueText(time: number, count: number): string {
  const totalSeconds = Math.round(time * 60);
  const minutesPart = Math.floor(totalSeconds / 60);
  const secondsPart = totalSeconds % 60;
  const displayMinute = secondsPart >= 30 ? minutesPart + 1 : minutesPart;
  const padMinute = displayMinute < 10 ? `0${displayMinute}` : `${displayMinute}`;
  const timeStr = `9:${padMinute} AM`;
  const callText = formatActiveCallsLabel(count);
  return `${timeStr}, ${callText}`;
}
