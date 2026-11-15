// R10: context tokens processed per project folder and per session, deduped by message id.
// Read-only over ~/.claude/projects. Usage: node r10-spend.cjs <projectsRoot> [folderSubstring ...]
// context = input + cache_creation + cache_read (per API call); output separate.
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const filters = process.argv.slice(3);
function walk(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}
const folders = fs.readdirSync(root).filter(f => !filters.length || filters.some(s => f.includes(s)));
const res = [];
for (const f of folders) {
  const files = walk(path.join(root, f), []);
  const sessions = new Map();
  for (const file of files) {
    // session id = first path segment under the folder (uuid.jsonl or uuid/...)
    const rel = path.relative(path.join(root, f), file).split(path.sep);
    const sid = rel[0].replace(/\.jsonl$/, '');
    const isSub = rel.length > 1;
    let s = sessions.get(sid);
    if (!s) { s = { sid, ctx: 0, out: 0, calls: 0, subCtx: 0, first: null, last: null, models: {}, seen: new Set() }; sessions.set(sid, s); }
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.includes('"usage"')) continue;
      let j; try { j = JSON.parse(line); } catch { continue; }
      const m = j.message; if (!m || !m.usage || m.role !== 'assistant') continue;
      const id = (m.id || '') + '|' + (j.requestId || '');
      if (s.seen.has(id)) continue; s.seen.add(id);
      const u = m.usage;
      const ctx = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
      if (ctx === 0 && !(u.output_tokens)) continue;
      s.ctx += ctx; s.out += (u.output_tokens || 0); s.calls++;
      if (isSub) s.subCtx += ctx;
      const mod = (m.model || '?').replace(/^claude-/, '');
      s.models[mod] = (s.models[mod] || 0) + ctx;
      const t = j.timestamp; if (t) { if (!s.first || t < s.first) s.first = t; if (!s.last || t > s.last) s.last = t; }
    }
  }
  let tot = { ctx: 0, out: 0, calls: 0 };
  const ss = [...sessions.values()].map(s => { delete s.seen; tot.ctx += s.ctx; tot.out += s.out; tot.calls += s.calls; return s; });
  res.push({ folder: f, ...tot, sessions: ss.sort((a, b) => b.ctx - a.ctx) });
}
res.sort((a, b) => b.ctx - a.ctx);
const M = x => (x / 1e6).toFixed(1) + 'M';
for (const r of res) {
  console.log(`${M(r.ctx).padStart(9)} ctx ${M(r.out).padStart(7)} out ${String(r.calls).padStart(6)} calls  ${r.folder}`);
  for (const s of r.sessions.slice(0, process.env.TOP ? +process.env.TOP : 0)) {
    console.log(`    ${M(s.ctx).padStart(9)} (sub ${M(s.subCtx)}) ${s.calls} calls ${s.first && s.first.slice(0, 10)}..${s.last && s.last.slice(0, 10)} ${s.sid} ${JSON.stringify(Object.fromEntries(Object.entries(s.models).map(([k, v]) => [k, M(v)])))}`);
  }
}
if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify(res, null, 1));
