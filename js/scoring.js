// KEEP IN LOCKSTEP with build/scoring.py (CI replay gate enforces the group rule;
// the knockout rule and its draw-without-pen-pick guard are mirrored manually).
const sign = x => (x > 0) - (x < 0);

export function groupPoints(actual, pred) {
  const [ah, aa] = actual, [ph, pa] = pred;
  let pts = 0;
  if (sign(ah - aa) === sign(ph - pa)) {
    pts++;
    if (ah - aa === ph - pa) {
      pts++;
      if (ah === ph && aa === pa) pts++;
    }
  }
  return pts;
}

export function knockoutPoints(actual, actualPen, pred, predPen) {
  const [ah, aa] = actual, [ph, pa] = pred;
  const actualDraw = ah === aa, predDraw = ph === pa;
  if (predDraw && predPen == null) {
    throw new Error("predPen must be 'H' or 'A' when pred is a draw");
  }
  if (!actualDraw) {
    if (predDraw) return predPen === (ah > aa ? 'H' : 'A') ? 1 : 0;
    if (sign(ah - aa) !== sign(ph - pa)) return 0;
    if (ah === ph && aa === pa) return 4;
    return ah - aa === ph - pa ? 3 : 2;
  }
  if (predDraw) {
    const rightPen = predPen === actualPen;
    if (ah === ph && aa === pa) return rightPen ? 4 : 3;
    return rightPen ? 3 : 2;
  }
  return (ph > pa ? 'H' : 'A') === actualPen ? 1 : 0;
}
