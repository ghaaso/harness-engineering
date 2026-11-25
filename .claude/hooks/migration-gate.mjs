// Migration gate (version 1, 2026-11-24, helper RHOOK; brief docs/program/monitor/round9/migration/briefs/HOOK.md).
// His words (FEEDBACK-3.md (c), (d)): a hook so that the skills, information and failure modes are enforced on the
// developer helpers; "we are determined to end up with the same thing after the migration as we have right now, and
// possibly have an even better product". The requirements: migration/SRS.md, CHECKS.md, FAILURE-MODES.md, SKILLS.md,
// PLAN.md (docs/program/monitor/round9/). No Fable in the migration (r57-0082).
//
// A migration caller: a helper whose first prompt, or a child session whose first prompt starts with a kind ("build: ..."),
// names the Rust workspace (round9/rust), the migration files (round9/migration), C:/rust-work, or a step of PLAN.md
// ("step 1.3") together with the word Rust or migration. A migration start: an Agent, Task or start_session call whose
// description, title or prompt does the same.
//
// Refused, with one plain line (exit 2):
//  1. Context. A migration start whose prompt (or a brief file it names) does not name SRS.md, FAILURE-MODES.md and the
//     skills PLAN.md gives its step (R rust-best-practices, M the Microsoft rust-guidelines excerpt, P tauri-knowledge-patch,
//     C tauri-commands, S tauri-security-capabilities-authoring, W tauri-bundling-windows-signing, N wasm-note); a build
//     start pointed at the Rust workspace that names no step; a step PLAN.md does not have. Context: SubagentStart gives a
//     migration helper the floors of SRS.md and the rules of FAILURE-MODES.md (read from the files at each call); if they
//     are not in the helper's transcript by its first gated call, PreToolUse gives them then (measured to reach helpers);
//     SessionStart after a compaction gives them again.
//  2. Floors. A change (Write, Edit, MultiEdit, NotebookEdit, or a shell write) to SRS.md, CHECKS.md, FAILURE-MODES.md,
//     SKILLS.md or an existing checks/baseline.json unless it names a journal record with status owner dated 2026-11-24 or
//     later: a line "owner: r57-NNNN" in the new text, in the shell command, or in the caller's first prompt. Once the checks
//     builder has finished (its tokens line in checks/README.md) or the workspace exists (rust/Cargo.toml): a change to
//     checks/**/*.mjs from a helper whose kind is not build-invariant; a Write or Edit that drops from checks/*.mjs (tests
//     aside) a check id CHECKS.md (C-nnn) or FAILURE-MODES.md (FM-nn.name) lists; a shell write to checks/*.mjs without an
//     owner record (its ids cannot be read). A migration caller's change to .claude/hooks/, .claude/settings*.json,
//     tools/git-hooks/, tools/check-commit.mjs or this hook's logs, unless an owner record is named.
//  3. Done. Once rust/Cargo.toml exists: `node .claude/hooks/migration-gate.mjs --gate`, called by tools/git-hooks/pre-commit,
//     refuses a commit whose staged files touch round9/rust or round9/migration while
//     `checks/run.mjs --level <L>` fails (L = 2 for crates/picture or glue, 3 for crates/hooks, else 1; the highest
//     touched), and while those folders hold unstaged or untracked changes (the tested tree must be the committed tree;
//     checks/runs/ and checks/work/ aside). A pass is kept as a token keyed by the hash of those files in the index, so a
//     second run is skipped. PreToolUse on Bash and PowerShell refuses a git commit that would touch them with
//     --no-verify, -n or a core.hooksPath override, or when the pre-commit hook does not call this gate; a git merge
//     bringing changes to them unless the incoming tip's files have a pass token at their level and the current branch did
//     not change them too (then: merge --no-commit and commit, which runs the gate); a git pull. Escape for the in-session
//     forms: "owner: r57-NNNN" (status owner) in the command.
//  4. Routes. A migration start on Fable (r57-0082); a start whose kind is not one PLAN.md gives its step (build may be
//     raised to build-invariant, the trial's Opus retry). Kind against model: the tier hook.
//  5. Failure modes caught at the call (FAILURE-MODES.md; the rest run inside checks/run.mjs): FM-05.refuse, a migration
//     caller's git stash, reset --hard, checkout --, clean, restore . or cargo clean; FM-06.loop, a cargo check, build,
//     clippy or test after two runs in a row without fewer error lines (the counts come from PostToolUse); FM-07.class, an
//     Edit or Write of a .rs file after cargo output showed an environment error (LNK, os error 5 or 32, Access is denied),
//     until C:/rust-work/preflight.json is newer and passed; FM-02.allow and FM-03.grep, a Write or Edit of a .rs file under
//     rust/ that adds a line with #[allow( #[expect( #[ignore .skip( todo! unimplemented! "not implemented" "similarly"
//     "same as above" TODO FIXME HACK workaround, unless checks/allow-list.txt holds that line. FM-27.count: every cargo
//     run is logged with its error count.
//
// Cannot see: a write made by a script file or through a path held in a variable when the command names no protected file;
// a .rs write through the shell (the banned patterns are then caught by checks/run.mjs at commit); a migration builder
// whose prompt names neither a migration path nor a step; whether an owner record is about this change (only its status
// and date are read); a check removed while its id string stays in the code (checks/run.test.mjs and the review catch
// that); merges, cherry-picks, rebases and reverts made by scripts or by the commands git runs without pre-commit (only
// commit, merge and pull are read); a pass token forged by a caller that is not a migration caller; cargo output cut by
// the tool's output limit (the error count is then low). SubagentStart context reaching the helper was not yet observed
// in this repository (no hook emitted it before); the log line "ctx" says by which event each helper got it.
// Fails closed on migration starts, floor and check files and migration commits; an error on any other call lets it
// through and is logged. Log: .claude/logs/migration-gate.jsonl; state and pass tokens: .claude/logs/migration-gate/.
// Commands: node .claude/hooks/migration-gate.mjs --gate [--level n]   (the floor gate on the staged migration files)
//           node .claude/hooks/migration-gate.mjs --context            (prints what a migration helper is given)
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, appendFileSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.MIGRATION_GATE_ROOT ? resolve(process.env.MIGRATION_GATE_ROOT) : resolve(here, '..', '..');
const R9 = 'docs/program/monitor/round9', MIG = R9 + '/migration', RUST = R9 + '/rust', CK = MIG + '/checks';
const LOGDIR = join(ROOT, '.claude', 'logs'), STATE = join(LOGDIR, 'migration-gate'), LOGF = join(LOGDIR, 'migration-gate.jsonl');
const PREFLIGHT = process.env.MIGRATION_GATE_PREFLIGHT || 'C:/rust-work/preflight.json';
const read = (p, n) => {
  try {
    if (!n) return readFileSync(p, 'utf8');
    const fd = openSync(p, 'r'); const b = Buffer.alloc(n); const k = readSync(fd, b, 0, n, 0); closeSync(fd); return b.toString('utf8', 0, k);
  } catch { return ''; }
};
const jread = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
function log(o) { try { mkdirSync(LOGDIR, { recursive: true }); appendFileSync(LOGF, JSON.stringify({ t: Date.now(), ...o }) + '\n'); } catch {} }
const low = (s) => String(s || '').replace(/\\/g, '/').toLowerCase();

