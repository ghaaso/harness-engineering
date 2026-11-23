// Prints the RESULT tables from raw.json. Usage: node summary.mjs > summary.txt
import fs from 'node:fs';
const G = JSON.parse(fs.readFileSync(new URL('./raw.json', import.meta.url)));
const order = ['harness', 'run', 'fixflow', 'clinic'];
const pct = (a, b) => b ? (100 * a / b).toFixed(2) + ' %' : '-';
const M = (x) => (x / 1e6).toFixed(2) + ' M';
const all = {};
const add = (k, v) => { all[k] = (all[k] || 0) + v; };
const rows = [];
for (const g of order) {
  const s = G[g]; const cpt = s.charsPerToken;
  const tok = (c) => c / cpt;
  const w = s.byWho; const n = (k) => (w[k] ? w[k].n : 0);
  const r = {
    g, windows: s.windows, helpers: s.helpers, calls: s.calls, ctx: M(s.ctxTokens), cpt: cpt.toFixed(2),
    reads: s.refetch.nRead, readTok: M(tok(s.readChars)), readCarriedTok: M(tok(s.readCarried)),
    readCarriedOfCtx: pct(tok(s.readCarried), s.ctxTokens),
    staleFileN: s.staleFile.n, staleFileCarried: pct(s.staleFile.carried, s.readCarried),
    staleRangeN: s.staleRange.n, staleRangeOnce: pct(s.staleRange.chars, s.readChars), staleRangeCarried: pct(s.staleRange.carried, s.readCarried),
    falseAlarmFileLevel: pct(s.staleFile.n - s.staleRange.n, s.staleFile.n),
    who: `same ${n('same')}, helper ${n('helper')}, parent ${n('parent')}, sibling ${n('sibling')}, other ${n('other')}`,
    invisibleN: s.invisible.n, noticed: s.invisible.noticed, invisibleOnce: pct(s.invisible.chars, s.readChars), invisibleCarried: pct(s.invisible.carried, s.readCarried),
    invisibleCarriedTok: M(tok(s.invisible.carried)), invisibleOfCtx: pct(tok(s.invisible.carried), s.ctxTokens),
    acted: s.actedOnStale, ownEdits: s.editsOwn, actedOfEdits: pct(s.actedOnStale, s.editsOwn), editErrStale: s.editErrStale,
    callsCarriedMedian: s.callsCarriedMedian, callsCarriedP90: s.callsCarriedP90,
    unneededOnce: pct(s.unneeded.chars, s.readChars), unneededCarried: pct(s.unneeded.carried, s.readCarried),
    unneededEditWinCarried: pct(s.unneededEditWin.carried, s.unneededEditWin.allCarried),
    refetchHash: s.refetch.n, refetchHashShare: pct(s.refetch.chars, s.refetch.charsRead),
    overlapReads: s.refetch.overlapReads, overlapShare: pct(s.refetch.overlapChars, s.refetch.charsRead),
    overlapOfCtxOnce: pct(tok(s.refetch.overlapChars), s.ctxTokens),
    samePathAnyShare: pct(s.refetch.samePathAnyChars, s.refetch.charsRead), stubs: s.stubs,
    dropEvents: s.drop.events, dropSaved: M(s.drop.savedTok), dropRewrite: M(s.drop.rewriteTok),
    dropNet125: M(s.drop.net125), dropNet2: M(s.drop.net2), dropPositive: `${s.drop.positive125} of ${s.drop.events}`,
    invisDrop: `${s.drop.invisEvents} events, saved ${M(s.drop.invisSaved)} cache reads, rewrite ${M(s.drop.invisRewrite)}`,
  };
  rows.push(r);
  add('ctx', s.ctxTokens); add('readCarriedTok', tok(s.readCarried)); add('invisCarriedTok', tok(s.invisible.carried));
  add('staleRangeCarriedTok', tok(s.staleRange.carried)); add('invis', s.invisible.n); add('staleRange', s.staleRange.n);
  add('staleFile', s.staleFile.n); add('acted', s.actedOnStale); add('edits', s.editsOwn); add('reads', s.refetch.nRead);
  add('net125', s.drop.net125); add('saved', s.drop.savedTok); add('rewrite', s.drop.rewriteTok); add('pos', s.drop.positive125); add('events', s.drop.events);
  add('unneededCarriedTok', tok(s.unneeded.carried)); add('overlapTok', tok(s.refetch.overlapChars));
}
for (const k of Object.keys(rows[0])) console.log([k.padEnd(24), ...rows.map((r) => String(r[k]).padEnd(22))].join(' | '));
console.log('\nALL four groups:');
console.log(`reads ${all.reads}; read tokens carried ${M(all.readCarriedTok)} = ${pct(all.readCarriedTok, all.ctx)} of ${M(all.ctx)} context tokens`);
console.log(`stale file level ${all.staleFile}, range level ${all.staleRange} (${pct(all.staleRange, all.reads)} of reads), carried ${pct(all.staleRangeCarriedTok, all.readCarriedTok)} of read tokens carried`);
console.log(`invisible range-level ${all.invis} (${pct(all.invis, all.reads)} of reads); carried ${M(all.invisCarriedTok)} = ${pct(all.invisCarriedTok, all.readCarriedTok)} of read tokens carried = ${pct(all.invisCarriedTok, all.ctx)} of context tokens`);
console.log(`acted on stale ${all.acted} of ${all.edits} own edits (${pct(all.acted, all.edits)})`);
console.log(`unneeded carried ${pct(all.unneededCarriedTok, all.readCarriedTok)}; overlap re-fetch ${M(all.overlapTok)} once = ${pct(all.overlapTok, all.ctx)} of context`);
console.log(`drop: ${all.events} events, saved ${M(all.saved)} cache-read tokens, rewrite ${M(all.rewrite)} tokens, net at 1.25x ${M(all.net125)} fresh-equivalent, positive ${all.pos}`);
console.log('\nby month (invisible carried / read carried; stale-range carried / read carried):');
for (const g of order) for (const [m, v] of Object.entries(G[g].byMonth).sort()) console.log(`${g} ${m}: reads carried ${M(v.readCarried / G[g].charsPerToken)}, invisible ${pct(v.invisCarried, v.readCarried)}, stale range ${pct(v.staleRangeCarried, v.readCarried)}`);
