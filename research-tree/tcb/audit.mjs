// audit.mjs: the read audit, the protected-write check, the search log, the notes rule, the first-call
// context and the coordinator's turns above 1.5 * W* (spec/audit.mjs.md, CONTRACT.md 3.5, 3.6, 3.7).
// It works only from the transcripts the harness writes (the session and its helpers) and never reads
// a note's text to decide anything but the TURN-END line.
//
// node audit.mjs --root R --ce N --task <id> --epoch <e> [--now iso] [--dry-run]
// node audit.mjs --root R --ce N --coordinator --session <id> [--now iso] [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import {
  TcbError, parseArgs, runMain, edgeFacts, thresholds, getObject, readJson, writeAtomic,
  acquireLock, appendLedger, recordIncident, readTasks, attemptOf, sessionTranscripts,
  parseTranscript, isUnder, normPath, relPosix, segmentName, checkCe, realProc,
} from './lib.mjs';

const SCRIPT = 'audit';
const SPEC = {
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    task: { type: 'string' },
    epoch: { type: 'int' },
    coordinator: { type: 'bool' },
    session: { type: 'string' },
    now: { type: 'string' },
    'dry-run': { type: 'bool' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
  },
};
const SESSION_RE = /^[0-9a-f-]{36}$/;
const RESULT_CUT = 2000;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
const NODE_PREFIX = 'node tcb/scripts/';

function isoNow(flags) {
  let now;
  try { now = edgeFacts(flags).now; } catch { now = flags.now; }
  if (now === null || now === undefined) now = flags.now;
  if (now instanceof Date) return now.toISOString();
  if (typeof now === 'number') return new Date(now).toISOString();
  return String(now);
}
const sortUnique = (xs) => [...new Set(xs)].sort();
const fwd = (p) => String(p).split(path.sep).join('/');
const usage = (detail) => new TcbError('usage', 66, detail);

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = sortKeys(v[k]);
    return o;
  }
  return v;
}
const pretty = (v) => JSON.stringify(sortKeys(v), null, 2) + '\n';

async function main(ctx) {
  const { flags } = parseArgs(process.argv.slice(2), SPEC);
  if (!path.isAbsolute(flags.root)) throw usage({ flag: 'root' });
  if (flags.now !== undefined && Number.isNaN(Date.parse(flags.now))) throw usage({ flag: 'now' });
  const root = path.resolve(flags.root);
  const ce = flags.ce;
  const dry = !!flags['dry-run'];
  const coordinator = !!flags.coordinator;
  const hasTask = flags.task !== undefined && flags.task !== null;
  if (coordinator === hasTask) throw usage({ why: 'exactly one of --task and --coordinator' });
  if (coordinator && (flags.session === undefined || flags.epoch !== undefined)) throw usage({ why: '--coordinator takes --session and no --epoch' });
  if (!coordinator && (flags.epoch === undefined || flags.session !== undefined)) throw usage({ why: '--task takes --epoch and no --session' });
  if (coordinator && !SESSION_RE.test(flags.session)) throw usage({ why: 'bad session id' });

  const th = thresholds(root);
  const now = isoNow(flags);
  const ctl = { root, ce, dry, th, now, ctx, flags };
  return coordinator ? coordinatorForm(ctl) : taskForm(ctl);
}

// ---------------------------------------------------------------------------------------------
// shared
// ---------------------------------------------------------------------------------------------
// The lock is held here, not by a library wrapper, and every call inside is awaited: nothing depends
// on whether the library's helpers are synchronous.
async function locked({ root, ce, th, now }, fn) {
  const h = await acquireLock(root, 'run.lock', { script: SCRIPT, ce, proc: realProc({ exe: th.get('proc_exe') }), now, retries: th.get('lock_retries') });
  try {
    await checkCe(root, ce);
    return await fn(h);
  } finally {
    await h.release();
  }
}
// isUnder answers a boolean; it is awaited and compared strictly so that either form works.
const under = async (child, parent) => (await isUnder(child, parent)) === true;

