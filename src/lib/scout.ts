/**
 * Scout Badge — awarded to the top ranked DSA warriors by ELO.
 *
 * Computed dynamically (no DB column) from a player's ELO rank, ranked
 * the same way the leaderboard ranks them (pure ELO, all rated rows —
 * so the badge always lines up with the visible top of the board).
 *
 * Cutoff = top 1%, but never fewer than `SCOUT_MIN` warriors — so on a
 * small population the elite few (not just rank #1) still earn it, and
 * at scale it tightens to a true top 1%.
 */

export const SCOUT_PERCENTILE = 0.01;
export const SCOUT_MIN = 3;

/** Number of warriors who hold the Scout mark for a given population. */
export function scoutCutoff(totalRanked: number): number {
  if (totalRanked <= 0) return 0;
  return Math.min(totalRanked, Math.max(SCOUT_MIN, Math.ceil(totalRanked * SCOUT_PERCENTILE)));
}

/** True if a 1-indexed rank falls within the Scout cutoff. */
export function isScoutRank(rank: number, totalRanked: number): boolean {
  const cutoff = scoutCutoff(totalRanked);
  return cutoff > 0 && rank >= 1 && rank <= cutoff;
}