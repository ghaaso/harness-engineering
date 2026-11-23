// Window ceiling (version 1, 2026-11-24, unit T8-CEIL; rulings r57-0008 and r57-0056).
// A session does not run on past its context ceiling: at the line it writes its hand-over and a fresh session goes on.
//
// What it reads. Every PreToolUse input carries transcript_path. The last "type":"assistant" line with message.usage
// gives the context of the last call: input + cache creation + cache read + output (measured 2026-11-24 by top
// session 8: 123,050 by this sum, 127,926 by the app a moment later; TOP8-STATE.md). Inside a helper (agent_id set)
// transcript_path is the parent's (SubagentStop carries both transcript_path and agent_transcript_path, plan-gate log),
// so a helper is judged by its own file <dir>/<session>/subagents/agent-<agent_id>.jsonl; if that file is not there
// the hook decides nothing for the helper (logged src "none"). The transcript is read incrementally: a small state
// file per transcript keeps the offset and the running figures, so a call reads only the bytes added since.
//
// Two forms of the line (research-tree/ORCHESTRATION.md section 5). Which one a session gets (fix B3 of
// research-tree/build/refute/TOP8.md, unit T8-FIX):
//   - The checkpoint, for every helper and every session that is not a named coordinator (builders, refuters, child
//     sessions, the owner's own sessions): hard line A - K g, warning K calls before it (section 5: "Taken: the
//     checkpoint at about 330 K = 368 K less 10 calls at the builders' Q3 growth of 3.8 K"; W* "not adopted" for
//     builders and refuters, a hand-over mid-edit loses the invariant reasoning).
//   - The hand-over W*, only for a coordinating session: one that a .md file directly in research-tree/build/ names on
//     one line as "session <its first 8 characters>" and "kind orchestrate" (TOP8-STATE.md: "Session 6d4e3fd7 ...,
//     kind orchestrate"; STATE.md: "Root session 8a7db643-... (Opus, kind orchestrate)"). The owner's own sessions
//     get it only if they name themselves so. Its hard line is min(W* + K g, the checkpoint line).
// A = 0.92 x the window: the app's autocompaction (section 5 and r57-0171: Opus compacts at 368 K of its 400 K
// autoCompactWindow). The window is the modelSettings autoCompactWindow of the model in the user or project settings;
// else 1,000,000 for Fable and Sonnet (section 5: "Fable and Sonnet compact near the 1M window"); else unknown and no
// compaction cap is applied. K = 10 (section 5's checkpoint: 10 calls to reach a quiet point, commit, write it).
// g in the checkpoint line: the recorded 3.8 K a call (G_REC) until the current segment has ORIENT = 17 calls of its
// own, then its growth over its last 17 calls (fix B1: one early large result, a big read, a helper's return or
// the re-reads after a compaction, made the old running mean tens of K and put the line below the context). A segment
// starts at the session's start or at a compaction (a "compact_boundary" line).
// W* = F + sqrt(2 R g) (lot sizing). ORIENT = 17 calls of orientation and R = the context summed over them (r57-0171:
//   17 calls, 2.33 M; five Opus roots re-measured 2026-11-24 from their transcripts: 2.23-2.48 M over their first 17
//   calls, F17 166-183 K). F = the context at the 17th call of the current segment (r57-0171 took F after a
//   compaction). R = this session's own first 17 calls (the successor orients like it); before it has 17 calls,
//   R_REC = 2.33 M (r57-0171). g = the growth per work call in this segment: (context now - F) / (calls since the
//   17th). The real point is the first quiet point after W* (section 5): the warning line is W*, the hard line K calls
//   later at that g. (W* + K g cannot fall below the context early: it is reached only after n* + K work calls.)
//
// Decisions (PreToolUse, matcher "*"): below the warning line every call passes silently. From the warning line to
// the hard line every call passes with a short notice (additionalContext). At or above the hard line only the calls
// that serve the hand-over pass (handoverCall below); every other call is refused with exit 2 and one line.
// Every decision is logged to .claude/logs/window-ceiling.jsonl. Any error, an unreadable input or transcript: the
// call passes (logged); a crash never blocks work.
//
// Live check without filling a window: node .claude/hooks/window-ceiling.mjs --test <session id> <scale> <minutes>
// [agent id] writes .claude/logs/window-ceiling-test.json; for that session (and that helper, or else the main
// session only) both lines are multiplied by the scale (0 < scale < 1: it can only lower them) until it expires.
// It is ignored when it names no session, another session, or has expired; each use is logged with "test".
// node .claude/hooks/window-ceiling.mjs --test-off removes it.
// node .claude/hooks/window-ceiling.mjs --show <transcript.jsonl> [helper|coordinator] prints the figures for a
// transcript (default: a session that is not a coordinator).
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync, openSync, readSync, closeSync, fstatSync, renameSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const LOGDIR = process.env.WINDOW_CEILING_LOGDIR || resolve(root, '.claude', 'logs');
const LOG = join(LOGDIR, 'window-ceiling.jsonl');
const STATEDIR = join(LOGDIR, 'window-ceiling-state');
const TESTFILE = join(LOGDIR, 'window-ceiling-test.json');

