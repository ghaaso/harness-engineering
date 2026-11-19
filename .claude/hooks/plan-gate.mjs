// Plan gate (version 1, 2026-11-19, unit GATE). Holds the build root to research-tree/build/plan.json, which is
// research-tree/ORCHESTRATION.md sections 2, 3, 6, 9 and BUILD-PLAN.md section 2 as data. The mechanism is
// admission control with precedence and a counting semaphore (a workflow engine starts a task only when the
// tasks it depends on are done and a slot is free); the lane stays the semaphore for test commands.
//   PreToolUse on Agent, for a description "<kind>: <unit id> ..." naming a planned unit: refuses (exit 2, one
//     line saying why and what the plan says) when the kind or model differs from the unit's row; a unit it
//     depends on, its builder's result (a refuter), or any unit of a batch its batch comes after is not done; a
//     helper for the same unit and role is still running; or its batch already runs as many units as its width.
//     A description naming no planned unit is left to the tier hook.
//   PostToolUse on Agent logs a start (tool_use_id and agent id); SubagentStop logs an end (agent id). Neither
//     ever blocks. A helper that returns LIMIT has ended, so a successor for its unit is allowed.
// Active only while plan.json exists. Log: .claude/logs/plan-gate.jsonl (git ignores it).
// If plan.json exists but cannot be read, a start naming an id found in its text (or, with no text, one of the
// plan's id forms) is refused and every other start passes; any error while deciding a planned start refuses
// it. So the build's own starts fail closed and a session doing unrelated work is never blocked.
// A width changes only through a line "width <batch> <n>: <measurement>" in research-tree/build/STATE.md (r57-0002).
// A helper that died without an end (an app restart kills helpers, r57-0118):
//   node .claude/hooks/plan-gate.mjs --end <agent id or tool_use_id> <why>
import { readFileSync, existsSync, appendFileSync, mkdirSync, statSync, renameSync, rmSync, rmdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const PLAN = resolve(root, 'research-tree', 'build', 'plan.json');
const STATE = resolve(root, 'research-tree', 'build', 'STATE.md');
const LOGDIR = resolve(root, '.claude', 'logs');
const LOG = resolve(LOGDIR, 'plan-gate.jsonl');
const LOCK = resolve(LOGDIR, 'plan-gate.lock');
// Used only when plan.json cannot be read at all: the id forms of plan version 1.
const ID_FORMS = /^(S\d\.\d[a-z]?|W\d|OUT|CLAIM|CGATE|REDO|PLAN|CLOSE|PROBE|L1|FX-[A-Z0-9]+|0b)$/;
const LOCK_STALE_MS = 5000; // a check holds the lock well under a second; an older lock is a crashed check
const LOCK_WAIT_MS = 8000;

const short = (e) => String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 120);
const normAgent = (a) => String(a).replace(/^agent-/, '');
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function append(o) { mkdirSync(LOGDIR, { recursive: true }); appendFileSync(LOG, JSON.stringify({ t: Date.now(), ...o }) + '\n'); }
function log(o) { try { append(o); } catch {} }

if (process.argv[2] === '--end') {
  const id = String(process.argv[3] || '').trim();
  const why = process.argv.slice(4).join(' ').trim();
  if (!id || !why) {
    process.stderr.write('usage: node .claude/hooks/plan-gate.mjs --end <agent id or tool_use_id> <why>\n');
    process.exit(1);
  }
  try {
    append({ ev: 'end', ...(id.startsWith('toolu_') ? { tu: id } : { agent: normAgent(id) }), manual: true, why: why.slice(0, 200) });
  } catch (e) {
    process.stderr.write(`plan gate: could not write ${LOG} (${short(e)})\n`);
    process.exit(1);
  }
  process.stdout.write(`plan gate: ${id} is logged as ended (${why.slice(0, 80)})\n`);
  process.exit(0);
}

let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
if (!j || typeof j !== 'object' || !existsSync(PLAN)) process.exit(0);
const ev = j.hook_event_name;
const sess = typeof j.session_id === 'string' ? j.session_id.slice(0, 8) : null;
const by = j.agent_id ? normAgent(j.agent_id) : null;
const tool = String(j.tool_name || '');
const isAgent = tool === 'Agent' || tool === 'Task';
const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};

if (ev === 'PostToolUse') {
  if (isAgent) {
    try {
      const tr = j.tool_response;
      const obj = tr && typeof tr === 'object' && !Array.isArray(tr);
      log({ ev: 'start', sess, by, tu: j.tool_use_id || null, agent: agentOf(tr),
        status: obj && typeof tr.status === 'string' ? tr.status : null,
        desc: String(ti.description ?? '').slice(0, 48), keys: Object.keys(j), rkeys: obj ? Object.keys(tr) : typeof tr });
    } catch {}
  }
  process.exit(0);
}
if (ev === 'SubagentStop') {
  try { log({ ev: 'end', sess, agent: j.agent_id ? normAgent(j.agent_id) : null, type: j.agent_type ?? null, keys: Object.keys(j) }); } catch {}
  process.exit(0);
}
if (ev !== 'PreToolUse' || !isAgent) process.exit(0);

