// R2 refuter: find sessions where a cause's error text appeared in a TOOL RESULT (not in a doc read).
// Read-only over ~/.claude/projects. Prints, per token, the sessions (file, first timestamp) where the
// token occurs inside a tool_result whose text does not look like a file read of docs.
const fs = require('fs');
const path = require('path');
const root = 'C:/Users/User/.claude/projects';
const dirs = fs.readdirSync(root).filter(d => /EMS-workshop1|FixFlow/i.test(d));
const tokens = {
  noref: /NoReferencedTableError/,
  illegalstate: /IllegalStateException/,
  unresolvedmod: /Unable to resolve module (expo-[a-z-]+|@expo\/[a-z-]+)/,
  reexport: /(does not explicitly export|implicit[- ]re-?export|no-implicit-reexport)/,
  easempty: /not allowed to be empty/,
  gradle: /EAS_BUILD_UNKNOWN_GRADLE_ERROR/,
  duprev: /is present more than once/,
  cp1252: /UnicodeEncodeError/,
  importlinter: /(Contracts?: \d+ kept, \d+ broken|BROKEN)/,
};
function walk(d, out) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out); else if (f.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}
const files = [];
for (const d of dirs) walk(path.join(root, d), files);
const hits = {}; // token -> [{file, ts, snippet}]
for (const t of Object.keys(tokens)) hits[t] = [];
for (const f of files) {
  let txt;
  try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const seen = {};
  for (const line of txt.split('\n')) {
    if (!line || line.indexOf('tool_result') < 0) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const c = o && o.message && o.message.content;
    if (!Array.isArray(c)) continue;
    for (const part of c) {
      if (!part || part.type !== 'tool_result') continue;
      let s = typeof part.content === 'string' ? part.content : JSON.stringify(part.content || '');
      // skip results that are file reads (cat -n style numbered lines) or grep over docs
      const looksLikeRead = /^\s*\d+\t|^\s*\d+→/m.test(s.slice(0, 400));
      if (looksLikeRead) continue;
      for (const [t, re] of Object.entries(tokens)) {
        if (seen[t]) continue;
        const m = s.match(re);
        if (m) {
          // skip if the match sits inside a markdown / docs path listing
          const i = s.search(re);
          const snip = s.slice(Math.max(0, i - 120), i + 140).replace(/\s+/g, ' ');
          if (/\.md[:)]|CLAUDE\.md|HANDOFF|KNOWLEDGE-STORE|docs\//.test(snip)) continue;
          seen[t] = true;
          hits[t].push({ file: f.replace(root + path.sep, '').slice(0, 110), ts: o.timestamp || '', snip: snip.slice(0, 220) });
        }
      }
    }
  }
}
for (const [t, arr] of Object.entries(hits)) {
  arr.sort((a, b) => (a.ts < b.ts ? -1 : 1));
  console.log(`\n== ${t}: ${arr.length} session files`);
  for (const h of arr) console.log(`  ${h.ts.slice(0, 16)}  ${h.file}\n      ${h.snip}`);
}
console.log('\nfiles scanned', files.length);
