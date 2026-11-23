// diag-scan.mjs (replay-L8, Part A): do Claude Code's edit diagnostics appear in the transcripts?
// Reads every .jsonl under C:/Users/User/.claude/projects (read-only). Counts, per project group:
// sessions (files), Edit/Write/MultiEdit/NotebookEdit tool calls, and lines carrying diagnostics feedback:
//   - an attachment whose type mentions "diagnostic"
//   - text containing "<new-diagnostics>" or "new-diagnostics" or "<diagnostics" (outside the API's "diagnostics":null field)
//   - a tool call to an IDE diagnostics tool (name contains "getDiagnostics")
// Usage: node diag-scan.mjs > diag-scan.out.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/User/.claude/projects';
const SELF = 'agent-aad921db2be7a22ed'; // this replay's own transcript, excluded
const group = (d) => {
  if (/Clinic-Workshop/i.test(d)) return 'clinic';
  if (/EMS-workshop1|FixFlow/i.test(d)) return 'fixflow';
  if (/harness-engineering|projects-hb/i.test(d)) return 'harness';
  if (/research-runs/i.test(d)) return 'research-run';
  return 'other';
};
const EDIT = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const res = {};
const examples = [];
function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.jsonl')) yield p;
  }
}
for (const top of fs.readdirSync(ROOT)) {
  const g = group(top);
  const r = (res[g] ??= { files: 0, filesWithEdits: 0, editCalls: 0, diagLines: 0, filesWithDiag: 0, ideDiagCalls: 0, attachTypes: {} });
  for (const f of walk(path.join(ROOT, top))) {
    if (f.includes(SELF)) continue;
    r.files++;
    let edits = 0, diag = 0;
    const text = fs.readFileSync(f, 'utf8');
    for (const line of text.split('\n')) {
      if (!line) continue;
      if (line.includes('"tool_use"')) {
        let o; try { o = JSON.parse(line); } catch { o = null; }
        const c = o?.message?.content;
        if (Array.isArray(c)) for (const b of c) if (b?.type === 'tool_use') {
          if (EDIT.has(b.name)) edits++;
          if (String(b.name).includes('getDiagnostics')) r.ideDiagCalls++;
        }
      }
      if (line.includes('"attachment"')) {
        let o; try { o = JSON.parse(line); } catch { o = null; }
        const t = o?.attachment?.type;
        if (t) r.attachTypes[t] = (r.attachTypes[t] || 0) + 1;
        if (t && /diagnostic/i.test(t)) { diag++; if (examples.length < 5) examples.push({ f, t, s: line.slice(0, 400) }); continue; }
      }
      // the API response field "diagnostics" (null, or {"cache_miss_reason":...}) is not edit feedback: removed first
      const stripped = line.replaceAll('"diagnostics":null', '').replace(/"diagnostics":\{"cache_miss_reason":\{[^}]*\}\}/g, '')
        // a workflow's task notice carries "<diagnostics>Per-agent results: ..." (not edit feedback): counted apart
        .replace(/<diagnostics>Per-agent results/g, () => { r.workflowNotices = (r.workflowNotices || 0) + 1; return ''; });
      if (/new-diagnostics|<diagnostics|"diagnostics":\s*[\[{]/.test(stripped)) {
        diag++; if (examples.length < 5) examples.push({ f, s: stripped.match(/.{0,150}(new-diagnostics|<diagnostics|"diagnostics":\s*[\[{]).{0,250}/)?.[0] });
      }
    }
    r.editCalls += edits; if (edits) r.filesWithEdits++;
    r.diagLines += diag; if (diag) r.filesWithDiag++;
  }
}
for (const g of Object.values(res)) {
  g.attachTypes = Object.fromEntries(Object.entries(g.attachTypes).sort((a, b) => b[1] - a[1]).slice(0, 25));
}
console.log(JSON.stringify({ res, examples }, null, 1));
