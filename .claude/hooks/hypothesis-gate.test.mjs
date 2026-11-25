// Tests of the hypothesis gate. Run: node --test .claude/hooks/hypothesis-gate.test.mjs
// Each case feeds PreToolUse JSON on stdin to the hook; the learning files, the journal, the hypotheses and the
// transcripts are small fakes in a temporary folder (HYPOTHESIS_GATE_ROOT).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(here, 'hypothesis-gate.mjs');
const CLI = resolve(here, '..', '..', 'tools', 'check-hypothesis.mjs');
const base = mkdtempSync(join(tmpdir(), 'hypothesis-gate-'));
const SESS = 'abcd1234-0000-0000-0000-000000000000';
const NEURAL = 'docs/program/learning/MECHANISMS-NEURAL.md';
const DATA = 'docs/program/learning/MECHANISMS-DATA.md';
let n = 0;

function setup() {
  const root = join(base, 'r' + (++n));
  for (const d of ['docs/program/learning', 'docs/program/hypotheses', 'library/journal/2026-11-25', 'records', 'projects/' + SESS + '/subagents'])
    mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, NEURAL), '# Neural\n## 9. Message passing\n**9.5 Can.** text\n## 11. Over-squashing\n**11.2 Cannot.** text\n');
  writeFileSync(join(root, DATA), '# Data\n## 4. Structure\n**4.3 Relational.** text\n## 6. Leakage\n**6.1 Time.** text\n');
  writeFileSync(join(root, 'records', 'r.md'), 'a record\n');
  writeFileSync(join(root, 'library/journal/2026-11-25/r58.jsonl'), [
    '{"id":"r58-0100","kind":"ruling","status":"owner","claim":"passed"}',
    '{"id":"r58-0101","kind":"fact","status":"measured","claim":"not a ruling"}',
  ].join('\n') + '\n');
  return { root, tp: join(root, 'projects', SESS + '.jsonl') };
}
const block = (id, over = {}) => {
  const p = { 'Depends on': 'the demands', Alternatives: 'A; B', 'Ruled out': 'B by D 6.1', Choice: 'A', Why: 'because N 9.5', 'Rests on': 'N 9.5; D 4.3; record: records/r.md', 'Refuted if': 'a count shows X', ...over };
  return `### ${id}. A decision\n` + Object.entries(p).filter(([, v]) => v !== null).map(([k, v]) => `**${k}.** ${v}`).join('\n') + '\n';
};
const doc = (blocks = [block('D1'), block('D2')], pre = '## The graph of decisions\nD1 then D2.\n', post = '## Consistency across the decisions\nAll agree.\n', head = 'Not reached by a graph of thoughts: a test fixture.\n', tail = '') =>
  '# Data hypothesis\n' + head + pre + blocks.join('\n') + post + tail;

