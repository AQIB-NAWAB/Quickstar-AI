import type { LogoMood } from "./definition";

export function suggestionFor(control: HTMLElement): { mood: LogoMood; message: string } {
  const label = (control.getAttribute("aria-label") || control.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
  const lower = label.toLowerCase();
  if (/start building|get started|sign in/.test(lower))
    return { mood: "pointing", message: "Curious? Take a look at what's coming." };
  if (/find a lead/.test(lower))
    return { mood: "pointing", message: "Try this step. It starts with a lead." };
  if (/start a conversation/.test(lower))
    return { mood: "curious", message: "See how a lead becomes a conversation." };
  if (/take the next action/.test(lower))
    return { mood: "excited", message: "Here's where the agent gets work done." };
  if (/add a document/.test(lower))
    return { mood: "pointing", message: "Give the preview agent something to learn." };
  if (/connect a tool/.test(lower))
    return { mood: "excited", message: "Give it a tool. See what it can do." };
  if (/instructions/.test(lower))
    return { mood: "thinking", message: "Tell your agent how you'd like it to help." };
  if (/test|send|try/.test(lower))
    return { mood: "excited", message: "Go on. Try your agent in the preview." };
  if (/edit.*draft/.test(lower))
    return { mood: "pointing", message: "Try an edit. The published version stays put." };
  if (/plan|pricing|compare/.test(lower))
    return { mood: "thinking", message: "Explore the proposed plans before you decide." };
  if (/pause|resume/.test(lower))
    return { mood: "curious", message: "Set the pace. You're in control." };
  if (/reset/.test(lower))
    return { mood: "curious", message: "Want a fresh start? Reset the example." };
  if (/remove|delete|disconnect/.test(lower))
    return { mood: "thinking", message: "Take a moment. This removes it from the preview." };
  const short = label.replace(/^\d+\s*/, "").replace(/[.!]$/, "");
  return {
    mood: "pointing",
    message:
      short && short.length <= 42
        ? `Want to explore ${short.toLowerCase()}?`
        : "Try this control. See what happens.",
  };
}
