// pair.mjs: replay-L38 step 2. For each helper H2, the earlier on-record item (helper brief+report, or journal record)
// with the highest TF-IDF cosine to H2's brief. Writes pairs.json, bins.txt, the blind judge packets judge-<k>.md and key.json.
// node pair.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const H = JSON.parse(fs.readFileSync(path.join(HERE, 'helpers.json'), 'utf8'));
const JOURNALS = [['harness', 'C:/Users/User/Documents/projects/harness-engineering/library/journal'],
  ['run', 'C:/research-runs/2026-11-harness-leads/journal']];
const SHARE = { harness: ['harness', 'run'], run: ['harness', 'run'], fixflow: ['fixflow'], clinic: ['clinic'] };

const recs = [];
for (const [g, root] of JOURNALS) {
  for (const day of fs.readdirSync(root)) {
    const dd = path.join(root, day); if (!fs.statSync(dd).isDirectory()) continue;
    for (const f of fs.readdirSync(dd)) {
      if (!f.endsWith('.jsonl')) continue;
      for (const l of fs.readFileSync(path.join(dd, f), 'utf8').split('\n')) {
        if (!l.trim()) continue; let o; try { o = JSON.parse(l); } catch { continue; }
        if (!o.claim) continue;
        const date = o.date || day;
        recs.push({ id: `rec:${g}:${o.id}`, g, kind: 'record', avail: Date.parse(date + 'T23:59:59'), text: `${o.kind || ''} ${o.status || ''}: ${o.claim}`, src: `${root}/${day}/${f}` });
      }
    }
  }
}
const STOP = new Set('the and for that this with from are not you your its was were has have but all any can will one two which what when who how into each per only than then them they their there these those out use used under over more most also our here just like such some other must does done file files read write line lines'.split(' '));
const words = s => (s || '').toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g)?.filter(w => !STOP.has(w)) || [];
const tf = s => { const m = new Map(); for (const w of words(s)) m.set(w, (m.get(w) || 0) + 1); return m; };

// documents: H2 side = brief; H1 side = brief + report (helpers) or claim (records)
const qDocs = H.map(h => tf(h.brief));
const items = [
  ...H.map((h, i) => ({ id: h.id, g: h.g, kind: 'helper', avail: h.last, idx: i, vec: tf(h.brief + '\n' + (h.report || '')) })),
  ...recs.map(r => ({ ...r, vec: tf(r.text) })),
];
const df = new Map(); const N = qDocs.length + items.length;
for (const d of [...qDocs, ...items.map(x => x.vec)]) for (const w of d.keys()) df.set(w, (df.get(w) || 0) + 1);
const idf = w => Math.log(N / (df.get(w) || 1));
function weigh(m) { const v = new Map(); let n = 0; for (const [w, c] of m) { const x = (1 + Math.log(c)) * idf(w); v.set(w, x); n += x * x; } n = Math.sqrt(n) || 1; for (const [w, x] of v) v.set(w, x / n); return v; }
const Q = qDocs.map(weigh); for (const it of items) it.w = weigh(it.vec);
const post = new Map(); items.forEach((it, j) => { for (const [w, x] of it.w) { let p = post.get(w); if (!p) post.set(w, p = []); p.push([j, x]); } });

const pairs = [];
H.forEach((h, i) => {
  const ok = SHARE[h.g]; const score = new Map();
  for (const [w, x] of Q[i]) for (const [j, y] of post.get(w) || []) {
    const it = items[j]; if (it.idx === i || !ok.includes(it.g) || !(it.avail < h.first)) continue;
    score.set(j, (score.get(j) || 0) + x * y);
  }
  let best = -1, bs = 0; for (const [j, s] of score) if (s > bs) { bs = s; best = j; }
  if (best < 0) return;
  const it = items[best];
  pairs.push({ h2: h.id, g: h.g, h1: it.id, h1g: it.g, h1kind: it.kind, cos: +bs.toFixed(4), gapH: +((h.first - it.avail) / 3.6e6).toFixed(2) });
});
const BINS = [[0.9, 1.01], [0.8, 0.9], [0.7, 0.8], [0.6, 0.7], [0.5, 0.6], [0.3, 0.5]];
const binOf = c => BINS.findIndex(([a, b]) => c >= a && c < b);
for (const p of pairs) p.bin = binOf(p.cos);
fs.writeFileSync(path.join(HERE, 'pairs.json'), JSON.stringify(pairs, null, 0));

