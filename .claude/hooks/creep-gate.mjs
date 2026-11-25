// Creep gate (version 2, 2026-11-24). PreToolUse on Agent and Task, in the session and inside its helpers. The owner's rule
// r57-0063 (no procedural creep: build the deliverable, test it where it matters, finish), with r57-0004 (a review only if
// its result can change what is done next; one attack round per fix; no re-run of unchanged work), r57-0033 and r57-0007.
// Version 1 (top session 9b, same day) refused a second review of a file, a review of a review, a repair round on
// non-breaking findings and a third refute in a session. Version 2 keeps the review of a review and the repair round, lets
// a second review follow a change (r57-0004), and adds rules 1, 2 and the context line.
//
// A review start: kind refute (description "refute: ..." or "kind refute" in the prompt), or a description that says
// review, critique, audit, verify, check, adversarial, lens, refute or blind check, unless its kind builds or fetches
// (build, build-invariant, locate, extract, collect, orchestrate: "build: fix what the check found" is not a review).
// The piece it reviews: the first repository path in its prompt that is not a brief or a library file, else the first in
// the brief the prompt names; none when it names no path.
//
// Refused, with one plain line:
//  1. A review when nothing was written since the last review of the session finished: no Write, Edit, MultiEdit or
//     NotebookEdit by the session or by a helper that is not a review (a review's own report is not a change).
//     A first review of a piece no earlier review named passes.
//  2. A review while another review of the same session (its helpers included) is still running: no panels or lenses.
//  3. A review of a review (the piece's path says refute, review, critique, audit, verdict or findings, or a review
//     wrote it), and a third review of the same piece (a review that names no piece counts as the same piece as any).
//  4. A repair or fold round on review findings (fold, fix or address findings; or a "fix round" or "repair round" after
//     a review finished) unless its prompt says the findings are breaking (version 1; CLAUDE.md rule 8).
//  5. The deliverable first (CLAUDE.md rule 8, r57-0066): when the session has stated the deliverable the owner judges,
//     a review or check aimed at anything else is refused until that deliverable has changed once in the session. The
//     statement: a line "Deliverable: <path>" (a file, or a folder for anything under it) in the session's brief or in one
//     of its own messages; the first such line counts. Changed: a Write or Edit to it by the session or a helper that is
//     not a review, or, live, its file time (newest file under a folder) later than the session's first line, which also
//     sees a page a build script writes. A review that names no path is aimed at anything else.
// Every start that passes gets one line of context: helpers started in the session, how many were reviews, when the
// deliverable (or, with none stated, any file) last changed, and how much of the session's spend came after that (tokens:
// input, cache creation, cache read and output, once per message id).
//
// Numbers: one, "third" in rule 3: the owner's screenshot names "3rd and 4th review/repair rounds" as the creep (r57-0063)
// and r57-0004 allows one attack round per fix, so a first review and one more after its fix. Rules 1, 2, 4 and the context
// line use the form that needs no number: nothing recorded measures a right count of reviews or a right time without a change.
// Escape: a prompt line "owner: r57-NNNN" naming a journal record whose status is owner passes rules 1 to 5.
// Cannot see: writes made through Bash or PowerShell (a build script's output; the script's own edit is seen); whether a
// write is the deliverable or a note; a review done inside one helper's own turns or by the coordinator itself; specs and
// pages written without a helper; a review whose description uses none of the words; child sessions (start_session is not
// matched).
// Binds sessions already running: an entry added to .claude/settings.json held a session that was running when it was added
// (measured once: session 6d4e3fd7 added the count gate at 19:32:21Z on 2026-11-23 and was refused by it 8 s later), and
// this file is read afresh at every call.
// Fails open: an error or unreadable input passes and is logged. Log: .claude/logs/creep-gate.jsonl, one line per call
// (t, session, agent_id, tu, desc, decision, why).
// Replay over a finished session: node .claude/hooks/creep-gate.mjs --replay <session id or transcript path>
//   [--deliverable <path>] (as if the session had stated it; a replay sees no file times, only Write and Edit calls)
import { readFileSync, readdirSync, appendFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, isAbsolute, basename } from 'node:path';
import { homedir } from 'node:os';

