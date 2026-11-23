// age.mjs: cache age at the new request = time of the request before the call minus time of the request before the previous
// call (request time = timestamp of the last non-assistant line before the call's first line). Splits breaks into
// expiry-explained (age > TTL) and not; checks kept gaps and controls the same way.
import fs from 'node:fs';
const ROOT = 'C:/Users/User/.claude/projects/';
const f = JSON.parse(fs.readFileSync('flagged.json', 'utf8')).filter(x => ['break', 'growth', 'lapse'].includes(x.cls));
const byFile = new Map(); for (const x of f) (byFile.get(x.file) || byFile.set(x.file, []).get(x.file)).push(x);
function reqTime(lines, first) { for (let i = first - 2; i >= 0; i--) { let o; try { o = JSON.parse(lines[i]); } catch { continue; } if (o.type !== 'assistant' && o.timestamp) return Date.parse(o.timestamp); } return NaN; }
const r = {}; const rows = []; const re = [];
for (const [file, xs] of byFile) {
  const lines = fs.readFileSync(ROOT + file, 'utf8').split('\n');
  for (const x of xs) {
    const age = (reqTime(lines, x.line) - reqTime(lines, x.prevLine)) / 1000;
    const over = age > x.ttl;
    const k = x.cls + (over ? ' age>TTL' : ' age<=TTL') + ' ' + x.kind;
    const tok = x.cls === 'break' ? Math.min(x.lost, x.cc) : x.cls === 'lapse' ? x.lost : 0;
    r[k] = r[k] || { n: 0, tok: 0, byP: {} }; r[k].n++; r[k].tok += tok; r[k].byP[x.project] = (r[k].byP[x.project] || 0) + tok;
    if (x.cls === 'break' && over) re.push({ ...x, cls: 'lapse', gap: Math.round(age), lost: Math.min(x.lost, x.cc), via: 'age' });
    if (x.cls === 'break' && !over) rows.push(`${x.project} ${x.kind} gap=${x.gap} age=${Math.round(age)} cr=${x.cr} cc=${x.cc} lost=${x.lost} ${file.split('/').pop().slice(0, 14)}:${x.prevLine}-${x.line}`);
  }
}
const out = Object.entries(r).sort().map(([k, v]) => `${k}: n ${v.n} tokens ${(v.tok / 1e6).toFixed(2)}M ${JSON.stringify(Object.fromEntries(Object.entries(v.byP).map(([p, t]) => [p, +(t / 1e6).toFixed(2)])))}`);
fs.writeFileSync('age.txt', out.join('\n') + '\n\nbreaks not explained by age:\n' + rows.join('\n') + '\n');
fs.writeFileSync('reclassified.json', JSON.stringify(re));
console.log(out.join('\n')); console.log(rows.slice(0, 40).join('\n'));