const asst = (blocks) => ({ parentUuid: 'p', type: 'assistant', message: { id: 'm' + Math.random(), role: 'assistant', content: blocks } });
const user = (results) => ({ parentUuid: 'p', type: 'user', message: { role: 'user', content: results } });
const use = (id, name, input) => ({ type: 'tool_use', id, name, input });
const res = (id, content, is_error = false) => ({ type: 'tool_result', tool_use_id: id, content, ...(is_error ? { is_error } : {}) });
const COMPACT = { parentUuid: null, type: 'system', subtype: 'compact_boundary', content: 'Conversation compacted' };
function readCalls(root, { offset = false, via = 'Read', out = 'text' } = {}) {
  const lines = [];
  for (const [i, f] of [NEURAL, DATA].entries()) {
    const id = 'toolu_r' + i + Math.random().toString(36).slice(2, 8);
    const abs = join(root, f).replace(/\//g, '\\');
    const input = via === 'Read' ? { file_path: abs, ...(offset ? { offset: 1, limit: 50 } : {}) } : { command: `cd ${root} && cat ${f}` };
    lines.push(asst([use(id, via, input)]), user([res(id, out)]));
  }
  return lines;
}
const writeT = (tp, objs) => writeFileSync(tp, objs.map((o) => JSON.stringify(o)).join('\n') + '\n');
function run(root, tool, input, extra = {}) {
  const j = { session_id: SESS, transcript_path: join(root, 'projects', SESS + '.jsonl'), hook_event_name: 'PreToolUse', tool_name: tool, tool_input: input, ...extra };
  const r = spawnSync(process.execPath, [HOOK], { input: typeof extra.raw === 'string' ? extra.raw : JSON.stringify(j), env: { ...process.env, HYPOTHESIS_GATE_ROOT: root, GOT_PROJECTS_DIR: join(root, 'projects') }, encoding: 'utf8' });
  return { code: r.status, err: r.stderr };
}
const hyp = (root, name = 'DATA-HYPOTHESIS-1.md') => join(root, 'docs/program/hypotheses', name);
function pass(root, name, ruling = 'r58-0100', text = doc()) {
  writeFileSync(hyp(root, name), text);
  const sha = createHash('sha256').update(readFileSync(hyp(root, name))).digest('hex');
  writeFileSync(hyp(root, name) + '.pass.json', JSON.stringify({ ruling, sha256: sha, words: 'passed' }));
}

// ---- refusal 1: reading before writing ----
test('write of a hypothesis with no reads is refused, naming both files', () => {
  const { root, tp } = setup(); writeT(tp, [asst([{ type: 'text', text: 'hi' }])]);
  const r = run(root, 'Write', { file_path: hyp(root), content: doc() });
  assert.equal(r.code, 2); assert.match(r.err, /MECHANISMS-NEURAL\.md and .*MECHANISMS-DATA\.md/);
});
test('write after full reads of both files passes', () => {
  const { root, tp } = setup(); writeT(tp, readCalls(root));
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: doc() }).code, 0);
});
test('a read with offset and limit is not a full read', () => {
  const { root, tp } = setup(); writeT(tp, readCalls(root, { offset: true }));
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: doc() }).code, 2);
});
test('a failed read does not count', () => {
  const { root, tp } = setup();
  writeT(tp, readCalls(root).map((o) => o.type === 'user' ? user([{ ...o.message.content[0], is_error: true }]) : o));
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: doc() }).code, 2);
});
test('cat in Bash counts; a cut "<persisted-output>" preview does not', () => {
  const a = setup(); writeT(a.tp, readCalls(a.root, { via: 'Bash' }));
  assert.equal(run(a.root, 'Write', { file_path: hyp(a.root), content: doc() }).code, 0);
  const b = setup(); writeT(b.tp, readCalls(b.root, { via: 'Bash', out: '<persisted-output>\nOutput too large (44KB).' }));
  assert.equal(run(b.root, 'Write', { file_path: hyp(b.root), content: doc() }).code, 2);
});
test('session with a compaction: reads before it do not count, reads after it do', () => {
  const a = setup(); writeT(a.tp, [...readCalls(a.root), COMPACT, asst([{ type: 'text', text: 'resumed' }])]);
  const r = run(a.root, 'Write', { file_path: hyp(a.root), content: doc() });
  assert.equal(r.code, 2); assert.match(r.err, /since this session's last compaction/);
  const b = setup(); writeT(b.tp, [COMPACT, ...readCalls(b.root), COMPACT, ...readCalls(b.root)]);
  assert.equal(run(b.root, 'Write', { file_path: hyp(b.root), content: doc() }).code, 0);
});
test('a helper is judged by its own transcript', () => {
  const { root, tp } = setup(); writeT(tp, readCalls(root));
  const own = join(root, 'projects', SESS, 'subagents', 'agent-a1b2.jsonl'); writeT(own, [asst([{ type: 'text', text: 'x' }])]);
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: doc() }, { agent_id: 'a1b2' }).code, 2);
  writeT(own, readCalls(root));
  writeT(tp, []);
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: doc() }, { agent_id: 'a1b2' }).code, 0);
});
test('shell writes of a hypothesis need the reads; reading it does not', () => {
  const { root, tp } = setup(); writeT(tp, []);
  for (const c of ['cat > docs/program/hypotheses/DATA-HYPOTHESIS-1.md <<EOF\nx\nEOF', 'echo x >> docs/program/hypotheses/MODEL-HYPOTHESIS-a.md',
    "sed -i 's/a/b/' docs/program/hypotheses/DATA-HYPOTHESIS-1.md", "node -e \"fs.writeFileSync('docs/program/hypotheses/DATA-HYPOTHESIS-1.md','x')\""])
    assert.equal(run(root, 'Bash', { command: c }).code, 2, c);
  assert.equal(run(root, 'PowerShell', { command: 'Set-Content docs\\program\\hypotheses\\DATA-HYPOTHESIS-1.md x' }).code, 2);
  for (const c of ['cat docs/program/hypotheses/DATA-HYPOTHESIS-1.md', 'grep -n D1 docs/program/hypotheses/DATA-HYPOTHESIS-1.md 2>/dev/null', 'node tools/check-hypothesis.mjs docs/program/hypotheses/DATA-HYPOTHESIS-1.md'])
    assert.equal(run(root, 'Bash', { command: c }).code, 0, c);
});

