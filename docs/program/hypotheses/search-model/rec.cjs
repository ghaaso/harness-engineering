// Record tool of the model-side graph of thoughts (rule: docs/program/RESEARCH-METHOD-RULES-2026-11-25.md, last section).
// It only appends lines to thoughts.jsonl in this folder; it never changes a line. Check and ledger: tools/check-got.mjs.
//   node rec.cjs thoughts <op> <part> <by> <parents|-> <file> [<file> ...]
//        one thought per file; id = file name without .md; "at" = the file's last-write time.
//        <by> = a run id, "top session", or "auto": the run whose transcript holds a successful Write of that file
//        (looked up in this project's subagent transcripts; no match is an error, nothing is guessed).
//   node rec.cjs scores <file.json>   an array of {thought, levels, vetoes, entries, note}; by = "top session"; "at" = now
//   node rec.cjs keep <file.json>     an array of {part, kept, dropped:[{thought, reason}], why}; "at" = now
//   node rec.cjs final <id>
const fs = require('fs');
const os = require('os');
const path = require('path');
const dir = __dirname;
const out = path.join(dir, 'thoughts.jsonl');
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const now = () => new Date().toISOString();
const lines = () => (fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split(NL).filter((l) => l.trim()).map((l) => JSON.parse(l)) : []);
const add = (o) => fs.appendFileSync(out, JSON.stringify(o) + NL);
const die = (m) => { console.error(m); process.exit(1); };
const norm = (p) => { let s = String(p || '').split(BS).join('/').toLowerCase(); if (s.length > 2 && s[0] === '/' && s[2] === '/') s = s[1] + ':' + s.slice(2); return s; };
const root = path.resolve(dir, '..', '..', '..', '..');
const pdir = path.join(os.homedir(), '.claude', 'projects', root.replace(/[^A-Za-z0-9]/g, '-'));
let transcripts = null;
function writerOf(abs) {
  if (!transcripts) {
    transcripts = [];
    for (const s of fs.readdirSync(pdir, { withFileTypes: true })) {
      if (!s.isDirectory()) continue;
      const sub = path.join(pdir, s.name, 'subagents');
      if (!fs.existsSync(sub)) continue;
      for (const f of fs.readdirSync(sub)) {
        if (!f.startsWith('agent-') || !f.endsWith('.jsonl')) continue;
        const p = path.join(sub, f);
        if (Date.now() - fs.statSync(p).mtimeMs < 24 * 3600 * 1000) transcripts.push({ id: f.slice(6, -6), p, text: null });
      }
    }
  }
  const target = norm(abs);
  const found = [];
  for (const t of transcripts) {
    if (t.text == null) t.text = fs.readFileSync(t.p, 'utf8');
    const want = new Set();
    const ls = t.text.split(NL);
    for (const l of ls) {
      if (!l.includes('"tool_use"')) continue;
      let o; try { o = JSON.parse(l); } catch (e) { continue; }
      const bs = o && o.message && Array.isArray(o.message.content) ? o.message.content : [];
      for (const b of bs) if (b.type === 'tool_use' && b.input && ['Write', 'Edit', 'MultiEdit'].includes(b.name) && norm(b.input.file_path) === target) want.add(b.id);
    }
    if (!want.size) continue;
    let ok = false;
    for (const l of ls) {
      if (ok || !l.includes('"tool_result"')) continue;
      let o; try { o = JSON.parse(l); } catch (e) { continue; }
      const bs = o && o.message && Array.isArray(o.message.content) ? o.message.content : [];
      for (const b of bs) if (b.type === 'tool_result' && want.has(b.tool_use_id) && b.is_error !== true) ok = true;
    }
    if (ok) found.push(t.id);
  }
  return found;
}
const [cmd, ...a] = process.argv.slice(2);
const have = new Set(lines().filter((o) => o.t === 'thought').map((o) => o.id));
if (cmd === 'thoughts') {
  const [op, part, by, parents, ...files] = a;
  if (!['generate', 'aggregate', 'refine'].includes(op) || !part || !by || !parents || !files.length) die('usage: thoughts <op> <part> <by> <parents|-> <file>...');
  const ps = parents === '-' ? [] : parents.split(',');
  for (const p of ps) if (!have.has(p)) die('parent not recorded: ' + p);
  for (const f of files) {
    const abs = path.resolve(dir, f);
    const st = fs.statSync(abs);
    if (!st.size) die('empty file: ' + f);
    const id = path.basename(abs, '.md');
    if (have.has(id)) die('already recorded: ' + id);
    let who = by;
    if (by === 'auto') {
      const w = writerOf(abs);
      if (w.length !== 1) die('writer of ' + f + ' not found exactly once in the transcripts: ' + JSON.stringify(w));
      who = w[0];
    }
    have.add(id);
    add({ t: 'thought', id, op, part, parents: ps, by: who, file: path.relative(dir, abs).split(path.sep).join('/'), at: new Date(Math.ceil(st.mtimeMs)).toISOString() });
    console.log('thought', id, op, part, who);
  }
} else if (cmd === 'scores') {
  const arr = JSON.parse(fs.readFileSync(path.resolve(a[0]), 'utf8'));
  for (const s of arr) {
    if (!have.has(s.thought)) die('score of a thought not recorded: ' + s.thought);
    if (!s.levels || !Object.keys(s.levels).length) die('no levels: ' + s.thought);
  }
  for (const s of arr) add({ t: 'score', thought: s.thought, by: 'top session', levels: s.levels, vetoes: s.vetoes || [], entries: s.entries || [], note: s.note || '', at: now() });
  console.log('scores', arr.length);
} else if (cmd === 'keep') {
  const arr = JSON.parse(fs.readFileSync(path.resolve(a[0]), 'utf8'));
  for (const k of arr) for (const id of [...k.kept, ...k.dropped.map((d) => d.thought)]) if (!have.has(id)) die('selection names a thought not recorded: ' + id);
  for (const k of arr) { const o = { t: 'keep', part: k.part, kept: k.kept, dropped: k.dropped, at: now() }; if (k.why) o.why = k.why; add(o); }
  console.log('keeps', arr.length);
} else if (cmd === 'final') {
  if (!have.has(a[0])) die('not recorded: ' + a[0]);
  add({ t: 'final', thought: a[0] });
  console.log('final', a[0]);
} else die('usage: thoughts | scores | keep | final');
