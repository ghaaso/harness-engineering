// Hypothesis gate (2026-11-26; owner ruling r58-0017, form widened by r58-0021). Brief:
// research-tree/build/briefs/HYPOTHESIS-GATE.md. Standard: docs/program/RESEARCH-METHOD-RULES-2026-11-25.md, from
// "The standard a hypothesis must meet" to the end. PreToolUse on Write, Edit, MultiEdit, NotebookEdit, Bash,
// PowerShell, Agent, Task and mcp__ccd_session__start_session. Three refusals:
//
// 1. Reading before writing. A call that writes or changes docs/program/hypotheses/*-HYPOTHESIS-*.md (Write/Edit on the
//    path; a shell command naming the path with a write: >, >>, tee, sed -i, writeFileSync, Set-Content, Out-File, ...)
//    needs, in this session's own transcript after its last compaction, a full read of both learning files: a Read with
//    no offset and no limit that did not fail, or a Bash/PowerShell `cat <file>` not piped or redirected whose output was
//    not cut (the app's "<persisted-output>" preview is not a full read). A compaction is a transcript line
//    {"type":"system","subtype":"compact_boundary",...} (seen in this repository's transcripts, 2026-11-26). Inside a
//    helper the transcript is its own file <session>/subagents/agent-<agent_id>.jsonl, as window-ceiling.mjs reads it.
// 2. The form. A Write of a hypothesis, and tools/check-hypothesis.mjs for any file: checkHypothesis() below.
//    An Edit is not judged on form (the result is not in the call); the command line and the pass cover it.
// 3. No step of the new work without the pass. Roots ROOTS below. A step: a write under a root, a shell command that
//    names a root or reaches a rented machine (RENTED) and is not a pure read, a helper or session whose input names a
//    root. data2 needs a valid pass of DATA-HYPOTHESIS-*.md; model2 and a rented machine need DATA and MODEL. A pass is
//    <file>.pass.json with sha256 equal to the file's hash now, the file passing the form, and its "ruling" id a record
//    of kind ruling and status owner in library/journal/.
//
// Cannot see: a write made by a script file or `node -e` without a write word named here; a relative path that does not
// name the root (cd into data2, then "python train.py"); a rented machine reached by any other program; whether the
// reasoning is right (that is the owner's pass). Writes nothing (no log). On an internal error the call passes, except a
// call whose raw input names a root or a rented-machine command: that is refused with the error named.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename, isAbsolute } from 'node:path';

// ---- constants: the form (r58-0017, r58-0021) -----------------------------------------------------------------------
export const LABELS = ['Depends on', 'Alternatives', 'Ruled out', 'Choice', 'Why', 'Rests on', 'Refuted if'];
export const SECTION_BEFORE = 'graph of decisions';               // a "## " heading holding this, before the first block
export const SECTION_AFTER = 'Consistency across the decisions';  // a "## " heading holding this, after the last block
export const BLOCK_RE = /^### ([DM])(\d+)\./;                     // a decision block's heading
export const LEARNING = { N: 'docs/program/learning/MECHANISMS-NEURAL.md', D: 'docs/program/learning/MECHANISMS-DATA.md' };
export const HYP_DIR = 'docs/program/hypotheses';
export const ROOTS_RE = /(?:research-tree[\\/]+build|(?:[A-Za-z]:|\/[A-Za-z])?[\\/]+research-runs)[\\/]+(data2|model2)(?![A-Za-z0-9_])/gi;
export const RENTED_RE = /\b(?:ssh|scp|rsync) |runpodctl/;
const HYP_PATH_RE = /(?:^|[\\/])docs[\\/]+program[\\/]+hypotheses[\\/]+[^\\/]*-HYPOTHESIS-[^\\/]*\.md$/i;
const HYP_IN_CMD_RE = /hypotheses[\\/]+[A-Za-z0-9_.-]*-HYPOTHESIS-[A-Za-z0-9_.-]*?\.md(?![\w.])/i;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const START_TOOLS = new Set(['Agent', 'Task', 'mcp__ccd_session__start_session']);
// First words of a command segment that only read.
const READ_WORDS = new Set(['cat', 'ls', 'dir', 'grep', 'egrep', 'fgrep', 'rg', 'head', 'tail', 'wc', 'find', 'stat', 'du',
  'file', 'less', 'more', 'sort', 'uniq', 'cut', 'tr', 'cd', 'pwd', 'test', '[', 'realpath', 'readlink', 'dirname',
  'basename', 'md5sum', 'sha256sum', 'sha1sum', 'diff', 'cmp', 'echo', 'printf', 'true', 'type', 'jq', 'tree', 'nl', 'column',
  'get-content', 'gc', 'get-childitem', 'gci', 'select-string', 'sls', 'test-path', 'get-item', 'gi', 'resolve-path',
  'measure-object', 'select-object', 'where-object', 'sort-object', 'format-table', 'format-list', 'out-string', 'get-filehash']);
