// Library start (version 0, 2026-11-19). SessionStart hook: at every start, resume, clear and compaction of a
// session started in this repository, puts the library's look-up table and the next open task into the
// session's context and tells it to read the board first (r57-0009: open the record from the files, a
// compaction is no excuse). The text is cut from library/INDEX.md at each start, so it follows the board.
// Kept under 9,000 characters. On its own error it prints a one-line pointer instead.
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
let source = 'startup';
try { const j = JSON.parse(readFileSync(0, 'utf8')); if (j && j.source) source = String(j.source); } catch {}

let text;
try {
  const board = readFileSync(resolve(repo, 'library', 'INDEX.md'), 'utf8').split(/\r?\n/);
  const at = (re) => board.findIndex((l) => re.test(l));
  const t0 = at(/^## Before you do this/), t1 = board.findIndex((l, i) => i > t0 && /^## /.test(l));
  const table = t0 >= 0 ? board.slice(t0 + 1, t1 > t0 ? t1 : undefined).join('\n') : '(the look-up table was not found on the board)';
  const next = board.find((l) => /^\d+\.\s+NEXT\b/.test(l)) || '(no line marked NEXT on the board)';
  const head = source === 'compact'
    ? 'This session was just compacted. The summary is not the record: re-read library/INDEX.md now, and reopen from the files any record or document the work in hand rests on (r57-0009).'
    : 'Harness-engineering library: read library/INDEX.md (the board) before anything else, and again after any compaction (r57-0009).';
  text = [
    head,
    'Look a record up with Bash: `bash library/lookup.sh <id or word>` or `bash library/lookup.sh -f <id>` (the Grep tool drops the long lines). If the library has nothing, say "not recorded"; never answer from memory.',
    'Enforced by hooks here: helpers and child sessions name their kind and model (tier hook, r57-0150); no design questions to the owner (AskUserQuestion must start "approve:", "cap:" or "fact:", r57-0001); archived evidence is never edited and the journal is only appended to (record guard); a commit check refuses the same through shell writes.',
    '',
    'Before you do this, look this up (from the board):',
    table,
    '',
    'Next open task on the board: ' + next.replace(/^\d+\.\s+/, ''),
  ].join('\n');
  if (text.length > 9000) text = text.slice(0, 8900) + '\n... (cut; read the rest in library/INDEX.md)';
} catch (e) {
  text = 'Harness-engineering library: read library/INDEX.md before anything else (the start hook could not read it: ' + String(e && e.message || e).slice(0, 120) + ').';
}
try {
  mkdirSync(resolve(here, '..', 'logs'), { recursive: true });
  appendFileSync(resolve(here, '..', 'logs', 'library-start.jsonl'), JSON.stringify({ t: Date.now(), source, chars: text.length }) + '\n');
} catch {}
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }));
process.exit(0);