// Kit mode (harness kit, 2026-11-25; docs/program/harness-kit-2026-11-25/CONTRACT.md section 2): only with --harness-kit
// "--project=<folder>": the project is the root (its .claude/logs; paths in prompts are taken relative to it, real paths
// compared), and a brief a prompt names is also looked for under <project>/.harness/ (briefs/X.md) and
// <project>/.harness/briefs/. The escape "owner: r57-NNNN" needs <project>/library/journal; where that is absent it
// passes nothing and every rule holds. A missing or broken kit-mode.mjs leaves the hook as it is without the argument.
let KIT = null;
if (process.argv.includes('--harness-kit')) { try { KIT = (await import('./kit-mode.mjs')).kitMode(import.meta.url); } catch { KIT = null; } }
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = KIT ? KIT.project : process.env.CREEP_GATE_ROOT ? resolve(process.env.CREEP_GATE_ROOT) : resolve(here, '..', '..');
// Kit mode: the root's real path too, so a path written through a link (/tmp and /private/tmp on macOS) is the same file.
const ROOTS = [ROOT, ...(KIT ? [KIT.realOf(ROOT)] : [])].map((r) => r.replace(/\\/g, '/').toLowerCase() + '/');
const LOGDIR = resolve(ROOT, '.claude', 'logs');
const LOGF = join(LOGDIR, 'creep-gate.jsonl');
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
function log(o) { try { mkdirSync(LOGDIR, { recursive: true }); appendFileSync(LOGF, JSON.stringify({ t: Date.now(), ...o }) + '\n'); } catch {} }

// ---- kinds -------------------------------------------------------------------------------------------------------
const NOT_REVIEW = new Set(['build', 'build-invariant', 'locate', 'extract', 'collect', 'orchestrate']);
const WORDS = /\b(review(s|ed|ing|er|ers)?|critiques?|audit(s|ed|ing)?|verif(y|ies|ied|ying|ication)|check(s|ed|ing|er)?|adversarial|lens(es)?|refut(e|es|ed|ing|ation)|blind[- ]check)\b/i;
const kindOf = (d) => ((String(d).match(/^\s*([a-z][a-z-]*)\s*:/i) || [])[1] || '').toLowerCase();
export function isReview(d, p) {
  const k = kindOf(d);
  if (k === 'refute' || /\bkind\s+refute\b/i.test(String(p))) return true;
  return !NOT_REVIEW.has(k) && WORDS.test(String(d));
}
const FOLD = /\b(fold|fix(?:ing)?\s+(?:the\s+)?findings|address(?:ing)?\s+(?:the\s+)?findings)\b/i;
const breaking = (p) => /(?<!non-)(?<!non )\bbreaking\b/i.test(p);
const REVIEW_NAME = /refute|review|critique|audit|verdict|findings/i;