const ORIENT = 17;          // r57-0171: orientation of an Opus root, 17 calls
const R_REC = 2_330_000;    // r57-0171: those 17 calls cost 2.33 M tokens of context
const K = 10;               // ORCHESTRATION.md section 5: 10 calls to reach a quiet point and write the checkpoint
const COMPACT_AT = 0.92;    // ORCHESTRATION.md section 5: the app compacts at 92 % of autoCompactWindow (368 K of 400 K)
const WINDOW_BY_FAMILY = { fable: 1_000_000, sonnet: 1_000_000 }; // ORCHESTRATION.md section 5: "near the 1M window"
const G_REC = 3_800;        // ORCHESTRATION.md section 5: the builders' Q3 growth, 3.8 K a call (t8-0106: between the median and Q3 of all Opus helpers here)
const BUILD = process.env.WINDOW_CEILING_BUILD || resolve(root, 'research-tree', 'build'); // where state files name a coordinator

const kfmt = (x) => (Number.isFinite(x) ? `${Math.round(x / 1000)} K` : 'none');
function log(o) {
  try { mkdirSync(LOGDIR, { recursive: true }); appendFileSync(LOG, JSON.stringify({ t: Date.now(), ...o }) + '\n'); } catch {}
}

// ---------- reading a transcript ----------
export function freshState(path) {
  return { v: 2, path, off: 0, n: 0, lastId: null, seg: 0, boundary: false, segN: 0, segFirst: 0, segF: 0, segLast: 0, first17: [], recent: [], model: '' };
}
function addCall(s, id, ctx, model) {
  if (id && id === s.lastId) { // another content block of the same call: keep the largest reading
    if (ctx <= s.segLast) return;
    s.segLast = ctx;
    if (s.segN === 1) s.segFirst = ctx;
    if (s.segN <= ORIENT) s.segF = ctx;
    if (s.n <= ORIENT) s.first17[s.n - 1] = ctx;
    s.recent[s.recent.length - 1] = ctx;
    return;
  }
  if (s.boundary) { s.seg++; s.segN = 0; s.boundary = false; s.recent = []; }
  s.n++; s.segN++; s.lastId = id;
  if (s.segN === 1) s.segFirst = ctx;
  if (s.segN <= ORIENT) s.segF = ctx;
  s.segLast = ctx;
  if (s.n <= ORIENT) s.first17.push(ctx);
  s.recent.push(ctx); if (s.recent.length > ORIENT + 1) s.recent.shift(); // the segment's last 17 growth steps
  if (model) s.model = model;
}
export function scanText(s, text, helper) {
  for (const line of text.split('\n')) {
    if (line.includes('"compact_boundary"')) {
      try { const j = JSON.parse(line); if (j.type === 'system' && j.subtype === 'compact_boundary') s.boundary = true; } catch {}
      continue;
    }
    if (!line.includes('"assistant"') || !line.includes('"usage"')) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    if (j.type !== 'assistant' || !j.message || !j.message.usage) continue;
    if (!helper && j.isSidechain) continue;
    const m = j.message, u = m.usage;
    if (m.model === '<synthetic>') continue;
    const ctx = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0);
    if (!(ctx > 0)) continue;
    addCall(s, m.id || j.uuid || null, ctx, m.model || '');
  }
}
// Reads only the bytes added since the last call; whole lines only.
export function readTranscript(path, helper, useCache = true) {
  const key = basename(dirname(dirname(path))) + '-' + basename(path).replace(/\.jsonl$/, '');
  const sp = join(STATEDIR, key.replace(/[^A-Za-z0-9_.-]/g, '_') + '.json');
  let s = null;
  if (useCache) { try { s = JSON.parse(readFileSync(sp, 'utf8')); } catch {} }
  if (!s || s.v !== 2 || s.path !== path) s = freshState(path);
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size;
    if (size < s.off) s = freshState(path); // the file was rewritten
    if (size > s.off) {
      const buf = Buffer.alloc(size - s.off);
      readSync(fd, buf, 0, buf.length, s.off);
      const last = buf.lastIndexOf(10);
      if (last >= 0) {
        scanText(s, buf.subarray(0, last + 1).toString('utf8'), helper);
        s.off += last + 1;
      }
    }
  } finally { closeSync(fd); }
  if (useCache) {
    try { mkdirSync(STATEDIR, { recursive: true }); const tmp = sp + '.' + process.pid; writeFileSync(tmp, JSON.stringify(s)); renameSync(tmp, sp); } catch {}
  }
  return s;
}