const GIT_READ = new Set(['log', 'status', 'diff', 'show', 'ls-files', 'grep', 'blame', 'rev-parse', 'branch']);

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = process.env.HYPOTHESIS_GATE_ROOT ? resolve(process.env.HYPOTHESIS_GATE_ROOT) : resolve(here, '..', '..');
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const norm = (p) => String(p || '').replace(/\\/g, '/');

// ---- 2. the form ----------------------------------------------------------------------------------------------------
const learningCache = new Map();
function learningIndex(root, kind) {
  const key = root + '|' + kind;
  if (learningCache.has(key)) return learningCache.get(key);
  const text = read(join(root, LEARNING[kind]));
  const idx = text == null ? null : { entries: new Set(), sections: new Set() };
  if (idx) for (const l of text.split(/\r?\n/)) {
    let m = /^\*\*(\d+\.\d+)[\s.*]/.exec(l); if (m) idx.entries.add(m[1]);
    m = /^## (\d+)\./.exec(l); if (m) idx.sections.add(m[1]);
  }
  learningCache.set(key, idx);
  return idx;
}
const labelRe = (lab) => new RegExp('^\\*\\*' + lab.replace(/ /g, ' ') + '\\.\\*\\*');

// Returns a list of faults (empty = the form holds). text: the document; root: the repository it refers to.
export function checkHypothesis(text, root = ROOT) {
  const faults = [];
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  let cur = null;
  lines.forEach((l, i) => {
    const m = BLOCK_RE.exec(l);
    if (m) { cur = { name: m[1] + m[2], line: i + 1, body: [] }; blocks.push(cur); return; }
    if (/^#{1,3} /.test(l)) { cur = null; return; }
    if (cur) cur.body.push(l);
  });
  if (!blocks.length) return ['no decision block: each decision needs a heading "### D1. Title" (data) or "### M1. Title" (model).'];
  const firstLine = blocks[0].line, lastLine = blocks[blocks.length - 1].line;
  const h2 = lines.map((l, i) => ({ l, n: i + 1 })).filter((x) => /^## /.test(x.l));
  if (!h2.some((x) => x.n < firstLine && x.l.toLowerCase().includes(SECTION_BEFORE.toLowerCase())))
    faults.push(`no "## " heading containing "${SECTION_BEFORE}" before the first decision block.`);
  if (!h2.some((x) => x.n > lastLine && x.l.toLowerCase().includes(SECTION_AFTER.toLowerCase())))
    faults.push(`no "## " heading containing "${SECTION_AFTER}" after the last decision block.`);
  for (const b of blocks) {
    const pos = LABELS.map((lab) => b.body.findIndex((l) => labelRe(lab).test(l)));
    const missing = LABELS.filter((_, k) => pos[k] < 0);
    if (missing.length) faults.push(`${b.name} (line ${b.line}): missing ${missing.map((x) => '**' + x + '.**').join(', ')} at the start of a line.`);
    const present = LABELS.map((lab, k) => ({ lab, at: pos[k] })).filter((x) => x.at >= 0);
    for (let k = 1; k < present.length; k++) if (present[k].at < present[k - 1].at) {
      faults.push(`${b.name} (line ${b.line}): labels out of order; the order is ${LABELS.join(', ')}.`); break;
    }
    const starts = present.map((x) => x.at).sort((a, c) => a - c);
    for (const { lab, at } of present) {
      const end = starts.find((s) => s > at) ?? b.body.length;
      const body = [b.body[at].replace(labelRe(lab), ''), ...b.body.slice(at + 1, end)].join('\n').trim();
      if (!body) faults.push(`${b.name} (line ${b.line}): **${lab}.** has no text.`);
      if (lab === 'Rests on' && body) {
        const ok = /\b[ND] \d+(?:\.\d+)?\b/.test(body) || /\brecord:\s*\S/.test(body) || /\bassumption\b/i.test(body) || /\bcount first:\s*\S/i.test(body);
        if (!ok) faults.push(`${b.name} (line ${b.line}): **Rests on.** names no reference of an allowed kind (N x.y, D x.y, record: <path>, assumption, count first: <what>).`);
      }
    }
  }
  // Every N x.y / D x.y / N x / D x anywhere must exist.
  const seen = new Set();
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/(?<![A-Za-z0-9_])([ND]) (\d+)(?:\.(\d+))?(?![\d])/g)) {
      const ref = m[3] ? `${m[1]} ${m[2]}.${m[3]}` : `${m[1]} ${m[2]}`;
      if (seen.has(ref)) continue; seen.add(ref);
      const idx = learningIndex(root, m[1]);
      const file = basename(LEARNING[m[1]]);
      if (!idx) { faults.push(`line ${i + 1}: ${ref} cannot be checked: ${LEARNING[m[1]]} is missing.`); continue; }
      if (m[3] ? !idx.entries.has(`${m[2]}.${m[3]}`) : !idx.sections.has(m[2]))
        faults.push(`line ${i + 1}: ${ref} is not in ${file} (${m[3] ? 'no line starting "**' + m[2] + '.' + m[3] + ' "' : 'no section "## ' + m[2] + '."'}).`);
    }
    for (const m of l.matchAll(/\brecord:\s*`?([^\s;`'"]+)/g)) {
      const p = m[1].replace(/[.,)\]]+$/, '');
      if (seen.has('record:' + p)) continue; seen.add('record:' + p);
      const abs = isAbsolute(p) || /^[A-Za-z]:/.test(p) ? p : join(root, p);
      if (!existsSync(abs)) faults.push(`line ${i + 1}: record: ${p} does not exist in the repository.`);
    }
  });
  return faults;
}

