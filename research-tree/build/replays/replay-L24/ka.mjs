// ka.mjs: keep-alive net saving with a cap on how long it pings (SCORING.md, savings), by project and kind.
import fs from 'node:fs';
const f = [...JSON.parse(fs.readFileSync('flagged.json', 'utf8')), ...JSON.parse(fs.readFileSync('reclassified.json', 'utf8'))];
const { agg } = JSON.parse(fs.readFileSync('agg.json', 'utf8'));
const PING = 100, M = x => (x / 1e6).toFixed(2);
const out = [];
for (const cap of [1800, 7200, 28800]) for (const w of [1.25, 2]) {
  const r = {};
  for (const x of f) {
    if (!['lapse', 'kept', 'end'].includes(x.cls)) continue;
    const ks = ['all', 'p:' + x.project, 'k:' + x.kind];
    const span = x.cls === 'end' ? cap : Math.min(x.gap, cap);
    const pings = Math.floor(span / (x.ttl - 30));
    const cost = pings * (x.held * 0.01 + PING);
    const save = x.cls === 'lapse' && x.gap <= cap ? x.lost * ((x.is1h ? w : 1) - 0.01) : 0;
    for (const k of ks) { r[k] = r[k] || { save: 0, cost: 0, saved: 0, n: 0 }; r[k].save += save; r[k].cost += cost; if (save) r[k].saved++; if (x.cls === 'lapse') r[k].n++; }
  }
  for (const k of Object.keys(r).sort()) {
    const b = agg[k]; const meter = b.inp + b.out + b.c5m + w * b.c1h + 0.01 * b.cr; const net = r[k].save - r[k].cost;
    out.push(`cap ${cap}s w1h ${w} ${k}: lapses covered ${r[k].saved}/${r[k].n} save ${M(r[k].save)}M pings ${M(r[k].cost)}M net ${M(net)}M = ${(100 * net / meter).toFixed(2)}% of meter ${M(meter)}M`);
  }
}
fs.writeFileSync('ka.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