// ---- refusal 2: the form ----
test('a Write with faults in the form is refused with the faults named', () => {
  const { root, tp } = setup(); writeT(tp, readCalls(root));
  const cases = [
    [doc([block('D1', { 'Ruled out': null })]), /missing \*\*Ruled out\.\*\*/],
    [doc([block('D1', { Why: '' })]), /\*\*Why\.\*\* has no text/],
    [doc([block('D1', { 'Rests on': 'my own feeling' })]), /names no reference of an allowed kind/],
    [doc([block('D1', { Why: 'see N 9.9' })]), /N 9\.9 is not in MECHANISMS-NEURAL\.md/],
    [doc([block('D1', { Why: 'see D 12' })]), /D 12 is not in MECHANISMS-DATA\.md/],
    [doc([block('D1', { 'Rests on': 'record: records/none.md' })]), /record: records\/none\.md does not exist/],
    [doc([]), /no decision block/],
    [doc([block('M1')], ''), /graph of decisions/],
    [doc([block('M1')], undefined, ''), /Consistency across the decisions/],
    [doc([block('M1').replace('**Choice.** A\n', '').replace('**Alternatives.**', '**Choice.** A\n**Alternatives.**')]), /out of order/],
  ];
  for (const [text, re] of cases) { const r = run(root, 'Write', { file_path: hyp(root), content: text }); assert.equal(r.code, 2); assert.match(r.err, re); }
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: doc([block('M1', { 'Rests on': 'assumption' }), block('M2', { 'Rests on': 'count first: files per commit' })]) }).code, 0);
});
test('an Edit of a hypothesis is not judged on form, only on the reads', () => {
  const { root, tp } = setup(); writeT(tp, readCalls(root));
  assert.equal(run(root, 'Edit', { file_path: hyp(root), old_string: 'a', new_string: '**Why.**' }).code, 0);
  writeT(tp, []);
  assert.equal(run(root, 'Edit', { file_path: hyp(root), old_string: 'a', new_string: 'b' }).code, 2);
});
test('the command line: ok, or one line per fault', () => {
  const { root } = setup();
  writeFileSync(join(root, 'good.md'), doc());
  writeFileSync(join(root, 'bad.md'), doc([block('D1', { Choice: null, Why: 'N 3.3' })], ''));
  const env = { ...process.env, HYPOTHESIS_GATE_ROOT: root };
  const g = spawnSync(process.execPath, [CLI, join(root, 'good.md')], { env, encoding: 'utf8' });
  assert.equal(g.status, 0); assert.equal(g.stdout.trim(), 'ok');
  const b = spawnSync(process.execPath, [CLI, join(root, 'bad.md')], { env, encoding: 'utf8' });
  assert.equal(b.status, 1); assert.equal(b.stdout.trim().split('\n').length, 3);
});