const desc = String(ti.description ?? '').trim();
const dm = /^([a-z][a-z-]*)\s*:\s*(\S+)/i.exec(desc);
if (!dm) process.exit(0);
const kind = dm[1].toLowerCase();
const token = dm[2].replace(/[,;:.)\]]+$/, '');
const parts = token.split(/[+,&/]/).filter(Boolean);
const model = family(ti.model);
const rec = { sess, by, tu: j.tool_use_id || null, kind, model, token: token.slice(0, 40) };

function refuse(o, why) { log({ ev: 'deny', ...rec, ...o, why }); process.stderr.write(why + '\n'); process.exit(2); }

let plan;
try { plan = readPlan(); } catch (e) {
  const ids = idsFromText();
  const named = parts.find((p) => (ids ? ids.has(p) : ID_FORMS.test(p)));
  if (named) {
    refuse({ unit: named }, `plan gate: research-tree/build/plan.json exists but cannot be read (${short(e)}), so the start of planned unit ${named} waits until it is fixed; helpers naming no planned unit pass.`);
  }
  process.exit(0);
}

const alias = new Map(), lower = new Map(), byId = new Map();
for (const u of plan.units) {
  if (!byId.has(u.id)) byId.set(u.id, []);
  byId.get(u.id).push(u);
  for (const a of u.aliases || []) alias.set(a, u.id);
  lower.set(String(u.id).toLowerCase(), u.id);
  for (const a of u.aliases || []) lower.set(String(a).toLowerCase(), u.id);
}
const ids = parts.map((p) => alias.get(p) || p);
if (!ids.some((p) => byId.has(p))) {
  const near = parts.find((p) => lower.has(p.toLowerCase()));
  if (near) log({ ev: 'near', ...rec, note: `"${near}" differs in case from planned unit ${lower.get(near.toLowerCase())}; left to the tier hook` });
  process.exit(0);
}

let row;
try { row = pickRow(); } catch (e) { refuse({ unit: ids[0] }, `plan gate: could not check the start of planned unit ${ids[0]} (${short(e)}); it waits until the gate or plan.json is fixed.`); }
const says = `the plan: "${row.kind}: ${row.id} ..." on ${row.model}, batch ${row.batch}`;
const what = row.role === 'refute' ? `the review of ${row.covers ? row.covers.join('+') : row.id}` : row.id;
if (row.kind !== kind || row.model !== model) {
  refuse({ unit: row.id, role: row.role }, `plan gate: ${what} is not started as ${kind} on ${model || 'no model'}; ${says}.`);
}

let waits;
try { waits = notDone(); } catch (e) { refuse({ unit: row.id, role: row.role }, `plan gate: could not check what ${what} depends on (${short(e)}); it waits until that is fixed.`); }
if (waits.length) {
  const shown = waits.slice(0, 3).join('; ') + (waits.length > 3 ? `; and ${waits.length - 3} more` : '');
  refuse({ unit: row.id, role: row.role, waits: waits.slice(0, 12) },
    `plan gate: ${what} (batch ${row.batch}) waits for ${shown}; ${says}. Retry after the next helper's finish notice, not by polling.`);
}

let why = null;
if (!lock()) why = `plan gate: the start of ${what} could not take the gate's lock (.claude/logs/plan-gate.lock) within ${LOCK_WAIT_MS / 1000} s; retry after the next notice.`;
else {
  try { why = slotCheck(); if (!why) append({ ev: 'allow', ...rec, unit: row.id, role: row.role, batch: row.batch }); }
  catch (e) { why = `plan gate: could not count the running helpers for ${what} (${short(e)}); it waits until that is fixed.`; }
  finally { unlock(); }
}
if (why) refuse({ unit: row.id, role: row.role }, why);
process.exit(0);

// ---------------------------------------------------------------------------------------------------------

function family(m) {
  const s = typeof m === 'string' ? m.toLowerCase().trim() : '';
  return ['haiku', 'sonnet', 'opus', 'fable', 'mythos'].find((f) => s.includes(f)) || s || null;
}

function readPlan() {
  const read = () => JSON.parse(readFileSync(PLAN, 'utf8').replace(/^﻿/, ''));
  let p;
  try { p = read(); } catch { sleep(60); p = read(); } // one retry: a write in progress
  if (!p || !Array.isArray(p.units) || !Array.isArray(p.batches)) throw new Error('no "units" or "batches" list');
  return p;
}

