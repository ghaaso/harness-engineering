'use strict';
// Cross-check equivalence of two ranked lists (protocol addendum 2, E.19):
//   1. the same reach set (node ids), and the same hop per node;
//   2. the same score per node within EPS (both null, or |a - b| <= EPS);
//   3. the same rank order wherever two scores differ by more than EPS: each list must be ordered
//      by score descending with no later item scoring more than EPS above an earlier one (ties within
//      EPS may come in any order). For rankings without a score (bfs: score null) the order must be
//      identical, because the order IS the specification there;
//   4. every explanation path (item.path, node ids from a seed) is a valid shortest path: checked by
//      the reference arm's explainChecker (starts at a seed, hop edges of the named kinds, each one
//      allowed by direction, classes, minConf, the traversal's state machine, no blocked interior node).
// strict(a, b) is the byte comparison kept for relational versus reference.
const EPS = 1e-9;

function strict(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function sortedDesc(list) {
  let min = Infinity;
  for (let j = 0; j < list.length; j++) {
    const s = list[j].score;
    if (s - min > EPS) return j; // a later item scores more than EPS above an earlier one
    if (s < min) min = s;
  }
  return -1;
}

// returns {ok, reason, at} ; check = optional (item) -> null | reason for explanation paths
function equivalent(A, B, checkA, checkB) {
  if (A.length !== B.length) return { ok: false, reason: 'reach size ' + A.length + ' vs ' + B.length };
  const mb = new Map(B.map((x, j) => [x.i, x]));
  for (const x of A) {
    const y = mb.get(x.i);
    if (!y) return { ok: false, reason: 'node ' + x.i + ' only in A' };
    if (x.hop !== y.hop) return { ok: false, reason: 'hop of ' + x.i + ': ' + x.hop + ' vs ' + y.hop };
    const na = x.score == null; const nb = y.score == null;
    if (na !== nb) return { ok: false, reason: 'score of ' + x.i + ' null in one list' };
    if (!na && Math.abs(x.score - y.score) > EPS) return { ok: false, reason: 'score of ' + x.i + ': ' + x.score + ' vs ' + y.score };
  }
  const scored = A.length && A[0].score != null;
  if (!scored) {
    for (let j = 0; j < A.length; j++) if (A[j].i !== B[j].i) return { ok: false, reason: 'order differs at ' + j + ' (unscored ranking)', at: j };
  } else {
    const ja = sortedDesc(A); if (ja >= 0) return { ok: false, reason: 'A not in score order at ' + ja, at: ja };
    const jb = sortedDesc(B); if (jb >= 0) return { ok: false, reason: 'B not in score order at ' + jb, at: jb };
  }
  for (const [L, chk, nm] of [[A, checkA, 'A'], [B, checkB, 'B']]) {
    if (!chk) continue;
    for (let j = 0; j < L.length; j++) {
      const r = chk(L[j]);
      if (r) return { ok: false, reason: nm + ' explanation of ' + L[j].i + ': ' + r, at: j };
    }
  }
  return { ok: true };
}

module.exports = { equivalent, strict, EPS };
