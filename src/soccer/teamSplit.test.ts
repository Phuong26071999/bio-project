import { splitTeams, tierCounts } from './teamSplit';
import { Member } from './types';

const player = (id: string, tier: number): Member => ({ id, name: id, number: null, tier, goals: 0, avatar: '' });

// Deterministic RNG so the test is stable.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const power = (team: Member[]) => team.reduce((s, m) => s + m.tier, 0);
const ofTier = (team: Member[], tier: number) => team.filter((m) => m.tier === tier).length;

const ROSTERS: Record<string, number[]> = {
  mixed16: [5, 5, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 1, 1, 1],
  odd11: [5, 4, 4, 3, 3, 3, 3, 2, 2, 1, 1],
  topHeavy: [5, 5, 5, 5, 3, 3, 1, 1, 1, 1],
  allSame: [3, 3, 3, 3, 3, 3, 3],
};

test.each(Object.entries(ROSTERS))('two teams are fair for %s', (_, tiers) => {
  const players = tiers.map((t, i) => player(`p${i}`, t));
  for (let seed = 1; seed <= 30; seed++) {
    const [a, b] = splitTeams(players, 2, seeded(seed));
    expect([...a, ...b].map((m) => m.id).sort()).toEqual(players.map((p) => p.id).sort());
    expect(Math.abs(a.length - b.length)).toBeLessThanOrEqual(1);
    // Every tier is split as evenly as possible.
    [1, 2, 3, 4, 5].forEach((t) => expect(Math.abs(ofTier(a, t) - ofTier(b, t))).toBeLessThanOrEqual(1));
    // With an odd roster the extra player can't be avoided, so allow one top-tier gap;
    // with an even roster the teams must be within 2.
    expect(Math.abs(power(a) - power(b))).toBeLessThanOrEqual(players.length % 2 ? 5 : 2);
  }
});

test('random ties give different splits', () => {
  const players = ROSTERS.mixed16.map((t, i) => player(`p${i}`, t));
  const keys = new Set([1, 2, 3, 4, 5].map((s) => splitTeams(players, 2, seeded(s))[0].map((m) => m.id).sort().join()));
  expect(keys.size).toBeGreaterThan(1);
});

test('tierCounts lists strongest tiers first', () => {
  expect(tierCounts([player('a', 3), player('b', 5), player('c', 3)])).toEqual([{ tier: 5, count: 1 }, { tier: 3, count: 2 }]);
});

test('returns empty teams when there are no players', () => {
  expect(splitTeams([], 2)).toEqual([[], []]);
});
