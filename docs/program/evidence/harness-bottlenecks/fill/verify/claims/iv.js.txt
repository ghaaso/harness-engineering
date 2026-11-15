// Line interval of a read: [a,b] (b = Infinity for a whole file), or null when not a line read (grep, git, ls ...).
const K = require('./cls.js');
module.exports = function iv(tn, ti) {
  ti = ti || {};
  if (tn === 'Read') { if (ti.offset == null && ti.limit == null) return [1, Infinity]; const a = Math.max(1, +ti.offset || 1); return [a, a + (+ti.limit || 2000) - 1]; }
  const f = K.fine(tn, ti);
  if (f === 'cat') return [1, Infinity];
  if (f.startsWith('sed range')) { const m = K.strip(ti.command).match(/(\d+),(\d+)p/); return m ? [+m[1], +m[2]] : null; }
  return null;
};
// Fraction of [a,b] already covered by the list L of earlier intervals.
module.exports.covered = function (x, L) {
  if (!L.length) return 0;
  if (x[1] === Infinity) return L.some((y) => y[1] === Infinity) ? 1 : -1; // -1: whole file after ranges only, unknown
  let pts = []; for (const y of L) { const a = Math.max(x[0], y[0]), b = Math.min(x[1], y[1]); if (a <= b) pts.push([a, b]); }
  pts.sort((p, q) => p[0] - q[0]); let cov = 0, end = x[0] - 1;
  for (const [a, b] of pts) { if (b > end) { cov += b - Math.max(a, end + 1) + 1; end = b; } }
  return cov / (x[1] - x[0] + 1);
};
