'use strict';
const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const B = JSON.parse(fs.readFileSync(L + '/r58c/B/mounts-B.json', 'utf8'));
const dir = L + '/r58c/B/lane-steps';
const rep = JSON.parse(fs.readFileSync(__dirname + '/report.json', 'utf8')).res;
const out = [];
for (const f of fs.readdirSync(dir)) {
  const t = fs.readFileSync(dir + '/' + f, 'utf8');
  const lines = t.split(/\r?\n/);
  const runs = lines.map((l, i) => [i + 1, l]).filter(([, l]) => /docker run /.test(l));
  const name = f.replace(/-\d{8}T\d{6}Z\.log$/, '');
  const test = /--test|TEST run|LS_PREFREEZE=test/.test(t);
  const last = lines.filter((l) => l.trim()).slice(-1)[0] || '';
  for (const [ln, l] of runs) {
    const vs = [...l.matchAll(/-v (\S+)/g)].map((m) => m[1]);
    const flags = vs.map((v) => { const i = v.indexOf(':', 2); const rest = v.slice(i + 1); const ro = rest.endsWith(':ro'); return { src: v.slice(0, i), dst: ro ? rest.slice(0, -3) : rest, mode: ro ? 'ro' : 'rw' }; });
    const allow = (B[name] || {}).allow || [];
    const extra = flags.filter((x) => !allow.find((a) => a.src === x.src && a.dst === x.dst && a.mode === x.mode));
    const missing = allow.filter((a) => !flags.find((x) => a.src === x.src && a.dst === x.dst && a.mode === x.mode));
    const net = (l.match(/--network (\S+)/) || [])[1];
    const mem = (l.match(/ -m (\S+)/) || [])[1];
    const img = (l.match(/sha256:[0-9a-f]{64}/g) || []);
    out.push({ f, ln, name, test, n: flags.length, extra: extra.length, missing: missing.length, net, mem, img: [...new Set(img)].map((x) => x.slice(7, 15)), last: last.slice(0, 160) });
    if (name === 'ktest-r7' || extra.length || missing.length) out[out.length - 1].detail = { extra, missing: missing.map((a) => a.dst) };
  }
  if (!runs.length) out.push({ f, name, test, noRun: true, last: last.slice(0, 160) });
}
// match r7 record mounts vs r7 log flags
const r7 = rep.find((o) => o.file === 'ktest-r7.json');
fs.writeFileSync(__dirname + '/logs-report.json', JSON.stringify(out, null, 1));
for (const o of out) console.log(JSON.stringify(o).replace(new RegExp(L.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'LANE').slice(0, 700));
