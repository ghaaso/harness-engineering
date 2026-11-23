// Creep gate (version 1, 2026-11-24, top session 9b). PreToolUse on Agent and Task. Owner's rule r57-0063: no procedural
// creep (reviews of reviews, repeated review rounds, repair rounds over low-severity findings). Refuses, with one line:
//  1. a second review of the same deliverable (a review start whose target file an earlier review start of the same session
//     or its helpers already named; the target is the first repository path in the prompt, else in the brief file it names);
//  2. a review of a review (the target's path or name has refute, review, critique or audit in it);
//  3. a fold or repair round on findings (description or prompt says fold, fix findings, address findings) unless the prompt
//     says "breaking";
//  4. a third or later start of kind refute in one session.
// A review start: description begins "refute", or description/prompt asks for a review, critique, blind check or audit.
// Escape: a prompt line "owner: r57-NNNN" passes all four. Any error or unreadable input passes (logged).
// Cannot see: a review done inside one helper's own turns, a creep round made without a helper start, plans and pages the
// coordinator writes itself, a target named in no path. Log: .claude/logs/creep-gate.jsonl.
import { readFileSync, readdirSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, isAbsolute } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.CREEP_GATE_ROOT ? resolve(process.env.CREEP_GATE_ROOT) : resolve(here, '..', '..');
const LOGDIR = resolve(ROOT, '.claude', 'logs');
function log(o) { try { mkdirSync(LOGDIR, { recursive: true }); appendFileSync(join(LOGDIR, 'creep-gate.jsonl'), JSON.stringify({ t: Date.now(), ...o }) + '\n'); } catch {} }
function deny(rec, why) { log({ ...rec, decision: 'deny', why }); process.stderr.write('creep gate (r57-0063): ' + why + '\n'); process.exit(2); }
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };

const isRefute = (d, p) => /^\s*refute\b/i.test(d) || /\bkind\s+refute\b/i.test(p);
const REVIEW_WORD = /\b(review|critique|audit|blind[- ]check)\b/i;
const isReview = (d, p) => isRefute(d, p) || REVIEW_WORD.test(d) || /\bblind[- ]check\b/i.test(p) || REVIEW_WORD.test(String(p).split(/\r?\n/)[0]);
const isFold = (d, p) => /\b(fold|fix(?:ing)?\s+(?:the\s+)?findings|address(?:ing)?\s+(?:the\s+)?findings)\b/i.test(d + '\n' + p);
const PATH_RE = /[A-Za-z0-9_.:-]+(?:[\\/][A-Za-z0-9_.-]+)+\.[A-Za-z0-9]{1,6}\b/g;
const norm = (p) => {
  let s = p.replace(/\\/g, '/').toLowerCase();
  const r = ROOT.replace(/\\/g, '/').toLowerCase() + '/';
  if (s.startsWith(r)) s = s.slice(r.length);
  return s.replace(/^\.\//, '');
};
const isBrief = (p) => /(^|\/)briefs\//.test(norm(p));
function targetOf(prompt) {
  const ps = [...String(prompt || '').matchAll(PATH_RE)].map((m) => m[0]);
  const t = ps.find((p) => !isBrief(p));
  if (t) return norm(t);
  for (const b of ps.filter(isBrief)) {
    const c = isAbsolute(b) || /^[A-Za-z]:/.test(b) ? [b] : [resolve(ROOT, b), resolve(ROOT, 'research-tree', 'build', b)];
    for (const f of c) {
      const txt = read(f); if (!txt) continue;
      const bt = [...txt.matchAll(PATH_RE)].map((m) => m[0]).find((p) => !isBrief(p));
      if (bt) return norm(bt);
    }
  }
  return null;
}
const isReviewOutput = (t) => /refute|review|critique|audit/.test(t);
function files(dir, out = []) {
  let es = []; try { es = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) { const p = join(dir, e.name); if (e.isDirectory()) files(p, out); else if (e.name.endsWith('.jsonl')) out.push(p); }
  return out;
}
// Every start of the session and its helpers, except this one and the ones the app refused.
function earlierStarts(tp, thisTu) {
  const sub = tp.split(/[\\/]subagents[\\/]/);
  const sessDir = sub.length > 1 ? sub[0] : tp.replace(/\.jsonl$/, '');
  const all = [sessDir + '.jsonl', ...files(join(sessDir, 'subagents'))];
  const starts = new Map(), errs = new Set();
  for (const f of all) for (const l of read(f).split('\n')) {
    if (!l.startsWith('{"parentUuid"')) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    const c = o.message && Array.isArray(o.message.content) ? o.message.content : [];
    for (const b of c) {
      if (o.type === 'assistant' && b.type === 'tool_use' && (b.name === 'Agent' || b.name === 'Task') && b.id !== thisTu) starts.set(b.id, b.input || {});
      if (o.type === 'user' && b.type === 'tool_result' && b.is_error) errs.add(b.tool_use_id);
    }
  }
  return [...starts].filter(([id]) => !errs.has(id)).map(([, i]) => i);
}

let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
const rec = {};
try {
  if (!j || j.hook_event_name !== 'PreToolUse' || !['Agent', 'Task'].includes(String(j.tool_name))) process.exit(0);
  const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
  const d = String(ti.description || ''), p = String(ti.prompt || '');
  Object.assign(rec, { session: String(j.session_id || '').slice(0, 8), desc: d.slice(0, 60) });
  if (/^\s*owner:\s*r57-\d{4}\b/m.test(p)) { log({ ...rec, decision: 'allow', note: 'owner escape' }); process.exit(0); }
  const review = isReview(d, p), fold = isFold(d, p);
  if (!review && !fold) process.exit(0);

  if (fold && !/(?<!non-)\bbreaking\b/i.test(p)) deny(rec, 'a repair or fold round on review findings is refused unless the findings are breaking; put non-breaking findings in a list at the end of the work.');
  if (review) {
    const target = targetOf(p);
    rec.target = target;
    if (target && isReviewOutput(target)) deny(rec, `a review of a review (${target}) is refused; one review per deliverable.`);
    const tp = String(j.transcript_path || '');
    const prior = tp ? earlierStarts(tp, j.tool_use_id) : [];
    if (target && prior.some((i) => isReview(String(i.description || ''), String(i.prompt || '')) && targetOf(i.prompt) === target)) {
      deny(rec, `a second review of ${target} is refused; one review per deliverable.`);
    }
    if (isRefute(d, p) && prior.filter((i) => isRefute(String(i.description || ''), String(i.prompt || ''))).length >= 2) {
      deny(rec, 'a third refute start in one session is refused.');
    }
  }
  log({ ...rec, decision: 'allow' });
  process.exit(0);
} catch (e) {
  log({ ...rec, decision: 'allow', note: 'error: ' + String((e && e.message) || e).slice(0, 160) });
  process.exit(0);
}