// "not run" records: one check line and one incident line, under the lock.
async function recordFailure(ctl, subject, exit, reasons, extra = {}) {
  if (!ctl.dry && fs.existsSync(path.join(ctl.root, 'run', 'ledger.jsonl'))) {
    const { root, ce, now, ctx } = ctl;
    try {
      await locked(ctl, async (h) => {
        if (recheck) await recheck(h);
        await appendLedger(root, h, { ctx, ce, kind: 'check', now, ...extra, data: { check: 'audit', subject, result: 'not_run', reasons } });
        await recordIncident(root, h, { ctx, ce, cls: 'not-run', detail: { code: reasons[0].code, reasons }, now, ...extra });
      });
    } catch (e) {
      if (e instanceof TcbError && (e.exit === 64 || e.exit === 65 || e.exit === 75)) throw e;
      process.stderr.write(`audit: could not record the failure: ${e.message}\n`);
    }
  }
  return { exit, result: { refused: true, subject }, reasons };
}
let recheck = null; // set by the task form: the epoch compare-and-set inside the lock

function readsOf(parsed) {
  const out = [];
  for (const u of parsed.toolUses ?? []) if (u.access?.kind === 'read') for (const p of u.access.paths ?? []) out.push({ use: u, path: p });
  return out;
}
function writesOf(parsed) {
  const out = [];
  for (const u of parsed.toolUses ?? []) if (u.access?.kind === 'write') for (const p of u.access.paths ?? []) out.push({ use: u, path: p });
  return out;
}

// root-relative where possible, else the resolved absolute path with forward slashes
async function display(root, abs) {
  try {
    if (await under(abs, root)) return relPosix(root, abs);
  } catch { /* fall through */ }
  return fwd(abs);
}

function makeProtected(root, protectedPrefixes, attemptDir) {
  const prefixRoots = protectedPrefixes.map((p) => path.join(root, p));
  const harvested = attemptDir ? path.join(attemptDir, 'staging', 'harvested') : null;
  return async (abs) => {
    for (const r of prefixRoots) if (await under(abs, r)) return true;
    if (harvested && await under(abs, harvested)) return true;
    let rel = null;
    try { if (await under(abs, root)) rel = relPosix(root, abs).toLowerCase(); } catch { /* not under */ }
    if (rel !== null && /^wt\/[^/]+\/staging\/harvested(\/|$)/.test(rel)) return true;
    const segs = abs.split(/[\\/]/).filter((s) => s !== '');
    if (segs.some((s) => segmentName(s) === '.claude')) return true;
    const last = segs.length ? segmentName(segs[segs.length - 1]) : '';
    return last === 'claude.md' || last === 'claude.local.md';
  };
}

function parseAll(trRoot, sessionId) {
  const found = sessionTranscripts(trRoot, sessionId);
  if (!found.main) return { missing: true };
  const files = [found.main, ...found.helpers];
  const parsed = [];
  for (const f of files) {
    const p = parseTranscript(f);
    const bad = Array.isArray(p.badLines) ? p.badLines.length : Number(p.badLines) || 0;
    const empty = (p.calls?.length ?? 0) === 0 && (p.toolUses?.length ?? 0) === 0 && (p.toolResults?.length ?? 0) === 0
      && (p.turnEnds?.length ?? 0) === 0 && (p.structured?.length ?? 0) === 0;
    if (bad > 0 && empty && fs.statSync(f).size > 0) return { formatUnknown: f };
    parsed.push(p);
  }
  return { found, parsed, main: parsed[0], helpers: parsed.slice(1) };
}
const relTr = (trRoot, p) => fwd(path.relative(trRoot, p));

