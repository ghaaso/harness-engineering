// Per-minute: growth of QHActiveDefense working set vs. lower-bound counts of new powershell / node / any processes
const fs = require('fs');
const L = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const from = process.argv[3] || '04:01', to = process.argv[4] || '05:04';
const S = [];
for (const l of L) {
  const t = l.slice(0, 8);
  if (!/^\d\d:\d\d:\d\d$/.test(t)) continue;
  const g = k => { const r = new RegExp(' ' + k + '=(\\d+)').exec(l); return r ? +r[1] : null; };
  const q = /QHActiveDefense:(\d+)/.exec(l);
  S.push({ t, mm: t.slice(0, 5), ps: g('ps'), node: g('node'), procs: g('procs'), cpu: g('cpu'), qh: q ? +q[1] : null });
}
const rows = {};
for (let i = 1; i < S.length; i++) {
  const a = S[i - 1], b = S[i];
  if (b.mm < from || b.mm > to) continue;
  const r = rows[b.mm] || (rows[b.mm] = { psUp: 0, nodeUp: 0, procsUp: 0, psSamplesAbove2: 0, n: 0, q0: null, q1: null, cpu: 0 });
  r.n++;
  r.psUp += Math.max(0, b.ps - a.ps);
  r.nodeUp += Math.max(0, b.node - a.node);
  r.procsUp += Math.max(0, b.procs - a.procs);
  r.psSamplesAbove2 += Math.max(0, b.ps - 2);
  r.cpu += b.cpu;
  if (b.qh !== null) { if (r.q0 === null) r.q0 = a.qh !== null ? a.qh : b.qh; r.q1 = b.qh; }
}
const keys = Object.keys(rows).sort();
const X = [], Y = [];
let tot = { g: 0, ps: 0, node: 0, procs: 0, psS: 0 };
for (const k of keys) {
  const r = rows[k];
  const g = (r.q0 !== null && r.q1 !== null) ? r.q1 - r.q0 : null;
  console.log(k, 'growth=' + g, 'psUp=' + r.psUp, 'psSampleExcess=' + r.psSamplesAbove2, 'nodeUp=' + r.nodeUp, 'procsUp=' + r.procsUp, 'cpu=' + Math.round(r.cpu / r.n));
  if (g !== null) { X.push([r.psUp, r.nodeUp, r.procsUp]); Y.push(g); tot.g += g; tot.ps += r.psUp; tot.node += r.nodeUp; tot.procs += r.procsUp; tot.psS += r.psSamplesAbove2; }
}
console.log('TOTAL', JSON.stringify(tot), 'minutes=' + Y.length);
// simple correlations
const corr = (a, b) => { const n = a.length, ma = a.reduce((x, y) => x + y) / n, mb = b.reduce((x, y) => x + y) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
console.log('corr(growth, psUp)=' + corr(Y, X.map(x => x[0])).toFixed(2), 'corr(growth, nodeUp)=' + corr(Y, X.map(x => x[1])).toFixed(2), 'corr(growth, procsUp)=' + corr(Y, X.map(x => x[2])).toFixed(2), 'corr(psUp,nodeUp)=' + corr(X.map(x => x[0]), X.map(x => x[1])).toFixed(2));
// minutes with no ps increase
const zero = keys.filter(k => rows[k].psUp === 0 && rows[k].q0 !== null);
let gz = 0; for (const k of zero) gz += rows[k].q1 - rows[k].q0;
console.log('minutes with psUp=0: ' + zero.length + ', growth in them: ' + gz + ' MB; ' + zero.map(k => k + ':' + (rows[k].q1 - rows[k].q0) + '/nodeUp' + rows[k].nodeUp).join(' '));
// least squares growth ~ a*psUp + b*nodeUp + c
function ols(X, Y) { const n = X.length, p = X[0].length + 1; const A = Array.from({ length: p }, () => Array(p).fill(0)), B = Array(p).fill(0); for (let i = 0; i < n; i++) { const x = [...X[i], 1]; for (let j = 0; j < p; j++) { B[j] += x[j] * Y[i]; for (let k = 0; k < p; k++) A[j][k] += x[j] * x[k]; } } for (let j = 0; j < p; j++) { let m = j; for (let r = j + 1; r < p; r++) if (Math.abs(A[r][j]) > Math.abs(A[m][j])) m = r;[A[j], A[m]] = [A[m], A[j]];[B[j], B[m]] = [B[m], B[j]]; for (let r = 0; r < p; r++) if (r !== j) { const f = A[r][j] / A[j][j]; for (let k = j; k < p; k++) A[r][k] -= f * A[j][k]; B[r] -= f * B[j]; } } return B.map((b, j) => b / A[j][j]); }
console.log('OLS growth ~ psUp + nodeUp + 1: ' + ols(X.map(x => [x[0], x[1]]), Y).map(v => v.toFixed(2)).join(', '));
console.log('OLS growth ~ psUp + 1: ' + ols(X.map(x => [x[0]]), Y).map(v => v.toFixed(2)).join(', '));
console.log('OLS growth ~ nodeUp + 1: ' + ols(X.map(x => [x[1]]), Y).map(v => v.toFixed(2)).join(', '));
