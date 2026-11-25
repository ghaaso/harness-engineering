// Tests of the graph-of-thoughts check and ledger. Run: node --test tools/check-got.test.mjs
// Each case builds a search folder and a fake projects folder (GOT_PROJECTS_DIR / opts.projectsDir) in a temporary folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkGot, ledger } from './check-got.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, 'check-got.mjs');
const base = mkdtempSync(join(tmpdir(), 'check-got-'));
const T = Date.parse('2026-11-25T10:00:00Z');
const at = (min) => new Date(T + min * 60000).toISOString();
let n = 0;

const th = (id, op, part, parents, min, by = 'top session') => ({ t: 'thought', id, op, part, parents, by, file: `thoughts/${id}.md`, at: at(min) });
const sc = (thought, min, by = 'run-s') => ({ t: 'score', thought, by, levels: { fit: 2, clarity: 3 }, vetoes: [], entries: ['N 9.5'], at: at(min) });
// A graph that meets every minimum: two parts of three, scored, two kept per part, three aggregates, a refine, a final.
function valid() {
  const r = [];
  for (const p of ['a', 'b']) for (const k of [1, 2, 3]) r.push(th(p + k, 'generate', p, [], k, p + k === 'a1' ? 'agent-aaa' : p + k === 'a2' ? 'bbb' : 'top session'));
  for (const p of ['a', 'b']) for (const k of [1, 2, 3]) r.push(sc(p + k, 10));
  r.push({ t: 'keep', part: 'a', kept: ['a1', 'a2'], dropped: [{ thought: 'a3', reason: 'vetoed by D 6.1' }], at: at(20) });
  r.push({ t: 'keep', part: 'b', kept: ['b1', 'b2'], dropped: [{ thought: 'b3', reason: 'lowest level' }], at: at(20) });
  r.push(th('g1', 'aggregate', 'whole', ['a1', 'b1'], 30), th('g2', 'aggregate', 'whole', ['a2', 'b2'], 31), th('g3', 'aggregate', 'whole', ['a1', 'b2'], 32));
  r.push(sc('g1', 40), sc('g2', 40), sc('g3', 40));
  r.push(th('r1', 'refine', 'whole', ['g1'], 50), sc('r1', 60));
  r.push({ t: 'final', thought: 'r1' });
  return r;
}
// Writes the folder: plan first (old), then thought files, then the records. Returns { dir, opts }.
function build(records = valid(), { plan = true, planMin = -60, fileMin = 1, skipFiles = [], emptyFiles = [] } = {}) {
  const root = join(base, 'g' + (++n));
  const dir = join(root, 'search');
  const pdir = join(root, 'projects');
  mkdirSync(join(dir, 'thoughts'), { recursive: true });
  mkdirSync(join(pdir, 'sess-1', 'subagents'), { recursive: true });
  if (plan) { writeFileSync(join(dir, 'GRAPH-PLAN.md'), '# Plan\n'); const t = new Date(T + planMin * 60000); utimesSync(join(dir, 'GRAPH-PLAN.md'), t, t); }
  for (const o of records) if (o.t === 'thought' && !skipFiles.includes(o.id)) {
    const f = join(dir, o.file);
    writeFileSync(f, emptyFiles.includes(o.id) ? '' : `thought ${o.id}\n`);
    const t = new Date(T + fileMin * 60000); utimesSync(f, t, t);
  }
  writeFileSync(join(dir, 'thoughts.jsonl'), records.map((o) => JSON.stringify(o)).join('\n') + '\n');
  // agent-aaa wrote a1 (a Write that succeeded); bbb has a transcript with no write to a2.
  const tl = (objs) => objs.map((o) => JSON.stringify(o)).join('\n') + '\n';
  writeFileSync(join(pdir, 'sess-1', 'subagents', 'agent-aaa.jsonl'), tl([
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu1', name: 'Write', input: { file_path: join(dir, 'thoughts', 'a1.md'), content: 'x' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'File created' }] } },
  ]));
  writeFileSync(join(pdir, 'sess-1', 'subagents', 'agent-bbb.jsonl'), tl([
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu2', name: 'Read', input: { file_path: join(dir, 'thoughts', 'a2.md') } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu2', content: 'x' }] } },
  ]));
  return { dir, root, pdir, opts: { root, projectsDir: pdir } };
}
const faultsOf = (b) => checkGot(b.dir, b.opts).faults;
const has = (fs, re) => assert.ok(fs.some((f) => re.test(f)), `expected a fault matching ${re}, got:\n${fs.join('\n')}`);
const edit = (fn) => { const r = valid(); fn(r); return r; };
const find = (r, id, t = 'thought') => r.find((o) => o.t === t && (o.id === id || o.thought === id));

