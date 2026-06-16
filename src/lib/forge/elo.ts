// N-way tournament-style Elo for a weekly challenge.
// Each submitter is ranked 1..N by overall_score.
// Delta against the average submitter Elo, expected-score model.

const K_FACTOR = 24;

export interface EloInput {
  user_id: string;
  elo: number;
  overall_score: number;
}

export interface EloResult {
  user_id: string;
  rank: number;
  elo_before: number;
  elo_after: number;
  elo_delta: number;
}

export function computeWeeklyEloDeltas(submitters: EloInput[]): EloResult[] {
  const n = submitters.length;
  if (n === 0) return [];

  // Higher overall_score = better rank (1 = best).
  // Stable sort by score desc, tiebreak by lower elo first (small upset bonus).
  const sorted = [...submitters].sort((a, b) => {
    if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
    return a.elo - b.elo;
  });

  const eAvg = sorted.reduce((s, x) => s + x.elo, 0) / n;

  if (n === 1) {
    // Single submitter: no comparative signal, no Elo move. Still record rank.
    const only = sorted[0];
    return [{
      user_id: only.user_id,
      rank: 1,
      elo_before: only.elo,
      elo_after: only.elo,
      elo_delta: 0,
    }];
  }

  return sorted.map((u, idx) => {
    const rank = idx + 1;
    const expected = 1 / (1 + Math.pow(10, (eAvg - u.elo) / 400));
    const actual = (n - rank) / (n - 1); // 1.0 best, 0.0 last
    const rawDelta = K_FACTOR * (actual - expected);
    const delta = Math.round(rawDelta);
    const after = Math.max(600, u.elo + delta);
    return {
      user_id: u.user_id,
      rank,
      elo_before: u.elo,
      elo_after: after,
      elo_delta: after - u.elo,
    };
  });
}