// ---- the piece a review names --------------------------------------------------------------------------------------
const PATH_RE = /[A-Za-z0-9_.:-]+(?:[\\/][A-Za-z0-9_.-]+)+\.[A-Za-z0-9]{1,6}\b/g;
const norm = (p) => {
  let s = String(p).replace(/\\/g, '/').toLowerCase();
  if (!KIT) {
    const r = ROOT.replace(/\\/g, '/').toLowerCase() + '/';
    if (s.startsWith(r)) s = s.slice(r.length);
  } else {
    const r = ROOTS.find((x) => s.startsWith(x));
    if (r) s = s.slice(r.length);
    else if (s.startsWith('/') || /^[a-z]:\//.test(s)) { // an absolute path through another link to the project
      const rel = KIT.under(String(p), ROOT);
      if (rel != null) s = rel.toLowerCase();
    }
  }
  return s.replace(/^\.\//, '');
};
const isBrief = (p) => /(^|\/)briefs?\//.test(norm(p)) || /brief[^/]*\.md$/.test(norm(p));
const isContext = (p) => /^library\//.test(norm(p)) || /(^|\/)(claude|agents|start-here|index)\.md$/.test(norm(p));
function targetOf(prompt) {
  const ps = [...String(prompt || '').matchAll(PATH_RE)].map((m) => m[0]).filter((p) => !isContext(p));
  const t = ps.find((p) => !isBrief(p));
  if (t) return norm(t);
  for (const b of ps.filter(isBrief)) {
    const c = isAbsolute(b) || /^[A-Za-z]:/.test(b) ? [b]
      : KIT ? [resolve(ROOT, b), resolve(KIT.state, b), resolve(KIT.briefs, basename(b))]
        : [resolve(ROOT, b), resolve(ROOT, 'research-tree', 'build', b)];
    for (const f of c) {
      const bt = [...read(f).matchAll(PATH_RE)].map((m) => m[0]).find((p) => !isBrief(p) && !isContext(p));
      if (bt) return norm(bt);
    }
  }
  return null;
}

// ---- what the session's files show --------------------------------------------------------------------------------
function walk(dir, out = []) {
  let es = []; try { es = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) { const p = join(dir, e.name); if (e.isDirectory()) { if (e.name !== '.git' && e.name !== 'node_modules') walk(p, out); } else out.push(p); }
  return out;
}
const DELIV_RE = /^[\s>*#-]*deliverable\s*:\s*`?([^\s`'",;]+)/im;
// The newest file time of the deliverable (a file, or every file under a folder); null if it does not exist.
function mtimeOf(d) {
  const p = resolve(ROOT, d);
  try { const st = statSync(p); if (!st.isDirectory()) return st.mtimeMs; } catch { return null; }
  let m = null; for (const f of walk(p)) { try { const t = statSync(f).mtimeMs; if (m == null || t > m) m = t; } catch {} }
  return m;
}
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
export function load(sessDir) {
  const metas = new Map(), parents = new Map(), files = [[sessDir + '.jsonl', 'main']];
  for (const f of walk(join(sessDir, 'subagents'))) {
    const m = basename(f).match(/^agent-(.+)\.(meta\.json|jsonl)$/); if (!m) continue;
    if (m[2] === 'jsonl') { files.push([f, m[1]]); continue; }
    try { const o = JSON.parse(read(f)); if (o.toolUseId) metas.set(o.toolUseId, { agent: m[1], finished: o.finished === true }); if (o.parentAgentId) parents.set(m[1], String(o.parentAgentId)); } catch {}
  }
  const starts = new Map(), writes = [], msgs = new Map(), results = new Map(), lastTs = new Map();
  let first = Infinity, deliverable = null;
  for (const [f, who] of files) {
    let pos = 0;
    for (const l of read(f).split('\n')) {
      if (!l || l[0] !== '{') continue;
      let o; try { o = JSON.parse(l); } catch { continue; }
      const ts = Date.parse(o.timestamp); if (!Number.isFinite(ts)) continue;
      if (who === 'main' && ts < first) first = ts;
      if (!(lastTs.get(who) >= ts)) lastTs.set(who, ts);
      const msg = o.message || {}, c = Array.isArray(msg.content) ? msg.content : [];
      if (who === 'main' && !deliverable) {
        const texts = typeof o.content === 'string' ? [o.content] : [];
        if (o.type === 'user' || o.type === 'assistant') {
          if (typeof msg.content === 'string') texts.push(msg.content);
          for (const b of c) if (b.type === 'text') texts.push(String(b.text || ''));
        }
        for (const t of texts) { const m = t.match(DELIV_RE); if (m) { deliverable = norm(m[1]).replace(/\/+$/, ''); break; } }
      }
      if (o.type === 'assistant' && msg.id && msg.usage && !msgs.has(msg.id)) {
        const u = msg.usage;
        msgs.set(msg.id, { ts, who, n: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0) });
      }
      for (const b of c) {
        if (o.type === 'assistant' && b.type === 'tool_use') {
          const i = b.input || {};
          if ((b.name === 'Agent' || b.name === 'Task') && !starts.has(b.id)) starts.set(b.id, { id: b.id, ts, who, pos: pos++, desc: String(i.description || ''), prompt: String(i.prompt || '') });
          if (WRITE_TOOLS.has(b.name)) writes.push({ id: b.id, ts, who, path: norm(i.file_path || i.notebook_path || '') });
        }
        if (o.type === 'user' && b.type === 'tool_result' && !results.has(b.tool_use_id)) {
          const t = typeof b.content === 'string' ? b.content : Array.isArray(b.content) ? String((b.content[0] || {}).text || '') : '';
          results.set(b.tool_use_id, { ts, err: !!b.is_error, launched: /^Async agent launched/.test(t) });
        }
      }
    }
  }
  for (const s of starts.values()) {
    const m = metas.get(s.id), r = results.get(s.id);
    s.err = !!(r && r.err); s.review = isReview(s.desc, s.prompt); s.target = targetOf(s.prompt);
    s.agent = m ? m.agent : null;
    s.end = m ? (m.finished ? (lastTs.get(m.agent) ?? (r ? r.ts : s.ts)) : null) : (r && !r.err && !r.launched ? r.ts : null);
  }
  return { starts: [...starts.values()].sort((a, b) => a.ts - b.ts), writes: writes.filter((w) => !(results.get(w.id) || {}).err), msgs, parents, first: Number.isFinite(first) ? first : null, deliverable, dMtime: null };
}

// ---- the decision ---------------------------------------------------------------------------------------------------
const fmtTok = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : Math.round(n / 1e3) + ' k');
const fmtMin = (ms) => Math.max(0, Math.round(ms / 60000)) + ' min';
// cur: { id, ts, who, pos, desc, prompt }; T: the time the state is read at; refused: ids of starts that did not run.
export function decide(S, cur, T, refused, escape = false) {
  const earlier = (s) => s.id !== cur.id && (cur.pos != null && s.who === cur.who ? s.pos < cur.pos : s.ts <= cur.ts);
  const prior = S.starts.filter((s) => earlier(s) && !refused.has(s.id));
  const reviews = prior.filter((s) => s.review);
  const reviewAgents = new Set(S.starts.filter((s) => s.review && s.agent).map((s) => s.agent));
  const goneAgents = new Set(S.starts.filter((s) => refused.has(s.id) && s.agent).map((s) => s.agent));
  const deliv = S.writes.filter((w) => w.ts <= T && !reviewAgents.has(w.who) && !goneAgents.has(w.who));
  const reviewWritten = new Set(S.writes.filter((w) => reviewAgents.has(w.who)).map((w) => w.path));
  const review = isReview(cur.desc, cur.prompt), target = targetOf(cur.prompt);
  const finished = reviews.filter((s) => s.end != null && s.end <= T);
  const D = S.deliverable;
  const inD = (p) => !!(D && p && (p === D || p.startsWith(D + '/')));
  let dLast = null;
  for (const w of deliv) if (inD(w.path) && (dLast == null || w.ts > dLast)) dLast = w.ts;
  if (D && S.dMtime != null && S.first != null && S.dMtime > S.first && S.dMtime <= T && (dLast == null || S.dMtime > dLast)) dLast = S.dMtime;
  const why = (() => {
    if (escape) return null;
    if (review) {
      const running = reviews.find((s) => s.end == null || s.end > T);
      if (running) return `another review ("${running.desc}") is still running; one review at a time, no panels or lenses.`;
      if (D && dLast == null && !inD(target)) return `the deliverable (${D}) has not changed in this session yet: build it first; a review or check aimed at ${target || 'no named file'} waits until it has.`;
      if (target && (REVIEW_NAME.test(target) || reviewWritten.has(target))) return `${target} is a review's output; a review of a review is refused.`;
      const same = reviews.filter((s) => !target || !s.target || s.target === target);
      if (same.length >= 2) return `this would be the third review of ${target || 'the same work'}; fix what breaks it, list the rest, and finish.`;
      if (finished.length) {
        const lastEnd = Math.max(...finished.map((s) => s.end));
        const firstOfPiece = target && !same.length;
        if (!firstOfPiece && !deliv.some((w) => w.ts > lastEnd)) return 'nothing was written since the last review finished: ship it or fix it, do not review it again.';
      }
    }
    const fold = FOLD.test(cur.desc + '\n' + cur.prompt) || (/\b(fix|repair)\s+round\b/i.test(cur.desc) && finished.length > 0);
    if (fold && !breaking(cur.prompt)) return 'a repair round on review findings is refused unless the findings break the work; list the rest at the end of the work.';
    return null;
  })();
  const lastAny = deliv.reduce((a, w) => (!a || w.ts > a.ts ? w : a), null);
  const changeTs = D ? dLast : lastAny ? lastAny.ts : null;
  let total = 0, after = 0;
  for (const m of S.msgs.values()) if (m.ts <= T) { total += m.n; if (changeTs != null && m.ts > changeTs) after += m.n; }
  const share = `${fmtTok(after)} of the session's ${fmtTok(total)} tokens (${total ? Math.round((100 * after) / total) : 0} %) came after that.`;
  const context = `creep gate: ${prior.length + 1} helpers started in this session, ${reviews.length + (review ? 1 : 0)} of them reviews; ` +
    (D ? (changeTs != null ? `the deliverable (${D}) last changed ${fmtMin(T - changeTs)} ago; ${share}` : `the deliverable (${D}) has not changed in this session yet; all ${fmtTok(total)} tokens so far went elsewhere.`)
      : (changeTs != null ? `a file last changed ${fmtMin(T - changeTs)} ago (${lastAny.path}); ${share}` : `no file changed yet; ${fmtTok(total)} tokens so far.`) +
        ' No deliverable stated: a line "Deliverable: <path>" in the brief or a message names it.') +
    (KIT ? ' Build the deliverable, one targeted check, finish (the kit\'s rules).' : ' Build the deliverable, one targeted check, finish (CLAUDE.md rule 8).');
  return { why, context, review, target };
}

