// R8 refuter. Wilson intervals for the replay precisions, union projections from old-entry fire rates,
// filter (cheap judge) arithmetic, and the base-rate cap. Inputs typed from r8-replay.json output.
const wilson = (k, n, z = 1.96) => { const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - m) / d, (c + m) / d].map(x => +(100 * x).toFixed(1)); };
const rows = [
  ['D6 K1 as published (fired PRs)', 1, 25], ['D6 K3 as published', 2, 49], ['D6 K10 as published', 3, 88],
  ['D6-replica K1, forward fires only', 1, 12], ['D6-replica K3, forward fires only', 2, 31],
  ['fwd K1 all tokens', 2, 23], ['fwd K3 all tokens', 4, 100], ['fwd K1 symbol-ish', 1, 8], ['fwd K3 symbol-ish', 2, 47], ['fwd K5 AND>=2', 2, 20], ['fwd K10 AND>=3', 1, 20],
];
for (const [n, k, t] of rows) console.log(`${n}: ${k}/${t} = ${(100 * k / t).toFixed(1)}%  Wilson95 ${wilson(k, t).join('-')}%  wrong per right ${((t - k) / k).toFixed(1)}`);
// union projection: independence with the per-entry fire rate measured on entries 61+ PRs old
const old = { 'fwd K1 symbol-ish (caught 1/4)': 1 / 747, 'fwd K1 all tokens (2/4)': 2 / 747, 'fwd K5 AND>=2 (2/4)': 4 / 747, 'fwd K3 symbol-ish (2/4)': 15 / 747, 'fwd K3 all tokens (4/4)': 33 / 747 };
for (const [k, r] of Object.entries(old)) console.log(`${k}: old-entry rate ${(100 * r).toFixed(2)}%/PR -> union at 50 = ${(100 * (1 - Math.pow(1 - r, 50))).toFixed(0)}%, at 133 = ${(100 * (1 - Math.pow(1 - r, 133))).toFixed(0)}%; per-entry max for 10% at 133 = ${(100 * (1 - Math.pow(0.9, 1 / 133))).toFixed(3)}%`);
// base-rate cap: 5 known repeats fall in 4 distinct PRs (two land in the same PR)
for (const t of [3, 4, 5]) console.log(`cap at 10% union with ${t} true PRs: ${(100 * t / 15.4).toFixed(1)}%`);
// cheap judge on each fire: posterior precision for prior p0, sensitivity se, specificity sp
for (const p0 of [0.04, 0.10]) for (const [se, sp] of [[0.87, 0.80], [0.87, 0.90], [0.87, 0.94], [0.87, 0.98]]) console.log(`prior ${p0} judge se ${se} sp ${sp} -> precision ${(100 * p0 * se / (p0 * se + (1 - p0) * (1 - sp))).toFixed(0)}%`);
// higher base rate: same false fires, k-times the true repeats
for (const m of [2, 5]) for (const [n, k, t] of [['fwd K1 symbol-ish', 1, 8], ['fwd K5 AND>=2', 2, 20], ['fwd K3 all', 4, 100]]) console.log(`base rate x${m}, ${n}: ${(100 * m * k / (t - k + m * k)).toFixed(0)}%`);
