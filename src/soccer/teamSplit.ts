import { Member } from './types';
import { teamPower } from './utils';

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Splits players into `count` teams so that:
 *  - every tier is spread evenly (e.g. two S players never land on the same team),
 *  - team sizes differ by at most one,
 *  - total strength (sum of tiers) stays as close as possible.
 * Players of the same tier are shuffled first, so "Chia ngẫu nhiên" gives a
 * different but equally fair split each time.
 */
export function splitTeams(players: Member[], count: number, rng: () => number = Math.random): Member[][] {
  const teams: Member[][] = Array.from({ length: count }, () => []);
  if (!players.length || count < 2) return teams;

  const tiers = Array.from(new Set(players.map((p) => p.tier))).sort((a, b) => b - a);
  // Each player goes to the team with the fewest players, then the fewest of
  // this tier, then the lowest total strength; remaining ties are random.
  tiers.forEach((tier) => {
    shuffle(players.filter((p) => p.tier === tier), rng).forEach((player) => {
      const order = shuffle(teams.map((_, i) => i), rng).sort((a, b) =>
        teams[a].length - teams[b].length
        || teams[a].filter((m) => m.tier === tier).length - teams[b].filter((m) => m.tier === tier).length
        || teamPower(teams[a]) - teamPower(teams[b]));
      teams[order[0]].push(player);
    });
  });

  // Then swap players between teams while it narrows the strength gap,
  // never letting any tier become uneven by more than one.
  const spread = () => {
    const powers = teams.map(teamPower);
    return Math.max(...powers) - Math.min(...powers);
  };
  const tiersEven = () => tiers.every((tier) => {
    const counts = teams.map((t) => t.filter((m) => m.tier === tier).length);
    return Math.max(...counts) - Math.min(...counts) <= 1;
  });
  for (let iter = 0; iter < 100; iter++) {
    const current = spread();
    if (current === 0) break;
    let best = { a: -1, i: -1, b: -1, j: -1, value: current };
    for (let a = 0; a < count; a++) {
      for (let b = a + 1; b < count; b++) {
        for (let i = 0; i < teams[a].length; i++) {
          for (let j = 0; j < teams[b].length; j++) {
            const pa = teams[a][i];
            const pb = teams[b][j];
            if (pa.tier === pb.tier) continue;
            teams[a][i] = pb; teams[b][j] = pa;
            const value = spread();
            if (value < best.value && tiersEven()) best = { a, i, b, j, value };
            teams[a][i] = pa; teams[b][j] = pb;
          }
        }
      }
    }
    if (best.a < 0) break;
    const { a, i, b, j } = best;
    [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]];
  }
  return teams;
}

/** "S×1 A×2 B×5" style summary, strongest first. */
export function tierCounts(team: Member[]): { tier: number; count: number }[] {
  const counts = new Map<number, number>();
  team.forEach((m) => counts.set(m.tier, (counts.get(m.tier) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[0] - a[0]).map(([tier, count]) => ({ tier, count }));
}
