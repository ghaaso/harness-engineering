// score.mjs: replay-L38 step 3. Joins the blind verdicts with key.json; bin rates, estimated returns and their tokens;
// premises of the R pairs; file-level invalidation against the judge's same/changed. Writes score.out.txt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = f => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
const H = J('helpers.json'), P = J('pairs.json'), KEY = J('key.json'), E = J('edits.json');
const byId = new Map(H.map(h => [h.id, h]));
const V = new Map();
for (const k of [1, 2, 3]) for (const l of fs.readFileSync(path.join(HERE, `judge-${k}.verdicts.tsv`), 'utf8').split('\n')) {
  const [pid, cls, agree, reason] = l.split('\t'); if (pid && cls) V.set(pid.trim(), { cls: cls.trim(), agree: (agree || '').trim(), reason });
}
const G = ['harness', 'run', 'fixflow', 'clinic'];
const BINS = ['[0.9,1]', '[0.8,0.9)', '[0.7,0.8)', '[0.6,0.7)', '[0.5,0.6)', '[0.3,0.5)'];
let out = '';
const log = s => { out += s + '\n'; };
const M = x => (x / 1e6).toFixed(2);
const judged = KEY.map(k => ({ ...k, ...(V.get(k.pid) || { cls: '?' }) }));
log(`judged ${judged.length}, verdicts found ${judged.filter(j => j.cls !== '?').length}`);
log('class counts: ' + JSON.stringify(judged.reduce((a, j) => (a[j.cls] = (a[j.cls] || 0) + 1, a), {})));
log('\nbin\tsize\tjudged\tRw\tRp\tC\tV\tD\trateRw\trateR');
const rate = [];
BINS.forEach((b, i) => {
  const js = judged.filter(j => j.bin === i), n = js.length, size = P.filter(p => p.bin === i).length;
  const c = x => js.filter(j => j.cls === x).length;
  rate[i] = { rw: n ? c('Rw') / n : 0, r: n ? (c('Rw') + c('Rp')) / n : 0 };
  log(`${b}\t${size}\t${n}\t${c('Rw')}\t${c('Rp')}\t${c('C')}\t${c('V')}\t${c('D')}\t${rate[i].rw.toFixed(2)}\t${rate[i].r.toFixed(2)}`);
});
// estimate by group: sum over pairs of the bin rate x tokens; judged pairs use their own verdict
log('\ngroup\thelpers\thelperTok(M)\thelperFresh(M)\testRw(n)\testR(n)\testRwTok(M)\testRwShare\testRTok(M)\testRShare\testRwFresh share\tjudgedRw\tjudgedRp');
const jBy = new Map(judged.map(j => [j.h2, j]));
for (const g of [...G, 'all']) {
  const hs = H.filter(h => g === 'all' || h.g === g); const tot = hs.reduce((a, h) => a + h.total, 0), fr = hs.reduce((a, h) => a + h.fresh, 0);
  let nRw = 0, nR = 0, tRw = 0, tR = 0, fRw = 0;
  for (const p of P.filter(p => (g === 'all' || p.g === g) && p.bin >= 0)) {
    const h = byId.get(p.h2); const j = jBy.get(p.h2);
    const rw = j ? (j.cls === 'Rw' ? 1 : 0) : rate[p.bin].rw, r = j ? (['Rw', 'Rp'].includes(j.cls) ? 1 : 0) : rate[p.bin].r;
    nRw += rw; nR += r; tRw += rw * h.total; tR += r * h.total; fRw += rw * h.fresh;
  }
  const jr = judged.filter(j => g === 'all' || j.g === g);
  log(`${g}\t${hs.length}\t${M(tot)}\t${M(fr)}\t${nRw.toFixed(1)}\t${nR.toFixed(1)}\t${M(tRw)}\t${(100 * tRw / tot).toFixed(2)}%\t${M(tR)}\t${(100 * tR / tot).toFixed(2)}%\t${(100 * fRw / fr).toFixed(2)}%\t${jr.filter(j => j.cls === 'Rw').length}\t${jr.filter(j => j.cls === 'Rp').length}`);
}
// premises of judged R pairs (helper A only)
log('\npid\tg\tcls\tagree\tcos\tA.trace\tB.trace\tB.used\tmissed\tover\tAeditsBetween\tfires\tB.tok(M)\tA.desc => B.desc');
const base = f => f.split('/').pop();
const missed = [], over = []; const conf = { caught: 0, falseAlarm: 0, missedStale: 0, quietSame: 0, cannot: 0 };
for (const j of judged.filter(j => ['Rw', 'Rp'].includes(j.cls))) {
  const b = byId.get(j.h2), a = byId.get(j.h1);
  if (!a) { log(`${j.pid}\t${j.g}\t${j.cls}\t${j.agree}\trecord A: no trace`); continue; }
  const A = new Set(a.trace), B = new Set(b.trace);
  const rep = (b.report || '').toLowerCase();
  let used = [...B].filter(f => base(f).length > 3 && rep.includes(base(f))); if (!used.length) used = [...B];
  const mi = used.length ? used.filter(f => !A.has(f)).length / used.length : NaN;
  const ov = A.size ? [...A].filter(f => !B.has(f)).length / A.size : NaN;
  const ed = E.filter(e => e.g === a.g && A.has(e.f) && e.t > a.last && e.t < b.first);
  const fires = ed.length > 0;
  if (!isNaN(mi)) missed.push(mi); if (!isNaN(ov)) over.push(ov);
  if (j.agree === 'changed') fires ? conf.caught++ : conf.missedStale++;
  else if (j.agree === 'same') fires ? conf.falseAlarm++ : conf.quietSame++;
  else conf.cannot++;
  log(`${j.pid}\t${j.g}\t${j.cls}\t${j.agree}\t${j.cos}\t${A.size}\t${B.size}\t${used.length}\t${mi.toFixed(2)}\t${ov.toFixed(2)}\t${new Set(ed.map(e => e.f)).size}\t${fires}\t${M(b.total)}\t${a.desc.slice(0, 40)} => ${b.desc.slice(0, 40)}`);
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
log(`\nR pairs with traces: ${missed.length}; median missed ${med(missed).toFixed(2)}; median over ${med(over).toFixed(2)}`);
log('file-level invalidation vs judge: ' + JSON.stringify(conf));
// sessions context: helper tokens against all tokens
const S = J('sessions.json');
for (const g of G) { const st = S.filter(s => s.g === g).reduce((a, s) => a + s.total, 0), ht = H.filter(h => h.g === g).reduce((a, h) => a + h.total, 0); log(`${g}: helpers ${M(ht)} M of all ${M(st + ht)} M tokens (${(100 * ht / (st + ht)).toFixed(1)} %)`); }
fs.writeFileSync(path.join(HERE, 'score.out.txt'), out); console.log(out);
