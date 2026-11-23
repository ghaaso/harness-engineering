// classify.mjs: classes and savings of SCORING.md over scan.mjs output.
// node classify.mjs <scan dir> <out dir>  -> agg.json, flagged.json (all lapses and breaks, for the check), classify.txt
import fs from 'node:fs';
import path from 'node:path';

const [IN, OUT] = process.argv.slice(2);
const MIN = 1024;
const streams = JSON.parse(fs.readFileSync(path.join(IN, 'streams.json'), 'utf8'));
const calls = JSON.parse(fs.readFileSync(path.join(IN, 'calls.json'), 'utf8'));
const dups = JSON.parse(fs.readFileSync(path.join(IN, 'dups.json'), 'utf8'));

const by = new Map(); for (const c of calls) { (by.get(c[0]) || by.set(c[0], []).get(c[0])).push(c); }
const month = ts => isNaN(ts) ? 'unknown' : new Date(ts).toISOString().slice(0, 7);
const CLS = ['first', 'sibling', 'compaction', 'model', 'lapse', 'break', 'growth'];
const agg = {}; // key -> stats
function bucket(k) {
  if (!agg[k]) agg[k] = { calls: 0, inp: 0, out: 0, cc: 0, cr: 0, c1h: 0, c5m: 0, ccHelper: 0, n: {}, t: {}, gapsOver: 0, gapsOverLost: 0, gapsOverKept: 0,
    lapseLost1h: 0, lapseLost5m: 0, breakW1h: 0, breakW5m: 0, sibW: 0, kaPingCost: 0, kaSave1h: 0, kaSave5m: 0, helperLapseUnder1h: 0, endIdleHeld: 0,
    gapHist: { h300_600: 0, h600_1800: 0, h1800_3600: 0, h3600p: 0, s3600_7200: 0, s7200p: 0 } };
  return agg[k];
}
function add(keys, f) { for (const k of keys) f(bucket(k)); }

// helper first calls, for sibling detection
const firsts = [];
for (const [si, list] of by) {
  const st = streams[si]; if (st.kind !== 'helper') continue;
  list.sort((a, b) => a[1] - b[1] || a[10] - b[10]);
  const c = list[0]; firsts.push({ si, parent: st.parent, project: st.project, model: c[2], ts: c[1], cc: c[4], cr: c[5] });
}
const medCr = {};
for (const m of new Set(firsts.map(f => f.model))) {
  const v = firsts.filter(f => f.model === m && f.cr > 0).map(f => f.cr).sort((a, b) => a - b);
  medCr[m] = v.length ? v[Math.floor(v.length / 2)] : 0;
}
const sib = new Map(); // si -> {shareable}
const sibStats = { withSib: 0, withSibRead: 0, alone: 0, aloneRead: 0 };
const groups = new Map();
for (const f of firsts) { const k = f.parent + '|' + f.model; (groups.get(k) || groups.set(k, []).get(k)).push(f); }
for (const g of groups.values()) {
  g.sort((a, b) => a.ts - b.ts);
  for (let i = 0; i < g.length; i++) {
    const f = g[i];
    const has = i > 0 && f.ts - g[i - 1].ts <= 300000 && f.ts >= g[i - 1].ts;
    if (has) { sibStats.withSib++; if (f.cr > 0) sibStats.withSibRead++; sib.set(f.si, Math.max(0, Math.min(f.cc, medCr[f.model] - f.cr))); }
    else { sibStats.alone++; if (f.cr > 0) sibStats.aloneRead++; }
  }
}

