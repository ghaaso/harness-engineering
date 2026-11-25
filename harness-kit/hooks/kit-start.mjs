// Kit start (2026-11-25, harness kit; brief docs/program/harness-kit-2026-11-25/briefs/HOOKS.md item 9). SessionStart
// hook, on the model of .claude/hooks/library-start.mjs: at every start, resume, clear and compaction it puts into the
// session, in this order: where the kit is (the clone's path, so a session in another project finds the commands), the
// text of harness-kit/RULES.md (cut at 9,000 characters; if it is missing, one line pointing at ORCHESTRATION.md), the
// names of the state files in <project>/.harness/, and after a compaction the line that the summary is not the record.
// Wired as: node "<clone>/harness-kit/hooks/kit-start.mjs" --harness-kit "--project=<project>"
// The project is --project=<folder> (else the clone). Log: <project>/.claude/logs/kit-start.jsonl. Never fails a start:
// on its own error it prints a one-line pointer.
import { readFileSync, readdirSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const clone = resolve(here, '..', '..');
const args = process.argv.slice(2);
let project = clone;
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--project=') && args[i].length > 10) project = resolve(args[i].slice(10));
  else if (args[i] === '--project' && args[i + 1]) project = resolve(args[i + 1]);
}
const MAX = 9000;
const C = clone.replace(/\\/g, '/');
let source = 'startup';
try { const j = JSON.parse(readFileSync(0, 'utf8')); if (j && j.source) source = String(j.source); } catch {}

let text;
try {
  const where = `Harness kit: the kit is at ${C} (its README: ${C}/harness-kit/README.md). Commands: node "${C}/harness-kit/tokens.mjs" --project "${project.replace(/\\/g, '/')}" (what each helper cost; --basis adds one as a basis of your own); node "${C}/harness-kit/setup.mjs" --apply --project <folder> (wire the hooks in another project). State files, briefs, widths and your own basis live in ${project.replace(/\\/g, '/')}/.harness/.`;
  let rules;
  try {
    rules = readFileSync(join(clone, 'harness-kit', 'RULES.md'), 'utf8').replace(/\r\n/g, '\n').trim();
    if (rules.length > MAX) rules = rules.slice(0, MAX) + `\n... (cut at ${MAX} characters; read the rest in ${C}/harness-kit/RULES.md)`;
  } catch {
    rules = `The kit's short rules (harness-kit/RULES.md) are missing; read ${C}/harness-kit/ORCHESTRATION.md before starting any helper.`;
  }
  let states = [];
  try { states = readdirSync(join(project, '.harness')).filter((n) => /state\.md$/i.test(n)).sort(); } catch {}
  const st = states.length ? `State files in .harness/: ${states.join(', ')}. Read the one your work continues before anything else.` : 'State files in .harness/: none yet.';
  text = [where, '', rules, '', st];
  if (source === 'compact') text.push('', 'This session was just compacted. The summary is not the record: reopen the state file and the files the work in hand rests on before going on.');
  text = text.join('\n');
} catch (e) {
  text = `Harness kit: read harness-kit/RULES.md and ORCHESTRATION.md in the kit before anything else (the start hook could not build its text: ${String((e && e.message) || e).slice(0, 120)}).`;
}
try {
  const logs = join(project, '.claude', 'logs');
  mkdirSync(logs, { recursive: true });
  appendFileSync(join(logs, 'kit-start.jsonl'), JSON.stringify({ t: Date.now(), source, chars: text.length }) + '\n');
} catch {}
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }));
process.exit(0);
