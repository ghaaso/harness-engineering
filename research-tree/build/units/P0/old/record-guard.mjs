// Record guard (version 0, 2026-11-19). PreToolUse hook for Write, Edit, NotebookEdit and AskUserQuestion.
// Enforces, for tool calls in sessions started in this repository (and the helpers inside them):
//   1. Archived evidence is never changed (CLAUDE.md rule 1, AGENTS.md): a file under recovered/, or one
//      listed in migration/source-manifest.json or migration/clinic-manifest.json, may not be edited or
//      overwritten. New files anywhere are allowed ("new work goes in new files").
//   2. The library journal is only added to (library/README.md rule 1): a Write or Edit of an existing
//      library/journal/**.jsonl file must keep every existing byte and add after the end.
//   3. No design questions to the owner (r57-0001, CLAUDE.md rule 7): every question of AskUserQuestion
//      starts with the kind of word it asks for and a colon: "approve:" (his go for a run, install,
//      download, spend, publish or commit), "cap:" (a token cap, CLAUDE.md rule 5) or "fact:" (a fact
//      only he can read, such as a setting on his screen).
// What it cannot see: writes made through shell commands (tools/check-commit.mjs catches those at commit),
// a question asked in plain text, and a design question given the wrong kind. On its own error it lets
// the call through and logs it. Every refusal is logged to ../logs/record-guard.jsonl.
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, isAbsolute } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
function log(o) {
  try {
    mkdirSync(resolve(here, '..', 'logs'), { recursive: true });
    appendFileSync(resolve(here, '..', 'logs', 'record-guard.jsonl'), JSON.stringify({ t: Date.now(), ...o }) + '\n');
  } catch {}
}
function deny(rec, why) { log({ ...rec, decision: 'deny', why }); process.stderr.write(why + '\n'); process.exit(2); }

let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { log({ decision: 'allow', note: 'hook input unreadable' }); process.exit(0); }
if (j.hook_event_name !== 'PreToolUse') process.exit(0);
const tool = String(j.tool_name || '');
const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
const rec = { session: typeof j.session_id === 'string' ? j.session_id.slice(0, 8) : null, tool };

try {
  if (tool === 'AskUserQuestion') checkQuestions();
  else if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') checkWrite();
} catch (e) {
  log({ ...rec, decision: 'allow', note: 'guard error: ' + String(e && e.message || e).slice(0, 200) });
}
process.exit(0);

function checkQuestions() {
  const qs = Array.isArray(ti.questions) ? ti.questions : [];
  const bad = qs.filter((q) => !/^\s*(approve|cap|fact)\s*:/i.test(String(q && q.question || '')));
  if (bad.length) {
    deny({ ...rec, question: String(bad[0].question || '').slice(0, 80) },
      'record guard (r57-0001, CLAUDE.md rule 7): no design questions to the owner. A mechanism comes from the recorded research, ' +
      'a parameter is computed from measurements, a missing fact is measured. Ask him only for his word on an action ' +
      '("approve: ..."), a token cap ("cap: ...") or a fact only he can read ("fact: ..."): start each question with that kind and a colon. ' +
      'If it is a design choice, decide it from the library (library/INDEX.md) and show him how the conclusion was reached (r57-0027).');
  }
}

function relPath(p) {
  if (!p) return null;
  const abs = isAbsolute(p) ? p : resolve(j.cwd || repo, p);
  const r = relative(repo, abs);
  if (!r || r.startsWith('..') || isAbsolute(r)) return null; // outside this repository
  return r.split('\\').join('/');
}

function archived(rel) {
  const low = rel.toLowerCase();
  if (low === 'recovered' || low.startsWith('recovered/')) return 'recovered/';
  const m1 = JSON.parse(readFileSync(resolve(repo, 'migration', 'source-manifest.json'), 'utf8'));
  if (m1.some((x) => String(x.path).toLowerCase() === low)) return 'migration/source-manifest.json';
  const m2 = JSON.parse(readFileSync(resolve(repo, 'migration', 'clinic-manifest.json'), 'utf8'));
  if ((m2.files || []).some((x) => String(x.path).toLowerCase() === low)) return 'migration/clinic-manifest.json';
  return null;
}

function checkWrite() {
  const p = ti.file_path || ti.notebook_path;
  const rel = relPath(p);
  if (!rel) return;
  const abs = resolve(repo, rel);
  const exists = existsSync(abs);
  if (!exists) return; // a new file is always allowed
  const src = archived(rel);
  if (src) {
    deny({ ...rec, path: rel },
      `record guard (CLAUDE.md rule 1): ${rel} is archived evidence (listed by ${src}); it is never edited, renamed or normalised. ` +
      'Put new work in a new file.');
  }
  if (/^library\/journal\/.+\.jsonl$/i.test(rel)) {
    const old = readFileSync(abs, 'utf8');
    if (tool === 'Write') {
      const neu = String(ti.content ?? '');
      if (!neu.startsWith(old)) {
        deny({ ...rec, path: rel },
          `record guard (library/README.md rule 1): ${rel} is a journal file; it is only added to. This Write would change or drop existing lines. ` +
          'Append new records after the last line; a correction is a new record whose "supersedes" names the old one.');
      }
    } else if (tool === 'Edit') {
      const o = String(ti.old_string ?? ''), n = String(ti.new_string ?? '');
      const atEnd = o.length > 0 && (old.endsWith(o) || old.endsWith(o + '\n') || old.endsWith(o + '\r\n'));
      if (ti.replace_all || !atEnd || !n.startsWith(o) || old.indexOf(o) !== old.lastIndexOf(o)) {
        deny({ ...rec, path: rel },
          `record guard (library/README.md rule 1): ${rel} is a journal file; it is only added to. An Edit is allowed only as an append: ` +
          'old_string is the end of the file, occurring once, and new_string starts with it. A correction is a new record whose "supersedes" names the old one.');
      }
    }
  }
}
