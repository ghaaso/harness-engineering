// Tests of kit-start.mjs (2026-11-25). Run: node harness-kit/hooks/kit-start.test.mjs
// The hook is copied into a temporary clone (<tmp>/clone/harness-kit/hooks/); her project is another temporary folder.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const T = mkdtempSync(join(tmpdir(), 'kit-start-'));
const C = join(T, 'clone'), P = join(T, 'her-project');
mkdirSync(join(C, 'harness-kit', 'hooks'), { recursive: true });
mkdirSync(join(P, '.harness'), { recursive: true });
copyFileSync(join(here, 'kit-start.mjs'), join(C, 'harness-kit', 'hooks', 'kit-start.mjs'));
writeFileSync(join(P, '.harness', 'TEAM-STATE.md'), '# state\n');
writeFileSync(join(P, '.harness', 'WIDTHS.md'), '# widths\n');
let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'} ${name}${c ? '' : '  ' + String(extra).slice(0, 200)}`); };
function run(source, args = ['--harness-kit', `--project=${P}`]) {
  const r = spawnSync(process.execPath, [join(C, 'harness-kit', 'hooks', 'kit-start.mjs'), ...args], { input: JSON.stringify({ hook_event_name: 'SessionStart', session_id: 's', source }), encoding: 'utf8' });
  let t = ''; try { t = JSON.parse(r.stdout).hookSpecificOutput.additionalContext; } catch {}
  return { code: r.status, t };
}
const CF = C.replace(/\\/g, '/');

let r = run('startup');
ok(r.code === 0 && r.t.startsWith(`Harness kit: the kit is at ${CF}`), 'startup: first the kit\'s path', r.t.slice(0, 120));
ok(/RULES\.md\) are missing; read .*ORCHESTRATION\.md/.test(r.t), 'RULES.md missing: one line pointing at ORCHESTRATION.md', r.t);
ok(/State files in \.harness\/: TEAM-STATE\.md\./.test(r.t) && !/WIDTHS/.test(r.t.split('State files')[1]), 'the state files of the project are named (not WIDTHS.md)', r.t);
ok(!/compacted/.test(r.t), 'startup: no compaction line');
ok(existsSync(join(P, '.claude', 'logs', 'kit-start.jsonl')), 'the log is under <project>/.claude/logs');

writeFileSync(join(C, 'harness-kit', 'RULES.md'), '# Rules\nRULE-ONE.\n' + 'x'.repeat(12000) + '\nTAIL-NEVER-SHOWN\n');
r = run('compact');
const iWhere = r.t.indexOf('Harness kit:'), iRules = r.t.indexOf('RULE-ONE'), iState = r.t.indexOf('State files in .harness'), iComp = r.t.indexOf('just compacted');
ok(iWhere === 0 && iWhere < iRules && iRules < iState && iState < iComp, 'compact: kit path, rules, state files, then the compaction line, in that order', [iWhere, iRules, iState, iComp].join(' '));
ok(!r.t.includes('TAIL-NEVER-SHOWN') && /cut at 9000 characters/.test(r.t), 'RULES.md cut at 9,000 characters');
ok(/The summary is not the record/.test(r.t), 'compact: the summary is not the record');

r = run('resume', ['--harness-kit']);
ok(r.code === 0 && /State files in \.harness\/: none yet\./.test(r.t), 'no --project: the project is the clone (no .harness there yet)', r.t.slice(-200));

const bad = spawnSync(process.execPath, [join(C, 'harness-kit', 'hooks', 'kit-start.mjs'), '--harness-kit', `--project=${P}`], { input: 'not json', encoding: 'utf8' });
ok(bad.status === 0 && /Harness kit/.test(bad.stdout), 'unreadable input: still exit 0 with the text');

console.log(`kit-start: ${pass} passed, ${fail} failed (${pass + fail} cases)`);
try { rmSync(T, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
