// Self-tests of the creep gate. Run: node .claude/hooks/creep-gate.test.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), 'creep-gate.mjs');
const base = mkdtempSync(join(tmpdir(), 'creep-gate-'));
const SESS = 'abcd1234-0000-0000-0000-000000000000';
let n = 0, failed = 0;
const startLine = (id, d, p) => ({ parentUuid: 'p', type: 'assistant', message: { id: 'm' + id, content: [{ type: 'tool_use', id, name: 'Agent', input: { description: d, prompt: p } }] } });
function setup(prior = [], helper = []) {
  const root = join(base, 'r' + (++n)); const proj = join(root, 'projects');
  mkdirSync(join(proj, SESS, 'subagents'), { recursive: true });
  const w = (f, os) => writeFileSync(f, os.map((o) => JSON.stringify(o)).join('\n') + '\n');
  w(join(proj, SESS + '.jsonl'), prior);
  w(join(proj, SESS, 'subagents', 'agent-h1.jsonl'), helper);
  return { root, main: join(proj, SESS + '.jsonl'), helper: join(proj, SESS, 'subagents', 'agent-h1.jsonl') };
}
function run(name, want, s, desc, prompt, tp, raw) {
  const input = raw ?? JSON.stringify({ session_id: SESS, transcript_path: tp || s.main, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 'cur', tool_input: { description: desc, prompt } });
  const r = spawnSync(process.execPath, [HOOK], { input, env: { ...process.env, CREEP_GATE_ROOT: s.root }, encoding: 'utf8' });
  const got = r.status === 2 ? 'deny' : r.status === 0 ? 'allow' : 'exit ' + r.status;
  const ok = got === want && (want !== 'deny' || r.stderr.includes('r57-0063'));
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got}${r.stderr ? ' | ' + r.stderr.trim().slice(0, 110) : ''}`);
}
const E = { root: base };
// rule 1
const r1 = [startLine('a1', 'refute: locks', 'Review docs/x/LOCKS.md for faults.')];
run('1 second review of same file refused', 'deny', setup(r1), 'blind check of locks', 'Audit docs/x/LOCKS.md again.');
run('1 second review of same file, earlier in a helper, refused', 'deny', setup([], r1), 'critique: locks', 'Critique docs/x/LOCKS.md.');
run('1 other file passes', 'allow', setup(r1), 'refute: faults', 'Review docs/x/FAULTS.md.');
run('1 earlier review was refused: passes', 'allow', setup([...r1, { parentUuid: 'p', type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'a1', is_error: true, content: 'no' }] } }]), 'refute: locks', 'Review docs/x/LOCKS.md.');
const sb = setup(r1);
mkdirSync(join(sb.root, 'research-tree', 'build', 'briefs'), { recursive: true });
writeFileSync(join(sb.root, 'research-tree', 'build', 'briefs', 'R.md'), 'Target: docs/x/LOCKS.md\n');
run('1 target in a named brief', 'deny', sb, 'refute: locks', 'Follow research-tree/build/briefs/R.md');
// rule 2
run('2 review of a review refused', 'deny', setup(), 'refute: the refute', 'Review research-tree/build/refute/LOCKS.md.');
run('2 review of a refute-named file refused', 'deny', setup(), 'audit', 'Audit docs/LOCKS-refute.md.');
run('2 review of a plain deliverable passes', 'allow', setup(), 'refute: locks', 'Review research-tree/build/LOCKS.md.');
// rule 3
run('3 fold round refused', 'deny', setup(), 'fold: locks', 'Fold the findings of docs/x/R.md into docs/x/LOCKS.md.');
run('3 fix findings refused', 'deny', setup(), 'repair', 'Please fix findings in docs/x/LOCKS.md.');
run('3 fold with breaking findings passes', 'allow', setup(), 'fold: locks', 'Fold the breaking findings into docs/x/LOCKS.md.');
run('3 non-breaking does not pass', 'deny', setup(), 'fold: locks', 'Fold the non-breaking findings into docs/x/LOCKS.md.');
// rule 4
const two = [startLine('a1', 'refute: one', 'Review docs/a.md.'), startLine('a2', 'refute: two', 'Review docs/b.md.')];
run('4 third refute refused', 'deny', setup(two), 'refute: three', 'Review docs/c.md.');
run('4 third refute with no target refused', 'deny', setup(two), 'refute: three', 'Refute the design.');
run('4 third refute counts helper starts', 'deny', setup([two[0]], [two[1]]), 'refute: three', 'Review docs/c.md.');
run('4 second refute passes', 'allow', setup([two[0]]), 'refute: two', 'Review docs/b.md.');
// escape, others, errors
run('escape passes rule 4', 'allow', setup(two), 'refute: three', 'owner: r57-0071\nReview docs/c.md.');
run('escape passes rule 3', 'allow', setup(), 'fold', 'owner: r57-0071\nFold findings.');
run('ordinary build passes', 'allow', setup(two), 'build: thing', 'Build docs/c.md. No review of your work follows.');
run('unreadable input passes', 'allow', E, '', '', null, 'not json');
run('missing transcript passes', 'allow', E, 'refute: x', 'Review docs/c.md.', join(base, 'none.jsonl'));
const sh = setup(r1);
run('helper caller sees session starts', 'deny', sh, 'refute: locks', 'Review docs/x/LOCKS.md.', sh.helper);
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);