// ---- the requirement files ---------------------------------------------------------------------------------------
const KINDS = (() => { const r = jread(join(here, 'tier-routes.json')); return new Set(Object.keys((r && r.kinds) || {}).concat(['build', 'build-invariant', 'run', 'read', 'refute', 'analyse', 'orchestrate'])); })();
const SKILL = { R: /rust-best-practices/i, M: /rust-guidelines|pragmatic rust/i, P: /tauri-knowledge-patch/i, C: /tauri-commands(?!-)/i,
  S: /tauri-security-capabilities-authoring/i, W: /tauri-bundling-windows-signing/i, N: /wasm-note/i };
const SKILL_NAME = { R: 'rust-best-practices', M: 'the Microsoft rust-guidelines excerpt', P: 'tauri-knowledge-patch', C: 'tauri-commands',
  S: 'tauri-security-capabilities-authoring', W: 'tauri-bundling-windows-signing', N: 'wasm-note.md' };
export function planSteps(text = read(join(ROOT, MIG, 'PLAN.md'))) {
  const rows = {};
  const strip = (s) => String(s || '').replace(/\([^)]*\)/g, ' ');
  for (const l of text.split('\n')) {
    const m = l.match(/^\|\s*(\d\.\d)\b/); if (!m) continue;
    const c = l.split('|').slice(1, -1).map((s) => s.trim());
    if (c.length < 5) continue;
    rows[m[1]] = { kinds: [...new Set(strip(c[3]).toLowerCase().split(/[\s,;*]+/).filter((w) => KINDS.has(w)))],
      skills: [...new Set(strip(c[4]).match(/\b[RMPCSWN]\b/g) || [])] };
  }
  return rows;
}
const listedIds = () => new Set([...(read(join(ROOT, MIG, 'CHECKS.md')).match(/\bC-\d{3}\b/g) || []), ...(read(join(ROOT, MIG, 'FAILURE-MODES.md')).match(/\bFM-\d{2}\.[a-z][a-z0-9]*\b/g) || [])]);
const oneLine = (s, n) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
export function contextBlock() {
  const srs = read(join(ROOT, MIG, 'SRS.md')), fm = read(join(ROOT, MIG, 'FAILURE-MODES.md'));
  const floors = [];
  for (const m of srs.matchAll(/\*\*(R-\d{3})\s+([^*]+?)\.?\*\*[\s\S]*?\n- Floor:\s*([\s\S]*?)(?=\n- |\n\n)/g)) {
    const f = m[3].replace(/\s+/g, ' ').split(/ Today[:,]| \(today/)[0];
    floors.push(`${m[1]} ${oneLine(m[2], 50)}: ${oneLine(f, 150)}`);
  }
  const never = [...srs.matchAll(/^\|\s*(R-0[67]\d)\s*\|\s*([^|]+)\|/gm)].map((m) => `${m[1]} ${oneLine(m[2], 70)}`);
  if (never.length) floors.push('Never again (floor: none on the screen): ' + never.join('; '));
  const rules = [...fm.matchAll(/^### (FM-\d{2}) ([^\n]+)[\s\S]*?\n- \*\*Rule:\*\*\s*([\s\S]*?)(?=\n- \*\*|\n#)/gm)].map((m) => `${m[1]} ${oneLine(m[2], 60)}: ${oneLine(m[3], 200)}`);
  return [
    'MIGRATION-GATE-CONTEXT (the migration hook, .claude/hooks/migration-gate.mjs). You work on the session tool\'s move to Rust. ' +
    'His words: the result must be the same thing as now, possibly better; no floor may fall, anything above passes. ' +
    `Done means \`node ${CK}/run.mjs --level <n>\` exits 0 as this hook runs it at commit, never a helper's word (U-11). ` +
    'Before writing code read SRS.md, CHECKS.md, FAILURE-MODES.md, your step\'s row of PLAN.md and its skill files.',
    'This hook refuses: changes to SRS.md, CHECKS.md, FAILURE-MODES.md, SKILLS.md or checks/baseline.json without an owner record; ' +
    'changes to checks/*.mjs from a helper that is not build-invariant or that drop a listed check id; edits of .claude/hooks, ' +
    'the settings and the commit hook; git stash, reset --hard, checkout --, clean, restore . and cargo clean (FM-05); a cargo ' +
    'run after two runs in a row without fewer errors (FM-06: stop and report); .rs edits after an environment error until the ' +
    'preflight passes (FM-07); added .rs lines with #[allow( #[expect( #[ignore .skip( todo! unimplemented! TODO FIXME HACK ' +
    'workaround "similarly" "same as above" "not implemented" (FM-02, FM-03) unless checks/allow-list.txt holds them; a commit ' +
    'touching rust/ or migration/ while its level\'s floor check fails or while those folders hold unstaged changes.',
    `Floors (SRS.md; the numbers are in SRS.md and CHECKS.md), ${floors.length}:`, ...floors,
    `Failure-mode rules (FAILURE-MODES.md), ${rules.length}:`, ...rules,
  ].join('\n');
}

// ---- callers --------------------------------------------------------------------------------------------------------
export function isMigrationText(t) {
  const s = String(t || '');
  return /round9[\\/]+(?:rust|migration)(?![\w-])/i.test(s) || /\bC:[\\/]+rust-work\b/i.test(s) ||
    (/\bstep\s+[0-3]\.[0-6]\b/i.test(s) && /\b(?:rust|migration)\b/i.test(s));
}
const kindOf = (d) => ((String(d || '').match(/^\s*([a-z][a-z-]*)\s*:/i) || [])[1] || '').toLowerCase();
const sessDirOf = (tp) => { const s = String(tp || '').split(/[\\/]subagents[\\/]/); return s.length > 1 ? s[0] : String(tp || '').replace(/\.jsonl$/, ''); };
function firstPrompt(file) {
  let n = 0;
  for (const l of read(file, 262144).split('\n')) {
    if (!l.startsWith('{')) continue; let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.type !== 'user') continue;
    const c = o.message && o.message.content;
    const t = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b && b.type === 'text').map((b) => String(b.text || '')).join('\n') : '';
    if (!t.trim() || t.trimStart().startsWith('<')) { if (++n > 5) break; continue; }
    return t;
  }
  return '';
}
function callerOf(j) {
  const sessDir = sessDirOf(j.transcript_path);
  const agent = j.agent_id ? String(j.agent_id).replace(/^agent-/, '') : null;
  const file = !j.transcript_path ? '' : agent ? join(sessDir, 'subagents', `agent-${agent}.jsonl`) : sessDir + '.jsonl';
  const prompt = file ? firstPrompt(file) : '';
  const meta = agent ? jread(join(sessDir, 'subagents', `agent-${agent}.meta.json`)) : null;
  const kind = kindOf(meta && meta.description) || kindOf(prompt);
  const migration = isMigrationText(prompt) && (agent ? true : KINDS.has(kindOf(prompt)));
  const key = `${String(j.session_id || 'nosession').slice(0, 8)}-${agent || 'main'}`;
  return { agent, file, prompt, kind, migration, key, sess: String(j.session_id || '').slice(0, 8) };
}
const stateOf = (key) => jread(join(STATE, `caller-${key}.json`)) || {};
const saveState = (key, s) => { try { mkdirSync(STATE, { recursive: true }); writeFileSync(join(STATE, `caller-${key}.json`), JSON.stringify(s)); } catch {} };

// ---- owner records ----------------------------------------------------------------------------------------------------
const OWNER_LINE = /^[\s>*#/-]*owner:\s*(r57-\d{4})\b/gim, OWNER_CMD = /(?:^|[\s"'#(])owner:\s*(r57-\d{4})\b/gim;
export function ownerRecord(texts, re = OWNER_LINE) {
  const ids = new Set();
  for (const t of texts) for (const m of String(t || '').matchAll(new RegExp(re.source, re.flags))) ids.add(m[1].toLowerCase());
  if (!ids.size) return null;
  const jd = join(ROOT, 'library', 'journal');
  let days = []; try { days = readdirSync(jd).filter((d) => d >= '2026-11-24').sort(); } catch { return null; }
  for (const d of days) {
    let fs = []; try { fs = readdirSync(join(jd, d)).filter((f) => f.endsWith('.jsonl')); } catch { continue; }
    for (const f of fs) for (const l of read(join(jd, d, f)).split('\n')) {
      for (const id of ids) if (new RegExp(`"id"\\s*:\\s*"${id}"`).test(l)) { try { if (JSON.parse(l).status === 'owner') return id; } catch {} }
    }
  }
  return null;
}

// ---- what a path is -----------------------------------------------------------------------------------------------
const FLOOR_DOCS = new Set(['srs.md', 'checks.md', 'failure-modes.md', 'skills.md']);
const HARNESS = /\/\.claude\/hooks\/|\/\.claude\/settings(?:\.local)?\.json$|\/tools\/git-hooks\/|\/tools\/check-commit\.mjs$|\/\.claude\/logs\/migration-gate/;
function absOf(p, cwd) {
  let s = String(p || '').trim().replace(/^\\\\\?\\|^\/\/\?\//, '');
  const g = s.match(/^\/([a-zA-Z])\/(.*)$/); if (g) s = g[1] + ':/' + g[2];
  return resolve(cwd || ROOT, s);
}
export function classify(abs) {
  const a = low(abs), out = { abs: a };
  const mi = a.indexOf('/' + MIG + '/');
  if (mi >= 0) {
    const tail = a.slice(mi + MIG.length + 2);
    out.top = a.slice(0, mi);
    if (FLOOR_DOCS.has(tail)) out.floor = tail;
    else if (tail === 'checks/baseline.json' && existsSync(abs)) out.floor = tail;
    else if (/^checks\/.+\.mjs$/.test(tail) && !/^checks\/(runs|work)\//.test(tail)) out.checkCode = tail;
  }
  const ri = a.indexOf('/' + RUST + '/');
  if (ri >= 0 && a.endsWith('.rs')) { out.rs = a.slice(ri + RUST.length + 2); out.top = a.slice(0, ri); }
  if (HARNESS.test(a)) out.harness = true;
  return out;
}
const checksDone = () => /\|\s*calls\s+\d+\s*\|\s*tokens\s+[\d.]+\s*[MK]/i.test(read(join(ROOT, CK, 'README.md'))) || existsSync(join(ROOT, RUST, 'Cargo.toml'));

// ---- the shell: which protected files a command may write ------------------------------------------------------------
const CP_LIKE = new Set(['cp', 'copy', 'copy-item', 'cpi', 'install', 'ln', 'rsync']);
const W_VERBS = new Set(['tee', 'truncate', 'dd', 'touch', 'rm', 'rmdir', 'unlink', 'shred', 'mv', 'patch', 'set-content', 'add-content',
  'out-file', 'new-item', 'move-item', 'remove-item', 'rename-item', 'clear-content', 'tee-object', 'sc', 'ac', 'ni', 'mi', 'ri', 'rni',
  'clc', 'del', 'erase', 'ren', 'move', 'rd', ...CP_LIKE]);
const GIT_W = /^(?:checkout|restore|reset|stash|apply|am|mv|rm|clean|switch|merge|pull|cherry-pick|revert|rebase)$/;
function verbOf(seg) {
  const w = seg.trim().split(/\s+/); let i = 0;
  while (i < w.length && (/^\w+=/.test(w[i]) || ['sudo', 'command', 'exec', 'time', 'nohup', 'xargs', 'env', '&', '(', '{', '!'].includes(w[i]))) i++;
  return { verb: (w[i] || '').replace(/^.*\//, '').replace(/\.exe$/, ''), words: w.slice(i) };
}
function writes(seg) {
  const { verb, words } = verbOf(seg);
  if (verb === 'sed') return /\s-[a-z]*i|--in-place/.test(seg) ? 'all' : null;
  if (verb === 'perl') return /\s-[a-z0-9]*i/.test(seg) ? 'all' : null;
  if (verb === 'git') { const sub = words.slice(1).find((x, k, a) => !x.startsWith('-') && !['-c', '-C'].includes(a[k - 1])); return sub && GIT_W.test(sub) ? 'all' : null; }
  if (CP_LIKE.has(verb)) { const d = words.findIndex((x) => x === '-destination'); return d > 0 ? words[d + 1] || '' : words.filter((x) => !x.startsWith('-')).slice(-1)[0] || ''; }
  return W_VERBS.has(verb) ? 'all' : null;
}
// The protected names a piece of shell text names: [{cls, name}].
export function namedIn(text, cwdLow, whole) {
  const t = low(text), ctxMig = low(whole).includes('round9/migration') || cwdLow.includes('/round9/migration'), out = [];
  for (const m of t.matchAll(/(?<![\w.-])((?:[\w.:~$-]*\/)*)(srs|checks|failure-modes|skills)\.md\b/g)) {
    const pre = m[1];
    if (pre.endsWith('round9/migration/') || (ctxMig && (pre === '' || pre === './' || pre.endsWith('migration/')))) out.push({ cls: 'floor', name: m[2] + '.md' });
  }
  for (const m of t.matchAll(/(?<![\w.-])((?:[\w.:~$-]*\/)*)baseline\.json\b/g))
    if ((m[1].endsWith('migration/checks/') || (ctxMig && (m[1].endsWith('checks/') || cwdLow.endsWith('/migration/checks')))) && existsSync(join(ROOT, CK, 'baseline.json'))) out.push({ cls: 'floor', name: 'checks/baseline.json' });
  for (const m of t.matchAll(/(?<![\w.-])((?:[\w.:~$-]*\/)*)([\w.-]+\.mjs)\b/g)) {
    const pre = m[1];
    if (/checks\/(runs|work)\//.test(pre)) continue;
    if (pre.endsWith('migration/checks/') || (ctxMig && pre.endsWith('checks/')) || (pre === '' && cwdLow.endsWith('/round9/migration/checks'))) out.push({ cls: 'checkCode', name: 'checks/' + m[2] });
  }
  if (/\.claude\/hooks\/|\.claude\/settings(?:\.local)?\.json|tools\/git-hooks\/|tools\/check-commit\.mjs|\.claude\/logs\/migration-gate/.test(t)) out.push({ cls: 'harness', name: (t.match(/\.claude\/hooks\/[\w.-]*|\.claude\/settings(?:\.local)?\.json|tools\/git-hooks\/[\w.-]*|tools\/check-commit\.mjs|\.claude\/logs\/migration-gate[\w./-]*/) || [''])[0] });
  return out;
}
export function shellWrites(cmd, cwd) {
  const text = low(cmd), cw = low(cwd).replace(/\/+$/, ''), hits = [];
  const add = (s) => { for (const h of namedIn(s, cw, text)) hits.push(h); };
  for (const m of text.matchAll(/(?<![0-9&<>=-])>>?\|?\s*(?:"([^"]*)"|'([^']*)'|([^\s;&|<>()]+))/g)) {
    const tg = m[1] ?? m[2] ?? m[3] ?? '';
    if (/^&\d?$|^\/dev\/null$|^nul$|^\$null$/.test(tg)) continue;
    if (/[$`%]/.test(tg)) add(text); else add(tg);
  }
  for (const seg of text.split(/\r?\n|;|&&|\|\||\|/)) {
    const w = writes(seg); if (w == null) continue;
    add(w === 'all' ? seg : w);
  }
  if (/\b(?:node|python3?|py|perl|ruby|deno|bun|pwsh|powershell)\b/.test(text) &&
    /writefilesync|appendfilesync|writefile\b|appendfile\b|createwritestream|renamesync|unlinksync|rmsync|copyfilesync|cpsync|truncatesync|write_text|write_bytes|shutil\.|os\.remove|os\.rename|open\([^)]*,\s*['"][wax+]|::(?:writeall|appendall|delete|move|copy|replace)/.test(text)) add(text);
  const seen = new Set();
  return hits.filter((h) => { const k = h.cls + h.name; if (seen.has(k)) return false; seen.add(k); return true; });
}
export const FM05 = /\bgit\b(?:\s+(?:-c\s+\S+|--git-dir(?:=|\s+)\S+|--work-tree(?:=|\s+)\S+|--no-pager|-p|--paginate))*\s+(?:stash\b|reset\b[^\n;&|]*\s--hard\b|checkout\b[^\n;&|]*\s--(?=\s|$)|clean\b|restore\b[^\n;&|]*\s\.(?=\s|$|\/))|\bcargo\s+(?:\+\S+\s+)?clean\b/i;
const CARGO = /\bcargo\s+(?:\+\S+\s+)?(check|build|clippy|test)\b/i;

// ---- git ----------------------------------------------------------------------------------------------------------
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000, maxBuffer: 64 << 20 });
const gitTry = (cwd, args) => { try { return git(cwd, args); } catch { return null; } };
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const rawLines = (s) => String(s || '').split('\n').map((x) => x.replace(/\r$/, '')).filter((x) => x.trim());
const inArea = (p) => { const s = low(p); return (s.startsWith(RUST + '/') || s.startsWith(MIG + '/')) && !/^docs\/program\/monitor\/round9\/migration\/checks\/(runs|work)\//.test(s); };
export function levelOf(files) {
  let L = 1;
  for (const f of files) { const s = low(f); if (s.startsWith(RUST + '/crates/hooks/')) L = Math.max(L, 3); else if (s.startsWith(RUST + '/crates/picture/') || s.startsWith(RUST + '/glue/')) L = Math.max(L, 2); }
  return L;
}
const areaKey = (entries) => createHash('sha256').update(entries.filter((e) => inArea(e.split('\t')[1] || '')).sort().join('\n')).digest('hex');
const keyIndex = (top) => areaKey(lines(git(top, ['ls-files', '-s', '--', RUST, MIG])).map((l) => { const m = l.match(/^(\d+) (\w+) \d+\t(.*)$/); return m ? `${m[1]} ${m[2]}\t${m[3]}` : l; }));
const keyRev = (top, rev) => areaKey(lines(git(top, ['ls-tree', '-r', rev, '--', RUST, MIG])).map((l) => { const m = l.match(/^(\d+) \w+ (\w+)\t(.*)$/); return m ? `${m[1]} ${m[2]}\t${m[3]}` : l; }));
const PASSES = join(STATE, 'passes.jsonl');
const hasPass = (key, L) => read(PASSES).split('\n').some((l) => { try { const o = JSON.parse(l); return o.key === key && o.level === L; } catch { return false; } });
const addPass = (key, L, top) => { mkdirSync(STATE, { recursive: true }); appendFileSync(PASSES, JSON.stringify({ t: Date.now(), key, level: L, top }) + '\n'); };
const started = (top, extra = []) => existsSync(join(top, RUST, 'Cargo.toml')) || extra.some((f) => low(f) === RUST + '/cargo.toml');

// The floor gate on the staged migration files (pre-commit, or by hand). Returns [exit code, message].
export function gate(cwd, levelArg) {
  const top = (gitTry(cwd, ['rev-parse', '--show-toplevel']) || '').trim();
  if (!top) return [0, 'not a git checkout'];
  const staged = lines(git(top, ['diff', '--cached', '--name-only']));
  const area = staged.filter(inArea);
  if (!levelArg && !area.length) return [0, 'the commit touches no migration file'];
  if (!started(top, staged)) return [0, 'the migration has not started (no rust/Cargo.toml)'];
  const dirty = rawLines(git(top, ['status', '--porcelain=v1', '--untracked-files=all', '--', RUST, MIG])).filter((l) => (l.startsWith('??') || l[1] !== ' ') && inArea(l.slice(3)));
  if (dirty.length) return [1, `migration gate: ${dirty.length} file(s) under rust/ or migration/ differ from what is staged (${dirty.slice(0, 4).map((l) => l.slice(3)).join(', ')}); the tested tree must be the committed tree: stage them or remove them, then commit.`];
  const L = levelArg || levelOf(area);
  let key; try { key = keyIndex(top); } catch (e) { return [1, 'migration gate: the staged migration files cannot be read (' + String(e.message || e).slice(0, 80) + '); refused.']; }
  if (hasPass(key, L)) return [0, `level ${L} passed before on these exact files`];
  const run = join(top, CK, 'run.mjs');
  if (!existsSync(run)) return [1, `migration gate: ${CK}/run.mjs is missing; nothing counts as done without the floor check.`];
  const r = spawnSync(process.execPath, [run, '--level', String(L)], { cwd: top, stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status === 0) { addPass(key, L, top); return [0, `level ${L} floor check passed`]; }
  return [1, `migration gate: checks/run.mjs --level ${L} failed (exit ${r.status}); a commit touching the migration is refused while a floor fails (nothing counts as done before).`];
}

// ---- the decisions --------------------------------------------------------------------------------------------------
const quoteless = (s) => String(s).replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
function briefsOf(prompt, cwd) {
  let out = '';
  for (const m of [...String(prompt || '').matchAll(/[A-Za-z0-9_.:~\\/-]+\.md\b/g)].slice(0, 8)) {
    const p = m[0]; if (!/[\\/]/.test(p) || !/[\\/]briefs?[\\/]|brief[^\\/]*\.md$/i.test(p)) continue;
    const f = absOf(p, cwd); out += '\n' + read(f, 200000);
  }
  return out;
}
const WORK_KINDS = new Set(['build', 'build-invariant', 'run', 'read', 'locate', 'extract', 'collect', 'test', 'design']);
export function startDecision(ti, isSession, cwd) {
  const label = String(isSession ? ti.title ?? '' : ti.description ?? ''), prompt = String(ti.prompt ?? ti.message ?? '');
  const text = label + '\n' + prompt;
  if (!isMigrationText(text)) return null;
  const fam = String(ti.model || '').toLowerCase();
  if (/fable/.test(fam)) return 'a migration helper or session on Fable is refused (r57-0082: no Fable in the move to Rust); use the model the tier routes give its kind.';
  const all = text + briefsOf(prompt, cwd);
  const miss = [];
  if (!/\bSRS\.md\b/i.test(all)) miss.push('SRS.md');
  if (!/\bFAILURE-MODES\.md\b/i.test(all)) miss.push('FAILURE-MODES.md');
  const STEP = /\bstep\s+(\d\.\d)\b/i, sm = label.match(STEP) || prompt.match(STEP) || all.match(STEP);
  const steps = sm ? [sm[1]] : [];
  const kind = kindOf(label);
  const plan = planSteps();
  if (!steps.length && /round9[\\/]+rust\b|rust-work/i.test(text) && ['build', 'build-invariant'].includes(kind))
    return `a build start pointed at the Rust workspace must name its step of ${MIG}/PLAN.md ("step 1.2"), so its skills and checks are known.`;
  for (const s of steps) {
    const row = plan[s];
    if (!row) return `step ${s} is not a step of ${MIG}/PLAN.md.`;
    const ok = new Set(row.kinds); if (ok.has('build')) ok.add('build-invariant');
    if (kind && ok.size && !ok.has(kind)) {
      if (WORK_KINDS.has(kind)) return `step ${s} runs as ${row.kinds.join(' or ')} (PLAN.md), not as ${kind}.`;
      continue; // a coordinator or a reviewer naming a step it does not do
    }
    for (const k of row.skills) if (!SKILL[k].test(all)) miss.push(`${SKILL_NAME[k]} (skill ${k} of step ${s})`);
  }
  if (miss.length) return `a migration ${isSession ? 'session' : 'helper'} starts with the requirements in front of it: its prompt (or a brief it names) must name ${miss.join(', ')}.`;
  return '';
}
function addedLines(oldText, newText) {
  const have = new Map(); for (const l of String(oldText).split('\n')) have.set(l, (have.get(l) || 0) + 1);
  const out = []; for (const l of String(newText).split('\n')) { const n = have.get(l) || 0; if (n) have.set(l, n - 1); else out.push(l); }
  return out;
}
const FM02 = /#!?\[(allow|expect)\(|#\[ignore|\.skip\(/, FM03 = /todo!|unimplemented!|not implemented|similarly|same as above|TODO|FIXME|HACK|workaround/;
function newTextOf(tool, ti, oldText) {
  if (tool === 'Write') return String(ti.content ?? '');
  const apply = (t, e) => { const o = String(e.old_string ?? ''), n = String(e.new_string ?? ''); if (!o) return t; return e.replace_all ? t.split(o).join(n) : t.replace(o, () => n); };
  if (tool === 'Edit') return apply(oldText, ti);
  if (tool === 'MultiEdit') return (ti.edits || []).reduce(apply, oldText);
  return String(ti.new_source ?? '');
}
function idsIn(texts, listed) { const s = new Set(); for (const t of texts) for (const m of String(t).matchAll(/\b(?:C-\d{3}|FM-\d{2}\.[a-z][a-z0-9]*)\b/g)) if (listed.has(m[0])) s.add(m[0]); return s; }
function codeFiles(dir) { const out = []; const walk = (d) => { let es = []; try { es = readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { const p = join(d, e.name); if (e.isDirectory()) { if (!['runs', 'work', 'node_modules'].includes(e.name)) walk(p); } else if (e.name.endsWith('.mjs') && !e.name.endsWith('.test.mjs')) out.push(p); } }; walk(dir); return out; }

export function fileDecision(tool, ti, cwd, caller) {
  const p = ti.file_path || ti.notebook_path || ti.path || '';
  if (!p) return null;
  const abs = absOf(p, cwd), c = classify(abs);
  if (!c.floor && !c.checkCode && !c.rs && !c.harness) return null;
  const oldText = read(abs), newText = newTextOf(tool, ti, oldText);
  const change = tool === 'Write' ? addedLines(oldText, newText).join('\n') : tool === 'MultiEdit' ? (ti.edits || []).map((e) => e.new_string).join('\n') : String(ti.new_string ?? ti.new_source ?? '');
  const why = (() => {
    if (c.floor && !ownerRecord([change, caller.prompt]))
      return `${c.floor} holds the floors of the migration: a change needs a journal record with status owner approving it (a line "owner: r57-NNNN" in the new text or in the brief), SRS.md section 10, FAILURE-MODES.md FM-02.`;
    if (c.checkCode && checksDone()) {
      if (caller.agent && caller.kind !== 'build-invariant') return `checks/ is the floor check: only a build-invariant helper changes it (FM-02), not a ${caller.kind || 'helper of unknown kind'}.`;
      const listed = listedIds(), dir = join(c.top || '', CK);
      const others = codeFiles(dir).filter((f) => low(f) !== low(abs)).map((f) => read(f));
      if (!c.checkCode.endsWith('.test.mjs')) {
        const before = idsIn([...others, oldText], listed), after = idsIn([...others, newText], listed);
        const gone = [...before].filter((x) => !after.has(x));
        if (gone.length) return `this change drops check ${gone.slice(0, 6).join(', ')} that CHECKS.md or FAILURE-MODES.md lists; a floor check is not removed by a builder (FM-02).`;
      }
    }
    if (c.rs) {
      const env = jread(join(STATE, 'env.json'));
      if (env && env.t && !preflightAfter(env.t)) return `cargo showed an environment error (${oneLine(env.line || '', 80)}); edit no .rs file until the preflight passes again (FM-07: report it, the machine is not fixed in code).`;
      const allow = new Set(read(join(c.top || ROOT, CK, 'allow-list.txt')).split('\n').map((l) => l.trim()).filter(Boolean));
      const bad = addedLines(oldText, newText).filter((l) => (FM02.test(l) || FM03.test(l)) && !allow.has(l.trim()));
      if (bad.length) return `the change adds ${oneLine(bad[0], 80)}: ${FM02.test(bad[0]) ? 'a lint or test switched off (FM-02.allow)' : 'a stub or a note in place of the work (FM-03.grep)'}; write the real code, or the coordinator lists the line in checks/allow-list.txt.`;
    }
    if (c.harness && caller.migration && !ownerRecord([change, caller.prompt]))
      return 'a migration builder does not change the hooks, the settings or the commit hook that hold it to the floors (an owner record is needed).';
    return null;
  })();
  return { why, related: true };
}
function preflightAfter(t) {
  try { const st = statSync(PREFLIGHT); if (st.mtimeMs <= t) return false; const o = JSON.parse(readFileSync(PREFLIGHT, 'utf8')); return o.pass === true || o.ok === true || o.passed === true || o.status === 'pass' || o.result === 'pass'; } catch { return false; }
}

export function shellDecision(cmd, cwd, caller, st) {
  const text = String(cmd || ''), related = { v: false };
  const why = (() => {
    if (caller.migration && FM05.test(text)) { related.v = true; return 'FM-05: git stash, reset --hard, checkout --, clean, restore . and cargo clean destroy other helpers\' work in the shared tree; refused for migration builders.'; }
    if (CARGO.test(text)) {
      related.v = true;
      const c = (st.cargo || []).slice(-3);
      if (c.length === 3 && c[1] >= c[0] && c[2] >= c[1] && c[2] > 0) return `FM-06: the last cargo runs left ${c.join(', ')} errors, two runs in a row without fewer; stop and report, a restart from the brief with the error added beats more repair.`;
    }
    const hits = shellWrites(text, cwd);
    if (hits.length) related.v = true;
    for (const h of hits) {
      if (h.cls === 'floor' && !ownerRecord([text], OWNER_CMD) && !ownerRecord([caller.prompt]))
        return `this command may write ${h.name}, which holds the migration's floors: a change needs a journal record with status owner ("owner: r57-NNNN" in the command or the brief).`;
      if (h.cls === 'checkCode' && checksDone()) {
        if (caller.agent && caller.kind !== 'build-invariant') return `this command may write ${h.name}: only a build-invariant helper changes the floor check (FM-02).`;
        if (!ownerRecord([text], OWNER_CMD)) return `this command may write ${h.name}; change the floor check with Write or Edit, so the hook can see that no check id is dropped.`;
      }
      if (h.cls === 'harness' && caller.migration && !ownerRecord([text], OWNER_CMD) && !ownerRecord([caller.prompt]))
        return `this command may write ${h.name}: a migration builder does not change the hooks, the settings or the commit hook.`;
    }
    return gitDecision(text, cwd, related);
  })();
  return { why, related: related.v };
}
function gitDecision(text, cwd0, related) {
  if (!/\bgit\b/.test(text) || !/\b(?:commit|merge|pull)\b/.test(text)) return null;
  let cwd = cwd0;
  for (const seg0 of text.replace(/\\/g, '/').split(/\r?\n|;|&&|\|\||\|/)) {
    const seg = seg0.trim();
    const cd = seg.match(/^(?:cd|pushd|set-location|sl)\s+(?:-\w+\s+)?["']?([^"'\s]+)/i); if (cd) { cwd = absOf(cd[1], cwd); continue; }
    const m = seg.match(/\bgit\b((?:\s+(?:-[cC]\s+\S+|--[\w-]+(?:=\S+)?|-[a-zA-Z]))*)\s+(commit|merge|pull)\b(.*)$/);
    if (!m) continue;
    const glob = m[1], sub = m[2], args = m[3];
    const gc = glob.match(/-C\s+["']?([^"'\s]+)/); const at = gc ? absOf(gc[1], cwd) : cwd;
    const top = (gitTry(at, ['rev-parse', '--show-toplevel']) || '').trim(); if (!top) continue;
    const escape = ownerRecord([seg], OWNER_CMD);
    if (sub === 'commit') {
      const staged = lines(gitTry(top, ['diff', '--cached', '--name-only']));
      const widen = /\bgit\b[^;&|\n]*\badd\b/.test(text) || /(?:^|\s)(?:-[a-zA-Z]*a[a-zA-Z]*|--all|--include|--only|-i|-o|--)(?=\s|$)/.test(quoteless(args));
      const dirty = widen ? rawLines(gitTry(top, ['status', '--porcelain=v1', '--untracked-files=all', '--', RUST, MIG])).map((l) => l.slice(3)) : [];
      const touch = [...staged, ...dirty].filter(inArea);
      if (!touch.length || !started(top, staged)) continue;
      related.v = true;
      if (escape) continue;
      const bypass = /(?:^|\s)(?:--no-verify|-n|-[a-zA-Z]*n[a-zA-Z]*)(?=\s|$)/.test(quoteless(args).replace(/\s-m\s*""|\s-F\s*\S+/g, ' ')) || /core\.hookspath/i.test(glob);
      if (bypass) return 'a commit touching the migration must pass through the pre-commit floor gate: no --no-verify, -n or core.hooksPath override.';
      const hp = (gitTry(top, ['config', 'core.hooksPath']) || '').trim();
      if (!hp || !read(join(absOf(hp, top), 'pre-commit')).includes('migration-gate')) return `the pre-commit hook here does not run the migration gate, so this commit would skip the floor check; wire it first: git config core.hooksPath "${join(ROOT, 'tools', 'git-hooks')}".`;
      continue;
    }
    if (sub === 'pull') {
      if (!started(top)) continue;
      related.v = true;
      if (escape) continue;
      return 'git pull merges what it fetches without the floor gate seeing it; git fetch, then git merge <ref> (the gate checks a merge).';
    }
    const words = quoteless(args).trim().split(/\s+/).filter(Boolean);
    if (words.some((w) => ['--no-commit', '--squash', '--abort', '--quit', '--continue'].includes(w))) continue;
    const revs = []; for (let i = 0; i < words.length; i++) { const w = words[i]; if (['-m', '-F', '-s', '-X', '--strategy', '--strategy-option', '--file'].includes(w)) { i++; continue; } if (!w.startsWith('-') && w !== '""') revs.push(w); }
    if (!revs.length) revs.push('@{u}');
    for (const rev of revs) {
      const ok = gitTry(top, ['rev-parse', '--verify', '--quiet', rev + '^{commit}']);
      if (!ok) { if (started(top)) { related.v = true; if (!escape) return `the merge source ${rev} cannot be read, so the gate cannot tell whether it brings migration changes.`; } continue; }
      const inc = lines(gitTry(top, ['diff', '--name-only', `HEAD...${rev}`, '--', RUST, MIG])).filter(inArea);
      const revStarted = gitTry(top, ['cat-file', '-e', `${rev}:${RUST}/Cargo.toml`]) !== null;
      if (!inc.length || !(started(top) || revStarted)) continue;
      related.v = true;
      if (escape) continue;
      const mine = lines(gitTry(top, ['diff', '--name-only', `${rev}...HEAD`, '--', RUST, MIG])).filter(inArea);
      if (mine.length) return `both this branch and ${rev} changed the migration files; merge with --no-commit, then commit, so the pre-commit gate runs the floor check on the merged files.`;
      const L = levelOf(inc), key = keyRev(top, rev);
      if (!hasPass(key, L)) return `${rev} brings migration changes whose files never passed the level ${L} floor check; check it out, run node .claude/hooks/migration-gate.mjs --gate --level ${L}, then merge.`;
    }
  }
  return null;
}

// ---- command line ---------------------------------------------------------------------------------------------------
if (process.argv[2] === '--gate') {
  const li = process.argv.indexOf('--level'); const L = li > 0 ? Number(process.argv[li + 1]) : 0;
  let res; try { res = gate(process.cwd(), [1, 2, 3].includes(L) ? L : 0); } catch (e) { res = [0, 'error, let through: ' + String((e && e.message) || e).slice(0, 160)]; }
  log({ ev: 'gate', decision: res[0] ? 'deny' : 'allow', why: res[1], cwd: process.cwd() });
  if (res[0]) process.stderr.write(res[1] + '\n'); else if (L || !/touches no|not started|not a git/.test(res[1])) process.stderr.write('migration gate: ' + res[1] + '\n');
  process.exit(res[0]);
}
if (process.argv[2] === '--context') { process.stdout.write(contextBlock() + '\n'); process.exit(0); }

// ---- the hook -------------------------------------------------------------------------------------------------------
let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { log({ decision: 'allow', why: 'unreadable input' }); process.exit(0); }
const ev = String((j && j.hook_event_name) || ''), tool = String((j && j.tool_name) || '');
const ti = j && j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
const cwd = typeof (j && j.cwd) === 'string' && j.cwd ? j.cwd : ROOT;
const rec = { ev, tool, session: String((j && j.session_id) || '').slice(0, 8), agent: j && j.agent_id ? String(j.agent_id).slice(0, 17) : null };
let related = false;
const deny = (why, rule) => { log({ ...rec, decision: 'deny', rule, why }); process.stderr.write(`migration gate (${rule}): ${why}\n`); process.exit(2); };
const say = (event, extra) => { process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: contextBlock() } })); log({ ...rec, decision: 'allow', ctx: event, ...extra }); process.exit(0); };
try {
  if (ev === 'SubagentStart' || ev === 'SessionStart') {
    const caller = callerOf(j);
    if (caller.migration) { saveState(caller.key, { ...stateOf(caller.key), ctx: ev }); say(ev); }
    if (ev === 'SubagentStart' && !caller.prompt) {
      const pend = (jread(join(STATE, `pending-${rec.session}.json`)) || []).filter((t) => Date.now() - t < 120000);
      if (pend.length) { pend.shift(); try { writeFileSync(join(STATE, `pending-${rec.session}.json`), JSON.stringify(pend)); } catch {} saveState(caller.key, { ...stateOf(caller.key), ctx: ev }); say(ev, { by: 'pending start' }); }
    }
    process.exit(0);
  }
  if (ev === 'PostToolUse' && (tool === 'Bash' || tool === 'PowerShell')) {
    const cmd = String(ti.command || ''); const m = cmd.match(CARGO);
    if (!m) process.exit(0);
    const caller = callerOf(j), r = j.tool_response;
    const out = typeof r === 'string' ? r : r && typeof r === 'object' ? [r.stdout, r.stderr, r.output, r.content].filter((x) => typeof x === 'string').join('\n') : '';
    const errors = (out.match(/^\s*(?:\S+:\d+:\d+:\s+)?error(?:\[E\d{4}\])?:/gm) || []).length;
    const st = stateOf(caller.key); st.cargo = [...(st.cargo || []), errors].slice(-5); saveState(caller.key, st);
    const envLine = (out.match(/.*(?:LNK\d{4}|linker .link\.exe. not found|os error (?:5|32)\b|failed to link or copy|Access is denied).*/i) || [])[0];
    if (envLine) { try { mkdirSync(STATE, { recursive: true }); writeFileSync(join(STATE, 'env.json'), JSON.stringify({ t: Date.now(), line: envLine.slice(0, 200), caller: caller.key })); } catch {} }
    log({ ...rec, ev: 'cargo', sub: m[1].toLowerCase(), errors, env: !!envLine, caller: caller.key });
    process.exit(0);
  }
  if (ev !== 'PreToolUse') process.exit(0);
  let why = null, rule = '';
  if (tool === 'Agent' || tool === 'Task' || /start_session$/.test(tool)) {
    related = isMigrationText(String(ti.description ?? ti.title ?? '') + '\n' + String(ti.prompt ?? ''));
    if (!related) process.exit(0);
    if (/start_session$/.test(tool) && (ti.initiation === 'offer' || ti.proposal_id)) { log({ ...rec, decision: 'allow', why: 'a card, not a start' }); process.exit(0); }
    why = startDecision(ti, /start_session$/.test(tool), cwd); rule = 'start, r57-0082';
    if (!why) {
      try { mkdirSync(STATE, { recursive: true }); const pf = join(STATE, `pending-${rec.session}.json`); writeFileSync(pf, JSON.stringify([...(jread(pf) || []).filter((t) => Date.now() - t < 120000), Date.now()])); } catch {}
      log({ ...rec, decision: 'allow', why: 'migration start with its requirements named', desc: String(ti.description ?? ti.title ?? '').slice(0, 60) });
      process.exit(0);
    }
    deny(why, rule);
  }
  let caller = null;
  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
    const p = ti.file_path || ti.notebook_path || '';
    const c = p ? classify(absOf(p, cwd)) : {};
    if (c.floor || c.checkCode || c.rs || c.harness) {
      related = true; caller = callerOf(j);
      const d = fileDecision(tool, ti, cwd, caller); why = d && d.why; rule = 'floors and failure modes';
    }
  } else if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(ti.command || '');
    caller = callerOf(j);
    const d = shellDecision(cmd, cwd, caller, stateOf(caller.key)); related = d.related; why = d.why; rule = /^FM-0[56]/.test(d.why || '') ? d.why.slice(0, 5) : 'floors and done';
  }
  if (why) deny(why, rule);
  if (!caller && ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) caller = callerOf(j);
  if (caller && caller.migration) {
    const st = stateOf(caller.key);
    if (!st.seen) {
      st.seen = true; saveState(caller.key, st);
      if (read(caller.file).includes('MIGRATION-GATE-CONTEXT')) { log({ ...rec, decision: 'allow', ctx: 'already in the transcript (' + (st.ctx || 'unknown event') + ')' }); process.exit(0); }
      say('PreToolUse', { by: 'first gated call' });
    }
  }
  if (related) log({ ...rec, decision: 'allow', why: 'checked' });
  process.exit(0);
} catch (e) {
  const msg = String((e && e.message) || e).slice(0, 160);
  if (related && ev === 'PreToolUse') { log({ ...rec, decision: 'deny', why: 'error on a migration call: ' + msg }); process.stderr.write('migration gate: an error on a migration call, refused (fails closed): ' + msg + '\n'); process.exit(2); }
  log({ ...rec, decision: 'allow', why: 'error: ' + msg });
  process.exit(0);
}
