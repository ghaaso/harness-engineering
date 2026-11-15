// R9 refuter: read-only scan of FixFlow transcripts.
// Measures (1) the caller's context at the moment a record would be written
// (calls that run `git commit`, calls that write a memory note), (2) how big a
// fresh subagent's first call is (the floor for a "small fresh writer/reviewer"),
// (3) the date range the transcripts cover.
// Usage: node R9-tx.cjs > R9-tx.json
const fs = require("fs"), path = require("path");
const ROOT = "C:/Users/User/.claude/projects";
const SKIP = "0bf1c4f3-76dc-4144-995c-2af5a213db41"; // this live session
const dirs = fs.readdirSync(ROOT).filter(d => d.includes("EMS-workshop1"));
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".jsonl")) files.push(p); } };
for (const d of dirs) walk(path.join(ROOT, d));
const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const commits = [], notes = [], firsts = [], perFile = [];
let tmin = Infinity, tmax = -Infinity, nCalls = 0;
for (const f of files) {
  if (f.includes(SKIP)) continue;
  const role = /subagents/.test(f) ? (/workflows/.test(f) ? "wf-agent" : "agent") : "main";
  const seen = new Map(); // message.id -> {ctx, model, tools[]}
  const order = [];
  let lines;
  try { lines = fs.readFileSync(f, "utf8").split("\n"); } catch { continue; }
  for (const ln of lines) {
    if (!ln) continue; let o; try { o = JSON.parse(ln); } catch { continue; }
    if (o.timestamp) { const t = Date.parse(o.timestamp); if (t < tmin) tmin = t; if (t > tmax) tmax = t; }
    if (o.type !== "assistant" || !o.message || !o.message.usage) continue;
    const id = o.message.id || o.uuid; const u = o.message.usage;
    const ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    let rec = seen.get(id);
    if (!rec) { rec = { ctx, model: o.message.model, tools: [] }; seen.set(id, rec); order.push(rec); }
    for (const c of o.message.content || []) if (c.type === "tool_use") rec.tools.push(c);
  }
  if (!order.length) continue;
  nCalls += order.length;
  firsts.push({ role, ctx: order[0].ctx, model: order[0].model });
  perFile.push({ role, calls: order.length, total: order.reduce((s, r) => s + r.ctx, 0) });
  order.forEach((r, i) => {
    for (const t of r.tools) {
      const cmd = t.input && (t.input.command || "");
      if (t.name === "Bash" || t.name === "PowerShell") {
        if (/git\b[^|;&]*\bcommit\b/.test(cmd)) commits.push({ role, ctx: r.ctx, model: r.model, idx: i, left: order.length - i - 1, fix: /fix/i.test(cmd) });
      }
      const fp = (t.input && (t.input.file_path || "")) + "";
      if ((t.name === "Write" || t.name === "Edit") && /[\\/]memory[\\/][^\\/]+\.md$/i.test(fp)) notes.push({ role, ctx: r.ctx, model: r.model, idx: i, left: order.length - i - 1 });
    }
  });
}
const summ = (a, k) => ({ n: a.length, p10: q(a.map(x => x[k]), .1), p25: q(a.map(x => x[k]), .25), median: q(a.map(x => x[k]), .5), p75: q(a.map(x => x[k]), .75), p90: q(a.map(x => x[k]), .9), mean: a.length ? Math.round(a.reduce((s, x) => s + x[k], 0) / a.length) : null });
const byRole = (a, k) => Object.fromEntries(["main", "agent", "wf-agent"].map(r => [r, summ(a.filter(x => x.role === r), k)]));
const out = {
  files: files.length, calls: nCalls,
  dateRange: [new Date(tmin).toISOString(), new Date(tmax).toISOString()],
  commitCallCtx: byRole(commits, "ctx"),
  commitCallCtxFixOnly: summ(commits.filter(c => c.fix), "ctx"),
  commitCallsLeftInWindow: summ(commits, "left"),
  memoryNoteWriteCtx: byRole(notes, "ctx"),
  subagentFirstCallCtx: summ(firsts.filter(x => x.role !== "main"), "ctx"),
  subagentFirstCallCtxMin: Math.min(...firsts.filter(x => x.role !== "main").map(x => x.ctx)),
  agentWindowTotal: summ(perFile.filter(x => x.role !== "main"), "total"),
  agentWindowCalls: summ(perFile.filter(x => x.role !== "main"), "calls"),
};
console.log(JSON.stringify(out, null, 1));
