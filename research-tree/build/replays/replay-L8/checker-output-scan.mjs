// checker-output-scan.mjs (replay-L8, side count): how often did a type checker or linter, run by the agents
// themselves (inside the project's check or by hand), report errors in tool results? This is what a per-edit gate
// would have moved earlier; it is not a defect count.
// Counted per project group: tool_result blocks holding at least one
//   mypy error line   /\.py:\d+: error: .*\[[a-z0-9-]+\]/
//   ruff finding line /\.py:\d+:\d+: [A-Z]{1,3}\d{3,4}\b/
//   tsc error line    /\.tsx?\(\d+,\d+\): error TS\d+/ or /\.tsx?:\d+:\d+ - error TS\d+/
//   eslint problem    /\d+ problems? \(\d+ errors?/
// and the number of such lines. Also the number of tool_result blocks total (denominator).
// Usage: node checker-output-scan.mjs > checker-output-scan.out.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/User/.claude/projects';
const SELF = 'agent-aad921db2be7a22ed';
const group = (d) => /Clinic-Workshop/i.test(d) ? 'clinic' : /EMS-workshop1|FixFlow/i.test(d) ? 'fixflow'
  : /harness-engineering|projects-hb/i.test(d) ? 'harness' : /research-runs/i.test(d) ? 'research-run' : 'other';
const RX = {
  mypy: /\.py:\d+: error: [^\n]*\[[a-z0-9-]+\]/g,
  ruff: /\.py:\d+:\d+: [A-Z]{1,3}\d{3,4}\b/g,
  tsc: /\.tsx?(\(\d+,\d+\): error TS\d+|:\d+:\d+ - error TS\d+)/g,
  eslint: /\d+ problems? \(\d+ errors?/g,
};
const res = {};
function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(p); else if (e.name.endsWith('.jsonl')) yield p;
  }
}
const textOf = (c) => typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x?.text || '').join('\n') : '';
for (const top of fs.readdirSync(ROOT)) {
  const g = group(top);
  const r = (res[g] ??= { files: 0, toolResults: 0, filesWithAny: 0 });
  for (const k of Object.keys(RX)) { r[k + 'Results'] ??= 0; r[k + 'Lines'] ??= 0; }
  for (const f of walk(path.join(ROOT, top))) {
    if (f.includes(SELF)) continue;
    r.files++;
    let any = false;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.includes('"tool_result"')) continue;
      let o; try { o = JSON.parse(line); } catch { continue; }
      const c = o?.message?.content;
      if (!Array.isArray(c)) continue;
      for (const b of c) {
        if (b?.type !== 'tool_result') continue;
        r.toolResults++;
        const t = textOf(b.content);
        for (const [k, rx] of Object.entries(RX)) {
          const m = t.match(rx);
          if (m) { r[k + 'Results']++; r[k + 'Lines'] += m.length; any = true; }
        }
      }
    }
    if (any) r.filesWithAny++;
  }
}
console.log(JSON.stringify(res, null, 1));