// ---- refusal 3: no step of the new work without the pass ----
test('steps under data2 need the data pass; model2 and rented machines need both', () => {
  const { root, tp } = setup(); writeT(tp, []);
  const w2 = (p) => run(root, 'Write', { file_path: p, content: 'x' });
  assert.equal(w2(join(root, 'research-tree/build/data2/build.py')).code, 2);
  assert.match(run(root, 'Bash', { command: 'python C:\\research-runs\\data2\\make.py' }).err, /no docs\/program\/hypotheses\/DATA-HYPOTHESIS/);
  pass(root, 'DATA-HYPOTHESIS-1.md');
  assert.equal(w2(join(root, 'research-tree/build/data2/build.py')).code, 0);
  assert.equal(run(root, 'Bash', { command: 'docker run -v c:/Research-Runs/data2:/w img' }).code, 0);
  assert.equal(w2('C:/research-runs/model2/train.py').code, 2);
  assert.equal(run(root, 'Bash', { command: 'ssh root@1.2.3.4 nvidia-smi' }).code, 2);
  assert.equal(run(root, 'Bash', { command: 'runpodctl create pod' }).code, 2);
  pass(root, 'MODEL-HYPOTHESIS-1.md', 'r58-0100', doc([block('M1')]));
  assert.equal(w2('C:/research-runs/model2/train.py').code, 0);
  assert.equal(run(root, 'Bash', { command: 'rsync -a x host:/y' }).code, 0);
});
test('a pass goes stale when the hypothesis changes, and needs an owner ruling', () => {
  const { root, tp } = setup(); writeT(tp, []);
  pass(root, 'DATA-HYPOTHESIS-1.md');
  const step = () => run(root, 'Write', { file_path: join(root, 'research-tree/build/data2/a.py'), content: 'x' });
  assert.equal(step().code, 0);
  appendFileSync(hyp(root), '\none more line\n');
  const r = step(); assert.equal(r.code, 2); assert.match(r.err, /changed since its pass/);
  pass(root, 'DATA-HYPOTHESIS-1.md', 'r58-0101');
  assert.match(step().err, /not an owner ruling/);
  pass(root, 'DATA-HYPOTHESIS-1.md', 'r58-0100', doc([block('D1', { Why: 'N 7.7' })]));
  assert.match(step().err, /fails the form check/);
});
test('helpers and sessions whose prompt names a root are steps', () => {
  const { root, tp } = setup(); writeT(tp, []);
  assert.equal(run(root, 'Agent', { description: 'x', prompt: 'build: write research-tree/build/data2/ingest.py' }).code, 2);
  assert.equal(run(root, 'mcp__ccd_session__start_session', { title: 't', message: 'train under C:\\research-runs\\model2' }).code, 2);
  assert.equal(run(root, 'Agent', { description: 'x', prompt: 'read: summarise docs/program/learning' }).code, 0);
});
test('reading the new work is never refused', () => {
  const { root, tp } = setup(); writeT(tp, []);
  for (const c of ['ls research-tree/build/data2', 'cat C:/research-runs/model2/log.txt | tail -5', 'grep -rn "ssh " research-tree/build/model2', 'git log -- research-tree/build/data2', 'Get-ChildItem C:\\research-runs\\data2'])
    assert.equal(run(root, 'Bash', { command: c }).code, 0, c);
});
test('the running improvement round is untouched', () => {
  const { root, tp } = setup(); writeT(tp, []);
  assert.equal(run(root, 'Write', { file_path: join(root, 'research-tree/build/improve/code/U2/trainlib.py'), content: 'x' }).code, 0);
  assert.equal(run(root, 'Edit', { file_path: 'C:/Users/User/Documents/projects/card-run-2026-11/run.sh', old_string: 'a', new_string: 'b' }).code, 0);
  for (const c of ['docker run --gpus all --network none -v C:/Users/User/Documents/projects/card-run-2026-11:/w img python /w/train.py',
    'cd research-tree/build/improve && node code/T3/run.mjs > units/T3/out.txt', 'docker ps', 'nvidia-smi'])
    assert.equal(run(root, 'Bash', { command: c }).code, 0, c);
  assert.equal(run(root, 'Agent', { description: 'u', prompt: 'run: unit U5 under research-tree/build/improve/units/U5' }).code, 0);
  assert.equal(run(root, 'Glob', { pattern: '**/*' }).code, 0);
});
test('an internal error lets a call through unless it is a step of the new work', () => {
  const { root } = setup();
  assert.equal(run(root, 'Bash', {}, { raw: '{not json "ls"' }).code, 0);
  const r = run(root, 'Bash', {}, { raw: '{not json "python research-tree/build/model2/train.py"' });
  assert.equal(r.code, 2); assert.match(r.err, /internal error/);
});