// ---------------------------------------------------------------------------------------------
// task form
// ---------------------------------------------------------------------------------------------
async function taskForm(ctl) {
  const { root, ce, dry, th, now, ctx, flags } = ctl;
  const task = flags.task;
  const epoch = flags.epoch;
  const subject = `${task}-e${epoch}`;

  await checkCe(root, ce);
  const table = readTasks(root);
  const row = table.tasks.find((t) => t.task === task);
  if (!row) return { exit: 1, result: { refused: true, task }, reasons: [{ code: 'no-task', detail: { task } }] };
  if (row.epoch !== epoch) throw new TcbError('stale-epoch', 65, { task, epoch, row_epoch: row.epoch });
  recheck = async () => {
    const t2 = readTasks(root).tasks.find((t) => t.task === task);
    if (!t2) throw new TcbError('no-task', 1, { task });
    if (t2.epoch !== epoch) throw new TcbError('stale-epoch', 65, { task, epoch, row_epoch: t2.epoch });
  };
  const notRun = (code, detail) => recordFailure(ctl, subject, 2, [{ code, detail: detail ?? null }], { task, epoch });

  // 1. the attempt, its manifest, the profile, the transcripts
  let at = null;
  try { at = attemptOf(row, epoch); } catch (e) { if (!(e instanceof TcbError)) throw e; }
  if (!at || !at.session) return notRun('no-session', { task, epoch });
  if (!at.manifest) return notRun('missing', { what: 'manifest' });
  let manifest;
  try {
    manifest = getObject(root, at.manifest);
  } catch (e) {
    if (e instanceof TcbError && e.code === 'missing') return notRun('missing', { what: 'manifest', id: at.manifest });
    throw e;
  }
  let profile;
  try {
    profile = readJson(path.join(root, 'tcb', 'profiles', `${row.role}.json`));
  } catch (e) {
    if (e instanceof TcbError) return notRun(e.code === 'missing' ? 'profile-missing' : 'profile-unreadable', { role: row.role });
    throw e;
  }
  const trRoot = th.get('transcripts_root');
  let all;
  try {
    all = parseAll(trRoot, at.session);
  } catch (e) {
    if (e instanceof TcbError) return notRun(e.code, e.detail ?? null);
    throw e;
  }
  if (all.missing) return notRun('transcript-not-found', { session: at.session });
  if (all.formatUnknown) return notRun('format-unknown', { file: relTr(trRoot, all.formatUnknown) });
  const { main, helpers, found } = all;

  // 2. reads against the allowed roots
  const F = path.join(root, 'wt', `${task}-e${epoch}`);
  const fileEntries = [];
  for (const n of ['brief.md', 'manifest.json']) fileEntries.push(path.join(F, 'in', n));
  for (const i of manifest.inputs ?? []) fileEntries.push(path.join(F, 'in', i.name));
  for (const a of manifest.agents ?? []) fileEntries.push(path.join(F, '.claude', 'agents', `${a.type}.md`));
  for (const u of manifest.user_files ?? []) if (u?.path) fileEntries.push(path.resolve(u.path));
  const dirEntries = [path.join(F, 'staging'), path.join(F, 'view')];
  const batchDirs = [];
  try {
    for (const d of fs.readdirSync(path.join(root, 'queue'), { withFileTypes: true })) {
      if (d.isDirectory() && fs.existsSync(path.join(root, 'queue', d.name, 'batch.json'))) batchDirs.push(path.join(root, 'queue', d.name));
    }
  } catch { /* no queue folder */ }
  for (const pfx of profile.read_prefixes ?? []) {
    const base = pfx.replaceAll('{root}', root).replaceAll('{attempt}', F);
    if (base.includes('{batch}')) for (const b of batchDirs) dirEntries.push(path.resolve(base.replaceAll('{batch}', path.basename(b))));
    else dirEntries.push(path.resolve(base));
  }
  const eq = (a, b) => normPath(a) === normPath(b);
  const readAllowed = async (abs) => {
    if (eq(abs, F)) return true;
    for (const d of dirEntries) if (eq(abs, d) || await under(abs, d)) return true;
    for (const f of fileEntries) if (eq(abs, f) || await under(abs, f)) return true;
    return false;
  };
  const undeclared = [];
  for (const parsed of [main, ...helpers]) {
    for (const { path: p } of readsOf(parsed)) {
      const abs = path.resolve(F, p);
      if (!(await readAllowed(abs))) undeclared.push(await display(root, abs));
    }
  }

  // 3. protected writes
  const isProtected = makeProtected(root, th.get('tcb_paths_protected'), F);
  const protectedWrites = [];
  for (const parsed of [main, ...helpers]) {
    for (const { path: p } of writesOf(parsed)) {
      const abs = path.resolve(F, p);
      if (await isProtected(abs)) protectedWrites.push(await display(root, abs));
    }
  }

  // 4. search log
  const searchLines = [];
  const discovered = [];
  let nSearch = 0;
  let nFetch = 0;
  const sources = [['main', main], ...helpers.map((h, i) => [path.basename(found.helpers[i]), h])];
  const denyUses = []; // {use, tool, query, url, prompt}
  for (const [source, parsed] of sources) {
    const results = new Map((parsed.toolResults ?? []).map((r) => [r.toolUseId, r]));
    for (const u of parsed.toolUses ?? []) {
      const kind = u.access?.kind;
      if (kind !== 'search' && kind !== 'fetch') continue;
      const res = results.get(u.id);
      const text = res?.text ?? '';
      const line = { n: searchLines.length + 1, ts: u.ts ?? null, tool: u.name, source };
      if (kind === 'search') { line.query = u.access.query; nSearch++; }
      else { line.url = (u.access.urls ?? [])[0]; nFetch++; if (line.url) discovered.push(line.url); }
      line.is_error = res ? !!res.isError : false;
      line.result_chars = text.length;
      line.result_urls = new Set(text.match(URL_RE) ?? []).size;
      line.truncated = text.length >= RESULT_CUT;
      line.repeatable = false;
      searchLines.push(line);
      denyUses.push({ id: u.id, tool: u.name, query: u.access.query, url: line.url, prompt: typeof u.input?.prompt === 'string' ? u.input.prompt : undefined });
    }
  }

  // 5. denylist
  const denyFile = path.join(root, 'tcb', 'denylist.txt');
  const terms = [];
  if (fs.existsSync(denyFile)) {
    let text = fs.readFileSync(denyFile, 'utf8');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (t === '' || t.startsWith('#')) continue;
      terms.push(t);
    }
  }
  const hits = [];
  for (const d of denyUses) {
    for (const term of terms) {
      const needle = term.toLowerCase();
      for (const where of ['query', 'url', 'prompt']) {
        if (typeof d[where] === 'string' && d[where].toLowerCase().includes(needle)) hits.push({ term, tool_use_id: d.id, tool: d.tool, where });
      }
    }
  }

  // 6. profile reading (never an exit cause)
  const outOfProfile = [];
  const allowTools = profile.tools_allow ?? [];
  const denyTools = profile.tools_deny ?? [];
  const writePrefixes = (profile.write_prefixes ?? []).map((p) => path.resolve(p.replaceAll('{root}', root).replaceAll('{attempt}', F)));
  let mustRead = [];
  try {
    const mr = readJson(path.join(F, 'in', 'must_read.json'));
    mustRead = (mr.urls ?? []).flatMap((e) => [e.href, safeHref(e.url)]).filter(Boolean);
  } catch { /* none declared */ }
  for (const u of main.toolUses ?? []) {
    const a = u.access ?? {};
    if (!allowTools.includes(u.name) || denyTools.includes(u.name)) outOfProfile.push({ tool_use_id: u.id, kind: 'tool', detail: u.name });
    if (a.kind === 'write') {
      for (const p of a.paths ?? []) {
        const abs = path.resolve(F, p);
        let inside = false;
        for (const w of writePrefixes) if (eq(abs, w) || await under(abs, w)) inside = true;
        if (!inside) outOfProfile.push({ tool_use_id: u.id, kind: 'write', detail: await display(root, abs) });
      }
    }
    if (a.kind === 'agent' && !(profile.agent_types ?? []).includes(a.agentType)) outOfProfile.push({ tool_use_id: u.id, kind: 'agent', detail: String(a.agentType ?? '') });
    if (a.kind === 'fetch') {
      const url = (a.urls ?? [])[0];
      if (profile.fetch === 'none') outOfProfile.push({ tool_use_id: u.id, kind: 'fetch', detail: String(url ?? '') });
      else if (profile.fetch === 'witnessed' && !mustRead.includes(safeHref(url))) outOfProfile.push({ tool_use_id: u.id, kind: 'fetch', detail: String(url ?? '') });
    }
    if (a.kind === 'exec') {
      const cmd = String(a.command ?? '');
      if (profile.bash === 'none') outOfProfile.push({ tool_use_id: u.id, kind: 'bash', detail: cmd.slice(0, 200) });
      else if (profile.bash === 'tcb-node' && !cmd.trimStart().startsWith(NODE_PREFIX)) outOfProfile.push({ tool_use_id: u.id, kind: 'bash', detail: cmd.slice(0, 200) });
    }
  }

  // 7. notes (R30)
  const expected = `TURN-END ${row.field ?? row.task}`;
  let notesBad = 0;
  for (const t of main.turnEnds ?? []) {
    const nonBlank = String(t.text ?? '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
    if (nonBlank.length === 0 || nonBlank[nonBlank.length - 1] !== expected) notesBad++;
  }

  // 8. first-call context
  const firstContext = main.calls?.length ? main.calls[0].context : 0;
  // both lean values are readings until measured: a threshold file without them is a reading too
  const gateOf = (name) => { try { return th.isGate(name); } catch (e) { if (e instanceof TcbError && e.code === 'param-missing') return false; throw e; } };
  const baseGate = gateOf('lean_baseline_tokens');
  const tolGate = gateOf('lean_tolerance_tokens');
  let firstOver = null;
  if (baseGate && tolGate && row.role !== 'control') firstOver = firstContext > th.get('lean_baseline_tokens') + th.get('lean_tolerance_tokens');

  // 9. label
  const label = undeclared.length > 0 || hits.length > 0 || firstOver === true || protectedWrites.length > 0 ? 'tainted' : 'clean';
  const audit = {
    schema_version: 1, task, epoch, session: at.session, label,
    undeclared: sortUnique(undeclared), protected_writes: sortUnique(protectedWrites), denylist_hits: hits,
    out_of_profile: outOfProfile, notes_bad: notesBad, first_context: firstContext, first_context_over: firstOver,
    discovered_urls: sortUnique(discovered), n_search: nSearch, n_fetch: nFetch,
    transcripts: { main: relTr(trRoot, found.main), helpers: found.helpers.map((h) => relTr(trRoot, h)) },
    at: now,
  };
  const auditRel = `run/audit/${task}-e${epoch}.json`;
  const searchRel = `run/audit/search-${task}-e${epoch}.jsonl`;

  // exit and reasons
  const reasons = [];
  let exit = 0;
  if (audit.protected_writes.length > 0) {
    exit = 3;
    reasons.push({ code: 'protected-write', detail: { paths: audit.protected_writes } });
  }
  if (undeclared.length > 0 || hits.length > 0 || firstOver === true) {
    if (exit === 0) exit = 1;
    reasons.push({ code: 'tainted', detail: { undeclared: audit.undeclared, denylist_hits: hits.map((h) => h.term), first_context_over: firstOver } });
  }
  const result = { ...audit, audit_file: auditRel, search_log: searchRel };
  if (dry) return { exit, dry_run: true, result: { ...result, dry_run: true }, reasons };

  await locked(ctl, async (h) => {
    await recheck(h);
    await writeAtomic(path.join(root, auditRel), pretty(audit));
    await writeAtomic(path.join(root, searchRel), searchLines.map((l) => JSON.stringify(l) + '\n').join(''));
    if (exit === 3) await recordIncident(root, h, { ctx, ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code: 'protected-write' }, now, task, epoch });
    await appendLedger(root, h, {
      ctx, ce, kind: 'audit', task, epoch, now,
      data: { label, undeclared: audit.undeclared, protected_writes: audit.protected_writes, first_context: firstContext, notes_bad: notesBad },
    });
    await appendLedger(root, h, { ctx, ce, kind: 'check', task, epoch, now, data: { check: 'audit', subject, result: exit === 0 ? 'pass' : 'fail', reasons } });
  });
  return { exit, result, reasons };
}

