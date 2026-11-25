// Self-tests of the creep gate, version 2 with rule 5. Run: node .claude/hooks/creep-gate.test.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), 'creep-gate.mjs');
const base = mkdtempSync(join(tmpdir(), 'creep-gate-'));
const SESS = 'abcd1234-0000-0000-0000-000000000000';
const T0 = Date.now() - 3 * 3600000; // three hours ago: every fixture line lies before the hook's "now"
const at = (min) => new Date(T0 + min * 60000).toISOString();
let n = 0, failed = 0;

// transcript lines
const start = (id, d, p, min) => ({ type: 'assistant', timestamp: at(min), message: { id: 'm' + id, usage: { input_tokens: 1000, output_tokens: 0 }, content: [{ type: 'tool_use', id, name: 'Agent', input: { description: d, prompt: p } }] } });
const result = (id, min, err) => ({ type: 'user', timestamp: at(min), message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: !!err, content: [{ type: 'text', text: err ? 'refused' : 'Async agent launched successfully.' }] }] } });
const write = (id, path, min) => [{ type: 'assistant', timestamp: at(min), message: { id: 'm' + id, usage: { input_tokens: 500000, output_tokens: 0 }, content: [{ type: 'tool_use', id, name: 'Write', input: { file_path: path } }] } }, { type: 'user', timestamp: at(min), message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'ok' }] } }];
const tick = (min) => ({ type: 'user', timestamp: at(min), message: { content: 'x' } });
// a helper: its start in the main transcript, its meta and its own transcript (its last line is when it finished)
const helper = (agent, tu, d, p, from, to, finished = true, lines = []) => ({ agent, tu, d, finished, main: [start(tu, d, p, from), result(tu, from)], lines: [tick(from), ...lines, tick(to)] });