// ---- 1. reading before writing ----------------------------------------------------------------------------------------
export function isHypothesisPath(p) { return HYP_PATH_RE.test(norm(p)); }
export function shellWritesHypothesis(cmd) {
  const c = String(cmd || '');
  if (!HYP_IN_CMD_RE.test(c)) return false;
  const name = /[^\s'"<>|;&]*hypotheses[\\/]+[A-Za-z0-9_.-]*-HYPOTHESIS-[A-Za-z0-9_.-]*?\.md(?![\w.])/i;
  if (new RegExp('>>?\\s*[\'"]?' + name.source, 'i').test(c)) return true;
  return /\btee\b|\bsed\s+(?:[^|;&\n]*\s)?-i|\bperl\s+(?:[^|;&\n]*\s)?-i|writeFileSync|appendFileSync|copyFileSync|renameSync|\bSet-Content\b|\bAdd-Content\b|\bOut-File\b|\bCopy-Item\b|\bMove-Item\b|(?:^|[\s;&|(])(?:cp|mv)\s/i.test(c);
}
function blocksOf(o) { return o && o.message && Array.isArray(o.message.content) ? o.message.content : []; }
function resultText(r) {
  if (typeof r.content === 'string') return r.content;
  if (Array.isArray(r.content)) return r.content.map((x) => (x && typeof x.text === 'string' ? x.text : '')).join('');
  return '';
}
function fileHit(p, which) { return norm(p).toLowerCase().endsWith(LEARNING[which].toLowerCase()); }
function catReads(cmd, which) {
  const name = basename(LEARNING[which]).replace('.', '\\.');
  for (const seg of String(cmd || '').split(/&&|\|\||;|\n/)) {
    const s = seg.replace(/\s2>(?:&1|\/dev\/null|\$null)/g, '').trim();
    if (/[|>]/.test(s)) continue;
    const w = s.split(/\s+/)[0].toLowerCase();
    if (w !== 'cat' && w !== 'get-content' && w !== 'gc' && w !== 'type') continue;
    if (/-(?:TotalCount|Head|Tail|First|Last)\b/i.test(s)) continue;
    if (new RegExp('(?:^|[\\s\'"\\\\/])' + name + '[\'"]?(?:\\s|$)', 'i').test(s)) return true;
  }
  return false;
}
// The transcript's full reads of the learning files since the last compaction: { N: bool, D: bool, compacted: bool }.
export function readsSinceCompaction(path) {
  const text = read(path);
  if (text == null) return null;
  const ls = text.split('\n');
  let start = 0, compacted = false;
  for (let i = ls.length - 1; i >= 0; i--) {
    if (!ls[i].includes('"compact_boundary"')) continue;
    try { const o = JSON.parse(ls[i]); if (o.type === 'system' && o.subtype === 'compact_boundary') { start = i + 1; compacted = true; break; } } catch {}
  }
  const uses = new Map(); // tool_use id -> which
  const results = new Map(); // tool_use id -> { err, text }
  for (let i = start; i < ls.length; i++) { // the calls (only lines naming a learning file are parsed)
    if (!ls[i].includes('MECHANISMS-') || !ls[i].includes('"tool_use"')) continue;
    let o; try { o = JSON.parse(ls[i]); } catch { continue; }
    for (const b of blocksOf(o)) {
      if (b.type !== 'tool_use' || !b.input) continue;
      for (const which of ['N', 'D']) {
        const inp = b.input;
        if (b.name === 'Read' && fileHit(inp.file_path, which) && inp.offset == null && inp.limit == null && inp.pages == null) uses.set(b.id, { which, kind: 'read' });
        else if ((b.name === 'Bash' || b.name === 'PowerShell') && catReads(inp.command, which)) uses.set(b.id, { which, kind: 'cat' });
      }
    }
  }
  if (uses.size) for (let i = start; i < ls.length; i++) { // their results
    const l = ls[i];
    if (!l.includes('"tool_result"') || ![...uses.keys()].some((id) => l.includes(id))) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    for (const b of blocksOf(o)) if (b.type === 'tool_result' && uses.has(b.tool_use_id)) results.set(b.tool_use_id, { err: b.is_error === true, text: resultText(b) });
  }
  const got = { N: false, D: false, compacted };
  for (const [id, u] of uses) {
    const r = results.get(id);
    if (!r || r.err) continue;
    if (u.kind === 'cat' && /^\s*<persisted-output>/.test(r.text)) continue; // only a preview reached the session
    got[u.which] = true;
  }
  return got;
}
export function ownTranscript(j) {
  const tp = typeof j.transcript_path === 'string' ? j.transcript_path : '';
  if (!tp) return null;
  const agent = j.agent_id ? String(j.agent_id).replace(/^agent-/, '') : null;
  if (!agent) return tp;
  if (new RegExp(`agent-${agent}\\.jsonl$`).test(norm(tp))) return tp;
  return join(dirname(tp), basename(tp).replace(/\.jsonl$/, ''), 'subagents', `agent-${agent}.jsonl`);
}

// ---- 3. steps of the new work and the pass ------------------------------------------------------------------------------
export function isPureRead(cmd) {
  const c = String(cmd || '');
  if (/\$\(|`/.test(c)) return false;
  const stripped = c.replace(/\d?>\s*(?:&\d|\/dev\/null|\$null)/g, '');
  if (/>/.test(stripped)) return false;
  for (const seg of stripped.split(/&&|\|\||;|\||\n/)) {
    const words = seg.trim().replace(/^\(+/, '').split(/\s+/).filter((w) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w));
    if (!words.length || !words[0]) continue;
    const w = words[0].toLowerCase();
    if (w === 'git') { const sub = words.slice(1).find((x) => !x.startsWith('-')); if (!GIT_READ.has(sub)) return false; continue; }
    if (w === 'sed' && /\s-i/.test(seg)) return false;
    if (w === 'find' && /\s-(?:delete|exec|execdir|ok|fprint)/.test(seg)) return false;
    if (!READ_WORDS.has(w)) return false;
  }
  return true;
}
// Which passes this call needs: { data, model, why } or null when it is not a step of the new work.
export function stepNeeds(tool, input) {
  const inp = input || {};
  const names = (s) => { const out = new Set(); for (const m of String(s || '').matchAll(ROOTS_RE)) out.add(m[1].toLowerCase()); return out; };
  let roots = new Set(), rented = false, why = '';
  if (WRITE_TOOLS.has(tool)) { roots = names(inp.file_path || inp.notebook_path); why = 'a write under ' + [...roots].join(' and '); }
  else if (SHELL_TOOLS.has(tool)) {
    const cmd = String(inp.command || '');
    roots = names(cmd); rented = RENTED_RE.test(cmd);
    if ((roots.size || rented) && isPureRead(cmd)) return null;
    why = rented ? 'a command that reaches a rented machine' : 'a command naming ' + [...roots].join(' and ');
  } else if (START_TOOLS.has(tool)) { roots = names(JSON.stringify(inp)); why = 'a helper or session whose prompt names ' + [...roots].join(' and '); }
  else return null;
  if (!roots.size && !rented) return null;
  return { data: true, model: rented || roots.has('model2'), why };
}
let journal = null;
function journalRecord(root, id) {
  if (!journal) {
    journal = new Map();
    const walk = (d) => {
      let es = []; try { es = readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of es) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.jsonl')) for (const l of (read(p) || '').split('\n')) {
          if (!l.startsWith('{')) continue;
          try { const o = JSON.parse(l); if (o && typeof o.id === 'string') journal.set(o.id, o); } catch {}
        }
      }
    };
    walk(join(root, 'library', 'journal'));
  }
  return journal.get(id);
}
// The state of the pass for one kind ('DATA' or 'MODEL'): { ok, file, fault }.
export function passState(root, kind) {
  const dir = join(root, HYP_DIR);
  let names = []; try { names = readdirSync(dir).filter((n) => new RegExp(`^${kind}-HYPOTHESIS-.*\\.md$`, 'i').test(n)); } catch {}
  if (!names.length) return { ok: false, fault: `there is no ${HYP_DIR}/${kind}-HYPOTHESIS-*.md yet` };
  const faults = [];
  for (const n of names) {
    const f = join(dir, n), rel = `${HYP_DIR}/${n}`;
    const pj = read(f + '.pass.json');
    if (pj == null) { faults.push(`${rel} has no pass (${n}.pass.json)`); continue; }
    let pass; try { pass = JSON.parse(pj); } catch { faults.push(`${n}.pass.json is not valid JSON`); continue; }
    const bytes = readFileSync(f);
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (String(pass.sha256 || '').toLowerCase() !== sha) { faults.push(`${rel} has changed since its pass (the hash differs), so the pass is void`); continue; }
    const form = checkHypothesis(bytes.toString('utf8'), root);
    if (form.length) { faults.push(`${rel} fails the form check (${form[0]})`); continue; }
    const rec = journalRecord(root, String(pass.ruling || ''));
    if (!rec || rec.kind !== 'ruling' || rec.status !== 'owner') { faults.push(`the pass of ${rel} names ruling "${pass.ruling || ''}", which is not an owner ruling in library/journal`); continue; }
    return { ok: true, file: rel };
  }
  return { ok: false, fault: faults.join('; ') };
}

// ---- the hook ---------------------------------------------------------------------------------------------------------------
function deny(why) { process.stderr.write('hypothesis gate: ' + why + '\n'); process.exit(2); }
export function decide(j) {
  const tool = String(j.tool_name || ''), inp = j.tool_input || {};
  // 1 and 2: a hypothesis being written.
  let hypWrite = false;
  if (WRITE_TOOLS.has(tool) && isHypothesisPath(inp.file_path || inp.notebook_path)) hypWrite = true;
  if (SHELL_TOOLS.has(tool) && shellWritesHypothesis(inp.command)) hypWrite = true;
  if (hypWrite) {
    const tp = ownTranscript(j);
    const got = tp ? readsSinceCompaction(tp) : null;
    const miss = got ? ['N', 'D'].filter((k) => !got[k]).map((k) => LEARNING[k]) : [LEARNING.N, LEARNING.D];
    if (miss.length) return `writing a hypothesis needs both learning files read in full ${got && got.compacted ? 'since this session\'s last compaction' : 'in this session'}. Read ${miss.join(' and ')} with the Read tool (no offset, no limit), then write again.`;
    if (tool === 'Write') {
      const f = checkHypothesis(inp.content, ROOT);
      if (f.length) return `the hypothesis does not meet the form (${f.length} fault${f.length > 1 ? 's' : ''}). Fix and write again: ` + f.slice(0, 8).join(' ') + (f.length > 8 ? ` ... and ${f.length - 8} more (node tools/check-hypothesis.mjs <file> lists all).` : '');
    }
  }
  // 3: a step of the new work.
  const need = stepNeeds(tool, inp);
  if (need) {
    const miss = [];
    for (const k of need.model ? ['DATA', 'MODEL'] : ['DATA']) { const s = passState(ROOT, k); if (!s.ok) miss.push(s.fault); }
    if (miss.length) return `this is a step of the new work (${need.why}) and needs the owner's pass first: ${miss.join('; ')}. Ask him to pass the hypothesis; nothing of the new work runs before.`;
  }
  return null;
}

const main = !globalThis.HYPOTHESIS_GATE_IMPORT;
if (main) {
  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch { process.exit(0); }
  let why = null;
  try {
    const j = JSON.parse(raw);
    if (!j || (j.hook_event_name && j.hook_event_name !== 'PreToolUse')) process.exit(0);
    why = decide(j);
  } catch (e) {
    ROOTS_RE.lastIndex = 0;
    if (new RegExp(ROOTS_RE.source, 'i').test(raw) || RENTED_RE.test(raw))
      deny(`internal error (${String(e && e.message || e).slice(0, 200)}); a step of the new work is refused while the gate cannot check it.`);
    process.exit(0);
  }
  if (why) deny(why);
  process.exit(0);
}
