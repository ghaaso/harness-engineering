// R1 refuter: carried cost of each read, by path. A read's tokens (chars/4) are re-read by every later
// call in the same compaction segment. Sum by path and by path class; flag cross-window repeats.
// Also: pull-lookup cost (one extra call per exploration run at the run's first-call context).
// Usage: node r1-carry.cjs <calls.jsonl>
const fs = require('fs');
const [inF] = process.argv.slice(2);
const calls = fs.readFileSync(inF, 'utf8').trim().split('\n').map(JSON.parse);
const T = calls.reduce((a, c) => a + c.ctx, 0);
const pct = x => (100 * x).toFixed(1) + '%';
const bySeg = new Map();
for (const c of calls) { const k = c.win + '#' + c.seg; const l = bySeg.get(k) || []; l.push(c); bySeg.set(k, l); }
const perPath = new Map(); let carryAll = 0;
const seenWin = new Map(); // path -> Set of windows that read it before (time order approximated by processing order below)
// order segments by first ts so "earlier window" is time ordered
const segs = [...bySeg.values()].sort((a, b) => (a[0].ts || 0) - (b[0].ts || 0));
const ev = [];
for (const s of segs) { const N = s.length; s.forEach((c, i) => { for (const t of c.tools) for (const p of (t.rp || [])) ev.push({ p, ts: c.ts, win: c.win, tok: t.ch / 4 / t.rp.length, later: N - 1 - i }); }); }
ev.sort((a, b) => a.ts - b.ts);
let repCarry = 0;
for (const e of ev) {
  const carry = e.tok * (1 + e.later); carryAll += carry;
  const s = seenWin.get(e.p) || new Set(); const rep = [...s].some(w => w !== e.win); if (rep) repCarry += carry;
  s.add(e.win); seenWin.set(e.p, s);
  const o = perPath.get(e.p) || { carry: 0, n: 0, wins: new Set() }; o.carry += carry; o.n++; o.wins.add(e.win); perPath.set(e.p, o);
}
function cls(p) {
  if (/(^|\/)(claude\.md|agents\.md)$/.test(p)) return 'instruction file';
  if (/board|status|handoff|state|progress|plan|todo|journal|ledger\.md|log\.md|tracker/.test(p) && /\.(md|json|txt|ya?ml)$/.test(p)) return 'state/plan doc';
  if (/^(docs|\.claude|design|research|program)\//.test(p) || /\.(md|txt)$/.test(p)) return 'other doc';
  if (/\.(py|ts|tsx|js|jsx|mjs|cjs|sql|html|css|sh|ps1|kt|java|go|rs)$/.test(p)) return 'code';
  return 'other';
}
const byCls = {};
for (const [p, o] of perPath) { const k = cls(p); byCls[k] = (byCls[k] || 0) + o.carry; }
const top = [...perPath.entries()].sort((a, b) => b[1].carry - a[1].carry).slice(0, 15).map(([p, o]) => `${p} ${pct(o.carry / T)} (${o.wins.size} windows)`);
// pull-lookup cost: one extra call per run, at the run's first-call context
let pull = 0, runs = 0;
const byWin = new Map(); for (const c of calls) { const l = byWin.get(c.win) || []; l.push(c); byWin.set(c.win, l); }
const LOOK = new Set(['Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch', 'ToolSearch']);
const WRITE = /\bsed\s+-i\b|\btee\b|(^|[^0-9&>2])>\s*[^&\s]|\bmkdir\b|\brm\b|\bmv\b|\bcp\b|\bnpm\b|\bnpx\b|\bpytest\b|\bnode\b|\bpython3?\b|\bdocker\b|\bgit\s+(commit|push|merge|checkout|add|rebase|reset|worktree|stash)/i;
const look = c => c.tools.length && c.tools.every(t => LOOK.has(t.n) || ((t.n === 'Bash' || t.n === 'PowerShell') && t.cmd && !WRITE.test(t.cmd)));
for (const [w, l] of byWin) { let inRun = false; for (const c of l) { const lk = look(c); if (lk && !inRun) { pull += c.ctx; runs++; } inRun = lk; } }
console.log(JSON.stringify({ file: inF, fetchedCarryShareOfAllTokens: pct(carryAll / T), carryOnPathsAnotherWindowReadBefore: pct(repCarry / carryAll), byClassShareOfAllTokens: Object.fromEntries(Object.entries(byCls).map(([k, v]) => [k, pct(v / T)])), top15: top, pullLookupCostOneCallPerRun: pct(pull / T), runs }, null, 1));
