// Count gate (version 1, 2026-11-24, unit T8-COUNT of top session 8). How many helpers run at once in this session,
// helpers of helpers counted as the app counts them, and a refusal of a start that would pass a width
// (r57-0414 version 2: run at the smallest width; r57-0056: what was designed is enforced by a hook).
// PreToolUse on Agent, Task and SendMessage. It refuses (exit 2, one line) a new helper, or a SendMessage that would
// revive a helper that has ended (a revival takes a slot like a start), when:
//   1. the helpers running now in this session, plus those admitted in the last seconds whose start has not shown
//      yet, plus this one, would pass the app's limit: 20 (observed: t7-0603, hc1-0103; the app's refusal names
//      CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS, read here when set);
//   2. a width a plan declared in research-tree/build/WIDTHS.md would be passed (format below).
// Every other width of r57-0414 is not computable by a hook today (research-tree/build/units/T8-COUNT/result.md).
//
// What runs, from the app's own files: <session>/subagents/agent-<id>.meta.json (description, toolUseId,
// parentAgentId, spawnDepth; "finished": true is written when the helper stops) and agent-<id>.jsonl (its
// transcript). The session folder comes from the hook input's transcript_path. A helper runs when its meta has no
// "finished", or its transcript was written after the meta (revived: a finished helper's transcript is never written
// more than 0.1 s after its meta, 450 of 450 measured), and when it or a helper below it wrote within T_QUIET.
// This is the app's count: replayed from SubagentStart and SubagentStop in .claude/logs/plan-gate.jsonl for
// 2026-11-23 (session ad4e59df, top session 7), 20 ran at each of the app's 26 "Concurrent subagent limit reached"
// refusals (counting the starts of the same batch it admitted: 13 + 7 at 17:01:28), and 19 or fewer before each of
// its 178 successful starts. A helper waiting on a background task has stopped (SubagentStop) and is not counted.
// An admitted start that another hook or the app then refused (its result in the caller's transcript is an error) is
// not pending (fix B2 of research-tree/build/refute/TOP8.md: the fan-out gate refuses a start's first try, and the
// retry was counted twice).
// A stale entry (a helper killed by an app restart, r57-0118, never gets "finished") expires after T_QUIET without a
// write by it or its own helpers; or at once by hand:
//   node .claude/hooks/count-gate.mjs --end <agent id> <why>
// See what it counts:  node .claude/hooks/count-gate.mjs --status <session id or its first characters>
//
// WIDTHS.md: other lines are prose and ignored, and so are indented and fenced lines (examples); a declaration is a
// line that starts at its first column (a "- " or "* " before it is allowed)
//   width "<pattern>" <n>: <reason>              at most n running helpers whose description matches
//   hold "<pattern>" while "<pattern>": <reason>  no new helper matching the first while one matching the second runs
// A pattern is matched against a helper's whole description, case and runs of spaces ignored; * is any text and ?
// one character. The reason names the plan line or the measurement and carries a number (r57-0002), at least 12
// characters. A declaration that does not parse refuses every start until it is fixed, so a plan's width is never
// silently off. Remove the line to lift it.
// Failure: an error while counting lets the start through and logs it (the app's own limit still stands behind);
// unreadable input passes. Log: .claude/logs/count-gate.jsonl (git ignores .claude/logs).
import { readFileSync, existsSync, appendFileSync, mkdirSync, statSync, renameSync, rmSync, rmdirSync, readdirSync,
  openSync, readSync, fstatSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';
import { homedir } from 'node:os';

// Kit mode (harness kit, 2026-11-25; docs/program/harness-kit-2026-11-25/CONTRACT.md section 2): only with --harness-kit
// "--project=<folder>": widths and holds are read from <project>/.harness/WIDTHS.md, the log and the lock are under
// <project>/.claude/logs, and --status looks for the session among the project's transcripts. Every rule as above. A
// missing or broken kit-mode.mjs leaves the hook as it is without the argument.
let KIT = null;
if (process.argv.includes('--harness-kit')) { try { KIT = (await import('./kit-mode.mjs')).kitMode(import.meta.url); } catch { KIT = null; } }
const here = dirname(fileURLToPath(import.meta.url));
const root = KIT ? KIT.project : resolve(here, '..', '..');
const WIDTHS = KIT ? join(KIT.state, 'WIDTHS.md') : resolve(root, 'research-tree', 'build', 'WIDTHS.md');
// Kit mode: the command that ends a helper by hand, with this machine's paths (repair F2, 2026-11-26).
const KIT_END = KIT ? { prog: `node "${fileURLToPath(import.meta.url).replace(/\\/g, '/')}"`,
  args: ` --harness-kit "--clone=${KIT.clone.replace(/\\/g, '/')}" "--project=${KIT.project.replace(/\\/g, '/')}"` } : null;
const WIDTHS_REL = KIT ? '.harness/WIDTHS.md' : 'research-tree/build/WIDTHS.md';
const LOGDIR = resolve(root, '.claude', 'logs');
const LOG = resolve(LOGDIR, 'count-gate.jsonl');
const LOCK = resolve(LOGDIR, 'count-gate.lock');

// The app's limit when CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS is not set: 20 (t7-0603 observed, its message
// "You can run 20 subagents at once"; hc1-0103 the documentation).
const APP_LIMIT = 20;
// Longest silence of a running helper: 10.8 min, measured over the 314 helpers of this repository's sessions of
// 2026-11-19 to 23 (gaps between transcript lines while the helper ran, periods after its SubagentStop left out);
// 9.4 min counting the writes of its own helpers; median 1.1, p99 8.2. Same form as WIDEN.md D6 (10.9 min in 262).
const T_QUIET_MS = 10.8 * 60000; // t8-0100
// A finished helper's transcript is written at most 0.097 s after its meta (458 of 458); the quickest revival came
// 0.113 s after the stop (17 revivals): a transcript written more than 0.1 s after the meta means the helper was revived.
const REVIVED_MS = 100; // t8-0101
// From PreToolUse to the Agent call's return: at most 16.7 s (median 0.32 s) over the 72 admitted starts in
// .claude/logs/plan-gate.jsonl, 2026-11-19 to 23. An admitted start counts as pending this long or until its meta shows.
const PENDING_MS = 16.7 * 1000; // t8-0102
// The lock: held for one count and one log line, at most 20 ms (t8-0103: waves of 21 checks at
// once over a 172-helper session folder, 944 holds). At most APP_LIMIT + 1 checks of one session wait at once (its helpers and the
// session itself), so a lock older than that many holds is a crashed check, and a waiter outlasts one crashed check
// plus a full queue.
const HOLD_MAX_MS = 20; // t8-0103
const LOCK_STALE_MS = (APP_LIMIT + 1) * HOLD_MAX_MS; // 420 ms (t8-0103, t7-0603)
const LOCK_WAIT_MS = 2 * LOCK_STALE_MS; // 840 ms

const short = (e) => String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 120);
const normAgent = (a) => String(a).trim().replace(/^agent-/, '');
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function append(o) { mkdirSync(LOGDIR, { recursive: true }); appendFileSync(LOG, JSON.stringify({ t: Date.now(), ...o }) + '\n'); }
function log(o) { try { append(o); } catch {} }

