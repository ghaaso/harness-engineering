// replay-L2 scan: one JSON line per transcript with prefix measures (see SCORING.md).
// Usage: node scan.mjs <out.jsonl> <shard index> <shard count>
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const ROOT = 'C:/Users/User/.claude/projects';
const [out, si, sn] = [process.argv[2], +process.argv[3], +process.argv[4]];

function project(name) {
  if (name.startsWith('C--Users-User-Documents-projects-harness-engineering')) return 'harness';
  if (name === 'C--research-runs-2026-11-harness-leads') return 'run';
  if (/FixFlow|EMS-workshop1/.test(name)) return 'fixflow';
  if (/Clinic-Workshop/.test(name)) return 'clinic';
  return 'other';
}

const files = [];
for (const d of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const dir = path.join(ROOT, d.name);
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.jsonl')) files.push({ f: path.join(dir, e.name), folder: d.name, role: 'session' });
    if (e.isDirectory()) {
      const sd = path.join(dir, e.name, 'subagents');
      let ns; try { ns = fs.readdirSync(sd); } catch { continue; }
      for (const n of ns) if (n.endsWith('.jsonl')) files.push({ f: path.join(sd, n), folder: d.name, role: 'helper' });
    }
  }
}
files.sort((a, b) => a.f.localeCompare(b.f));
const mine = files.filter((_, i) => i % sn === si);
const ws = fs.createWriteStream(out);

function textOf(c) {
  if (typeof c === 'string') return c.length;
  if (!Array.isArray(c)) return 0;
  let n = 0; for (const x of c) n += (x.text || '').length + (typeof x.content === 'string' ? x.content.length : 0); return n;
}

async function scan(F) {
  let meta = {};
  if (F.role === 'helper') { try { meta = JSON.parse(fs.readFileSync(F.f.replace(/\.jsonl$/, '.meta.json'), 'utf8')); } catch {} }
  const desc = String(meta.description || '');
  const km = desc.match(/^([a-z-]+):/);
  const r = { file: F.f.slice(ROOT.length + 1), project: project(F.folder), role: F.role, kind: F.role === 'helper' ? (km ? km[1] : 'none') : 'session',
    agentType: meta.agentType || '', model: '', month: '', calls: 0, ctx: 0, fresh: 0, all: 0, out: 0, P: 0, firstIn: 0, firstCC: 0, firstCR: 0,
    cc1h: 0, cc5m: 0, preFreshStart: 0, preFreshLater: 0, laterRewriteCalls: 0, drops: 0, briefChars: 0, att: {}, tools: {} };
  const seen = new Set();
  let firstUser = true, beforeFirst = true, prevCtx = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(F.f, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const isA = line.includes('"type":"assistant"');
    if (!isA && !beforeFirst) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type === 'attachment' && beforeFirst && o.attachment) {
      const t = o.attachment.type || 'x'; r.att[t] = (r.att[t] || 0) + JSON.stringify(o.attachment).length; continue;
    }
    if (o.type === 'user' && firstUser && o.message) { r.briefChars = textOf(o.message.content); firstUser = false; continue; }
    if (o.type !== 'assistant' || !o.message) continue;
    const m = o.message;
    if (Array.isArray(m.content)) for (const x of m.content) if (x.type === 'tool_use') {
      let nm = x.name; if (nm === 'Skill' && x.input && x.input.skill) nm = 'Skill';
      r.tools[nm] = (r.tools[nm] || 0) + 1;
    }
    if (!m.usage || !m.id || seen.has(m.id) || m.model === '<synthetic>') continue;
    seen.add(m.id);
    const u = m.usage, inp = u.input_tokens || 0, cc = u.cache_creation_input_tokens || 0, cr = u.cache_read_input_tokens || 0, ou = u.output_tokens || 0;
    const c = inp + cc + cr;
    if (r.calls === 0) {
      r.model = m.model || ''; r.month = String(o.timestamp || '').slice(0, 7);
      r.P = c; r.firstIn = inp; r.firstCC = cc; r.firstCR = cr; beforeFirst = false;
      r.preFreshStart = Math.min(inp + cc, Math.max(0, c - cr));
    } else {
      const pf = Math.min(inp + cc, Math.max(0, Math.min(r.P, c) - cr));
      r.preFreshLater += pf; if (pf > 0.5 * r.P) r.laterRewriteCalls++;
      if (c < 0.5 * prevCtx) r.drops++;
    }
    if (u.cache_creation) { r.cc1h += u.cache_creation.ephemeral_1h_input_tokens || 0; r.cc5m += u.cache_creation.ephemeral_5m_input_tokens || 0; }
    prevCtx = c; r.calls++; r.ctx += c; r.out += ou; r.fresh += inp + cc + ou; r.all += c + ou;
  }
  if (r.calls) ws.write(JSON.stringify(r) + '\n');
}

let n = 0;
for (const F of mine) { try { await scan(F); } catch (e) { console.error('ERR', F.f, e.message); } if (++n % 200 === 0) console.log(n, 'of', mine.length); }
ws.end(); console.log('done', mine.length);