// ---------- the lines ----------
function windowFor(model) {
  const files = [process.env.WINDOW_CEILING_SETTINGS || join(homedir(), '.claude', 'settings.json'),
    resolve(root, '.claude', 'settings.json'), resolve(root, '.claude', 'settings.local.json')];
  for (const f of files) {
    try {
      const ms = JSON.parse(readFileSync(f, 'utf8')).modelSettings || {};
      const w = ms[model] && Number(ms[model].autoCompactWindow);
      if (w > 0) return { window: w, from: 'settings' };
    } catch {}
  }
  const fam = Object.keys(WINDOW_BY_FAMILY).find((f) => String(model).toLowerCase().includes(f));
  return fam ? { window: WINDOW_BY_FAMILY[fam], from: 'family' } : { window: null, from: 'unknown' };
}
// kind: 'helper', 'coordinator' or 'session' (any other main session).
export function lines(s, kind) {
  const ctx = s.segLast;
  const { window } = windowFor(s.model);
  const A = window ? COMPACT_AT * window : Infinity;
  const rc = s.recent || [];
  const own = rc.length > ORIENT;
  // fix B1: the recorded growth until the segment has 17 growth steps of its own, then its growth over its last 17
  const gC = own ? Math.max((rc[rc.length - 1] - rc[0]) / ORIENT, 0) : G_REC;
  const out = { ctx, calls: s.n, seg: s.seg, segCalls: s.segN, model: s.model, window, A, kind, gFrom: own ? 'own' : 'recorded' };
  const hardC = A - K * gC, warnC = hardC - K * gC;
  out.g = gC; out.hard = hardC; out.warn = warnC;
  if (kind !== 'coordinator') return out;
  const R = s.first17.length >= ORIENT ? s.first17.slice(0, ORIENT).reduce((a, b) => a + b, 0) : R_REC;
  const F = s.segF;
  const work = s.segN - Math.min(s.segN, ORIENT);
  const gWork = work > 0 ? (ctx - F) / work : null;
  const Wstar = gWork !== null && gWork > 0 ? F + Math.sqrt(2 * R * gWork) : Infinity;
  out.F = F; out.R = R; out.Wstar = Wstar;
  if (Wstar + K * gWork < hardC) { out.g = gWork; out.hard = Wstar + K * gWork; }
  out.warn = Math.min(Wstar, warnC);
  return out;
}
// A coordinating session: a .md file directly in research-tree/build/ names it on one line as "session <id>" and the
// first "kind" after that on the line is "orchestrate" (or orchestrate-deep). Returns the file's name, or null.
export function isCoordinator(sessionId) {
  const s8 = String(sessionId || '').slice(0, 8).toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(s8)) return null;
  const re = new RegExp(String.raw`\bsession\s+` + s8 + String.raw`[0-9a-f-]*\b(?:(?!\bkind\b).)*\bkind\s+orchestrate`, 'i');
  let names = [];
  try { names = readdirSync(BUILD).filter((n) => n.endsWith('.md')); } catch { return null; }
  for (const n of names) {
    let t; try { t = readFileSync(join(BUILD, n), 'utf8'); } catch { continue; }
    if (!t.toLowerCase().includes(s8)) continue;
    for (const l of t.split(/\r?\n/)) if (re.test(l)) return n;
  }
  return null;
}