const flagged = [];
const PING = 100;
for (const [si, list] of by) {
  const st = streams[si];
  list.sort((a, b) => a[1] - b[1] || a[10] - b[10]);
  let prev = null, lastTTL = st.kind === 'session' ? 3600 : 300;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const [, ts, model, inp, cc, cr, out, c1h, c5m, ac, line, split] = c;
    const keys = ['all', 'p:' + st.project, 'm:' + month(ts), 'pm:' + st.project + '|' + month(ts), 'k:' + st.kind, 'pk:' + st.project + '|' + st.kind];
    const w1h = split ? c1h : (st.kind === 'session' ? cc : 0);
    const w5m = cc - w1h;
    add(keys, b => { b.calls++; b.inp += inp; b.out += out; b.cc += cc; b.cr += cr; b.c1h += w1h; b.c5m += w5m; if (st.kind === 'helper') b.ccHelper += cc; });
    let cls = 'growth', tok = 0, lost = 0, gap = 0;
    const ttl = prev ? lastTTL : 0;
    if (prev) {
      lost = Math.max(0, prev[5] + prev[4] - cr); gap = (ts - prev[1]) / 1000;
      if (gap > ttl) {
        add(keys, b => { b.gapsOver++; if (lost > MIN) b.gapsOverLost++; else b.gapsOverKept++;
          const h = b.gapHist;
          if (st.kind === 'helper') { if (gap <= 600) h.h300_600++; else if (gap <= 1800) h.h600_1800++; else if (gap <= 3600) h.h1800_3600++; else h.h3600p++; }
          else { if (gap <= 7200) h.s3600_7200++; else h.s7200p++; } });
      }
    }
    if (cc > 0) {
      if (!prev) { if (sib.has(si)) { cls = 'sibling'; tok = sib.get(si); } else { cls = 'first'; tok = cc; } }
      else if (ac) { cls = 'compaction'; tok = cc; }
      else if (model !== prev[2]) { cls = 'model'; tok = cc; }
      else if (gap > ttl && lost > MIN) { cls = 'lapse'; tok = lost; }
      else if (lost > MIN) { cls = 'break'; tok = Math.min(lost, cc); }
      else { cls = 'growth'; tok = cc; }
    }
    const is1h = split ? c1h > 0 : st.kind === 'session';
    add(keys, b => { b.n[cls] = (b.n[cls] || 0) + 1; b.t[cls] = (b.t[cls] || 0) + tok; });
    if (cls === 'sibling') add(keys, b => { b.sibW += tok; });
    if (cls === 'break') add(keys, b => { if (is1h) b.breakW1h += tok; else b.breakW5m += tok; });
    if (cls === 'lapse') {
      const held = prev[5] + prev[4];
      const pings = Math.floor(gap / (ttl - 30));
      const pingCost = pings * (held * 0.01 + PING);
      add(keys, b => { if (is1h) b.lapseLost1h += tok; else b.lapseLost5m += tok; b.kaPingCost += pingCost;
        if (st.kind === 'helper' && gap <= 3600) b.helperLapseUnder1h += tok; });
    }
    if (cls === 'lapse' || cls === 'break' || (cls === 'growth' && cc > 20000 && prev)) flagged.push({ file: st.file, project: st.project, kind: st.kind, cls, is1h, month: month(ts), prevLine: prev[10], line, gap: Math.round(gap), ttl, lost, cc, cr, held: prev[5] + prev[4], model });
    // keep-alive also pings during kept gaps (cache survived anyway because gap was measured over response time) - cost only
    if (prev && gap > ttl && lost <= MIN && cls !== 'compaction') { const pings = Math.floor(gap / (ttl - 30)); add(keys, b => { b.kaPingCost += pings * ((prev[5] + prev[4]) * 0.01 + PING); }); flagged.push({ file: st.file, project: st.project, kind: st.kind, cls: 'kept', is1h, month: month(ts), gap: Math.round(gap), ttl, lost, held: prev[5] + prev[4] }); }
    if (cc > 0) { if (split) lastTTL = c1h > 0 ? 3600 : 300; }
    prev = c;
  }
  // a session idles after its last call: a keep-alive capped at 2 h pings twice
  if (st.kind === 'session' && prev) { const held = prev[5] + prev[4]; const k = ['all', 'p:' + st.project, 'm:' + month(prev[1]), 'pm:' + st.project + '|' + month(prev[1]), 'k:session', 'pk:' + st.project + '|session'];
    add(k, b => { b.endIdleHeld += held; }); flagged.push({ file: st.file, project: st.project, kind: 'session', cls: 'end', is1h: true, month: month(prev[1]), ttl: 3600, held }); }
}

fs.writeFileSync(path.join(OUT, 'agg.json'), JSON.stringify({ agg, sibStats, medCr, dups }, null, 1));
fs.writeFileSync(path.join(OUT, 'flagged.json'), JSON.stringify(flagged));
console.log('calls', calls.length, 'streams', streams.length, 'flagged', flagged.length, 'sib', JSON.stringify(sibStats), 'medCr', JSON.stringify(medCr));