function sessDirOf(tp) {
  const sub = String(tp).split(/[\\/]subagents[\\/]/);
  return sub.length > 1 ? sub[0] : String(tp).replace(/\.jsonl$/, '');
}
function ownerRecord(p) {
  const m = String(p).match(/^\s*owner:\s*(r57-\d{4})\b/m); if (!m) return false;
  const needle = `"id":"${m[1]}"`;
  for (const f of walk(resolve(ROOT, 'library', 'journal'))) {
    if (!f.endsWith('.jsonl')) continue;
    for (const l of read(f).split('\n')) if (l.includes(needle)) { try { return JSON.parse(l).status === 'owner'; } catch { return false; } }
  }
  return false;
}

// ---- replay ---------------------------------------------------------------------------------------------------------
if (process.argv[2] === '--replay') {
  let tp = process.argv[3] || '';
  if (!existsSync(tp)) {
    const base = join(homedir(), '.claude', 'projects');
    for (const d of (() => { try { return readdirSync(base); } catch { return []; } })()) {
      const f = (() => { try { return readdirSync(join(base, d)); } catch { return []; } })().find((n) => n.startsWith(tp) && n.endsWith('.jsonl'));
      if (f) { tp = join(base, d, f); break; }
    }
  }
  if (!existsSync(tp)) { console.error('no transcript for ' + process.argv[3]); process.exit(1); }
  const S = load(sessDirOf(tp));
  const di = process.argv.indexOf('--deliverable');
  if (di > 0 && process.argv[di + 1]) S.deliverable = norm(process.argv[di + 1]).replace(/\/+$/, '');
  console.log(`deliverable: ${S.deliverable || 'none stated'}`);
  const refused = new Set(S.starts.filter((s) => s.err).map((s) => s.id));
  const agentTok = (a) => { const fam = new Set([a]); let grew = true; while (grew) { grew = false; for (const [c, p] of S.parents) if (fam.has(p) && !fam.has(c)) { fam.add(c); grew = true; } } let n = 0; for (const m of S.msgs.values()) if (fam.has(m.who)) n += m.n; return n; };
  let saved = 0, n = 0;
  for (const s of S.starts) {
    if (s.err) { console.log(`${new Date(s.ts).toISOString().slice(11, 19)}  refused by the app or another hook  ${s.desc}`); continue; }
    const r = decide(S, s, s.ts, refused, ownerRecord(s.prompt));
    const tk = s.agent ? agentTok(s.agent) : 0;
    if (r.why) { refused.add(s.id); saved += tk; n++; }
    console.log(`${new Date(s.ts).toISOString().slice(11, 19)}  ${r.why ? 'REFUSE' : 'allow '}  ${s.desc}  [${r.review ? 'review' : 'work'}${r.target ? ', ' + r.target : ''}; its helper used ${fmtTok(tk)}]${r.why ? '\n          ' + r.why : ''}`);
  }
  let all = 0; for (const m of S.msgs.values()) all += m.n;
  console.log(`\n${n} of ${S.starts.length} starts refused; the refused helpers themselves used ${fmtTok(saved)} of the session's ${fmtTok(all)} tokens.`);
  process.exit(0);
}

