// scan.mjs: replay-L11. Extract helper final reports, classify DONE claims, backing checks, later linked verdicts.
// Usage: node scan.mjs > claims.jsonl   (rules: SCORING.md). Read-only over transcripts.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const ROOT = 'C:/Users/User/.claude/projects';
function projectOf(d) {
  if (d.includes('harness-engineering')) return 'H';
  if (d.includes('research-runs-2026-11-harness-leads')) return 'RUN';
  if (d.includes('EMS-workshop1') || d.includes('23-FixFlow')) return 'FF';
  if (d.includes('24-Clinic-Workshop')) return 'CL';
  return null;
}
const CHECK = /(\bnpm (run )?test\b|\bnpx (vitest|jest|tsc|playwright|eslint)\b|\bvitest\b|\bjest\b|\bpytest\b|node --test|\btsc\b|\beslint\b|\blint\b|playwright|check\.mjs|land\.mjs|\bgate\b|run-tests|test\.mjs|\.test\.|\bmake test|gradlew|\bmanage\.py test|\bcheck\b)/i;
const FAILOUT = /(\b[1-9]\d* (failed|failing|fail(s|ures?)?)\b|^\s*FAIL\b|not ok \d|Error: |exit code [1-9]|Tests?:\s+[1-9]\d* failed|# fail [1-9])/im;
const DONE = /\b(DONE|done|completed?|pass(ed|es)?|fixed|verified|green|landed|built|all [^.\n]{0,40} pass|0 fail(ed|ures)?)\b/;
const NOTDONE = /^\W*(LIMIT|BLOCKED|FAIL(ED)?|could not|cannot|unable|I could not|I cannot|Stopped)/i;
const VERIFIER = /(refute|review|verify|verif|judge|gate|audit|re-?check|critic|check:|skeptic)/i;
const VFAIL = /\b(FAIL(S|ED)?|does not hold|refuted|overstat\w*|not done|survives|regress\w*|broken|wrong|incorrect|P1|blocker|rejected?|does not pass|fails?)\b/;
const VPASS = /\b(PASS(ES|ED)?|holds|confirmed|caught|correct|green|no (P1|findings|defects?))\b/i;
const STOP = new Set('the and for with from into that this then over helper first second third part read build run analyse refute extract locate collect review check fix new all one two of to a an in on by at as is'.split(' '));

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map(c => c && c.type === 'text' ? c.text : (c && c.type === 'tool_result' ? textOf(c.content) : '')).join('\n');
}
function tokens(desc) {
  return [...new Set(String(desc || '').replace(/^[a-z-]+:\s*/i, '').toLowerCase().split(/[^a-z0-9.\-_]+/)
    .map(t => t.replace(/^[.\-_]+|[.\-_]+$/g, '')).filter(t => t.length >= 2 && !STOP.has(t)))];
}

async function readJsonl(file, onObj) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line || line.length > 5e6) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    onObj(o);
  }
}

// one helper transcript -> summary
async function helper(file) {
  const h = { start: null, end: null, finalText: '', prompt: '', edits: 0, codeEdits: 0, lastEditIdx: -1, checks: [], n: 0 };
  const pending = new Map();
  let idx = 0;
  await readJsonl(file, o => {
    if (o.timestamp) { if (!h.start) h.start = o.timestamp; h.end = o.timestamp; }
    const m = o.message; if (!m) return;
    if (o.type === 'user' && !h.prompt) { const t = textOf(m.content); if (t) h.prompt = t.slice(0, 4000); }
    if (o.type === 'assistant' && Array.isArray(m.content)) {
      const t = m.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
      if (t) h.finalText = t;
      for (const c of m.content) {
        if (c.type !== 'tool_use') continue;
        if (c.name === 'SubagentHandback' && c.input && c.input.message) { h.handback = String(c.input.message); }
        idx++;
        const fp = c.input && (c.input.file_path || c.input.notebook_path) || '';
        if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(c.name)) { h.edits++; if (!/\.md$/i.test(fp)) { h.codeEdits++; h.lastEditIdx = idx; } }
        if (/^(Bash|PowerShell)$/.test(c.name) && CHECK.test(String(c.input && c.input.command || ''))) pending.set(c.id, { idx, cmd: String(c.input.command).slice(0, 200) });
      }
    }
    if (o.type === 'user' && Array.isArray(m.content)) {
      for (const c of m.content) {
        if (c.type !== 'tool_result' || !pending.has(c.tool_use_id)) continue;
        const p = pending.get(c.tool_use_id); pending.delete(c.tool_use_id);
        const out = textOf(c.content);
        p.err = !!c.is_error || FAILOUT.test(out); p.out = out.slice(-300);
        h.checks.push(p);
      }
    }
  });
  if (h.handback) h.finalText = h.handback;
  return h;
}