test('a valid graph meets every minimum', () => {
  const b = build();
  assert.deepEqual(faultsOf(b), []);
  assert.match(ledger(b.dir, b.opts), /^Every minimum is met\.\n/);
});
test('the plan must be older than every thought: missing, changed later, or a thought dated before it', () => {
  has(faultsOf(build(valid(), { plan: false })), /There is no GRAPH-PLAN\.md/);
  has(faultsOf(build(valid(), { planMin: 5 })), /oldest thought file/);
  has(faultsOf(build(edit((r) => { find(r, 'a1').at = at(-90); }))), /last changed after `a1`/);
});
test('at least two parts', () => {
  has(faultsOf(build(edit((r) => { for (const k of [1, 2, 3]) find(r, 'b' + k).part = 'a'; }))), /Only 1 part has generated thoughts/);
});
test('at least three generated thoughts per part', () => {
  const r = valid().filter((o) => o.id !== 'b3' && o.thought !== 'b3');
  r.find((o) => o.t === 'keep' && o.part === 'b').dropped = [];
  has(faultsOf(build(r)), /Part `b` has 2 generated thoughts/);
});
test('a score before a thought is kept, dropped or made a parent', () => {
  has(faultsOf(build(edit((r) => { find(r, 'a3', 'score').at = at(25); }))), /`a3` is dropped in part `a` without a score before the selection/);
  has(faultsOf(build(edit((r) => { find(r, 'g1', 'score').at = at(55); }))), /`g1` is a parent of `r1` without a score before/);
});
test('a selection keeps more than one, or says why only one', () => {
  const one = edit((r) => { const k = r.find((o) => o.t === 'keep' && o.part === 'b'); k.kept = ['b1']; k.dropped.push({ thought: 'b2', reason: 'weaker' }); });
  has(faultsOf(build(one)), /selection of part `b` keeps 1 thought and does not say why/);
  one.find((o) => o.t === 'keep' && o.part === 'b').why = 'b2 and b3 both break D 6.1';
  assert.deepEqual(faultsOf(build(one)).filter((f) => /does not say why/.test(f)), []);
  has(faultsOf(build(edit((r) => { r.find((o) => o.t === 'keep' && o.part === 'a').dropped[0].reason = ''; }))), /`a3`, dropped in part `a`, has no reason/);
  has(faultsOf(build(valid().filter((o) => !(o.t === 'keep' && o.part === 'a')))), /Part `a` has no selection/);
});
test('three scored aggregates with different sets of parents', () => {
  has(faultsOf(build(edit((r) => { find(r, 'g3').parents = ['b1', 'a1']; }))), /2 scored aggregates with different sets of parents/);
  has(faultsOf(build(valid().filter((o) => !(o.t === 'score' && o.thought === 'g2')))), /2 scored aggregates/);
});
test('a refine of an aggregate, scored after it', () => {
  has(faultsOf(build(edit((r) => { find(r, 'r1', 'score').at = at(45); }))), /No refine of an aggregate has a score made after it/);
  has(faultsOf(build(edit((r) => { find(r, 'r1').parents = ['a1']; }))), /no refine whose parent is an aggregate/);
});
test('the final thought is an aggregate or a refine', () => {
  has(faultsOf(build(edit((r) => { find(r, 'r1', 'final').thought = 'a1'; }))), /final thought `a1` is a generate/);
  has(faultsOf(build(valid().filter((o) => o.t !== 'final'))), /There is no final record/);
});
test('every thought file exists, is not empty, and is its own', () => {
  has(faultsOf(build(valid(), { skipFiles: ['b2'] })), /`b2`: its file `thoughts\/b2\.md` does not exist/);
  has(faultsOf(build(valid(), { emptyFiles: ['b2'] })), /`b2`: its file `thoughts\/b2\.md` is empty/);
  has(faultsOf(build(edit((r) => { find(r, 'b2').file = 'thoughts/b1.md'; }))), /`b1` and `b2` share the file/);
});
test('writers: a confirmed run, a run with no write, a missing transcript, the top session', () => {
  const b = build(edit((r) => { find(r, 'b1').by = 'agent-zzz'; }));
  const l = ledger(b.dir, b.opts);
  assert.match(l, /`a1` \(file `thoughts\/a1\.md`\), written by run `aaa`: confirmed/);
  assert.match(l, /`a2` \(file `thoughts\/a2\.md`\), written by run `bbb`: not confirmed/);
  const un = l.slice(l.indexOf('### Writers not confirmed'));
  assert.doesNotMatch(un, /`a1`/);
  assert.match(un, /`a2`: by run `bbb`; its transcript holds no write to `thoughts\/a2\.md`/);
  assert.match(un, /`b1`: by run `zzz`; no transcript agent-zzz\.jsonl was found/);
  assert.match(un, /`g1`: by the top session; never confirmed/);
  assert.deepEqual(faultsOf(b), []); // unconfirmed writers are listed, not faults
});
test('a write by a shell command naming the path confirms; a failed write does not', () => {
  const b = build();
  const p = join(b.pdir, 'sess-1', 'subagents', 'agent-bbb.jsonl');
  const tl = (objs) => objs.map((o) => JSON.stringify(o)).join('\n') + '\n';
  const cmd = `cat > ${join(b.dir, 'thoughts', 'a2.md').replace(/\\/g, '/')} <<'EOF'\nx\nEOF`;
  writeFileSync(p, tl([{ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu3', name: 'Bash', input: { command: cmd } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu3', content: 'error', is_error: true }] } }]));
  assert.match(ledger(b.dir, b.opts), /run `bbb`: not confirmed/);
  const b2 = build();
  writeFileSync(join(b2.pdir, 'sess-1', 'subagents', 'agent-bbb.jsonl'), tl([{ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu4', name: 'Bash', input: { command: cmd.replace(b.dir.replace(/\\/g, '/'), b2.dir.replace(/\\/g, '/')) } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu4', content: '' }] } }]));
  assert.match(ledger(b2.dir, b2.opts), /run `bbb`: confirmed/);
});
test('the ledger is stable: same bytes for the same records, any line order, no absolute path, unmet minimums first', () => {
  const a = build(); const b = build(valid().reverse());
  const la = ledger(a.dir, a.opts);
  assert.equal(la, ledger(a.dir, a.opts));
  assert.equal(la, ledger(b.dir, b.opts));
  assert.ok(!la.includes(a.dir) && !la.includes(a.dir.replace(/\\/g, '/')) && !la.includes(base));
  for (const s of ['### Part `a`', '### Part `b`', '### Aggregates', '### Refinements', '### Final thought', '### Writers not confirmed', 'Dropped:', '- `a3`: vetoed by D 6.1', 'parents `a1`, `b1`', 'levels clarity=3, fit=2; vetoes: none; entries: N 9.5'])
    assert.ok(la.includes(s), s);
  const bad = build(valid().filter((o) => o.t !== 'final'));
  assert.match(ledger(bad.dir, bad.opts), /^Minimums not met:\n\n- There is no final record/);
});
test('the command line: ok, one line per fault, and the ledger', () => {
  const b = build();
  const env = { ...process.env, GOT_PROJECTS_DIR: b.pdir, GOT_ROOT: b.root };
  const g = spawnSync(process.execPath, [CLI, b.dir], { env, encoding: 'utf8' });
  assert.equal(g.status, 0); assert.equal(g.stdout, 'ok\n');
  const l = spawnSync(process.execPath, [CLI, b.dir, '--ledger'], { env, encoding: 'utf8' });
  assert.equal(l.status, 0); assert.equal(l.stdout, ledger(b.dir, b.opts));
  const bad = build(edit((r) => { find(r, 'r1', 'final').thought = 'a1'; }), { plan: false });
  const x = spawnSync(process.execPath, [CLI, bad.dir], { env: { ...env, GOT_PROJECTS_DIR: bad.pdir }, encoding: 'utf8' });
  assert.equal(x.status, 1); assert.equal(x.stdout.trim().split('\n').length, 2);
});
