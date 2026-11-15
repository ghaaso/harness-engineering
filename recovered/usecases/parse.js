// Stage 1: parse every EMS-workshop1 transcript into a compact step list (local only, nothing leaves the machine).
// Output: out/steps.jsonl, one line per transcript: {file, folder, sub, ts0, steps:[{mid, ctx, out, text, calls:[{id,name,inp,rc,err,head}]}]}
const fs = require('fs'), path = require('path'), readline = require('readline');
const P = 'C:/Users/User/.claude/projects';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const dirs = fs.readdirSync(P).filter((d) => d.includes('EMS-workshop1'));
function walk(d, a) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, a); else if (e.name.endsWith('.jsonl')) a.push(p); } return a; }
function txt(c) { if (typeof c === 'string') return c; if (Array.isArray(c)) return c.map((x) => (x && x.type === 'text' ? x.text : x && x.type === 'image' ? '[image]' : '')).join('\n'); return ''; }
function slimInput(name, inp) {
  inp = inp || {};
  const o = {};
  for (const k of ['file_path', 'path', 'pattern', 'glob', 'type', 'output_mode', 'offset', 'limit', 'command', 'description', 'url', 'query', 'prompt', 'subagent_type', 'old_string', 'skill', 'action', 'notebook_path', 'content']) {
    if (inp[k] === undefined) continue;
    let v = inp[k];
    if (typeof v === 'string') { const cap = k === 'command' ? 600 : k === 'prompt' ? 400 : k === 'content' || k === 'old_string' ? 120 : 300; if (k === 'content' || k === 'old_string') o[k + '_len'] = v.length; v = v.slice(0, cap); }
    o[k] = v;
  }
  return o;
}
(async () => {
  const w = fs.createWriteStream(path.join(OUT, 'steps.jsonl'));
  let nT = 0;
  for (const d of dirs) {
    const short = d.includes('worktrees-') ? d.split('worktrees-')[1] : '(main)';
    for (const f of walk(path.join(P, d), [])) {
      const rel = path.relative(path.join(P, d), f).split(path.sep).join('/');
      const sub = rel.includes('/subagents/');
      const steps = []; const byMid = {}; const callById = {}; let ts0 = null, ts1 = null; let cwd = null; let compact = []; const prompts = [];
      const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
      let lineNo = 0;
      for await (const line of rl) {
        lineNo++;
        if (line.indexOf('"type":"assistant"') < 0 && line.indexOf('"type":"user"') < 0 && line.indexOf('isCompactSummary') < 0) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        if (o.timestamp) { if (!ts0) ts0 = o.timestamp; ts1 = o.timestamp; }
        if (!cwd && o.cwd) cwd = o.cwd;
        if (o.isCompactSummary) { compact.push(steps.length); continue; }
        if (o.type === 'assistant' && o.message && o.message.id) {
          const m = o.message; if (m.model === '<synthetic>') continue;
          let s = byMid[m.id];
          if (!s) { s = byMid[m.id] = { mid: m.id, ts: o.timestamp, ctx: 0, out: 0, text: '', think: '', calls: [] }; steps.push(s); }
          const u = m.usage || {}; const ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
          if (ctx > s.ctx) s.ctx = ctx; if ((u.output_tokens || 0) > s.out) s.out = u.output_tokens || 0;
          for (const b of Array.isArray(m.content) ? m.content : []) {
            if (b.type === 'text' && b.text) s.text += (s.text ? '\n' : '') + b.text.slice(0, 1500);
            else if (b.type === 'thinking' && b.thinking) s.think += b.thinking.slice(0, 1500);
            else if (b.type === 'tool_use') { const c = { id: b.id, name: b.name, inp: slimInput(b.name, b.input), rc: 0, err: false, head: '' }; s.calls.push(c); callById[b.id] = c; }
          }
        } else if (o.type === 'user' && o.message && (typeof o.message.content === 'string' || (Array.isArray(o.message.content) && o.message.content.some((b) => b && b.type === 'text') && !o.message.content.some((b) => b && b.type === 'tool_result')))) { if (!o.isMeta) prompts.push({ at: steps.length, text: txt(o.message.content).slice(0, 1200) }); } else if (o.type === 'user' && o.message && Array.isArray(o.message.content)) {
          for (const b of o.message.content) if (b && b.type === 'tool_result') {
            const c = callById[b.tool_use_id]; if (!c) continue; const t = txt(b.content);
            c.rc = t.length; c.err = !!b.is_error; c.head = t.slice(0, 240); c.tail = t.length > 240 ? t.slice(-120) : '';
            // keep a list of path-like strings in grep/glob results (for "opened from search" links)
            if (['Grep', 'Glob'].includes(c.name) || c.name === 'Bash' || c.name === 'PowerShell') { const ps = t.match(/[\w./\\-]+\.(?:py|tsx?|jsx?|mjs|md|json|toml|ya?ml|sql|txt|html)\b/g); if (ps) c.paths = [...new Set(ps)].slice(0, 60); }
          }
        }
      }
      nT++;
      w.write(JSON.stringify({ file: f, folder: short, sub, ts0, ts1, cwd, compact, prompts, steps }) + '\n');
    }
  }
  w.end();
  console.log('transcripts', nT);
})();
