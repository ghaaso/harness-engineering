// Streams every transcript under ~/.claude/projects and writes token tables. No dependencies.
import fs from 'node:fs'; import path from 'node:path'; import readline from 'node:readline'; import os from 'node:os';
const ROOT = path.join(os.homedir(), '.claude', 'projects');
const OUT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const label = d => /harness-engineering/.test(d) ? 'harness' : /EMS-workshop1/.test(d) ? 'product' : /Clinic-Workshop/.test(d) ? 'clinic' : 'other';
const q = v => { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const row = a => a.map(q).join(',') + '\n';
const median = a => { if (!a.length) return ''; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const stripReminders = t => t.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
const CONT = /(hand ?over|handed over|continue|continuing|STATE|successor|resume|resumed|predecessor|carry on)/i;

const wT = fs.createWriteStream(path.join(OUT, 'tokens-transcripts.csv'));
const wC = fs.createWriteStream(path.join(OUT, 'tokens-calls-harness.csv'));
const wH = fs.createWriteStream(path.join(OUT, 'tokens-10min.csv'));
wT.write(row(['project','session_id','agent_id','kind','agent_type','description','models','first_ts','last_ts','calls','input','cache_creation','cache_read','output','ctx_first','ctx_peak','growth_median','growth_mean','first_prompt_80','prompt_says_continue','agent_calls','start_session_calls','orient_calls','orient_tokens']));
wC.write(row(['transcript_id','call_index','timestamp','model','context','output']));
const days = new Map(), hours = new Map();
const bump = (m, key, u) => { let r = m.get(key); if (!r) m.set(key, r = [0,0,0,0,0]); r[0]++; r[1]+=u[0]; r[2]+=u[1]; r[3]+=u[2]; r[4]+=u[3]; };

async function doFile(file, proj, sid, aid, kind, meta) {
  const calls = new Map(); let order = []; let prompt = null, agentCalls = 0, startCalls = 0, firstWriteIdx = null;
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.length < 20 || (line.charCodeAt(0) !== 123)) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type === 'user' && prompt === null && o.message) {
      const c = o.message.content; let t = null;
      if (typeof c === 'string') t = c;
      else if (Array.isArray(c) && !c.some(b => b.type === 'tool_result')) t = c.filter(b => b.type === 'text').map(b => b.text).join(' ');
      if (t !== null) { t = stripReminders(t); if (t) prompt = t; }
    }
    if (o.type !== 'assistant' || !o.message) continue;
    const m = o.message, u = m.usage; if (!u || !m.id) continue;
    if (m.model === '<synthetic>') continue;
    let r = calls.get(m.id);
    if (!r) { r = { ts: o.timestamp, model: m.model, u: [0,0,0,0] }; calls.set(m.id, r); order.push(m.id); }
    const v = [u.input_tokens||0, u.cache_creation_input_tokens||0, u.cache_read_input_tokens||0, u.output_tokens||0];
    for (let i = 0; i < 3; i++) r.u[i] = v[i] || r.u[i];
    r.u[3] = Math.max(r.u[3], v[3]);
    if (Array.isArray(m.content)) for (const b of m.content) if (b.type === 'tool_use') {
      if (b.name === 'Agent' || b.name === 'Task') agentCalls++;
      if (b.name === 'mcp__ccd_session__start_session') startCalls++;
      if (firstWriteIdx === null && (b.name === 'Write' || b.name === 'Edit' || b.name === 'Agent' || b.name === 'Task' || b.name==='NotebookEdit')) firstWriteIdx = order.length; // 1-based count of calls up to and including this one
    }
  }
  if (!order.length) return;
  const id = aid ? sid + '/' + aid : sid;
  const sums = [0,0,0,0], ctx = [], models = new Set(); let first = null, last = null, ci = 0;
  for (const mid of order) {
    const r = calls.get(mid); ci++;
    for (let i = 0; i < 4; i++) sums[i] += r.u[i];
    const c = r.u[0] + r.u[1] + r.u[2]; ctx.push(c); models.add(r.model);
    if (!first || r.ts < first) first = r.ts; if (!last || r.ts > last) last = r.ts;
    const day = (r.ts || '').slice(0, 10), hr = (r.ts || '').slice(0, 15) + '0';
    bump(days, [day, proj, r.model, kind].join('|'), r.u); if (hr >= '2026-11-16') bump(hours, [hr, proj, r.model, kind].join('|'), r.u);
    if (proj === 'harness') wC.write(row([id, ci, r.ts, r.model, c, r.u[3]]));
  }
  const g = []; for (let i = 1; i < ctx.length; i++) g.push(ctx[i] - ctx[i - 1]);
  let orientCalls = '', orientTok = '';
  if (proj === 'harness' && kind === 'main') {
    const n = firstWriteIdx === null ? order.length : firstWriteIdx; let t = 0;
    for (let i = 0; i < n; i++) { const u = calls.get(order[i]).u; t += u[0]+u[1]+u[2]+u[3]; }
    orientCalls = n; orientTok = t;
  }
  const isH = proj === 'harness';
  wT.write(row([proj, sid, aid || '', kind, meta.agentType || '', isH ? (meta.description || '') : '', [...models].join(';'), first, last, order.length, ...sums, ctx[0], Math.max(...ctx),
    median(g), g.length ? Math.round(g.reduce((a, b) => a + b, 0) / g.length) : '',
    isH && kind === 'main' && prompt ? prompt.replace(/[,\r\n]+/g, ' ').slice(0, 80) : '', isH && kind === 'main' && prompt ? (CONT.test(prompt.slice(0, 1500)) ? 1 : 0) : '',
    agentCalls, startCalls, orientCalls, orientTok]));
}

let nf = 0;
for (const d of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, d); let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
  const proj = label(d);
  for (const e of ents) {
    if (e.isFile() && e.name.endsWith('.jsonl')) { await doFile(path.join(dir, e.name), proj, e.name.slice(0, -6), '', 'main', {}); nf++; }
    else if (e.isDirectory()) {
      const sub = path.join(dir, e.name, 'subagents'); const stack = [sub];
      while (stack.length) { const cur = stack.pop(); let ls; try { ls = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
        for (const x of ls) { const p = path.join(cur, x.name); if (x.isDirectory()) { stack.push(p); continue; }
          if (/^agent-.*.jsonl$/.test(x.name)) {
            let meta = {}; try { meta = JSON.parse(fs.readFileSync(p.replace(/.jsonl$/, '.meta.json'), 'utf8')); } catch {}
            await doFile(p, proj, e.name, x.name.slice(6, -6), 'helper', meta); nf++;
            if (nf % 200 === 0) console.log('files', nf, new Date().toISOString()); } } }
    }
  }
}
const wD = fs.createWriteStream(path.join(OUT, 'tokens-days.csv'));
wD.write(row(['utc_day','project','model','kind','calls','input','cache_creation','cache_read','output']));
for (const [k, r] of [...days].sort()) wD.write(row([...k.split('|'), ...r]));
wH.write(row(['utc_10min','project','model','kind','calls','input','cache_creation','cache_read','output']));
for (const [k, r] of [...hours].sort()) wH.write(row([...k.split('|'), ...r]));
await Promise.all([wT, wC, wH, wD].map(w => new Promise(r => w.end(r))));
console.log('DONE files', nf, new Date().toISOString());
