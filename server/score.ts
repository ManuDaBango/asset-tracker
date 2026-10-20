import type { Asset } from "./types";
import { normaliseText, similarity } from "./similarity";

// The clues we get from a report or a label photo. All optional.
export type Evidence = {
  brand?: string;
  model?: string;
  category?: string;
  site?: string;
};

// How much each clue matters. Model is the most distinctive.
const WEIGHTS = { model: 0.5, brand: 0.2, category: 0.15, site: 0.15 } as const;
type Field = keyof typeof WEIGHTS;

// Like similarity(), but "Dell" vs "Dell Inc" counts as a perfect match.
export function fieldScore(a: string, b: string): number {
  const x = normaliseText(a);
  const y = normaliseText(b);
  if (!x || !y) return 0;
  const shorter = x.length <= y.length ? x : y;
  const longer = x.length <= y.length ? y : x;
  if (shorter.length >= 4 && longer.includes(shorter)) return 1;
  return similarity(a, b);
}

export type CandidateScore = {
  score: number;                       // 0 to 1
  fieldsUsed: Field[];                 // which clues we could actually compare
  parts: Partial<Record<Field, number>>; // each clue's own score, for explaining later
};

export function scoreCandidate(evidence: Evidence, asset: Asset): CandidateScore {
  const parts: Partial<Record<Field, number>> = {};
  let total = 0;
  let weightUsed = 0;

  for (const field of Object.keys(WEIGHTS) as Field[]) {
    const have = evidence[field];
    const want = asset[field];
    if (!have || !want) continue; // missing clue: skip it, don't punish

    const s = fieldScore(have, want);
    parts[field] = s;
    total += s * WEIGHTS[field];
    weightUsed += WEIGHTS[field];
  }

  const score = weightUsed === 0 ? 0 : total / weightUsed;
  return { score, fieldsUsed: Object.keys(parts) as Field[], parts };
}