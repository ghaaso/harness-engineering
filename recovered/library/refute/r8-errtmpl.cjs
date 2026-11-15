// R8 refuter. Group tool errors into push keys (templates) and measure how often a template's recurrence shares
// the first occurrence's specific cause. Two key levels:
//  coarse = the error line with paths, numbers, quoted strings and identifiers-in-quotes masked (what a hook keys on)
//  fine   = the same line with only numbers/paths/hex masked (quoted names kept): a proxy for "same specific cause"
// Usage: node r8-errtmpl.cjs r8-errors.jsonl
const fs = require('fs');
const recs = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const KW = /(error|Error|ERROR|not found|No such|denied|failed|Failed|FAILED|cannot|Cannot|can't|not recognized|Traceback|Exception|exception|invalid|Invalid|refused|timed out|timeout|must|not allowed|blocked|rejected|unknown|Unknown|exceeds|too long|not exist)/;
function errLine(t) {
  const lines = String(t).split(/\r?\n/).map(s => s.trim()).filter(Boolean).filter(s => !/^Exit code \d+$/.test(s) && !/^<\/?tool_use_error>$/.test(s));
  if (!lines.length) return 'EMPTY';
  // python traceback: last line is the exception
  const tb = lines.findIndex(s => s.startsWith('Traceback'));
  if (tb >= 0) { for (let i = lines.length - 1; i > tb; i--) if (/^[A-Za-z_.]+(Error|Exception)\b/.test(lines[i])) return lines[i]; }
  const k = lines.find(s => KW.test(s));
  return (k || lines[0]).replace(/<\/?tool_use_error>/g, '');
}
const maskFine = s => s.replace(/[A-Za-z]:[\\/][^\s'"`]*|(?:\.{0,2}\/)?(?:[\w.@-]+\/)+[\w.@-]*/g, '<P>').replace(/\b[0-9a-f]{7,40}\b/g, '<H>').replace(/\d+/g, 'N').replace(/\s+/g, ' ').slice(0, 160);
const maskCoarse = s => maskFine(s).replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '<Q>').replace(/<P>\S*/g, '<P>');
for (const r of recs) { r.line = errLine(r.err); r.fine = maskFine(r.line); r.coarse = maskCoarse(r.line); r.recovKey = r.recov ? r.recov.split(':')[0] + ':' + (r.recov.split(':').slice(1).join(':').trim().split(/\s+/)[0] || '') : 'none'; }
const by = new Map(); for (const r of recs) { if (!by.has(r.coarse)) by.set(r.coarse, []); by.get(r.coarse).push(r); }
const rows = [];
for (const [k, rs] of by) {
  rs.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  const sessions = new Set(rs.map(r => r.sess)).size; if (rs.length < 2) continue;
  // pairwise "same specific cause" proxy: does a later occurrence share the FIRST occurrence's fine key?
  const first = rs[0].fine; const later = rs.slice(1);
  const sameFine = later.filter(r => r.fine === first).length;
  const fineKeys = new Set(rs.map(r => r.fine)).size;
  const recovKeys = new Set(rs.map(r => r.recovKey)).size;
  // occurrence-weighted chance two random occurrences share a fine key (Simpson)
  const cnt = new Map(); for (const r of rs) cnt.set(r.fine, (cnt.get(r.fine) || 0) + 1);
  let simpson = 0; for (const c of cnt.values()) simpson += c * (c - 1); simpson /= rs.length * (rs.length - 1);
  rows.push({ n: rs.length, sessions, stores: new Set(rs.map(r => r.store)).size, fineKeys, recovKeys, sameFineAsFirst: +(sameFine / later.length).toFixed(2), simpson: +simpson.toFixed(2), tool: [...new Set(rs.map(r => r.tool))].slice(0, 3).join('/'), key: k });
}
rows.sort((a, b) => b.n - a.n);
const tot = recs.length; const inRecurring = rows.reduce((s, r) => s + r.n, 0);
const cross = rows.filter(r => r.sessions >= 2); const inCross = cross.reduce((s, r) => s + r.n, 0);
// weighted share of later occurrences (repeat fires) whose fine key matches the template's first occurrence
let laterTot = 0, laterSame = 0; for (const r of cross) { laterTot += r.n - 1; laterSame += Math.round(r.sameFineAsFirst * (r.n - 1)); }
console.log(JSON.stringify({ errors: tot, templates: by.size, recurringTemplates: rows.length, errorsInRecurringTemplates: inRecurring, crossSessionTemplates: cross.length, errorsInCrossSession: inCross, repeatFiresCross: laterTot, repeatFiresSameFineKeyAsFirst: laterSame, share: +(laterSame / laterTot).toFixed(3) }));
for (const r of rows.slice(0, 60)) console.log(`${r.n}\t${r.sessions}s\t${r.stores}st\tfine=${r.fineKeys}\trecov=${r.recovKeys}\tsameAsFirst=${r.sameFineAsFirst}\tsimp=${r.simpson}\t${r.tool}\t${r.key.slice(0, 120)}`);
fs.writeFileSync('r8-errtmpl.json', JSON.stringify(rows, null, 0));