// parent tool calls after a time: executed checks
const parentCache = new Map();
async function parentChecks(file) {
  if (parentCache.has(file)) return parentCache.get(file);
  const calls = []; const pend = new Map();
  if (fs.existsSync(file)) await readJsonl(file, o => {
    const m = o.message; if (!m || !Array.isArray(m.content)) return;
    for (const c of m.content) {
      if (o.type === 'assistant' && c.type === 'tool_use') {
        const e = { t: o.timestamp, name: c.name, cmd: '' };
        if (/^(Bash|PowerShell)$/.test(c.name)) e.cmd = String(c.input && c.input.command || '').slice(0, 200);
        calls.push(e); pend.set(c.id, e);
      } else if (o.type === 'user' && c.type === 'tool_result' && pend.has(c.tool_use_id)) {
        const e = pend.get(c.tool_use_id); pend.delete(c.tool_use_id);
        if (e.cmd) { const out = textOf(c.content); e.err = !!c.is_error || FAILOUT.test(out); e.out = out.slice(-200); }
      }
    }
  });
  parentCache.set(file, calls);
  return calls;
}

function* walk(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else if (e.name.endsWith('.meta.json')) yield p;
  }
}

const out = [];
for (const d of fs.readdirSync(ROOT)) {
  const proj = projectOf(d); if (!proj) continue;
  const pdir = path.join(ROOT, d);
  for (const s of fs.readdirSync(pdir, { withFileTypes: true })) {
    if (!s.isDirectory()) continue;
    const sdir = path.join(pdir, s.name);
    const helpers = [];
    for (const mf of walk(path.join(sdir, 'subagents'))) {
      let meta; try { meta = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch { continue; }
      const tf = mf.replace(/\.meta\.json$/, '.jsonl'); if (!fs.existsSync(tf)) continue;
      const id = path.basename(tf, '.jsonl').replace(/^agent-/, '');
      const h = await helper(tf);
      helpers.push({ id, meta, h, dir: path.dirname(tf) });
    }
    for (const x of helpers) {
      const { id, meta, h } = x;
      if (!h.finalText || (h.start || '').startsWith('2026-11-23')) continue;
      const head = h.finalText.slice(0, 400);
      const isDone = meta.finished !== false && !NOTDONE.test(h.finalText) && (DONE.test(h.finalText.slice(0, 1500)) || h.finalText.split('\n').some(l => /^\W*(DONE|PASS)\b/.test(l)));
      const kind = h.codeEdits > 0 ? 'code' : 'report';
      const after = h.checks.filter(c => c.idx > h.lastEditIdx);
      const backed = after.length > 0 && !after[after.length - 1].err;
      const toks = tokens(meta.description);
      const later = [];
      for (const y of helpers) {
        if (y === x || !y.h.start || y.h.start <= h.end) continue;
        if ((y.meta.parentAgentId || null) !== (meta.parentAgentId || null)) continue;
        if (!VERIFIER.test(String(y.meta.description || ''))) continue;
        const hay = (String(y.meta.description) + '\n' + y.h.prompt).toLowerCase();
        const hit = toks.filter(t => hay.includes(t));
        const strong = hay.includes(id) || hit.filter(t => /\d/.test(t)).length >= 1 && hit.length >= 2 || hit.length >= 3;
        if (!strong) continue;
        const ft = y.h.finalText.slice(0, 600);
        later.push({ id: y.id, desc: y.meta.description, start: y.h.start, hit, fail: VFAIL.test(ft), pass: VPASS.test(ft), text: ft.slice(0, 300) });
      }
      const pfile = meta.parentAgentId ? path.join(x.dir, `agent-${meta.parentAgentId}.jsonl`) : path.join(pdir, s.name + '.jsonl');
      const pc = (await parentChecks(pfile)).filter(c => c.t > h.end);
      const pchk = pc.slice(0, 20).filter(c => c.cmd && CHECK.test(c.cmd)).map(c => ({ t: c.t, cmd: c.cmd.slice(0, 120), err: c.err, out: (c.out || '').slice(-120) }));
      out.push({ proj, session: s.name, id, desc: meta.description, model: meta.model, finished: meta.finished, depth: meta.spawnDepth, start: h.start, end: h.end,
        isDone, kind, codeEdits: h.codeEdits, checks: h.checks.length, backed, lastCheckErr: after.length ? after[after.length - 1].err : null,
        later, parentChecks: pchk, final: h.finalText.slice(0, 500) });
    }
    parentCache.clear();
  }
}
for (const o of out) process.stdout.write(JSON.stringify(o) + '\n');
console.error(`claims ${out.length}`);