// ---------- what passes above the line ----------
function norm(p, cwd) {
  let x = String(p || '').trim().replace(/\\/g, '/');
  const m = /^\/([a-zA-Z])\//.exec(x);
  if (m) x = m[1] + ':/' + x.slice(3);
  if (!/^[a-zA-Z]:\//.test(x) && !x.startsWith('/')) x = resolve(cwd || root, x).replace(/\\/g, '/');
  else x = resolve(x).replace(/\\/g, '/');
  return x.toLowerCase();
}
function handoverPath(p, j) {
  if (!p) return false;
  const x = norm(p, j.cwd);
  const r = resolve(root).replace(/\\/g, '/').toLowerCase() + '/';
  if (j.scratchpad_dir) {
    const sd = norm(j.scratchpad_dir, j.cwd).replace(/\/+$/, '') + '/';
    if (x.startsWith(sd)) return true; // the session's own scratchpad (a commit message file)
  }
  if (/\/appdata\/local\/claude-data\/[^/]+\/side-session-notes\/./.test(x)) return true;
  if (!x.startsWith(r)) return false;
  const rel = x.slice(r.length);
  return /^research-tree\/build\/[a-z0-9-]*state\.md$/.test(rel)
    || /^research-tree\/build\/briefs\/[^/]+\.md$/.test(rel)
    || /^research-tree\/build\/units\/.+/.test(rel);
}
const SEG_OK = [
  /^cd(\s+.*)?$/,
  /^git(\s+-c\s+\S+)*\s+(status|add|commit|rev-parse|log)(\s.*)?$/,
  /^node\s+("?)(\S*[\\/])?tools[\\/]journal\.mjs\1(\s.*)?$/,
  /^date(\s.*)?$/,
  /^node\s+("?)(\S*[\\/])?\.claude[\\/]hooks[\\/]window-ceiling\.mjs\1\s+(--test-off|--show\s.*)$/, // ends a live check
  /^(head|tail)(\s+-\S+)*$/, // only behind a pipe: no file argument
];
export function commandOk(cmd) {
  let c = String(cmd || '');
  // A here-document or here-string is allowed only as the message of a git commit; its body is not a command.
  const hd = /<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(\n|$)/;
  const hs = /@'\r?\n[\s\S]*?\r?\n'@/;
  for (const re of [hd, hs]) {
    let m;
    while ((m = re.exec(c))) {
      const before = c.slice(0, m.index);
      const lineStart = before.lastIndexOf('\n') + 1;
      const head = c.slice(lineStart, m.index);
      if (!/git(\s+-c\s+\S+)*\s+commit\b/.test(head)) return false;
      c = c.slice(0, m.index) + ' HEREDOC\n' + c.slice(m.index + m[0].length);
    }
  }
  if (/\$\(|`/.test(c)) return false;
  c = c.replace(/\s\d?>&\d/g, ' ').replace(/\s\d?>\s*(\/dev\/null|\$null|nul)\b/gi, ' ');
  if (/>/.test(c) || /<(?!<)/.test(c.replace(/ HEREDOC/g, ''))) return false;
  const segs = c.split(/&&|\|\||;|\||\n/).map((x) => x.trim()).filter(Boolean);
  if (!segs.length) return false;
  return segs.every((sg) => {
    const x = sg.replace(/ HEREDOC$/, '').replace(/\s+<<-?\s*\S+$/, '').trim();
    return SEG_OK.some((re) => re.test(x));
  });
}
export function handoverCall(j) {
  const tool = String(j.tool_name || '');
  const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
  if (/^(Write|Edit|MultiEdit)$/.test(tool)) return handoverPath(ti.file_path, j) ? 'hand-over file' : false;
  if (tool === 'NotebookEdit') return handoverPath(ti.notebook_path, j) ? 'hand-over file' : false;
  if (tool === 'Read') return handoverPath(ti.file_path, j) ? 'read of a hand-over file' : false;
  if (tool === 'Bash' || tool === 'PowerShell') return commandOk(ti.command) ? 'git, journal, clock' : false;
  if (/(^|__)(start_session|hand_off_to_session)$/.test(tool)) return 'successor';
  if (/(^|__)(wrap_up|update_plan)$/.test(tool)) return 'closing box';
  if (tool === 'SubagentHandback') return 'helper hand-back';
  if (tool === 'TaskStop') return 'ending a helper';
  if (tool === 'ToolSearch') return 'loading a hand-over tool';
  if (tool === 'AskUserQuestion') return 'question to the owner';
  if (tool === 'SendMessage') {
    const text = typeof ti.message === 'string' ? ti.message : JSON.stringify(ti.message || ti.content || '');
    return /\b(stop|checkpoint|hand[- ]?over|LIMIT|wrap up)\b/i.test(text) ? 'telling a helper to stop' : false;
  }
  return false;
}

// ---------- the test scale ----------
function testScale(j, now) {
  let t;
  try { t = JSON.parse(readFileSync(TESTFILE, 'utf8')); } catch { return null; }
  if (!t || typeof t.session !== 'string' || t.session.length < 8 || t.session !== j.session_id) return null;
  const agent = j.agent_id ? String(j.agent_id).replace(/^agent-/, '') : null;
  const want = t.agent ? String(t.agent).replace(/^agent-/, '') : null;
  if (want !== agent) return null;
  const exp = Date.parse(t.expires);
  if (!(exp > now)) return null;
  const sc = Number(t.scale);
  if (!(sc > 0 && sc < 1)) return null;
  return sc;
}

// ---------- command line ----------
// Run as a program (a hook or the command line). A replay that imports it sets globalThis.WINDOW_CEILING_IMPORT first
// and gets only its functions (so a path spelling can never switch the hook off).
const main = !globalThis.WINDOW_CEILING_IMPORT;
const argv = process.argv.slice(2);
if (main && argv[0] === '--test') {
  const [, sess, scale, minutes, agent] = argv;
  const sc = Number(scale), min = Number(minutes);
  if (!sess || !(sc > 0 && sc < 1) || !(min > 0)) {
    process.stderr.write('usage: node .claude/hooks/window-ceiling.mjs --test <full session id> <scale, 0 to 1> <minutes> [agent id]\n');
    process.exit(1);
  }
  const t = { session: sess, agent: agent || null, scale: sc, expires: new Date(Date.now() + min * 60000).toISOString() };
  mkdirSync(LOGDIR, { recursive: true });
  writeFileSync(TESTFILE, JSON.stringify(t) + '\n');
  log({ ev: 'test-on', ...t });
  process.stdout.write(`window ceiling: lines x ${sc} for session ${sess.slice(0, 8)}${agent ? ' helper ' + agent : ''} until ${t.expires}\n`);
  process.exit(0);
}
if (main && argv[0] === '--test-off') {
  try { rmSync(TESTFILE); } catch {}
  log({ ev: 'test-off' });
  process.stdout.write('window ceiling: test scale removed\n');
  process.exit(0);
}
if (main && argv[0] === '--show') {
  const kind = ['helper', 'coordinator'].includes(argv[2]) ? argv[2] : 'session';
  const s = readTranscript(resolve(argv[1]), kind === 'helper', false);
  const l = lines(s, kind);
  process.stdout.write(JSON.stringify({ ...l, warnK: kfmt(l.warn), hardK: kfmt(l.hard), WstarK: kfmt(l.Wstar) }) + '\n');
  process.exit(0);
}

// ---------- the hook ----------
if (main) hook();
function hook() {
let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { log({ decision: 'allow', note: 'hook input unreadable' }); process.exit(0); }
if (!j || j.hook_event_name !== 'PreToolUse') process.exit(0);
const rec = {
  session: typeof j.session_id === 'string' ? j.session_id.slice(0, 8) : null,
  agent: j.agent_id ? String(j.agent_id).replace(/^agent-/, '') : null,
  tool: String(j.tool_name || '').slice(0, 60),
};
try {
  const tp = typeof j.transcript_path === 'string' ? j.transcript_path : '';
  if (!tp) { log({ ...rec, decision: 'allow', note: 'no transcript_path' }); process.exit(0); }
  let path = tp, src = 'own';
  if (rec.agent) {
    const own = new RegExp(`agent-${rec.agent}\\.jsonl$`);
    if (!own.test(tp.replace(/\\/g, '/'))) {
      path = join(dirname(tp), basename(tp).replace(/\.jsonl$/, ''), 'subagents', `agent-${rec.agent}.jsonl`);
      src = 'derived';
    }
    if (!existsSync(path)) { log({ ...rec, src: 'none', decision: 'allow', note: 'helper transcript not found' }); process.exit(0); }
  }
  if (!existsSync(path)) { log({ ...rec, src: 'none', decision: 'allow', note: 'transcript not found' }); process.exit(0); }
  const s = readTranscript(path, !!rec.agent);
  if (!s.n) { log({ ...rec, src, decision: 'allow', note: 'no call with usage yet' }); process.exit(0); }
  // Both forms are silent below the coordinator's warning line (it is the lower), so the state files are read only
  // above it.
  const sc = testScale(j, Date.now());
  let kind = rec.agent ? 'helper' : 'coordinator', l = lines(s, kind), by = null;
  if (!rec.agent && l.ctx >= l.warn * (sc || 1)) {
    by = isCoordinator(j.session_id);
    if (!by) { kind = 'session'; l = lines(s, kind); }
  }
  if (sc) { l.hard *= sc; l.warn *= sc; }
  const base = { ...rec, src, ctx: l.ctx, warn: Math.round(l.warn) || null, line: Math.round(l.hard) || null,
    g: Math.round(l.g), gFrom: l.gFrom, kind, ...(by ? { by } : {}), ...(kind === 'coordinator' && l.Wstar !== undefined ? { W: Number.isFinite(l.Wstar) ? Math.round(l.Wstar) : null } : {}),
    model: l.model, ...(sc ? { test: sc } : {}) };
  const who = kind === 'coordinator' ? 'hand-over' : 'checkpoint';
  if (l.ctx >= l.hard) {
    const ok = handoverCall(j);
    if (ok) { log({ ...base, decision: 'allow', why: ok }); process.exit(0); }
    const what = rec.agent ? 'result under research-tree/build/units/, then return' : kind === 'coordinator' ? 'STATE or TOP-STATE file, a brief, the journal, git commit' : 'a STATE file or a result under research-tree/build/units/, the journal, git commit';
    const why = `window ceiling (r57-0008, r57-0056): context ${kfmt(l.ctx)} is past this ${rec.agent ? 'helper' : kind === 'coordinator' ? 'coordinator' : 'session'}'s line of ${kfmt(l.hard)}${sc ? ' (test scale ' + sc + ')' : ''}; only the ${who} passes now: write it (${what}), then ${rec.agent ? 'return LIMIT' : 'say a fresh session is needed and stop'}.`;
    log({ ...base, decision: 'deny' });
    process.stderr.write(why + '\n');
    process.exit(2);
  }
  if (l.ctx >= l.warn) {
    log({ ...base, decision: 'notice' });
    const text = `Window ceiling: context ${kfmt(l.ctx)}; ${kind === 'coordinator' ? 'hand-over point' : 'checkpoint'} ${kfmt(l.warn)}, hard line ${kfmt(l.hard)} (about ${Math.max(0, Math.round((l.hard - l.ctx) / Math.max(l.g, 1)))} calls at ${kfmt(l.g)} a call). A ${who} is due: go to the first quiet point and write it (r57-0008, r57-0056). Past the line only ${who} calls pass.`;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: text } }));
    process.exit(0);
  }
  log({ ...base, decision: 'allow' });
  process.exit(0);
} catch (e) {
  log({ ...rec, decision: 'allow', note: 'error: ' + String((e && e.message) || e).slice(0, 120) });
  process.exit(0);
}
}
