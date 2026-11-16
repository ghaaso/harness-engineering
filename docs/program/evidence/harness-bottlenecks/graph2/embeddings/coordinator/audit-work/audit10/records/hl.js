'use strict';
const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const A = JSON.parse(fs.readFileSync(L + '/r58c/A/mounts-A.json', 'utf8'));
const match = (pat, s) => { if (!pat.includes('{ARM}')) return pat === s; const [a, b] = pat.split('{ARM}'); return s.startsWith(a) && s.endsWith(b) && /^[A-Z0-9]+$/.test(s.slice(a.length, s.length - b.length)); };
for (const f of ['kge-H1', 'kge-H1P', 'kge-H1R']) {
  const t = fs.readFileSync(L + '/heldout-launch/' + f + '-launch.log', 'utf8').split(/\r?\n/);
  t.forEach((l, i) => {
    if (!/docker run/.test(l)) return;
    const name = (l.match(/--name (\S+)/) || [])[1];
    const vs = [...l.matchAll(/-v (\S+)/g)].map((m) => { const v = m[1]; const k = v.indexOf(':', 2); const r = v.slice(k + 1); const ro = r.endsWith(':ro'); return { src: v.slice(0, k), dst: ro ? r.slice(0, -3) : r, mode: ro ? 'ro' : 'rw' }; });
    const al = (A[name] || {}).allow || [];
    const ex = vs.filter((x) => !al.find((a) => match(a.src, x.src) && match(a.dst, x.dst) && a.mode === x.mode));
    const mi = al.filter((a) => !vs.find((x) => match(a.src, x.src) && match(a.dst, x.dst) && a.mode === x.mode));
    const imgs = [...new Set(l.match(/sha256:[0-9a-f]{64}/g) || [])].map((x) => x.slice(7, 15));
    console.log(f + ':' + (i + 1), name, 'net', (l.match(/--network (\S+)/) || [])[1], 'mem', (l.match(/ -m (\S+)/) || [])[1], 'swap', (l.match(/--memory-swap (\S+)/) || [])[1], 'gpus', /--gpus all/.test(l), 'pullnever', /--pull never/.test(l), 'img', imgs.join(','), 'v', vs.length, 'extra', ex.length, 'missing', mi.length, '|', l.slice(0, 120));
  });
}