function idsFromText() {
  let t;
  try { t = readFileSync(PLAN, 'utf8'); } catch { return null; }
  const s = new Set();
  for (const m of t.matchAll(/"id"\s*:\s*"([^"]{1,12})"/g)) s.add(m[1]);
  for (const m of t.matchAll(/"aliases"\s*:\s*\[([^\]]*)\]/g)) for (const a of m[1].matchAll(/"([^"]+)"/g)) s.add(a[1]);
  return s.size ? s : null;
}

function agentOf(tr) {
  if (tr && typeof tr === 'object') {
    for (const k of ['agentId', 'agent_id']) if (typeof tr[k] === 'string' && tr[k]) return normAgent(tr[k]);
  }
  const m = /agent[_ ]?id["']?\s*[:=]\s*["']?([A-Za-z0-9_-]{6,})/i.exec(typeof tr === 'string' ? tr : JSON.stringify(tr ?? ''));
  return m ? normAgent(m[1]) : null;
}

function unitRow(id) { return (byId.get(id) || []).find((u) => u.role !== 'refute'); }
function batchOf(id) {
  const b = plan.batches.find((x) => x.id === id);
  if (!b) throw new Error(`batch ${id} is not in plan.json`);
  return b;
}

function pickRow() {
  if (parts.length > 1) {
    const covering = kind === 'refute' && plan.units.find((u) => u.role === 'refute' && Array.isArray(u.covers) &&
      u.covers.length === new Set(ids).size && ids.every((p) => u.covers.includes(p)));
    if (covering) return covering;
    const reviews = plan.units.filter((u) => u.role === 'refute' && u.covers).map((u) => `"refute: ${u.id}" covers ${u.covers.join(', ')}`);
    refuse({ unit: ids.find((p) => byId.has(p)) }, `plan gate: a helper starts one planned unit; "${token}" names ${ids.join(', ')}.${reviews.length ? ' The plan\'s combined review: ' + reviews.join('; ') + '.' : ''}`);
  }
  const id = ids[0];
  const rows = byId.get(id) || [];
  if (kind === 'refute') {
    const r = rows.find((u) => u.role === 'refute');
    if (r) return r;
    const c = plan.units.find((u) => u.role === 'refute' && (u.covers || []).includes(id));
    const u = unitRow(id);
    refuse({ unit: id, role: 'refute' }, c
      ? `plan gate: ${id} has no review of its own; it is reviewed in "refute: ${c.id} ..." (covers ${c.covers.join(', ')}), batch ${c.batch}.`
      : `plan gate: ${id} has no refuter in the plan${u ? `; the plan: "${u.kind}: ${id} ..." on ${u.model}, batch ${u.batch}` : ''}.`);
  }
  const r = unitRow(id);
  if (!r) refuse({ unit: id }, `plan gate: ${id} is planned only as a review: "refute: ${id} ...".`);
  return r;
}

// Every reason the start must wait, as short texts; an empty list means everything it needs is done.
function notDone() {
  const memo = new Map();
  const done = (u) => {
    const k = `${u.id}|${u.role}`;
    if (!memo.has(k)) memo.set(k, u.done ? check(u.done, u.id) : true);
    return memo.get(k);
  };
  const out = [], seen = new Set();
  const add = (k, text) => { if (!seen.has(k)) { seen.add(k); out.push(text); } };
  for (const d of row.deps || []) {
    const u = unitRow(d);
    if (!u) throw new Error(`dependency ${d} of ${row.id} is not in plan.json`);
    if (!done(u)) add(`${u.id}|${u.role}`, `${u.id} (${doneText(u)})`);
  }
  if (row.needs && !check(row.needs, row.id)) add('needs', `${row.id}'s builder result (${row.needs.file || JSON.stringify(row.needs)})`);
  for (const b of batchOf(row.batch).after || []) {
    batchOf(b);
    for (const u of plan.units) {
      if (u.batch === b && u.done && !done(u)) add(`${u.id}|${u.role}`, `${u.role === 'refute' ? 'the review of ' + u.id : u.id} of batch ${b} (${doneText(u)})`);
    }
  }
  return out;
}

function doneText(u) {
  if (u.done && u.done.merged) return `not landed: ${u.done.merged} is not merged into build`;
  if (u.done && u.done.file) return `no ${u.done.file}`;
  return 'not done';
}

function check(spec, id) {
  if (spec && typeof spec.file === 'string') {
    return existsSync(resolve(root, spec.file)) || existsSync(resolve(root, '.claude', 'worktrees', id, spec.file));
  }
  if (spec && typeof spec.merged === 'string') {
    const r = spawnSync('git', ['-C', root, 'merge-base', '--is-ancestor', `refs/heads/${spec.merged}`, 'refs/heads/build'],
      { encoding: 'utf8', timeout: 15000, windowsHide: true });
    if (r.error) throw new Error('git: ' + short(r.error));
    if (r.status === 0) return true;
    if (r.status === 1 || /not a valid (object|commit) name/i.test(r.stderr || '')) return false; // not merged, or no such branch yet
    throw new Error(`git merge-base exit ${r.status}: ${String(r.stderr || '').trim().slice(0, 100)}`);
  }
  throw new Error(`unknown done form ${JSON.stringify(spec).slice(0, 60)}`);
}

// A start counts as running from its allow until its helper's end; before its Agent call returns, for pending_s.
function running(now) {
  let text = '';
  try { text = readFileSync(LOG, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const pendingMs = 1000 * Number((plan.gate && plan.gate.pending_s) ?? 60);
  const ends = new Set(), endTus = new Set(), starts = new Map(), allows = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.ev === 'end') { if (o.agent) ends.add(o.agent); if (o.tu) endTus.add(o.tu); }
    else if (o.ev === 'start' && o.tu) starts.set(o.tu, o);
    else if (o.ev === 'allow' && o.tu) allows.set(o.tu, o);
  }
  const out = [];
  for (const [tu, a] of allows) {
    if (endTus.has(tu)) continue;
    const s = starts.get(tu);
    if (s) {
      if (s.status && s.status !== 'async_launched') continue; // the call returned after the helper had finished
      if (s.agent && ends.has(s.agent)) continue;
      out.push({ unit: a.unit, role: a.role, batch: a.batch, tu, agent: s.agent || null, since: a.t });
    } else if (now - a.t < pendingMs) {
      out.push({ unit: a.unit, role: a.role, batch: a.batch, tu, agent: null, since: a.t, pending: true });
    }
  }
  return out;
}

function widthOf(b) {
  const max = Number(b.max ?? b.width);
  let n = Number(b.width), note = `plan.json width ${b.width}`;
  let text = '';
  try { text = readFileSync(STATE, 'utf8'); } catch {}
  for (const m of text.matchAll(/^[ \t>*-]*width\s+(\S+)\s+(\d+)\s*:\s*(.*\S)\s*$/gim)) {
    if (m[1] !== b.id) continue;
    const k = Number(m[2]);
    if (k >= 1 && k <= max && /\d/.test(m[3]) && m[3].length >= 12) { n = k; note = `STATE.md: width ${b.id} ${k}: ${m[3].slice(0, 60)}`; }
    else note += `; a STATE.md width line was ignored (1 to ${max}, naming its measurement)`;
  }
  return { n, note };
}

function slotCheck() {
  if (plan.gate && plan.gate.count_running === false) return null;
  const now = Date.now();
  const runs = running(now);
  const same = runs.find((r) => r.unit === row.id && r.role === row.role);
  if (same) {
    const age = Math.max(0, Math.round((now - same.since) / 60000));
    const ref = same.agent || same.tu;
    return `plan gate: a helper for ${what} is still running (${same.pending ? 'its Agent call has not returned' : 'agent ' + same.agent}, allowed ${age} min ago); one per unit and role, and a successor starts once it has ended (its finish notice). If it died without ending (an app restart): node .claude/hooks/plan-gate.mjs --end ${ref} "<why>".`;
  }
  if (row.role !== 'unit') return null;
  const b = batchOf(row.batch);
  const w = widthOf(b);
  const busy = runs.filter((r) => r.role === 'unit' && r.batch === b.id);
  if (busy.length >= w.n) {
    return `plan gate: batch ${b.id} already runs ${busy.length} of its width ${w.n} (${busy.map((r) => r.unit).join(', ')}; ${w.note}); ${row.id} starts when one of them returns. A width changes only by a line "width ${b.id} <n>: <measurement>" in research-tree/build/STATE.md.`;
  }
  return null;
}

function lock() {
  try { mkdirSync(LOGDIR, { recursive: true }); } catch {}
  const t0 = Date.now();
  for (;;) {
    try { mkdirSync(LOCK); return true; } catch (e) {
      if (e.code !== 'EEXIST') return false;
    }
    try {
      if (Date.now() - statSync(LOCK).mtimeMs > LOCK_STALE_MS) {
        const gone = `${LOCK}.stale.${process.pid}.${Date.now()}`;
        renameSync(LOCK, gone); // only one waiter wins the rename
        rmSync(gone, { recursive: true, force: true });
        continue;
      }
    } catch {}
    if (Date.now() - t0 > LOCK_WAIT_MS) return false;
    sleep(25);
  }
}
function unlock() { try { rmdirSync(LOCK); } catch {} }