function safeHref(u) {
  try { return new URL(u).href; } catch { return null; }
}

// ---------------------------------------------------------------------------------------------
// coordinator form
// ---------------------------------------------------------------------------------------------
async function coordinatorForm(ctl) {
  const { root, ce, dry, th, now, ctx, flags } = ctl;
  const sessionId = flags.session;
  const subject = `coordinator-ce${ce}`;
  recheck = null;

  await checkCe(root, ce);
  const notRun = (code, detail) => recordFailure(ctl, subject, 2, [{ code, detail: detail ?? null }]);

  let profile;
  try {
    profile = readJson(path.join(root, 'tcb', 'profiles', 'coordinator.json'));
  } catch (e) {
    if (e instanceof TcbError) return notRun(e.code === 'missing' ? 'profile-missing' : 'profile-unreadable', { role: 'coordinator' });
    throw e;
  }
  const trRoot = th.get('transcripts_root');
  let all;
  try {
    all = parseAll(trRoot, sessionId);
  } catch (e) {
    if (e instanceof TcbError) return notRun(e.code, e.detail ?? null);
    throw e;
  }
  if (all.missing) return notRun('transcript-not-found', { session: sessionId });
  if (all.formatUnknown) return notRun('format-unknown', { file: relTr(trRoot, all.formatUnknown) });
  const { main, helpers, found } = all;

  const base = main.cwd ? path.resolve(main.cwd) : root;
  const isProtected = makeProtected(root, th.get('tcb_paths_protected'), null);
  const protectedWrites = [];
  for (const parsed of [main, ...helpers]) {
    for (const { path: p } of writesOf(parsed)) {
      const abs = path.resolve(base, p);
      if (await isProtected(abs)) protectedWrites.push(await display(root, abs));
    }
  }
  const W = th.get('W_star_coord');
  const factor = th.get('coord_over_factor');
  const limit = W === null || W === undefined ? null : factor * W;
  const callsOver = [];
  let peak = 0;
  for (const c of main.calls ?? []) {
    if (c.context > peak) peak = c.context;
    if (limit !== null && c.context > limit) callsOver.push({ id: c.id, ts: c.ts ?? null, context: c.context });
  }
  const udi = [];
  for (const { path: p } of readsOf(main)) {
    const abs = path.resolve(base, p);
    let rel = null;
    try { if (await under(abs, root)) rel = relPosix(root, abs); } catch { /* outside the root */ }
    if (rel !== null && /^wt\/[^/]+\/staging(\/|$)/i.test(rel)) udi.push(rel);
  }
  const outOfProfile = [];
  for (const u of main.toolUses ?? []) {
    if (u.access?.kind !== 'exec') continue;
    const cmd = String(u.access.command ?? '');
    if (profile.bash === 'none' || !cmd.trimStart().startsWith(NODE_PREFIX)) outOfProfile.push({ tool_use_id: u.id, kind: 'bash', detail: cmd.slice(0, 200) });
  }
  const audit = {
    schema_version: 1, session: sessionId, ce,
    protected_writes: sortUnique(protectedWrites), calls_over: callsOver, peak_context: peak, n_calls: (main.calls ?? []).length,
    window: { W_star_coord: W ?? null, factor, limit, gate: th.isGate('W_star_coord') },
    udi_reads: sortUnique(udi), out_of_profile: outOfProfile,
    transcripts: { main: relTr(trRoot, found.main), helpers: found.helpers.map((h) => relTr(trRoot, h)) },
    at: now,
  };
  const auditRel = `run/audit/coordinator-ce${ce}.json`;
  const reasons = [];
  let exit = 0;
  if (audit.protected_writes.length > 0) {
    exit = 3;
    reasons.push({ code: 'protected-write', detail: { paths: audit.protected_writes } });
  }
  if (th.isGate('W_star_coord') && callsOver.length > 0) {
    if (exit === 0) exit = 1;
    reasons.push({ code: 'over-window', detail: { calls_over: callsOver, limit } });
  }
  const result = { ...audit, audit_file: auditRel };
  if (dry) return { exit, dry_run: true, result: { ...result, dry_run: true }, reasons };

  await locked(ctl, async (h) => {
    await writeAtomic(path.join(root, auditRel), pretty(audit));
    if (exit === 3) await recordIncident(root, h, { ctx, ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code: 'protected-write' }, now });
    await appendLedger(root, h, { ctx, ce, kind: 'check', now, data: { check: 'audit', subject, result: exit === 0 ? 'pass' : 'fail', reasons } });
  });
  return { exit, result, reasons };
}

await runMain(import.meta.url, SCRIPT, main);