// ---- command line: --end, --status ------------------------------------------------------------------------------
if (process.argv[2] === '--end') {
  const id = normAgent(process.argv[3] || '');
  const words = process.argv.slice(4);
  if (KIT) { // the kit's own arguments are not part of the reason
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i] === '--project' && i + 1 < words.length) words.splice(i, 2);
      else if (/^--(harness-kit|no-usage-tool|project=|clone=)/.test(words[i])) words.splice(i, 1);
    }
  }
  const why = words.join(' ').trim();
  if (!id || !why) { process.stderr.write('usage: node .claude/hooks/count-gate.mjs --end <agent id> <why>\n'); process.exit(1); }
  try { append({ ev: 'end', agent: id, manual: true, why: why.slice(0, 200) }); } catch (e) {
    process.stderr.write(`count gate: could not write ${LOG} (${short(e)})\n`); process.exit(1);
  }
  process.stdout.write(`count gate: ${id} is counted as ended until it writes again (${why.slice(0, 80)})\n`);
  process.exit(0);
}
if (process.argv[2] === '--status') {
  const arg = String(process.argv[3] || '').trim();
  const proj = join(homedir(), '.claude', 'projects', root.replace(/[^A-Za-z0-9]/g, '-'));
  // Kit mode: also the folder named after the project's real path, under CLAUDE_CONFIG_DIR when that is set.
  const projs = KIT ? [...new Set([root, KIT.realOf(root)].flatMap((p) => [process.env.CLAUDE_CONFIG_DIR, join(homedir(), '.claude')]
    .filter(Boolean).map((c) => join(c, 'projects', p.replace(/[^A-Za-z0-9]/g, '-')))))] : [proj];
  let dir = null, sid = arg;
  if (arg && existsSync(join(arg, 'subagents'))) dir = join(arg, 'subagents');
  else if (arg) {
    for (const pr of projs) {
      try {
        const d = readdirSync(pr).find((n) => n.startsWith(arg) && !n.endsWith('.jsonl'));
        if (d) { dir = join(pr, d, 'subagents'); sid = d; break; }
      } catch {}
    }
  }
  if (!dir) { process.stderr.write(`usage: node .claude/hooks/count-gate.mjs --status <session id or prefix> (looked in ${proj})\n`); process.exit(1); }
  const now = Date.now();
  const t0 = process.hrtime.bigint();
  const c = count(dir, now, manualEnds(now), sid);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  let decl = [];
  try { decl = declarations(); } catch (e) { decl = [{ bad: short(e) }]; }
  process.stdout.write(`count gate: session ${sid}: ${c.running.length} helpers running, ${c.pending.length} pending, ${c.refused} admitted and then refused; limit ${limit()} (counted in ${ms.toFixed(0)} ms over ${c.seen} meta files)\n`);
  for (const r of c.running) process.stdout.write(`  ${r.id} depth ${r.depth ?? '?'} silent ${(r.silent / 60000).toFixed(1)} min: ${r.desc}\n`);
  for (const p of c.pending) process.stdout.write(`  pending ${p.tu || p.agent}: ${p.desc}\n`);
  for (const d of decl) process.stdout.write(`  ${d.bad ? 'BAD ' + d.bad : `${d.text} (WIDTHS.md line ${d.line})`}\n`);
  process.exit(0);
}

