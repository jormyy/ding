import type { Traits } from "./personality";

export type Mood = {
  focus: number;      // 0..1 — rises when team converges
  confidence: number; // 0..1 — own confidence in current placements
  concern: number;    // 0..1 — rises when teammates churn or reject us
};

export function newMood(): Mood {
  return { focus: 0.5, confidence: 0.5, concern: 0.2 };
}

export function onTeammateChurn(m: Mood, traits: Traits): void {
  m.concern = Math.min(1, m.concern + 0.1 + 0.2 * traits.neuroticism);
  m.focus = Math.max(0, m.focus - 0.05);
}

export function onProposalAccepted(m: Mood): void {
  m.confidence = Math.min(1, m.confidence + 0.1);
  m.concern = Math.max(0, m.concern - 0.05);
}

export function onProposalRejected(m: Mood, traits: Traits): void {
  m.confidence = Math.max(0, m.confidence - 0.08 * (1 - traits.decisiveness));
  m.concern = Math.min(1, m.concern + 0.08 * traits.neuroticism);
}

export function onTeamConverged(m: Mood): void {
  m.focus = Math.min(1, m.focus + 0.08);
  m.concern = Math.max(0, m.concern - 0.1);
}

export function onPhaseBoundary(m: Mood): void {
  // Partial reset — carry some mood across phases but settle toward baseline.
  m.focus = 0.5 + 0.5 * (m.focus - 0.5);
  m.concern *= 0.7;
}

export function onRoundBoundary(m: Mood): void {
  m.focus = 0.5;
  m.confidence = 0.5;
  m.concern = 0.2;
}

// Mood modulates traits for the next decision. Worried bots become slower +
// more conscientious; confident bots become more decisive.
export function moodAdjustedTraits(t: Traits, m: Mood): Traits {
  return {
    ...t,
    conscientiousness: Math.min(1, t.conscientiousness + 0.2 * m.concern),
    decisiveness: Math.max(0, Math.min(1, t.decisiveness + 0.15 * m.confidence - 0.15 * m.concern)),
    hesitationProb: Math.min(0.5, t.hesitationProb + 0.1 * m.concern),
    baseThinkMs: Math.round(t.baseThinkMs * (1 + 0.2 * m.concern - 0.1 * m.focus)),
    thinkPerDifficultyMs: Math.round(t.thinkPerDifficultyMs * (1 + 0.25 * m.concern)),
  };
}
