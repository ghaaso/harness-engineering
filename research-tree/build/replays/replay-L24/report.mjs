// report.mjs: tables from agg.json (classes as shares of fresh and all tokens; savings at w1h 1.25 and 2)
import fs from 'node:fs';
const { agg } = JSON.parse(fs.readFileSync('agg.json', 'utf8'));
const M = x => (x / 1e6).toFixed(2);
const P = (a, b) => b ? (100 * a / b).toFixed(2) : '-';
const rows = Object.keys(agg).sort();
const out = [];
for (const k of rows) {
  const b = agg[k]; const fresh = b.inp + b.out + b.cc, all = fresh + b.cr; const t = b.t, n = b.n;
  const f = c => `${n[c] || 0}/${M(t[c] || 0)}M/${P(t[c] || 0, fresh)}%`;
  const line = [`${k}`, `calls ${b.calls}`, `fresh ${M(fresh)}M all ${M(all)}M`, `1h ${M(b.c1h)} 5m ${M(b.c5m)}`,
    `first ${f('first')}`, `sib ${f('sibling')}`, `compact ${f('compaction')}`, `model ${f('model')}`, `lapse ${f('lapse')} (allshare ${P(t.lapse || 0, all)}%)`, `break ${f('break')} (allshare ${P(t.break || 0, all)}%)`,
    `gapsOver ${b.gapsOver} lost ${b.gapsOverLost} kept ${b.gapsOverKept}`, `hist ${JSON.stringify(b.gapHist)}`];
  for (const w of [1.25, 2]) {
    const meter = b.inp + b.out + b.c5m + w * b.c1h + 0.01 * b.cr;
    const ka = b.lapseLost5m * 0.99 + b.lapseLost1h * (w - 0.01) - b.kaPingCost - 2 * 0.01 * b.endIdleHeld;
    const h1 = b.helperLapseUnder1h * 0.99 - (w - 1) * b.ccHelper;
    const sp = b.breakW5m * 0.99 + b.breakW1h * (w - 0.01);
    const sb = b.sibW * 0.99;
    line.push(`w${w}: meter ${M(meter)}M keepalive ${M(ka)}M ${P(ka, meter)}% | helper1h ${M(h1)}M ${P(h1, meter)}% | stablePrefix ${M(sp)}M ${P(sp, meter)}% | sibling ${M(sb)}M ${P(sb, meter)}% | pingCost ${M(b.kaPingCost)}M`);
  }
  out.push(line.join('\n  '));
}
fs.writeFileSync('report.txt', out.join('\n') + '\n');