// ---- the hook ---------------------------------------------------------------------------------------------------
let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
if (!j || typeof j !== 'object' || j.hook_event_name !== 'PreToolUse') process.exit(0);
const tool = String(j.tool_name || '');
const isAgent = tool === 'Agent' || tool === 'Task';
const isSend = tool === 'SendMessage';
if (!isAgent && !isSend) process.exit(0);
const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
const sess = typeof j.session_id === 'string' ? j.session_id : null;
const by = j.agent_id ? normAgent(j.agent_id) : null;
const tu = typeof j.tool_use_id === 'string' ? j.tool_use_id : null;
const dir = sessionDir(j);
if (!dir || !sess) { log({ ev: 'error', sess, by, tu, why: 'no transcript_path or session_id: not counted' }); process.exit(0); }

let desc, revive = null;
if (isAgent) desc = String(ti.description ?? '');
else {
  // SendMessage: to a helper of this session that has ended it revives it, which takes a slot; anything else passes.
  const to = typeof ti.to === 'string' ? normAgent(ti.to.replace(/\s*\[[^\]]*\]$/, '')) : '';
  if (!to || !/^[A-Za-z0-9_-]{1,80}$/.test(to) || !existsSync(join(dir, `agent-${to}.meta.json`))) process.exit(0);
  let c;
  try { c = count(dir, Date.now(), manualEnds(Date.now()), sess); } catch { process.exit(0); }
  if (c.running.some((r) => r.id === to)) process.exit(0); // a message to a running helper is only a message
  const m = readMeta(dir, to);
  desc = String((m && m.description) || '');
  revive = to;
}
const rec = { sess, by, tu, ...(revive ? { agent: revive } : {}), desc: norm(desc).slice(0, 60) };