// bins table
const G = ['harness', 'run', 'fixflow', 'clinic'];
const helpersBy = Object.fromEntries(G.map(g => [g, H.filter(h => h.g === g).length]));
let txt = 'bin\t' + G.join('\t') + '\tall\n';
BINS.forEach((b, k) => { const row = G.map(g => pairs.filter(p => p.bin === k && p.g === g).length); txt += `[${b[0]},${b[1] > 1 ? 1 : b[1]})\t${row.join('\t')}\t${row.reduce((a, x) => a + x, 0)}\n`; });
txt += 'below0.3\t' + G.map(g => pairs.filter(p => p.bin < 0 && p.g === g).length + (helpersBy[g] - pairs.filter(p => p.g === g).length)).join('\t') + '\n';
txt += 'helpers\t' + G.map(g => helpersBy[g]).join('\t') + '\n';
txt += 'h1 is record, by bin: ' + BINS.map((_, k) => pairs.filter(p => p.bin === k && p.h1kind === 'record').length).join(' ') + '\n';
txt += 'h1 other group (harness<->run), by bin: ' + BINS.map((_, k) => pairs.filter(p => p.bin === k && p.h1g !== p.g).length).join(' ') + '\n';
fs.writeFileSync(path.join(HERE, 'bins.txt'), txt); console.log(txt);

// sample: up to 12 per bin, seed 1729, proportional over groups (largest remainder)
let seed = 1729; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = [];
BINS.forEach((_, k) => {
  const inBin = pairs.filter(p => p.bin === k); const n = Math.min(12, inBin.length); if (!n) return;
  const quota = G.map(g => { const c = inBin.filter(p => p.g === g).length; return { g, c, q: Math.floor(n * c / inBin.length), r: (n * c / inBin.length) % 1 }; });
  let left = n - quota.reduce((a, x) => a + x.q, 0);
  for (const x of [...quota].sort((a, b) => b.r - a.r)) { if (left <= 0) break; if (x.q < x.c) { x.q++; left--; } }
  for (const x of quota) sample.push(...shuffle(inBin.filter(p => p.g === x.g)).slice(0, x.q));
});
shuffle(sample);
const byId = new Map(H.map(h => [h.id, h])); const recBy = new Map(recs.map(r => [r.id, r]));
const cut = (s, n = 1800) => { s = (s || '').replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim(); return s.length > n ? s.slice(0, n) + ' [...cut]' : s; };
const key = []; const K = 3; const packets = Array.from({ length: K }, () => []);
sample.forEach((p, n) => {
  const pid = 'P' + String(n + 1).padStart(2, '0'); key.push({ pid, ...p });
  const h2 = byId.get(p.h2); let a;
  if (p.h1kind === 'helper') { const h1 = byId.get(p.h1); a = `### A (earlier helper, ended ${new Date(h1.last).toISOString().slice(0, 16)})\n**Brief A:**\n${cut(h1.brief)}\n\n**Report A:**\n${cut(h1.report)}`; }
  else { const r = recBy.get(p.h1); a = `### A (library record on file before B started)\n${cut(r.text)}`; }
  const b = `### B (later helper, started ${new Date(h2.first).toISOString().slice(0, 16)})\n**Brief B:**\n${cut(h2.brief)}\n\n**Report B:**\n${cut(h2.report)}`;
  packets[n % K].push(`## ${pid}\n\n${a}\n\n${b}\n`);
});
packets.forEach((ps, k) => fs.writeFileSync(path.join(HERE, `judge-${k + 1}.md`), ps.join('\n---\n\n')));
fs.writeFileSync(path.join(HERE, 'key.json'), JSON.stringify(key, null, 1));
console.log('sample', sample.length, 'packets', packets.map(p => p.length).join(' '));
