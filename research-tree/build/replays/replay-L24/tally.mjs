// tally.mjs: markers between the two calls, for breaks, lapses and controls (growth writes > 20,000). Kinds only, no content.
import fs from 'node:fs';
const ROOT = 'C:/Users/User/.claude/projects/';
const f = JSON.parse(fs.readFileSync('flagged.json', 'utf8')).filter(x => ['break', 'lapse', 'growth'].includes(x.cls));
const MK = ['deferred_tools_record', 'deferred_tools_delta', 'total_tokens_reminder', 'thinking_drop', 'mcp_instructions_delta', 'skill_listing', 'api_error', 'isMeta', '"date"', 'instructions', 'queued_command', 'relocated', '<synthetic>'];
const cache = new Map();
const res = {};
const byFile = new Map(); for (const x of f) (byFile.get(x.file) || byFile.set(x.file, []).get(x.file)).push(x);
for (const [file, xs] of byFile) {
  const lines = fs.readFileSync(ROOT + file, 'utf8').split('\n');
  for (const x of xs) {
    const seg = lines.slice(x.prevLine, x.line - 1).join('\n');
    const r = res[x.cls] = res[x.cls] || { n: 0, tok: 0, none: 0, noneTok: 0, m: {} };
    r.n++; const tok = x.cls === 'growth' ? 0 : (x.cls === 'break' ? Math.min(x.lost, x.cc) : x.lost); r.tok += tok;
    let any = false;
    for (const k of MK) if (seg.includes(k)) { any = true; r.m[k] = r.m[k] || { n: 0, tok: 0 }; r.m[k].n++; r.m[k].tok += tok; }
    if (!any) { r.none++; r.noneTok += tok; }
    if (x.cls === 'break') { r.cr0 = (r.cr0 || 0) + (x.cr === 0 ? 1 : 0); r.crSys = (r.crSys || 0) + (x.cr > 30000 && x.cr < 65000 ? 1 : 0); }
  }
}
const out = [];
for (const [c, r] of Object.entries(res)) {
  out.push(`${c}: n ${r.n} tokens ${(r.tok / 1e6).toFixed(2)}M; no marker ${r.none} (${(r.noneTok / 1e6).toFixed(2)}M)` + (c === 'break' ? `; cache_read 0: ${r.cr0}; cache_read 30-65K (system and tools kept): ${r.crSys}` : ''));
  for (const [k, v] of Object.entries(r.m).sort((a, b) => b[1].n - a[1].n)) out.push(`   ${k}: ${v.n} (${(100 * v.n / r.n).toFixed(1)}%) ${(v.tok / 1e6).toFixed(2)}M`);
}
fs.writeFileSync('tally.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