let decl;
try { decl = declarations(); } catch (e) {
  refuse(`count gate: ${WIDTHS_REL} ${short(e)}; every start waits until that line is fixed or removed (a width a plan declares is never silently off).`);
}

let why = null;
const t0 = Date.now();
if (!lock()) { log({ ev: 'error', ...rec, wait: Date.now() - t0, why: 'lock not taken in time: not counted' }); process.exit(0); }
const tLock = Date.now();
try {
  const now = Date.now();
  const c = count(dir, now, manualEnds(now), sess);
  const all = [...c.running, ...c.pending];
  const lim = limit();
  const nested = c.running.filter((r) => (r.depth ?? 1) > 1).length;
  // No helper is named for --end: every one counted wrote within T_QUIET, so none is known dead (a dead one drops out
  // by itself after T_QUIET of silence).
  const stale = !c.running.length ? '' : KIT_END
    ? ` A helper that died without ending (an app restart) drops out after ${T_QUIET_MS / 60000} min silent; to end one at once: ${KIT_END.prog} --end <helper id> "<why>"${KIT_END.args} (ids and silences: ${KIT_END.prog} --status ${String(sess).slice(0, 8)}${KIT_END.args}).`
    : ` A helper that died without ending (an app restart) drops out after ${T_QUIET_MS / 60000} min silent; to end one at once: node .claude/hooks/count-gate.mjs --end <id> "<why>" (ids and silences: --status ${String(sess).slice(0, 8)}).`;
  const verb = revive ? `reviving ${revive}` : 'this start';
  if (all.length + 1 > lim) {
    why = `count gate: ${c.running.length} helpers run in this session now (${nested} of them started by helpers)${c.pending.length ? ` and ${c.pending.length} were just admitted` : ''}; the app allows ${lim} at once, helpers of helpers counted (t7-0603), so ${verb} would be number ${all.length + 1}. Retry after the next finish notice, not by polling.${stale}`;
  }
  const d = norm(desc);
  for (const h of why ? [] : decl) {
    if (!glob(h.a, d)) continue;
    if (h.kind === 'hold') {
      const hit = all.find((r) => glob(h.b, norm(r.desc)));
      if (hit) { why = `count gate: ${verb} matches "${h.a}", held while "${h.b}" runs (WIDTHS.md line ${h.line}: ${clip(h.reason)}); running: ${hit.id || hit.tu || hit.agent} "${String(hit.desc).slice(0, 50)}". Retry after its finish notice, not by polling.${stale}`; break; }
    } else {
      const busy = all.filter((r) => glob(h.a, norm(r.desc)));
      if (busy.length + 1 > h.n) { why = `count gate: ${verb} matches "${h.a}", declared width ${h.n} (WIDTHS.md line ${h.line}: ${clip(h.reason)}); ${busy.length} run now (${busy.slice(0, 4).map((r) => r.id || r.tu || r.agent).join(', ')}). Retry after a finish notice, not by polling.${stale}`; break; }
    }
  }
  const timing = { wait: tLock - t0, hold: Date.now() - tLock };
  if (why) log({ ev: 'deny', ...rec, n: all.length, limit: lim, ...timing, why });
  else append({ ev: 'allow', ...rec, n: all.length, limit: lim, ...timing });
} catch (e) { log({ ev: 'error', ...rec, why: 'count failed: ' + short(e) }); }
finally { unlock(); }
if (why) { process.stderr.write(why + '\n'); process.exit(2); }
process.exit(0);

// ---------------------------------------------------------------------------------------------------------------

