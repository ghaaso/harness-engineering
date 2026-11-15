// R10: work-type shares by context tokens (my own count, r10-spend.json) vs by list-price cost (cost-by-worktype.json).
// Read-only. Usage: node r10-worktype.cjs <cost-by-worktype.json> <r10-spend.json>
const fs = require('fs');
const cw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const spend = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const bySid = new Map();
for (const f of spend) for (const s of f.sessions) bySid.set(s.sid, { ...s, folder: f.folder });
const out = {};
for (const repo of ['fixflow', 'clinic']) {
  const inv = cw.inventory[repo].sessions;
  const tok = {}, n = {}; let tot = 0, missing = 0, matched = 0;
  for (const s of inv) {
    const wt = s.workType || '?';
    const m = bySid.get(s.sid);
    if (!m) { missing++; continue; }
    matched++;
    tok[wt] = (tok[wt] || 0) + m.ctx; n[wt] = (n[wt] || 0) + 1; tot += m.ctx;
  }
  const cost = cw.byWT[repo]; let ctot = 0; for (const v of Object.values(cost)) ctot += v;
  // cost keys may be workType or 'phase:x' for mixed labels; report both views
  out[repo] = { sessionsInInventory: inv.length, matched, missing, tokensMatched: (tot / 1e6).toFixed(0) + 'M',
    tokenShareByWorkType: Object.fromEntries(Object.entries(tok).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k + ' (' + n[k] + ')', (100 * v / tot).toFixed(1) + '%'])),
    costShareByKey: Object.fromEntries(Object.entries(cost).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, (100 * v / ctot).toFixed(1) + '%'])) };
  // sessions detail
  out[repo].detail = inv.map(s => ({ sid: s.sid.slice(0, 8), wt: s.workType, phase: s.phase, title: (s.title || '').slice(0, 60), ctxM: bySid.get(s.sid) ? +(bySid.get(s.sid).ctx / 1e6).toFixed(1) : null }))
    .sort((a, b) => (b.ctxM || 0) - (a.ctxM || 0));
}
console.log(JSON.stringify(out, null, 1));