// ---- the hook -------------------------------------------------------------------------------------------------------
let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { log({ decision: 'allow', why: 'unreadable input' }); process.exit(0); }
const rec = {};
try {
  const ti = j && j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
  Object.assign(rec, { session: String((j && j.session_id) || '').slice(0, 8), agent_id: j && j.agent_id ? String(j.agent_id).slice(0, 17) : null,
    tu: j && typeof j.tool_use_id === 'string' ? j.tool_use_id : null, desc: String(ti.description || '').slice(0, 60) });
  if (!j || j.hook_event_name !== 'PreToolUse' || !['Agent', 'Task'].includes(String(j.tool_name))) { log({ ...rec, decision: 'allow', why: 'not a helper start' }); process.exit(0); }
  const d = String(ti.description || ''), p = String(ti.prompt || '');
  const tp = String(j.transcript_path || '');
  const S = tp && existsSync(sessDirOf(tp) + '.jsonl') ? load(sessDirOf(tp)) : { starts: [], writes: [], msgs: new Map(), parents: new Map(), first: null };
  if (S.deliverable) S.dMtime = mtimeOf(S.deliverable);
  const refused = new Set(S.starts.filter((s) => s.err).map((s) => s.id));
  for (const l of read(LOGF).split('\n')) { if (!l.includes('"deny"')) continue; try { const o = JSON.parse(l); if (o.tu) refused.add(o.tu); } catch {} }
  const now = Date.now();
  const found = S.starts.find((s) => s.id === rec.tu);
  const cur = found ? { ...found, desc: d, prompt: p } : { id: rec.tu, ts: now, who: j.agent_id ? String(j.agent_id).replace(/^agent-/, '') : 'main', pos: null, desc: d, prompt: p };
  const escape = ownerRecord(p);
  const r = decide(S, cur, now, refused, escape);
  Object.assign(rec, { review: r.review, target: r.target });
  if (r.why) {
    log({ ...rec, decision: 'deny', why: r.why });
    process.stderr.write((KIT ? 'creep gate (no procedural creep, the kit\'s rules; r57-0063): ' : 'creep gate (CLAUDE.md rule 8, r57-0063): ') + r.why + '\n');
    process.exit(2);
  }
  log({ ...rec, decision: 'allow', why: escape ? 'owner escape' : r.review ? 'review passes rules 1, 2, 3 and 5' : 'not a review' });
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: r.context } }));
  process.exit(0);
} catch (e) {
  log({ ...rec, decision: 'allow', why: 'error: ' + String((e && e.message) || e).slice(0, 160) });
  process.exit(0);
}