// A reason as written, up to 200 characters, cut only between words (a cut reason lost its last word: "0 helpers" read "0 ").
function clip(s) { s = String(s).trim(); if (s.length <= 200) return s; const c = s.slice(0, 200); const k = c.lastIndexOf(' '); return (k > 100 ? c.slice(0, k) : c) + ' ...'; }

function refuse(text) { log({ ev: 'deny', ...rec, why: text }); process.stderr.write(text + '\n'); process.exit(2); }

function limit() {
  const v = Number(process.env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS);
  return Number.isInteger(v) && v >= 1 ? v : APP_LIMIT;
}

// The folder of this session's helpers: <project>/<session id>/subagents. Inside a helper the input may point at the
// helper's own transcript, which lies in that folder.
function sessionDir(x) {
  const tp = typeof x.transcript_path === 'string' ? x.transcript_path.trim() : '';
  if (!tp || !/\.jsonl$/i.test(tp)) return null;
  if (/[\\/]subagents[\\/][^\\/]+\.jsonl$/i.test(tp)) return dirname(tp);
  return join(dirname(tp), basename(tp).replace(/\.jsonl$/i, ''), 'subagents');
}

function readMeta(d, id) {
  for (let k = 0; k < 2; k++) {
    try { return JSON.parse(readFileSync(join(d, `agent-${id}.meta.json`), 'utf8')); } catch { if (k === 0) sleep(20); }
  }
  return null;
}
function mtime(p) { try { return statSync(p).mtimeMs; } catch { return null; } }

