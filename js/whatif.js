import { groupPoints } from './scoring.js';

const rankKey = p => [-p.total, -p.n3, -p.n2, -p.n1, p.tiebreak ?? 0];
const cmp = (a, b) => {
  const ka = rankKey(a), kb = rankKey(b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return 0;  // stable sort preserves data.json order = canonical (name-tiebroken) ranking
};

// hypotheticals: { matchNo: [homeGoals, awayGoals] }
export function applyWhatIf(players, hypotheticals) {
  const before = [...players].sort(cmp);
  const rankBefore = new Map(before.map((p, i) => [p.id, i + 1]));
  const out = players.map(p => {
    let gained = 0;
    const n = { n3: p.n3, n2: p.n2, n1: p.n1, n0: p.n0 };
    for (const [no, score] of Object.entries(hypotheticals)) {
      const pm = p.per_match[no];
      if (pm) {
        const pts = groupPoints(score, pm.pred);
        gained += pts;
        if (pts) n[`n${pts}`]++; else n.n0++;
      }
    }
    return { ...p, ...n, total: p.total + gained, gained,
             rankBefore: rankBefore.get(p.id) };
  });
  out.sort(cmp);
  return out.map((p, i) => ({ ...p, rankAfter: i + 1 }));
}
