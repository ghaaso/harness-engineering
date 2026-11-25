// The graph-of-thoughts check and ledger (2026-11-26; owner ruling r58-0027). Brief: research-tree/build/briefs/GOT-GATE.md.
// Rule: docs/program/RESEARCH-METHOD-RULES-2026-11-25.md, last section ("Graph of thoughts means the method, run in the open").
// Usage: node tools/check-got.mjs <folder> [--ledger]
//   without --ledger: exit 0 and "ok", or exit 1 and one line per minimum of point 4 not met (and per record fault).
//   with --ledger: the ledger of point 5 as markdown; the same bytes for the same records (no clock, no absolute paths).
// Reads <folder>/GRAPH-PLAN.md and <folder>/thoughts.jsonl. A thought whose `by` names a separate run is confirmed when the
// transcript agent-<id>.jsonl in a `subagents` folder under the project's folder in ~/.claude/projects (GOT_PROJECTS_DIR
// overrides it) holds a successful write to the thought's file: a Write/Edit/MultiEdit on the path, or a shell command
// naming the path with a write in it. Otherwise it is "not confirmed" and listed; that is not a fault. `top session` is
// never confirmed. Reads only. Cannot see: whether a thought is good, whether a score is fair, whether a `top session`
// thought was written honestly, or whether a confirmed run wrote the same text that is in the file now.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname, isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(process.env.GOT_ROOT || process.env.HYPOTHESIS_GATE_ROOT || resolve(here, '..'));
export const PLAN = 'GRAPH-PLAN.md';
export const THOUGHTS = 'thoughts.jsonl';
const OPS = new Set(['generate', 'aggregate', 'refine']);
const TOP = 'top session';
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const SHELL_WRITE_RE = />|\btee\b|\bsed\s+(?:[^|;&\n]*\s)?-i|writeFileSync|appendFileSync|copyFileSync|renameSync|\bSet-Content\b|\bAdd-Content\b|\bOut-File\b|\bCopy-Item\b|\bMove-Item\b|(?:^|[\s;&|(])(?:cp|mv)\s/i;

export function projectsDir(root = ROOT) {
  if (process.env.GOT_PROJECTS_DIR) return resolve(process.env.GOT_PROJECTS_DIR);
  return join(homedir(), '.claude', 'projects', resolve(root).replace(/[^A-Za-z0-9]/g, '-'));
}
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
// Forward slashes, lower case, Git Bash drive form (/c/...) turned into c:/...
const norm = (p) => String(p || '').replace(/\\+/g, '/').replace(/(^|[\s'"=(:])\/([a-zA-Z])\//g, (m, a, d) => `${a}${d}:/`).toLowerCase();
const time = (s) => { const t = Date.parse(s); return Number.isFinite(t) ? t : NaN; };
const q = (s) => '`' + String(s) + '`';

// ---- reading the records ----------------------------------------------------------------------------------------------
export function loadGraph(folder) {
  const dir = resolve(folder);
  const g = { dir, plan: null, thoughts: [], scores: [], keeps: [], finals: [], faults: [] };
  const planPath = join(dir, PLAN);
  if (existsSync(planPath)) g.plan = { mtime: statSync(planPath).mtimeMs };
  const text = read(join(dir, THOUGHTS));
  if (text == null) { g.faults.push(`There is no ${THOUGHTS} in the folder.`); return g; }
  text.split(/\r?\n/).forEach((l, i) => {
    if (!l.trim()) return;
    let o; try { o = JSON.parse(l); } catch { g.faults.push(`Line ${i + 1} of ${THOUGHTS} is not valid JSON.`); return; }
    if (!o || typeof o !== 'object') { g.faults.push(`Line ${i + 1} of ${THOUGHTS} is not a record.`); return; }
    o._line = i + 1;
    if (o.t === 'thought') g.thoughts.push(o);
    else if (o.t === 'score') g.scores.push(o);
    else if (o.t === 'keep') g.keeps.push(o);
    else if (o.t === 'final') g.finals.push(o);
    else g.faults.push(`Line ${i + 1} of ${THOUGHTS} has an unknown "t" (${JSON.stringify(o.t)}); the kinds are thought, score, keep, final.`);
  });
  return g;
}

// ---- who wrote a thought ----------------------------------------------------------------------------------------------
const transcriptCache = new Map();
function findTranscript(pdir, id) {
  const key = pdir + '|' + id;
  if (transcriptCache.has(key)) return transcriptCache.get(key);
  let found = null;
  let sess = []; try { sess = readdirSync(pdir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort(); } catch {}
  for (const s of sess) {
    const p = join(pdir, s, 'subagents', `agent-${id}.jsonl`);
    if (existsSync(p)) { found = p; break; }
  }
  transcriptCache.set(key, found);
  return found;
}
function blocksOf(o) { return o && o.message && Array.isArray(o.message.content) ? o.message.content : []; }
// 'verified' | 'no transcript' | 'no write' | 'top session'
export function writerState(thought, dir, opts = {}) {
  const by = String(thought.by || '');
  if (by === TOP) return { state: 'top session' };
  const id = by.replace(/^agent-/, '');
  const root = opts.root || ROOT;
  const tp = findTranscript(opts.projectsDir || projectsDir(root), id);
  if (!tp) return { state: 'no transcript', id };
  const abs = resolve(dir, String(thought.file || ''));
  const targets = [norm(abs)];
  const rel = relative(root, abs);
  if (rel && !rel.startsWith('..') && !isAbsolute(rel)) targets.push(norm(rel));
  const text = read(tp) || '';
  const want = new Set();
  const ls = text.split('\n');
  for (const l of ls) {
    if (!l.includes('"tool_use"')) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    for (const b of blocksOf(o)) {
      if (b.type !== 'tool_use' || !b.input) continue;
      if (WRITE_TOOLS.has(b.name) && norm(b.input.file_path || b.input.notebook_path) === targets[0]) want.add(b.id);
      else if ((b.name === 'Bash' || b.name === 'PowerShell') && typeof b.input.command === 'string') {
        const c = norm(b.input.command);
        if (targets.some((t) => c.includes(t)) && SHELL_WRITE_RE.test(b.input.command)) want.add(b.id);
      }
    }
  }
  if (want.size) for (const l of ls) {
    if (!l.includes('"tool_result"')) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    for (const b of blocksOf(o)) if (b.type === 'tool_result' && want.has(b.tool_use_id) && b.is_error !== true) return { state: 'verified', id };
  }
  return { state: 'no write', id };
}

// ---- the minimums of point 4 ------------------------------------------------------------------------------------------
export function checkGot(folder, opts = {}) {
  const g = loadGraph(folder);
  const faults = [...g.faults];
  const byId = new Map();
  for (const t of g.thoughts) {
    const where = `Thought on line ${t._line}`;
    if (typeof t.id !== 'string' || !t.id) { faults.push(`${where} has no "id".`); continue; }
    if (byId.has(t.id)) { faults.push(`Thought ${q(t.id)} is recorded twice.`); continue; }
    byId.set(t.id, t);
  }
  const ok = (t) => typeof t.id === 'string' && byId.get(t.id) === t;
  const thoughts = g.thoughts.filter(ok);
  // Record form (point 3).
  const fileOwner = new Map();
  for (const t of thoughts) {
    const n = q(t.id);
    if (!OPS.has(t.op)) faults.push(`Thought ${n} has op ${JSON.stringify(t.op)}; it must be generate, aggregate or refine.`);
    if (typeof t.part !== 'string' || !t.part) faults.push(`Thought ${n} has no "part".`);
    if (!Array.isArray(t.parents)) faults.push(`Thought ${n} has no "parents" list.`);
    else {
      if (t.op === 'generate' && t.parents.length) faults.push(`Thought ${n} is a generate with parents; only a generate has none.`);
      if (t.op !== 'generate' && OPS.has(t.op) && !t.parents.length) faults.push(`Thought ${n} is ${t.op === 'aggregate' ? 'an' : 'a'} ${t.op} with no parents.`);
      for (const p of t.parents) if (!byId.has(p)) faults.push(`Thought ${n} names a parent ${q(p)} that is not recorded.`);
    }
    if (typeof t.by !== 'string' || !t.by.trim()) faults.push(`Thought ${n} has no "by" (the run that wrote it, or "top session").`);
    if (Number.isNaN(time(t.at))) faults.push(`Thought ${n} has no readable "at" time.`);
    if (typeof t.file !== 'string' || !t.file) faults.push(`Thought ${n} has no "file".`);
    else {
      const abs = resolve(g.dir, t.file);
      const key = norm(abs);
      if (fileOwner.has(key)) faults.push(`Thoughts ${q(fileOwner.get(key))} and ${n} share the file ${q(t.file)}; each thought needs its own.`);
      else fileOwner.set(key, t.id);
      let size = -1; try { size = statSync(abs).isFile() ? statSync(abs).size : -1; } catch {}
      if (size < 0) faults.push(`Thought ${n}: its file ${q(t.file)} does not exist.`);
      else if (size === 0) faults.push(`Thought ${n}: its file ${q(t.file)} is empty.`);
    }
  }
  const scoresOf = new Map();
  for (const s of g.scores) {
    const where = `The score on line ${s._line}`;
    if (!byId.has(s.thought)) { faults.push(`${where} is of a thought ${q(s.thought)} that is not recorded.`); continue; }
    if (typeof s.by !== 'string' || !s.by.trim()) faults.push(`${where} has no "by".`);
    if (!s.levels || typeof s.levels !== 'object' || Array.isArray(s.levels) || !Object.keys(s.levels).length) faults.push(`${where} has no "levels" (a level per profile of the criteria sheet).`);
    if (!('vetoes' in s)) faults.push(`${where} has no "vetoes".`);
    if (!('entries' in s)) faults.push(`${where} has no "entries".`);
    if (Number.isNaN(time(s.at))) { faults.push(`${where} has no readable "at" time.`); continue; }
    if (!scoresOf.has(s.thought)) scoresOf.set(s.thought, []);
    scoresOf.get(s.thought).push(s);
  }
  const scoredBy = (id, at) => (scoresOf.get(id) || []).some((s) => time(s.at) <= at);
  const scoredAfter = (id, at) => (scoresOf.get(id) || []).some((s) => time(s.at) >= at);

  // 1. The plan is older than every thought.
  if (!g.plan) faults.push(`There is no ${PLAN}: the plan must be written before the first thought.`);
  else {
    const late = thoughts.filter((t) => !Number.isNaN(time(t.at)) && time(t.at) <= g.plan.mtime).sort((a, b) => cmp(a.id, b.id));
    if (late.length) faults.push(`The plan is not older than every thought: it was last changed after ${late.map((t) => q(t.id)).join(', ')} ${late.length > 1 ? 'were' : 'was'} written (by "at").`);
    let oldest = null;
    for (const t of thoughts) {
      if (typeof t.file !== 'string') continue;
      let m; try { m = statSync(resolve(g.dir, t.file)).mtimeMs; } catch { continue; }
      if (!oldest || m < oldest.m) oldest = { m, t };
    }
    if (oldest && oldest.m <= g.plan.mtime) faults.push(`The plan is not older than every thought: its file was changed after the oldest thought file (${q(oldest.t.file)}).`);
  }
  // 2 and 3. Parts and generated thoughts.
  const gen = new Map();
  for (const t of thoughts) if (t.op === 'generate' && typeof t.part === 'string' && t.part) {
    if (!gen.has(t.part)) gen.set(t.part, []);
    gen.get(t.part).push(t);
  }
  const parts = [...gen.keys()].sort(cmp);
  if (parts.length < 2) faults.push(`Only ${parts.length} part${parts.length === 1 ? ' has' : 's have'} generated thoughts; at least two parts are needed.`);
  for (const p of parts) if (gen.get(p).length < 3) faults.push(`Part ${q(p)} has ${gen.get(p).length} generated thought${gen.get(p).length === 1 ? '' : 's'}; at least three are needed.`);
  // 4. A score before a thought is kept, dropped or made a parent.
  for (const k of g.keeps) {
    const at = time(k.at);
    if (Number.isNaN(at)) { faults.push(`The selection on line ${k._line} has no readable "at" time.`); continue; }
    const ids = [...(Array.isArray(k.kept) ? k.kept : []), ...(Array.isArray(k.dropped) ? k.dropped.map((d) => (d && typeof d === 'object' ? d.thought : d)) : [])];
    for (const id of ids) {
      if (!byId.has(id)) { faults.push(`The selection of part ${q(k.part)} names ${q(id)}, which is not recorded.`); continue; }
      if (!scoredBy(id, at)) faults.push(`${q(id)} is ${(k.kept || []).includes(id) ? 'kept' : 'dropped'} in part ${q(k.part)} without a score before the selection.`);
    }
  }
  for (const t of thoughts) if (Array.isArray(t.parents) && !Number.isNaN(time(t.at)))
    for (const p of t.parents) if (byId.has(p) && !scoredBy(p, time(t.at))) faults.push(`${q(p)} is a parent of ${q(t.id)} without a score before ${q(t.id)} was written.`);
  // 5. Selections.
  const keepParts = new Set(g.keeps.map((k) => k.part));
  for (const p of parts) if (!keepParts.has(p)) faults.push(`Part ${q(p)} has no selection (a "keep" record).`);
  for (const k of g.keeps) {
    if (!Array.isArray(k.kept)) { faults.push(`The selection on line ${k._line} has no "kept" list.`); continue; }
    const why = typeof k.why === 'string' ? k.why.trim() : '';
    if (k.kept.length < 2 && !why) faults.push(`The selection of part ${q(k.part)} keeps ${k.kept.length} thought${k.kept.length === 1 ? '' : 's'} and does not say why only one could be kept (a "why" field).`);
    if (!Array.isArray(k.dropped)) faults.push(`The selection of part ${q(k.part)} has no "dropped" list (it may be empty).`);
    else for (const d of k.dropped) {
      const id = d && typeof d === 'object' ? d.thought : d;
      if (!d || typeof d !== 'object' || typeof d.reason !== 'string' || !d.reason.trim()) faults.push(`${q(id)}, dropped in part ${q(k.part)}, has no reason.`);
    }
  }
  // 6. Three scored aggregates with different sets of parents (an aggregate combines at least two).
  const aggs = thoughts.filter((t) => t.op === 'aggregate');
  const sets = new Set();
  for (const a of aggs) if (Array.isArray(a.parents) && new Set(a.parents).size >= 2 && (scoresOf.get(a.id) || []).length) sets.add([...new Set(a.parents)].sort(cmp).join('\u0000'));
  if (sets.size < 3) faults.push(`There ${sets.size === 1 ? 'is' : 'are'} ${sets.size} scored aggregate${sets.size === 1 ? '' : 's'} with different sets of parents (each combining at least two thoughts); at least three are needed.`);
  // 7. A refine of an aggregate, scored after it.
  const refines = thoughts.filter((t) => t.op === 'refine' && Array.isArray(t.parents) && t.parents.some((p) => byId.has(p) && byId.get(p).op === 'aggregate'));
  if (!refines.length) faults.push('There is no refine whose parent is an aggregate.');
  else if (!refines.some((r) => !Number.isNaN(time(r.at)) && scoredAfter(r.id, time(r.at)))) faults.push('No refine of an aggregate has a score made after it was written.');
  // 8. The final thought.
  if (!g.finals.length) faults.push('There is no final record ({"t":"final","thought":...}).');
  else if (g.finals.length > 1) faults.push(`There are ${g.finals.length} final records; there must be one.`);
  else {
    const f = byId.get(g.finals[0].thought);
    if (!f) faults.push(`The final thought ${q(g.finals[0].thought)} is not recorded.`);
    else if (f.op !== 'aggregate' && f.op !== 'refine') faults.push(`The final thought ${q(f.id)} is ${f.op === 'generate' ? 'a generate' : JSON.stringify(f.op)}; it must be an aggregate or a refine.`);
  }
  return { faults, graph: g, byId, thoughts, scoresOf, parts };
}

// ---- the ledger of point 5 ----------------------------------------------------------------------------------------------
function fmt(v) {
  if (v == null) return 'none';
  if (Array.isArray(v)) return v.length ? v.map(fmt).join('; ') : 'none';
  if (typeof v === 'object') { const ks = Object.keys(v).sort(cmp); return ks.length ? ks.map((k) => `${k}=${fmt(v[k])}`).join(', ') : 'none'; }
  return String(v).replace(/\s+/g, ' ').trim() || 'none';
}
export function ledger(folder, opts = {}) {
  const r = checkGot(folder, opts);
  const { graph: g, byId, thoughts, scoresOf } = r;
  const dir = g.dir;
  const out = [];
  if (r.faults.length) { out.push('Minimums not met:', ''); for (const f of r.faults) out.push('- ' + f); }
  else out.push('Every minimum is met.');
  const order = (a, b) => cmp(time(a.at) || 0, time(b.at) || 0) || cmp(String(a.id), String(b.id));
  const writers = new Map();
  for (const t of [...thoughts].sort((a, b) => cmp(a.id, b.id))) writers.set(t.id, writerState(t, dir, opts));
  const who = (t) => {
    const w = writers.get(t.id);
    if (w.state === 'top session') return 'written by the top session (cannot be confirmed)';
    return `written by run ${q(w.id)}: ${w.state === 'verified' ? 'confirmed' : 'not confirmed'}`;
  };
  const scoreLines = (t, ind) => {
    const ss = [...(scoresOf.get(t.id) || [])].sort((a, b) => cmp(time(a.at), time(b.at)) || cmp(String(a.by), String(b.by)) || a._line - b._line);
    if (!ss.length) return [`${ind}- not scored`];
    return ss.map((s) => `${ind}- scored by ${q(fmt(s.by))}: levels ${fmt(s.levels)}; vetoes: ${fmt(s.vetoes)}; entries: ${fmt(s.entries)}`);
  };
  const item = (t) => {
    const ps = Array.isArray(t.parents) && t.parents.length ? `, parents ${t.parents.map(q).join(', ')}` : '';
    return [`- ${q(t.id)} (file ${q(fmt(t.file))}${t.op !== 'generate' ? `, part ${q(fmt(t.part))}` : ''}${ps}), ${who(t)}`, ...scoreLines(t, '  ')];
  };
  const parts = new Set(r.parts);
  for (const k of g.keeps) if (typeof k.part === 'string' && k.part) parts.add(k.part);
  for (const p of [...parts].sort(cmp)) {
    out.push('', `### Part ${q(p)}`, '', 'Generated:', '');
    const gs = thoughts.filter((t) => t.op === 'generate' && t.part === p).sort(order);
    if (!gs.length) out.push('- none');
    for (const t of gs) out.push(...item(t));
    const ks = g.keeps.filter((k) => k.part === p).sort((a, b) => cmp(time(a.at), time(b.at)) || a._line - b._line);
    if (!ks.length) out.push('', 'No selection.');
    ks.forEach((k, i) => {
      out.push('', `Selection${ks.length > 1 ? ' ' + (i + 1) : ''}: kept ${Array.isArray(k.kept) && k.kept.length ? k.kept.map(q).join(', ') : 'none'}.` +
        (typeof k.why === 'string' && k.why.trim() ? ` Why only one: ${fmt(k.why)}` : ''));
      const ds = Array.isArray(k.dropped) ? k.dropped : [];
      if (!ds.length) out.push('Dropped: none.');
      else { out.push('Dropped:'); for (const d of ds) out.push(d && typeof d === 'object' ? `- ${q(fmt(d.thought))}: ${fmt(d.reason)}` : `- ${q(fmt(d))}: no reason given`); }
    });
  }
  for (const [title, op] of [['Aggregates', 'aggregate'], ['Refinements', 'refine']]) {
    out.push('', `### ${title}`, '');
    const ts = thoughts.filter((t) => t.op === op).sort(order);
    if (!ts.length) out.push('- none');
    for (const t of ts) out.push(...item(t));
  }
  const other = thoughts.filter((t) => !OPS.has(t.op)).sort(order);
  if (other.length) { out.push('', '### Thoughts with an unknown op', ''); for (const t of other) out.push(...item(t)); }
  out.push('', '### Final thought', '');
  if (g.finals.length === 1 && byId.has(g.finals[0].thought)) { const f = byId.get(g.finals[0].thought); out.push(`- ${q(f.id)} (${fmt(f.op)}, file ${q(fmt(f.file))})`); }
  else if (!g.finals.length) out.push('- none recorded');
  else out.push(...g.finals.map((f) => `- ${q(fmt(f.thought))}`));
  out.push('', '### Writers not confirmed', '');
  const un = [...writers.entries()].filter(([, w]) => w.state !== 'verified');
  if (!un.length) out.push('- none');
  for (const [id, w] of un) {
    const t = byId.get(id);
    out.push(`- ${q(id)}: ` + (w.state === 'top session' ? 'by the top session; never confirmed'
      : w.state === 'no transcript' ? `by run ${q(w.id)}; no transcript agent-${w.id}.jsonl was found`
        : `by run ${q(w.id)}; its transcript holds no write to ${q(fmt(t.file))}`));
  }
  return out.join('\n') + '\n';
}

// ---- the command line -----------------------------------------------------------------------------------------------------
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === self.toLowerCase()) {
  const args = process.argv.slice(2);
  const wantLedger = args.includes('--ledger');
  const folder = args.find((a) => a !== '--ledger');
  if (!folder) { process.stderr.write('usage: node tools/check-got.mjs <folder> [--ledger]\n'); process.exit(1); }
  const dir = resolve(process.cwd(), folder);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) { process.stdout.write(`The folder ${folder} does not exist.\n`); process.exit(1); }
  if (wantLedger) { process.stdout.write(ledger(dir)); process.exit(0); }
  const { faults } = checkGot(dir);
  if (!faults.length) { process.stdout.write('ok\n'); process.exit(0); }
  process.stdout.write(faults.join('\n') + '\n');
  process.exit(1);
}