// Running helpers of one session's folder, and admissions of the last PENDING_MS that have not shown yet.
function count(d, now, ends, sid) {
  let names = [];
  try { names = readdirSync(d); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const info = new Map();
  for (const n of names) {
    const m = /^agent-([A-Za-z0-9_-]{1,80})\.meta\.json$/.exec(n);
    if (!m) continue;
    const mm = mtime(join(d, n));
    if (mm == null) continue;
    info.set(m[1], { mm, tm: mtime(join(d, `agent-${m[1]}.jsonl`)) });
  }
  const metas = new Map();
  const metaOf = (id) => { if (!metas.has(id)) metas.set(id, readMeta(d, id)); return metas.get(id); };
  const last = (i) => Math.max(i.mm, i.tm ?? -Infinity);
  // The last write of each helper or of any helper below it, for the helpers that wrote within T_QUIET and their
  // ancestors.
  const tree = new Map();
  for (const [id, i] of info) {
    if (now - last(i) > T_QUIET_MS) continue;
    let cur = id, w = last(i);
    for (let g = 0; g < 12 && cur && info.has(cur); g++) {
      if (!(tree.get(cur) >= w)) tree.set(cur, w);
      const p = metaOf(cur) && metaOf(cur).parentAgentId;
      cur = p ? normAgent(p) : null;
    }
  }
  const running = [];
  for (const [id, w] of tree) {
    const i = info.get(id), m = metaOf(id);
    if (now - w > T_QUIET_MS) continue;
    const revived = i.tm != null && i.tm > i.mm + REVIVED_MS;
    if (m && m.finished === true && !revived) continue;
    const te = ends.get(id);
    if (te != null && last(i) <= te) continue; // ended by hand and not written since
    running.push({ id, desc: String((m && m.description) || ''), depth: m ? m.spawnDepth : null,
      parent: m && m.parentAgentId ? normAgent(m.parentAgentId) : null, tu: m ? m.toolUseId : null, silent: now - w });
  }
  const tus = new Set();
  for (const [, m] of metas) if (m && m.toolUseId) tus.add(m.toolUseId);
  const pending = [];
  const recent = tailAllows(now).filter((a) => a.sess === sid);
  const refused = refusedStarts(d, recent.filter((a) => !a.agent && a.tu && !tus.has(a.tu)));
  for (const a of recent) {
    if (refused.has(a.tu)) continue;
    if (a.agent) { // a revival: pending until the helper writes again
      const i = info.get(a.agent);
      if (i && i.tm != null && i.tm >= a.t) continue;
      if (running.some((r) => r.id === a.agent)) continue;
    } else if (!a.tu || tus.has(a.tu)) continue; // its meta shows (a new meta is recent, so it was read above)
    pending.push({ tu: a.tu, agent: a.agent || null, desc: String(a.desc || '') });
  }
  return { running, pending, refused: refused.size, seen: info.size };
}

// The end of a file back to the first line older than tMin (whole lines; an append-only file is in time order).
// Older lines cannot matter: an admission older than PENDING_MS has shown or failed, and a hand-written end older than
// T_QUIET marks a helper that has expired anyway; so no byte bound is needed. when(text) gives the time of the line
// that text starts with, or null.
function since(path, tMin, when) {
  let fd;
  try { fd = openSync(path, 'r'); } catch (e) { if (e.code === 'ENOENT') return ''; throw e; }
  try {
    let pos = fstatSync(fd).size;
    const parts = [];
    while (pos > 0) {
      const n = Math.min(1 << 20, pos); pos -= n; // a read size only: any size gives the same lines
      const b = Buffer.alloc(n); readSync(fd, b, 0, n, pos);
      parts.unshift(b);
      const first = b.indexOf(10);
      if (first >= 0 && first + 1 < n) {
        const t = when(b.subarray(first + 1, Math.min(n, first + 4097)).toString('utf8'));
        if (t != null && t < tMin) break;
      }
    }
    let s = Buffer.concat(parts).toString('utf8');
    if (pos > 0) s = s.slice(s.indexOf('\n') + 1);
    return s;
  } finally { closeSync(fd); }
}
var logCache = null; // var: the hook body above runs before this line
function lines(now = Date.now()) {
  if (logCache) return logCache;
  const out = [];
  const text = since(LOG, now - Math.max(T_QUIET_MS, PENDING_MS), (s) => { const m = /^\{"t":(\d+)/.exec(s); return m ? Number(m[1]) : null; });
  for (const l of text.split('\n')) {
    if (!l.trim()) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o && typeof o === 'object') out.push(o);
  }
  return (logCache = out);
}
function tailAllows(now) { return lines(now).filter((o) => o.ev === 'allow' && now - (Number(o.t) || 0) <= PENDING_MS); }
function manualEnds(now) {
  const m = new Map();
  for (const o of lines(now)) if (o.ev === 'end' && o.agent) { const t = Number(o.t) || 0; if (!(m.get(o.agent) >= t)) m.set(o.agent, t); }
  return m;
}
// Tool-use ids among these admissions whose result in the caller's transcript is an error: a later hook (the fan-out
// gate, the plan gate) or the app refused the start, so it will never run (fix B2). The caller's transcript is the
// session's <project>/<session>.jsonl, or <session>/subagents/agent-<by>.jsonl for a start made by a helper. Only the
// part written since the admission is read (the result comes after it).
function refusedStarts(d, allows) {
  const out = new Set();
  const byFile = new Map();
  for (const a of allows) {
    if (!a.tu || a.agent) continue;
    const f = a.by ? join(d, `agent-${a.by}.jsonl`) : join(dirname(dirname(d)), basename(dirname(d)) + '.jsonl');
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(a);
  }
  for (const [f, as] of byFile) {
    const tMin = Math.min(...as.map((a) => Number(a.t) || 0)) - 1000;
    const text = since(f, tMin, (s) => { const m = /"timestamp":"([^"]+)"/.exec(s); return m ? Date.parse(m[1]) : null; });
    for (const a of as) {
      const key = '"tool_use_id":"' + a.tu + '"';
      for (let k = text.indexOf(key); k >= 0; k = text.indexOf(key, k + 1)) {
        const ls = text.lastIndexOf('\n', k) + 1, le = text.indexOf('\n', k);
        const line = text.slice(ls, le < 0 ? text.length : le);
        if (/"type":"tool_result"/.test(line) && /"is_error":true/.test(line)) { out.add(a.tu); break; }
      }
    }
  }
  return out;
}

// WIDTHS.md declarations; a line that starts like one but does not parse throws, naming it.
function declarations() {
  let text;
  try { text = readFileSync(WIDTHS, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return []; throw new Error(`cannot be read (${short(e)})`); }
  const out = [];
  const ls = text.replace(/^﻿/, '').split(/\r?\n/);
  let fence = false;
  for (let k = 0; k < ls.length; k++) {
    const s = ls[k];
    if (/^[ \t]*```/.test(s)) { fence = !fence; continue; }
    if (fence) continue; // fenced and indented lines are examples, not declarations
    const head = /^(?:[-*][ \t]+)?(width|hold)[ \t]+"/i.exec(s.slice(0, 40));
    if (!head) continue;
    const line = k + 1;
    const bad = (w) => { throw new Error(`line ${line} is not a declaration (${w}): ${s.trim().slice(0, 80)}`); };
    if (s.length > 1000) bad('longer than 1000 characters');
    const body = s.slice(head.index + head[0].length - 1).trim(); // from the first quote
    const q = body.split('"'); // "", pattern, rest  or  "", pattern, " while ", pattern2, rest (a reason may hold quotes)
    const kind = head[1].toLowerCase();
    let a, b = null, n = null, rest;
    if (kind === 'width') {
      if (q.length < 3) bad('width "<pattern>" <n>: <reason>');
      a = q[1];
      const m = /^[ \t]+(\d{1,3})[ \t]*:(.*)$/.exec(q.slice(2).join('"'));
      if (!m) bad('width "<pattern>" <n>: <reason>');
      n = Number(m[1]); rest = m[2];
    } else {
      const tail = q.slice(4).join('"');
      if (q.length < 5 || !/^[ \t]+while[ \t]+$/i.test(q[2]) || !/^[ \t]*:/.test(tail)) bad('hold "<pattern>" while "<pattern>": <reason>');
      a = q[1]; b = q[3]; rest = tail.replace(/^[ \t]*:/, '');
    }
    const reason = rest.trim();
    if (!norm(a) || (b !== null && !norm(b))) bad('an empty pattern');
    if (reason.length < 12 || !/\d/.test(reason)) bad('the reason names its plan line or measurement, with a number, in 12 characters or more');
    out.push({ kind, a: norm(a), b: b === null ? null : norm(b), n, reason, line,
      text: kind === 'width' ? `width "${norm(a)}" ${n}` : `hold "${norm(a)}" while "${norm(b)}"` });
  }
  return out;
}

function norm(s) { return String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim(); }

// Wildcard match, * and ?, whole string; iterative with one backtrack point (linear for practical input, no regex).
function glob(p, s) {
  let i = 0, k = 0, star = -1, mark = 0;
  while (k < s.length) {
    if (i < p.length && (p[i] === '?' || p[i] === s[k])) { i++; k++; }
    else if (i < p.length && p[i] === '*') { star = i++; mark = k; }
    else if (star >= 0) { i = star + 1; k = ++mark; }
    else return false;
  }
  while (i < p.length && p[i] === '*') i++;
  return i === p.length;
}

function lock() {
  try { mkdirSync(LOGDIR, { recursive: true }); } catch {}
  const t0 = Date.now();
  for (;;) {
    try { mkdirSync(LOCK); return true; } catch (e) { if (e.code !== 'EEXIST' && e.code !== 'EPERM') return false; } // EPERM: Windows, the lock folder being removed
    try {
      if (Date.now() - statSync(LOCK).mtimeMs > LOCK_STALE_MS) {
        const gone = `${LOCK}.stale.${process.pid}.${Date.now()}`;
        renameSync(LOCK, gone); // only one waiter wins the rename
        rmSync(gone, { recursive: true, force: true });
        continue;
      }
    } catch {}
    if (Date.now() - t0 > LOCK_WAIT_MS) return false;
    sleep(10);
  }
}
function unlock() { try { rmdirSync(LOCK); } catch {} }