function setup(main = [], helpers = [], journal = null) {
  const root = join(base, 'r' + (++n)), proj = join(root, 'projects'), sub = join(proj, SESS, 'subagents');
  mkdirSync(sub, { recursive: true });
  const w = (f, os) => writeFileSync(f, os.map((o) => JSON.stringify(o)).join('\n') + '\n');
  w(join(proj, SESS + '.jsonl'), [tick(0), ...helpers.flatMap((h) => h.main), ...main].sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
  for (const h of helpers) {
    writeFileSync(join(sub, `agent-${h.agent}.meta.json`), JSON.stringify({ description: h.d, toolUseId: h.tu, spawnDepth: 1, ...(h.finished ? { finished: true } : {}) }));
    w(join(sub, `agent-${h.agent}.jsonl`), h.lines);
  }
  if (journal) { mkdirSync(join(root, 'library', 'journal', 'd'), { recursive: true }); w(join(root, 'library', 'journal', 'd', 'r57.jsonl'), journal); }
  return { root, main: join(proj, SESS + '.jsonl'), sub };
}
function run(name, want, s, desc, prompt, opt = {}) {
  const input = opt.raw ?? JSON.stringify({ session_id: SESS, transcript_path: opt.tp || s.main, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: opt.tu || 'cur', tool_input: { description: desc, prompt } });
  const r = spawnSync(process.execPath, [HOOK], { input, env: { ...process.env, CREEP_GATE_ROOT: s.root }, encoding: 'utf8' });
  const got = r.status === 2 ? 'deny' : r.status === 0 ? 'allow' : 'exit ' + r.status;
  let ok = got === want && (want !== 'deny' || r.stderr.includes('r57-0063'));
  if (ok && opt.says) ok = (r.stderr + r.stdout).includes(opt.says);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got} | ${(r.stderr || r.stdout).trim().slice(0, 140)}`);
  return r;
}

const REV = (agent, tu, target, from, to, fin = true, lines = []) => helper(agent, tu, 'refute: ' + target, `Review ${target} for faults.`, from, to, fin, lines);

// rule 1: nothing written since the last review finished
run('1 review again with nothing written: refused', 'deny', setup([], [REV('a1', 't1', 'docs/x/page.html', 1, 10)]), 'refute: the page again', 'Look again at the work.', { says: 'nothing was written' });
run('1 review after a write: passes', 'allow', setup(write('w1', 'docs/x/page.html', 15), [REV('a1', 't1', 'docs/x/page.html', 1, 10)]), 'refute: page after fix', 'Review docs/x/page.html.');
run('1 first review of another piece: passes', 'allow', setup([], [REV('a1', 't1', 'docs/x/a.md', 1, 10)]), 'refute: b', 'Review docs/x/b.md.');
run('1 a review\'s own report is not a change', 'deny', setup([], [REV('a1', 't1', 'docs/x/a.md', 1, 10), helper('a2', 't2', 'read: verify the sources', 'Verify docs/x/b.md sources.', 11, 20, true, write('w2', 'notes/verify.md', 15))]), 'analyse: check a again', 'Check docs/x/a.md.', { says: 'nothing was written' });
// rule 2: no panels
run('2 a review while another runs: refused', 'deny', setup([], [REV('a1', 't1', 'docs/x/a.md', 1, 5, false)]), 'refute: lens two', 'Review docs/x/b.md.', { says: 'still running' });
run('2 a build while a review runs: passes', 'allow', setup([], [REV('a1', 't1', 'docs/x/a.md', 1, 5, false)]), 'build: page', 'Build docs/x/b.md.');
const par = [start('p1', 'refute: lens one', 'Review docs/x/a.md.', 30), start('p2', 'refute: lens two', 'Review docs/x/a.md.', 30)];
run('2 first of a same-message panel: passes', 'allow', setup(par), 'refute: lens one', 'Review docs/x/a.md.', { tu: 'p1' });
run('2 second of a same-message panel: refused', 'deny', setup(par), 'refute: lens two', 'Review docs/x/a.md.', { tu: 'p2', says: 'still running' });
const sh = setup([], [REV('a1', 't1', 'docs/x/a.md', 1, 5, false)]);
run('2 a helper\'s call sees the session\'s reviews', 'deny', sh, 'refute: nested', 'Review docs/x/b.md.', { tp: join(sh.sub, 'agent-a1.jsonl') });
run('2 an earlier review the app refused does not count', 'allow', setup([start('e1', 'refute: a', 'Review docs/x/a.md.', 2), result('e1', 2, true)]), 'refute: a', 'Review docs/x/a.md.');
// rule 3: review of a review, third review of one piece
run('3 review of a refute file: refused', 'deny', setup(), 'audit: the refute', 'Audit research-tree/build/refute/LOCKS.md.', { says: 'review of a review' });
run('3 review of a file a review wrote: refused', 'deny', setup(write('w3', 'docs/x/b.md', 12), [REV('a1', 't1', 'docs/x/a.md', 1, 10, true, write('w1', 'notes/summary.md', 5))]), 'refute: summary', 'Review notes/summary.md.', { says: 'review of a review' });
const two = setup([...write('w1', 'docs/x/a.md', 15), ...write('w2', 'docs/x/a.md', 35)], [REV('a1', 't1', 'docs/x/a.md', 1, 10), REV('a2', 't2', 'docs/x/a.md', 20, 30)]);
run('3 third review of one piece: refused', 'deny', two, 'refute: a, round 3', 'Review docs/x/a.md.', { says: 'third review' });
run('3 third review naming no piece: refused', 'deny', two, 'analyse: adversarial pass', 'Find what is wrong.', { says: 'third review' });
run('3 first review of another piece after two: passes', 'allow', two, 'refute: c', 'Review docs/x/c.md.');
// rule 4: repair rounds
run('4 fold round: refused', 'deny', setup(), 'build: fold', 'Fold the findings into docs/x/a.md.', { says: 'repair round' });
run('4 fold of breaking findings: passes', 'allow', setup(), 'build: fold', 'Fold the breaking findings into docs/x/a.md.');
run('4 non-breaking does not pass', 'deny', setup(), 'build: fold', 'Fold the non-breaking findings into docs/x/a.md.');
run('4 fix round after a review: refused', 'deny', setup([], [REV('a1', 't1', 'docs/x/a.md', 1, 10)]), 'build: page fix round 2', 'Change the colours in docs/x/a.md.', { says: 'repair round' });
run('4 fix round with no review before: passes', 'allow', setup(), 'build: page fix round 1', 'Change docs/x/a.md as the owner said.');
// escape
const jr = [{ id: 'r57-0071', kind: 'ruling', status: 'owner', claim: 'x' }, { id: 'r57-0072', kind: 'hypothesis', status: 'reasoned', claim: 'y' }];
const two2 = () => setup([...write('w1', 'docs/x/a.md', 15), ...write('w2', 'docs/x/a.md', 35)], [REV('a1', 't1', 'docs/x/a.md', 1, 10), REV('a2', 't2', 'docs/x/a.md', 20, 30)], jr);
run('escape with an owner record: passes', 'allow', two2(), 'refute: a, round 3', 'owner: r57-0071\nReview docs/x/a.md.');
run('escape with a record that is not the owner\'s: refused', 'deny', two2(), 'refute: a, round 3', 'owner: r57-0072\nReview docs/x/a.md.');
run('escape with no such record: refused', 'deny', two2(), 'refute: a, round 3', 'owner: r57-0099\nReview docs/x/a.md.');
// rule 5: the deliverable first
const dl = (p) => ({ type: 'user', timestamp: at(0), message: { content: `Build the screen.\nDeliverable: ${p}\n` } });
run('5 check aimed elsewhere before the deliverable changed: refused', 'deny', setup([dl('docs/x/page.html')]), 'refute: data', 'Check docs/x/rules.json against the hooks.', { says: 'CLAUDE.md rule 8' });
run('5 check of the deliverable itself: passes', 'allow', setup([dl('docs/x/page.html')]), 'analyse: check the page', 'Check docs/x/page.html at 1870 px.');
run('5 a check naming no file: refused', 'deny', setup([dl('docs/x/page.html')]), 'analyse: adversarial pass', 'Find what is wrong.', { says: 'has not changed' });
run('5 after a Write to the deliverable: passes, told the share', 'allow', setup([dl('docs/x/page.html'), ...write('w1', 'docs/x/page.html', 5)]), 'refute: data', 'Check docs/x/rules.json.', { says: 'came after that' });
const fd = setup([dl('docs/x/ui/')]);
mkdirSync(join(fd.root, 'docs', 'x', 'ui'), { recursive: true }); writeFileSync(join(fd.root, 'docs', 'x', 'ui', 'page.html'), 'x');
run('5 a folder deliverable a build script changed on disk: passes', 'allow', fd, 'refute: data', 'Check docs/x/rules.json.');
const old = setup([dl('docs/x/page.html')]), oldf = join(old.root, 'docs', 'x', 'page.html');
mkdirSync(dirname(oldf), { recursive: true }); writeFileSync(oldf, 'x'); utimesSync(oldf, new Date(T0 - 3600000), new Date(T0 - 3600000));
run('5 a deliverable file older than the session: refused', 'deny', old, 'refute: data', 'Check docs/x/rules.json.');
run('5 a build start is told the deliverable has not changed', 'allow', setup([dl('docs/x/page.html')]), 'build: page', 'Build docs/x/page.html.', { says: 'has not changed in this session yet' });
// kinds, context, failure
run('a build that fixes what a check found is not a review', 'allow', setup([], [REV('a1', 't1', 'docs/x/a.md', 1, 10)]), 'build: fix what the check found', 'Fix docs/x/a.md.');
run('context names the deliverable, not the review\'s report', 'allow', setup(write('w1', 'docs/x/page.html', 2), [REV('a1', 't1', 'docs/x/page.html', 3, 10, true, write('w2', 'notes/report.md', 9))]), 'build: next', 'Build docs/x/next.md.', { says: 'ago (docs/x/page.html)' });
const lg = setup();
run('missing transcript passes with context', 'allow', lg, 'refute: x', 'Review docs/c.md.', { tp: join(base, 'none.jsonl'), says: 'helpers started' });
run('unreadable input passes', 'allow', lg, '', '', { raw: 'not json' });
const last = JSON.parse(readFileSync(join(lg.root, '.claude', 'logs', 'creep-gate.jsonl'), 'utf8').trim().split('\n')[0]);
const okLog = ['t', 'session', 'agent_id', 'tu', 'desc', 'decision', 'why'].every((k) => k in last);
if (!okLog) failed++;
console.log(`${okLog ? 'ok  ' : 'FAIL'} log line has time, session, helper, call, decision, why`);
// replay
const rp = spawnSync(process.execPath, [HOOK, '--replay', two.main], { env: { ...process.env, CREEP_GATE_ROOT: two.root }, encoding: 'utf8' });
const okRp = rp.status === 0 && /2 starts refused|0 of 2 starts refused/.test(rp.stdout);
if (!okRp) failed++;
console.log(`${okRp ? 'ok  ' : 'FAIL'} replay runs: ${rp.stdout.trim().split('\n').pop()}`);
// kit mode (harness kit, 2026-11-25): --harness-kit "--project=<folder>"; the project is the root, briefs under .harness/
const kitRun = (name, want, s, desc, prompt, says) => {
  const input = JSON.stringify({ session_id: SESS, transcript_path: s.main, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 'cur', tool_input: { description: desc, prompt } });
  const r = spawnSync(process.execPath, [HOOK, '--harness-kit', `--project=${s.root}`], { input, env: { ...process.env, CREEP_GATE_ROOT: join(base, 'not-this') }, encoding: 'utf8' });
  const got = r.status === 2 ? 'deny' : r.status === 0 ? 'allow' : 'exit ' + r.status;
  const ok = got === want && (!says || (r.stderr + r.stdout).includes(says));
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got} | ${(r.stderr || r.stdout).trim().slice(0, 140)}`);
};
const kb = setup();
mkdirSync(join(kb.root, '.harness', 'briefs'), { recursive: true });
writeFileSync(join(kb.root, '.harness', 'briefs', 'AUDIT.md'), '# brief\nAudit notes/refute/LOCKS.md for faults.\n');
kitRun('kit: a brief found under <project>/.harness/briefs/ names a review\'s output: refused', 'deny', kb, 'audit: the locks', 'Follow briefs/AUDIT.md.', 'review of a review');
kitRun('kit: the same brief named by its folder .harness/briefs/: refused', 'deny', kb, 'audit: the locks', 'Follow .harness/briefs/AUDIT.md.', 'review of a review');
kitRun('kit: a build start passes with the context line', 'allow', kb, 'build: page', 'Build docs/x/b.md.', "the kit's rules");
const kbLog = join(kb.root, '.claude', 'logs', 'creep-gate.jsonl');
const okKl = readFileSync(kbLog, 'utf8').trim().split('\n').length === 3;
if (!okKl) failed++;
console.log(`${okKl ? 'ok  ' : 'FAIL'} kit: the log is under <project>/.claude/logs`);
const kd = setup([dl('docs/x/page.html'), ...write('w1', 'docs/x/page.html', 5)]);
kitRun('kit: a Write to the deliverable inside the project counts: a check elsewhere passes', 'allow', kd, 'refute: data', 'Check docs/x/rules.json.', 'came after that');
kitRun('kit: with no record book the escape "owner: r57-NNNN" passes nothing (third review refused)', 'deny', setup([...write('w1', 'docs/x/a.md', 15), ...write('w2', 'docs/x/a.md', 35)], [REV('a1', 't1', 'docs/x/a.md', 1, 10), REV('a2', 't2', 'docs/x/a.md', 20, 30)]), 'refute: a, round 3', 'owner: r57-0071\nReview docs/x/a.md.', 'third review');
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);
