// Shared track + difficulty display metadata. Kept in one place so UI surfaces
// (week list, week detail, leaderboard) don't drift on colors / labels.

import type { ForgeTrack, ForgeDifficulty } from "./challenges";

export const TRACK_META: Record<ForgeTrack, {
  label: string;
  short: string;
  color: string;
  season: string;
  learnHref: string;       // deep link into /learn/agent for the matching season
  learnHint: string;       // shown on the "stuck?" CTA on the weekly challenge page
}> = {
  mental_models: {
    label: "Mental Models", short: "S0", color: "#06b6d4", season: "S0",
    learnHref: "/learn/agent?s=S0",
    learnHint: "Start with the S0 cards on how an LLM actually thinks before you attempt this build.",
  },
  daily_driver: {
    label: "Daily Driver", short: "S1", color: "#f59e0b", season: "S1",
    learnHref: "/learn/agent?s=S1",
    learnHint: "Run through the S1 Daily Driver cards on operating LLMs day-to-day — they unblock this challenge.",
  },
  operator_4d: {
    label: "4D Operator", short: "S2", color: "#a78bfa", season: "S2",
    learnHref: "/learn/agent?s=S2",
    learnHint: "The S2 4D Operator cards walk you through the judgment moves this challenge expects.",
  },
  agentic_eng: {
    label: "Agentic Engineering", short: "S3", color: "#34d399", season: "S3",
    learnHref: "/learn/agent?s=S3",
    learnHint: "Read the S3 Agentic Engineering cards first — they're the scaffolding for this build.",
  },
};

export const DIFFICULTY_META: Record<ForgeDifficulty, { label: string; color: string }> = {
  foundation: { label: "Foundation", color: "#34d399" },
  build:      { label: "Build",      color: "#06b6d4" },
  advanced:   { label: "Advanced",   color: "#a78bfa" },
  capstone:   { label: "Capstone",   color: "#f59e0b" },
};
