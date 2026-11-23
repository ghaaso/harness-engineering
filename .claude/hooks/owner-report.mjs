// Owner report check (unit T8-REPORT, top session 8, 2026-11-24; ruling r57-0056, brief research-tree/build/briefs/TOP8-REPORT.md).
// What reaches the owner is written for him: the picture first, plain words, a handful of numbers, no internal labels
// (CLAUDE.md rule 6; r57-0017; r57-0027; the owner's note "Big picture, not figures" of 2026-11-23; broken by
// r57-0608, r57-0609, r57-0612, r57-0613, t7-0608). This hook reads the three places he reads:
//   PreToolUse mcp__ccd_turn__wrap_up  the closing box: recap, ask and the button labels;
//   PreToolUse Artifact (publish)      every local text file the call publishes (page, supporting files, data files);
//   Stop (no agent_id)                 the session's last message (last_assistant_message).
// It refuses (exit 2, one plain line) a text that shows:
//   - record ids (r57-0056, t7-0608, x13-0117, d3c-0403: a writer prefix and four digits);
//   - unit names: the names of this repository's units, briefs, plan units and batches and replays, read from
//     research-tree/build/ at each call, plus the top session's unit form T<n>-NAME;
//   - repository file paths: an absolute path into this repository, a path that starts at one of its top-level
//     folders, or a bare file name of a record kind (.md, .mjs, .json, .jsonl, .sh, .ps1). A file he opens himself
//     (.drawio, .pdf, .png, .svg, .html, .pptx, .docx, .xlsx) may be named: diagrams and the compile are delivered to
//     him as such files (memory notes on trees and the compile);
//   - money: a currency sign or code next to a number (r57-0003: tokens are reported, never money);
//   - "in no paper" and its forms (r57-0029, r57-0610).
// A page gets no "record" section for ids: CLAUDE.md rule 6 puts the record in the markdown behind the page.
// Figures: "a handful" has no recorded number (`bash library/lookup.sh handful` holds none; r57-0002 forbids one by
// preference), so the count of figures in the box is a note (PostToolUse additionalContext), never a refusal. Pages
// are not counted: the owner's note keeps the figures in the files and the page.
// Stop: exit 2 makes the session go on and rewrite (x01-0308). It refuses once: when stop_hook_active is true the
// stop is let through and logged, so a refusal can never loop (x01-0308: must check stop_hook_active).
// What it cannot see: whether the picture comes first, whether the words are plain, whether a number matters, a label
// not in the files it reads (claim and lead numbers such as C38 or L59, research-run parts such as f4c), a label he
// asked for by name, text drawn on a page by a script from computed values, the docs connector, a helper's return.
// A hook input it cannot read, or an error of its own, lets the call through and is logged.
// Every decision is logged to ../logs/owner-report.jsonl.
import { readFileSync, appendFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, isAbsolute, basename, extname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');

function log(o) {
  try {
    mkdirSync(resolve(here, '..', 'logs'), { recursive: true });
    appendFileSync(resolve(here, '..', 'logs', 'owner-report.jsonl'), JSON.stringify({ t: Date.now(), ...o }) + '\n');
  } catch {}
}

// ---- what counts as an internal label ----
const ls = (p) => { try { return readdirSync(p, { withFileTypes: true }); } catch { return []; } };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Writer prefixes without a digit (bp, fill): the journal's file names. A prefix with a digit (r57, x13, d3c) is
// matched by its form.
function writers() {
  const out = new Set();
  for (const d of ls(resolve(repo, 'library', 'journal'))) {
    if (!d.isDirectory()) continue;
    for (const f of ls(resolve(repo, 'library', 'journal', d.name))) {
      const m = /^([a-z]{1,5})\.jsonl$/.exec(f.name);
      if (m) out.add(m[1]);
    }
  }
  return [...out];
}

// Unit names, read from the files that name them. A name that is a plain word (GATE, PLAN, OUT, ROUTER) is left out:
// it is also English; a name with a digit, a dot or a hyphen is a label.
function unitNames() {
  const b = resolve(repo, 'research-tree', 'build');
  const names = new Set();
  for (const d of ls(resolve(b, 'units'))) if (d.isDirectory()) names.add(d.name);
  for (const f of ls(resolve(b, 'briefs'))) if (f.isFile() && f.name.endsWith('.md')) names.add(f.name.slice(0, -3));
  for (const d of ls(resolve(b, 'replays'))) {
    if (!d.isDirectory()) continue;
    names.add(d.name);
    const m = /^replay-(.+)$/.exec(d.name);
    if (m) names.add(m[1]); // L6, L24: how the replays were named to the owner on 2026-11-23 (t7-0608)
  }
  try {
    const plan = JSON.parse(readFileSync(resolve(b, 'plan.json'), 'utf8'));
    for (const u of plan.units || []) if (u && typeof u.id === 'string') names.add(u.id);
    for (const x of plan.batches || []) if (x && typeof x.id === 'string') names.add(x.id);
  } catch {}
  return [...names].filter((n) => /[\d.-]/.test(n) && /[A-Za-z]/.test(n) && n.length <= 40);
}

function topEntries() {
  return ls(repo).map((d) => d.name).filter((n) => n !== '.git' && n !== '.' && n !== '..');
}

const OPEN_EXT = new Set(['.drawio', '.pdf', '.png', '.svg', '.html', '.htm', '.pptx', '.docx', '.xlsx', '.jpg', '.jpeg']);
const RECORD_EXT = 'md|mjs|cjs|jsonl|json|sh|ps1';

function build() {
  const W = writers();
  const idForms = [String.raw`(?=[a-z0-9]*\d)[a-z][a-z0-9]{0,4}`].concat(W.map(esc));
  const ID = new RegExp(String.raw`(?<![\w-])(?:${idForms.join('|')})-\d{4}(?![\w-])`, 'g');
  const names = unitNames().sort((a, b) => b.length - a.length);
  const UNIT = new RegExp(String.raw`(?<![\w.-])(?:${names.map(esc).concat([String.raw`T\d+-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*`]).join('|')})(?![\w-])`, 'g');
  const tops = topEntries().map(esc);
  // H/research-tree/... : a short alias for the repository before the folder, as the pages of 2026-11-23 wrote it
  const REL = tops.length ? new RegExp(String.raw`(?<![\w.\\/-])(?:[A-Z]{1,4}[\\/])?(?:${tops.join('|')})[\\/][^\s"'\x60*<>()\[\]{},;]*`, 'g') : null;
  const ABS = /(?:\b[A-Za-z]:[\\/]|(?<![\w.])\/[a-zA-Z]\/(?=[A-Za-z]))[^\s"'\x60<>|*?()\[\]{},;]*/g;
  const BARE = new RegExp(String.raw`(?<![\w./\\-])[\w-]+(?:\.[\w-]+)*\.(?:${RECORD_EXT})(?!\w|\.\w)`, 'g');
  const MONEY = /[$€£¥₹₨]\s?\d|\d\s?[€£¥₹₨]|\b(?:USD|EUR|GBP|PKR|INR)\s?\d|\d\s?(?:USD|EUR|GBP|PKR|INR)\b|\d\s?(?:dollars?|euros?|rupees?|cents?)\b/gi;
  const NOPAPER = /\b(?:in|by|from)\s+no\s+(?:paper|study|source|publication)s?\b|\bno\s+(?:paper|study|publication)s?\s+(?:has|have|shows?|covers?|reports?|exists?|describes?|measures?|found)\b/gi;
  return { ID, UNIT, REL, ABS, BARE, MONEY, NOPAPER };
}

const URL_RE = /\b(?:https?|file|ftp):\/\/[^\s"'<>]*/gi;
const repoKey = repo.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
const repoName = basename(repo).toLowerCase();

function inRepo(p) {
  let q = p.replace(/\\/g, '/').toLowerCase();
  const gb = /^\/([a-z])\//.exec(q);
  if (gb) q = gb[1] + ':/' + q.slice(3);
  q = q.replace(/\/+/g, '/');
  return q === repoKey || q.startsWith(repoKey + '/') || q.includes('/' + repoName + '/') || q.endsWith('/' + repoName);
}
const opens = (p) => OPEN_EXT.has(extname(p.replace(/[.:]+$/, '')).toLowerCase());
const uniq = (a) => [...new Set(a)];
const all = (re, s) => { re.lastIndex = 0; return [...s.matchAll(re)].map((m) => m[0]); };

// mode: 'text' (chat, box, markdown, a page's visible text) or 'data' (a page's scripts and data files: ids anywhere,
// unit names and paths inside string literals only; money and bare names not checked, code has $ and file names).
function findLabels(R, s, mode) {
  const found = { ids: [], units: [], paths: [], money: [], nopaper: [] };
  if (!s) return found;
  s = s.replace(URL_RE, ' ');
  found.ids = all(R.ID, s);
  const strings = mode === 'data' ? (s.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || []).join('\n') : s;
  found.units = all(R.UNIT, strings);
  const paths = [];
  for (const p of all(R.ABS, strings)) if (inRepo(p) && !opens(p)) paths.push(p);
  if (R.REL) for (const p of all(R.REL, strings)) if (!opens(p)) paths.push(p);
  if (mode === 'text') {
    for (const p of all(R.BARE, s)) if (!paths.some((q) => q.includes(p))) paths.push(p);
    found.money = all(R.MONEY, s);
    found.nopaper = all(R.NOPAPER, s);
  }
  found.paths = paths.map((p) => p.replace(/[.:]+$/, ''));
  for (const k of Object.keys(found)) found[k] = uniq(found[k]);
  return found;
}
const merge = (a, b) => { for (const k of Object.keys(a)) a[k] = uniq(a[k].concat(b[k])); return a; };
const empty = () => ({ ids: [], units: [], paths: [], money: [], nopaper: [] });
const any = (f) => Object.values(f).some((v) => v.length);

function describe(f) {
  const parts = [];
  const show = (a) => a.slice(0, 6).join(', ') + (a.length > 6 ? ` and ${a.length - 6} more` : '');
  if (f.ids.length) parts.push(`record ids (${show(f.ids)})`);
  if (f.units.length) parts.push(`unit names (${show(f.units)})`);
  if (f.paths.length) parts.push(`file paths (${show(f.paths)})`);
  if (f.money.length) parts.push(`money (${show(f.money)}); report tokens, never money`);
  if (f.nopaper.length) parts.push(`"${f.nopaper[0]}": say "not in the papers read" instead`);
  return parts.join('; ');
}

// ---- figures (a note only) ----
function countFigures(s) {
  if (!s) return 0;
  s = s.replace(URL_RE, ' ')
    .replace(/\b\d{4}-\d{2}-\d{2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?Z?)?\b/g, ' D ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' D ');
  const nums = s.match(/(?<![\w.])\d+(?:[.,]\d+)*(?![\w])/g) || [];
  return nums.length + (s.match(/ D /g) || []).length;
}

// ---- HTML ----
function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch { return ' '; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return ' '; } })
    .replace(/&amp;/g, '&');
}
function splitHtml(h) {
  const scripts = [];
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');
  h = h.replace(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi, (_, c) => { scripts.push(c); return ' '; });
  h = h.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ');
  const attrs = [];
  h = h.replace(/<[^>]*>/g, (tag) => {
    for (const m of tag.matchAll(/\b(?:title|alt|aria-label|placeholder)\s*=\s*("([^"]*)"|'([^']*)')/gi)) attrs.push(m[2] ?? m[3] ?? '');
    return ' ';
  });
  return { text: decode(h + '\n' + attrs.join('\n')), data: scripts.join('\n') };
}

const TEXT_EXT = new Set(['.html', '.htm', '.svg', '.md', '.markdown', '.txt', '.csv', '.tsv', '.js', '.mjs', '.cjs', '.json', '.jsonl']);
function scanFile(R, p) {
  const ext = extname(p).toLowerCase();
  if (!TEXT_EXT.has(ext)) return { f: empty(), read: false };
  let s;
  try { s = readFileSync(p, 'utf8'); }
  catch { return { f: empty(), read: false, missing: true }; }
  if (ext === '.html' || ext === '.htm' || ext === '.svg') {
    const { text, data } = splitHtml(s);
    return { f: merge(findLabels(R, text, 'text'), findLabels(R, data, 'data')), read: true };
  }
  if (ext === '.md' || ext === '.markdown' || ext === '.txt' || ext === '.csv' || ext === '.tsv') return { f: findLabels(R, s, 'text'), read: true };
  return { f: findLabels(R, s, 'data'), read: true };
}

function artifactFiles(ti, cwd) {
  const out = [];
  const base = typeof ti.root === 'string' && ti.root ? (isAbsolute(ti.root) ? ti.root : resolve(cwd, ti.root)) : cwd;
  const abs = (p, b) => (isAbsolute(p) ? p : resolve(b, p));
  if (typeof ti.file_path === 'string' && ti.file_path) out.push(abs(ti.file_path, cwd));
  if (Array.isArray(ti.file_paths)) for (const p of ti.file_paths) if (typeof p === 'string') out.push(abs(p, cwd));
  const files = ti.files;
  if (Array.isArray(files)) for (const e of files) { if (e && typeof e.path === 'string') out.push(abs(e.path, base)); }
  else if (files && typeof files === 'object') {
    for (const src of Object.values(files)) {
      if (typeof src === 'string') out.push(abs(src, base));
      else if (src && typeof src.from === 'string') out.push(abs(src.from, base));
      // {artifact, path}: copied from another published artifact, read when that one was published; null: a removal
    }
  }
  return uniq(out);
}

// ---- main ----
let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { log({ decision: 'allow', note: 'hook input unreadable' }); process.exit(0); }
try {
  const ev = j.hook_event_name;
  const tool = String(j.tool_name || '');
  const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
  const rec = { session: typeof j.session_id === 'string' ? j.session_id.slice(0, 8) : null, event: ev, tool: tool || null, agent: j.agent_id || null };
  const cwd = typeof j.cwd === 'string' && j.cwd ? j.cwd : repo;

  if (ev === 'PreToolUse' && tool === 'mcp__ccd_turn__wrap_up') {
    const R = build();
    const labels = Array.isArray(ti.actions) ? ti.actions.map((a) => (a && typeof a.label === 'string' ? a.label : '')).join('\n') : '';
    const f = findLabels(R, [ti.recap, ti.ask, labels].filter((x) => typeof x === 'string').join('\n'), 'text');
    if (any(f)) {
      const why = `Closing box refused: the owner reads it and it shows ${describe(f)}. Say what each means in plain words or leave it out; ids and paths belong in the markdown record (CLAUDE.md rule 6).`;
      log({ ...rec, decision: 'deny', found: f });
      process.stderr.write(why + '\n');
      process.exit(2);
    }
    log({ ...rec, decision: 'allow' });
    process.exit(0);
  }

  if (ev === 'PostToolUse' && tool === 'mcp__ccd_turn__wrap_up') {
    const n = countFigures([ti.recap, ti.ask].filter((x) => typeof x === 'string').join('\n'));
    log({ ...rec, decision: 'note', figures: n });
    if (n > 0) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext:
        `Owner report check: the closing box holds ${n} figure${n === 1 ? '' : 's'}. The owner asked for the picture first (what was done, what it is good for, the conclusion, how far along) and a handful of numbers at most, each said in words (CLAUDE.md rule 6, his note of 2026-11-23). No number for "a handful" is recorded, so this is a note, not a refusal; keep the closing message to the picture.` } }));
    }
    process.exit(0);
  }

  if (ev === 'PreToolUse' && tool === 'Artifact') {
    const action = typeof ti.action === 'string' ? ti.action : 'publish';
    if (action !== 'publish') { process.exit(0); }
    const R = build();
    const f = empty();
    const seen = [];
    for (const p of artifactFiles(ti, cwd)) {
      const r = scanFile(R, p);
      if (r.read) seen.push(p);
      else if (r.missing) log({ ...rec, decision: 'allow', note: 'file not readable', file: p });
      merge(f, r.f);
    }
    merge(f, findLabels(R, [ti.description, ti.title, ti.label].filter((x) => typeof x === 'string').join('\n'), 'text'));
    if (any(f)) {
      const why = `Page refused: it is published for the owner and shows ${describe(f)}. Say what each means in plain words or leave it out; ids and paths belong in the markdown record behind the page (CLAUDE.md rule 6), not in a section of the page.`;
      log({ ...rec, decision: 'deny', files: seen, found: f });
      process.stderr.write(why + '\n');
      process.exit(2);
    }
    log({ ...rec, decision: 'allow', files: seen });
    process.exit(0);
  }

  if (ev === 'Stop') {
    if (j.agent_id) process.exit(0); // a helper's stop: its words go to its caller, not to the owner
    const msg = typeof j.last_assistant_message === 'string' ? j.last_assistant_message : '';
    const R = build();
    const f = findLabels(R, msg, 'text');
    if (!any(f)) { log({ ...rec, decision: 'allow' }); process.exit(0); }
    if (j.stop_hook_active === true) { log({ ...rec, decision: 'allow', note: 'second stop let through', found: f }); process.exit(0); }
    const n = countFigures(msg);
    const why = `Your last message goes to the owner and shows ${describe(f)}. Rewrite it once in plain words: what was done, what it is good for, the conclusion, how far along; a handful of numbers (it holds ${n}). If he asked for one of these by name, keep it and say so. This is asked once; the next stop is let through.`;
    log({ ...rec, decision: 'deny', found: f, figures: n });
    process.stderr.write(why + '\n');
    process.exit(2);
  }
  process.exit(0);
} catch (e) {
  log({ decision: 'allow', note: 'hook error', error: String(e && e.stack || e).slice(0, 500) });
  process.exit(0);
}