// ---- refusal 4: graph of thoughts in the open (r58-0027) ----
const { ledger } = await import(new URL('../../tools/check-got.mjs', import.meta.url).href);
function searchFolder(root) { // a small search that misses minimums: the ledger says so first, which the rule allows
  const dir = join(root, 'search-x');
  mkdirSync(join(dir, 'thoughts'), { recursive: true });
  writeFileSync(join(dir, 'GRAPH-PLAN.md'), '# Plan\n');
  writeFileSync(join(dir, 'thoughts', 'a1.md'), 'a thought\n');
  writeFileSync(join(dir, 'thoughts.jsonl'), JSON.stringify({ t: 'thought', id: 'a1', op: 'generate', part: 'a', parents: [], by: 'top session', file: 'thoughts/a1.md', at: '2099-01-01T00:00:00Z' }) + '\n');
  return ledger(dir, { root, projectsDir: join(root, 'projects') });
}
test('a hypothesis with neither line is refused; "Not reached by a graph of thoughts: ..." passes', () => {
  const { root, tp } = setup(); writeT(tp, readCalls(root));
  const r = run(root, 'Write', { file_path: hyp(root), content: doc(undefined, undefined, undefined, '') });
  assert.equal(r.code, 2); assert.match(r.err, /Search: <folder>.*Not reached by a graph of thoughts/);
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: doc(undefined, undefined, undefined, 'Not reached by a graph of thoughts:\n') }).code, 2);
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: doc(undefined, undefined, undefined, 'Not reached by a graph of thoughts: one session merged drafts.\n') }).code, 0);
  const late = doc(undefined, undefined, undefined, '\n'.repeat(45) + 'Not reached by a graph of thoughts: x.\n');
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: late }).code, 2);
});
test('"Search: <folder>": the folder exists and "What was actually done" equals its ledger', () => {
  const { root, tp } = setup(); writeT(tp, readCalls(root));
  const l = searchFolder(root);
  assert.match(l, /^Minimums not met:/);
  const withSec = (body, head = 'Search: search-x\n') => doc(undefined, undefined, undefined, head, '\n## What was actually done\n' + body + '\n## After\nx\n');
  assert.equal(run(root, 'Write', { file_path: hyp(root), content: withSec(l.replace(/\n/g, '  \r\n')) }).code, 0);
  let r = run(root, 'Write', { file_path: hyp(root), content: withSec(l.replace('### Part `a`', '### Part `a` (two rounds)')) });
  assert.equal(r.code, 2); assert.match(r.err, /differs from the ledger of search-x.*node tools\/check-got\.mjs search-x --ledger/);
  r = run(root, 'Write', { file_path: hyp(root), content: withSec('Every minimum is met.') });
  assert.equal(r.code, 2);
  r = run(root, 'Write', { file_path: hyp(root), content: doc(undefined, undefined, undefined, 'Search: search-x\n') });
  assert.equal(r.code, 2); assert.match(r.err, /no "## " heading containing "What was actually done"/);
  r = run(root, 'Write', { file_path: hyp(root), content: withSec(l, 'Search: search-none\n') });
  assert.equal(r.code, 2); assert.match(r.err, /search-none" does not exist/);
});
test('an Edit is judged on the text it would leave', () => {
  const { root, tp } = setup(); writeT(tp, readCalls(root));
  writeFileSync(hyp(root), doc());
  assert.equal(run(root, 'Edit', { file_path: hyp(root), old_string: 'All agree.', new_string: 'All agree, checked.' }).code, 0);
  const r = run(root, 'Edit', { file_path: hyp(root), old_string: 'Not reached by a graph of thoughts: a test fixture.\n', new_string: '' });
  assert.equal(r.code, 2); assert.match(r.err, /first 40 lines/);
  assert.equal(run(root, 'MultiEdit', { file_path: hyp(root), edits: [{ old_string: 'Not reached by a graph of thoughts: a test fixture.', new_string: 'Search: search-none' }] }).code, 2);
});
