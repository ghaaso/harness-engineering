const fs = require('fs');
const f = process.argv[2]; const from = process.argv[3] || '00:00'; const to = process.argv[4] || '24:00';
const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
const m = {};
for (const l of L) {
  const t = l.slice(0, 8);
  if (!/^\d\d:\d\d:\d\d$/.test(t)) continue;
  const mm = t.slice(0, 5);
  if (mm < from || mm > to) continue;
  const g = k => { const r = new RegExp(' ' + k + '=(\\d+)').exec(l); return r ? +r[1] : null; };
  const top = /top=(\S+)/.exec(l); let qh = null;
  if (top) { const q = /QHActiveDefense:(\d+)/.exec(top[1]); if (q) qh = +q[1]; }
  const o = m[mm] || (m[mm] = { n: 0, cpu: [], free: [], ps: [], node: [], procs: [], qh: [], commit: [] });
  o.n++; o.cpu.push(g('cpu')); o.free.push(g('free')); o.ps.push(g('ps')); o.node.push(g('node')); o.procs.push(g('procs'));
  if (g('commit') !== null) o.commit.push(g('commit'));
  if (qh !== null) o.qh.push(qh);
}
const mn = a => Math.min(...a), mx = a => Math.max(...a), av = a => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
for (const k of Object.keys(m).sort()) {
  const o = m[k];
  console.log(k, 'n=' + o.n, 'cpu=' + av(o.cpu), 'free=' + mn(o.free) + '-' + mx(o.free),
    'ps=' + mn(o.ps) + '-' + mx(o.ps) + '(avg ' + (o.ps.reduce((a, b) => a + b, 0) / o.n).toFixed(2) + ')',
    'node=' + mn(o.node) + '-' + mx(o.node), 'procs=' + mn(o.procs) + '-' + mx(o.procs),
    o.commit.length ? 'commit=' + mn(o.commit) + '-' + mx(o.commit) : '',
    o.qh.length ? ('qh=' + o.qh[0] + '->' + o.qh[o.qh.length - 1]) : '');
}
