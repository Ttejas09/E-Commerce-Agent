// Brand & Copy Constants — Warm, Human Editorial Voice

export const APP_NAME = "The Anticipatory Shop";
export const APP_TAGLINE = "An agent that listens, understands, and locks in early.";

export interface SampleRequest {
  id: string;
  chipLabel: string;
  tag: "hinglish" | "correction" | "late_constraint" | "plain";
  text: string;
  targetId: string;
  description: string;
}

export const SAMPLE_REQUESTS: SampleRequest[] = [
  {
    id: "sample-hinglish",
    chipLabel: "Try: Hinglish",
    tag: "hinglish",
    text: "mujhe Loomsy green casual shoes size eight chahiye please",
    targetId: "P0109",
    description: "Code-mixed Hindi with number word and politeness cue",
  },
  {
    id: "sample-correction",
    chipLabel: "Try: correction",
    tag: "correction",
    text: "show me black no wait white sneakers size 8 under 3000",
    targetId: "P0086", // or P0063
    description: "Mid-stream reversal: black → white",
  },
  {
    id: "sample-late-constraint",
    chipLabel: "Try: late constraint",
    tag: "late_constraint",
    text: "show me Sonquil headphones under 7500, also, in blue for my brother",
    targetId: "P0982",
    description: "Arrives sounding finished, then adds blue",
  },
  {
    id: "sample-plain",
    chipLabel: "Try: plain accumulation",
    tag: "plain",
    text: "I want Loomsy navy blue casual sneakers within forty five hundred size 7",
    targetId: "P0086",
    description: "Spelled out numbers and multiple descriptive tokens",
  },
];
