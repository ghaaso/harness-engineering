// Tests of owner-report.mjs (unit T8-REPORT, 2026-11-24). Run: node .claude/hooks/owner-report.test.mjs
// (or HOOK=owner-report.next.mjs to test a copy before it replaces the live file).
// Each case copies the hook into a temporary folder that mirrors the names this repository holds (top-level folders,
// unit folders, brief names, replay folders, plan.json, journal file names), feeds it hook input shaped as the app sent
// it in this repository (keys of research-tree/probes/hook-probe/hook-log.jsonl, 2026-11-18) and checks its exit code
// (0 allow, 2 refuse), its reason and its note. The boxes marked "2026-11-23" are top session 7's own closing boxes
// (transcript ad4e59df) and its page research-tree/build/page/top7-page.html: with no hook (the code before this
// unit) all of them reached the owner; the labelled ones must now be refused. Nothing in the repository is written.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const HOOK = process.env.HOOK || (existsSync(resolve(here, 'owner-report.mjs')) ? 'owner-report.mjs' : 'owner-report.next.mjs');
const made = [];
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });
const ls = (p) => { try { return readdirSync(p, { withFileTypes: true }); } catch { return []; } };

// a folder that holds the same names as the repository
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'owner-report-'));
  made.push(dir);
  mkdirSync(join(dir, '.claude', 'hooks'), { recursive: true });
  copyFileSync(resolve(here, HOOK), join(dir, '.claude', 'hooks', 'owner-report.mjs'));
  for (const d of ls(repo)) if (d.name !== '.git' && d.name !== '.claude') {
    if (d.isDirectory()) mkdirSync(join(dir, d.name), { recursive: true }); else writeFileSync(join(dir, d.name), '');
  }
  const b = (...p) => join(dir, 'research-tree', 'build', ...p);
  const rb = (...p) => resolve(repo, 'research-tree', 'build', ...p);
  for (const d of ls(rb('units'))) if (d.isDirectory()) mkdirSync(b('units', d.name), { recursive: true });
  mkdirSync(b('briefs'), { recursive: true });
  for (const f of ls(rb('briefs'))) if (f.isFile()) writeFileSync(b('briefs', f.name), '');
  for (const d of ls(rb('replays'))) if (d.isDirectory()) mkdirSync(b('replays', d.name), { recursive: true });
  copyFileSync(rb('plan.json'), b('plan.json'));
  for (const d of ls(resolve(repo, 'library', 'journal'))) if (d.isDirectory()) {
    mkdirSync(join(dir, 'library', 'journal', d.name), { recursive: true });
    for (const f of ls(resolve(repo, 'library', 'journal', d.name))) writeFileSync(join(dir, 'library', 'journal', d.name, f.name), '');
  }
  return dir;
}
const F = fixture();
const logOf = (dir) => { const p = join(dir, '.claude', 'logs', 'owner-report.jsonl'); return existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; };

function run(input, dir = F) {
  const r = spawnSync(process.execPath, [join(dir, '.claude', 'hooks', 'owner-report.mjs')], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8' });
  return { code: r.status, err: r.stderr, out: r.stdout };
}
let seq = 0;
const common = () => ({ session_id: '6d4e3fd7-test', transcript_path: 'C:/x/t.jsonl', cwd: repo, scratchpad_dir: 'C:/x/scratchpad', prompt_id: 'p1', permission_mode: 'bypassPermissions', effort: 'high' });
const box = (tool_input, ev = 'PreToolUse') => ({ ...common(), hook_event_name: ev, tool_name: 'mcp__ccd_turn__wrap_up', tool_input, tool_use_id: `toolu_t${++seq}`, mcp_server: 'ccd_turn', ...(ev === 'PostToolUse' ? { tool_response: [{ type: 'text', text: 'ok' }], duration_ms: 3 } : {}) });
const page = (tool_input) => ({ ...common(), hook_event_name: 'PreToolUse', tool_name: 'Artifact', tool_input, tool_use_id: `toolu_t${++seq}` });
const stop = (msg, extra = {}) => ({ ...common(), hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: msg, background_tasks: [], session_crons: [], ...extra });
const tmpFile = (name, text) => { const d = mkdtempSync(join(tmpdir(), 'owner-report-page-')); made.push(d); const p = join(d, name); writeFileSync(p, text); return p; };

// ---- the closing box ----
test('2026-11-23 box with replay labels L8 and L6 is refused (the old code let it through)', () => {
  const r = run(box({ recap: 'Five of the seven replays have results on disk; L8 is still running and L6 is being finished after it hit its limit with no result. Three of the four parts for the 14 unread keys are now reading; the fourth starts at the first return. Nothing is committed in this repository yet.' }));
  assert.equal(r.code, 2); assert.match(r.err, /unit names \(L8, L6\)|unit names \(L6, L8\)/); assert.equal(r.err.trim().split('\n').length, 1);
});
test('2026-11-23 box without labels passes; the note counts its figures', () => {
  const ti = { recap: 'Both approved jobs are done and the results page is published: seven replays (64.2 M of the 87 M cap) and all 14 unread keys (255.6 M of the 600 M cap). Nothing is committed in this repository: my id script wrote three journal lines under ids already in use, and the commit check refuses them.', ask: "approve: remove my three void duplicate-id journal lines, then commit this round's files?", actions: [{ label: 'Yes, remove and commit' }, { label: 'Not now' }], blocked: false };
  assert.equal(run(box(ti)).code, 0);
  const post = run(box(ti, 'PostToolUse'));
  assert.equal(post.code, 0);
  const o = JSON.parse(post.out);
  assert.equal(o.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.match(o.hookSpecificOutput.additionalContext, /holds 5 figures/);
  assert.match(o.hookSpecificOutput.additionalContext, /not a refusal/);
});
test('2026-11-23 last box (no figures) passes with no note', () => {
  const ti = { recap: 'This session stops here: it is far past its hand-over point and should not take on new work. The hand-over for a fresh session that builds the enforcement is written and is the library\'s next task; the cache-expiry fix waits behind it. The hand-over files are not committed yet.', ask: 'approve: start a fresh session now to build the enforcement?', actions: [{ label: 'Yes, start it' }, { label: 'Not now' }], blocked: true };
  assert.equal(run(box(ti)).code, 0);
  const post = run(box(ti, 'PostToolUse')); assert.equal(post.code, 0); assert.equal(post.out, '');
});
test('a record id in the ask is refused', () => {
  const r = run(box({ recap: 'The check is built.', ask: 'approve: apply r57-0056 to the next round?' }));
  assert.equal(r.code, 2); assert.match(r.err, /record ids \(r57-0056\)/);
});
test('ids of other writers are refused: x13-0117, d3c-0403, x120-0400, bp-0001', () => {
  const r = run(box({ recap: 'See x13-0117, d3c-0403, x120-0400 and bp-0001.' }));
  assert.equal(r.code, 2); for (const id of ['x13-0117', 'd3c-0403', 'x120-0400', 'bp-0001']) assert.ok(r.err.includes(id), id);
});
test('a top-session unit name in a button label is refused', () => {
  const r = run(box({ recap: 'Two checks are ready.', ask: 'approve: wire them?', actions: [{ label: 'Wire T8-CEIL' }] }));
  assert.equal(r.code, 2); assert.match(r.err, /T8-CEIL/);
});
test('money is refused, tokens are not', () => {
  assert.equal(run(box({ recap: 'The round cost $12.40.' })).code, 2);
  assert.equal(run(box({ recap: 'The round cost 12 USD.' })).code, 2);
  assert.equal(run(box({ recap: 'The round used 8.6 M tokens, 25 % of the week.' })).code, 0);
});
test('"in no paper" is refused; "not in the papers read" passes', () => {
  assert.equal(run(box({ recap: 'This method is in no paper.' })).code, 2);
  assert.equal(run(box({ recap: 'This method is not in the papers read.' })).code, 0);
});
test('repository paths are refused: relative, absolute, Git Bash form, alias form, bare record file', () => {
  // F is the fixture: the hook copied there takes it as the repository
  const gitBash = '/' + F[0].toLowerCase() + F.slice(2).replace(/\\/g, '/');
  for (const recap of ['The state is in research-tree/build/TOP-STATE.md.', `It is at ${F}\\library\\INDEX.md now.`,
    `It is at ${gitBash}/tools/check-commit.mjs.`, 'Read H/research-tree/build/replays/JUDGE-REPLAYS.md first.',
    'The rule is in CLAUDE.md.']) {
    const r = run(box({ recap })); assert.equal(r.code, 2, recap); assert.match(r.err, /file paths/);
  }
});
test('a file he opens himself may be named; paths outside the repository, URLs and common words pass', () => {
  for (const recap of ['The diagram is docs/program/pipeline-diagram/harness-pipeline.drawio; open it in draw.io.',
    'The picture is `research-tree/build/tree/research-run-tree.png`.',
    'The PDF is at C:/Users/User/AppData/Local/Temp/x/compile.pdf.', 'The page is https://claude.ai/artifact/4xJK7qBdthigouzz5BAW2S and the code https://github.com/a/harness-engineering/blob/main/library/INDEX.md.',
    'It runs on Node.js with UTF-8 files, like GPT-4 and COVID-19 studies did on 2026-11-24 at 14:52.']) {
    const r = run(box({ recap })); assert.equal(r.code, 0, recap + ' ' + r.err);
  }
});

// ---- pages ----
test('2026-11-23 results page is refused for ids, unit names and paths (the old code published it)', () => {
  const r = run(page({ file_path: resolve(repo, 'research-tree', 'build', 'page', 'top7-page.html'), icon: 'chart', description: 'Results of the seven replays and of the reading of the 14 research keys, 2026-11-23.', label: 'Top session 7 results' }));
  assert.equal(r.code, 2); assert.match(r.err, /^Page refused/); assert.match(r.err, /record ids \(/); assert.match(r.err, /unit names \(/); assert.match(r.err, /file paths \(/);
});
const CLEAN = `<!doctype html><html><head><title>Hook results</title><style>.a::before{content:"r57-0001"}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<script>const total = 3; const s = \`\${total} checks\`; document.title = s.replace(/x/, '$1');</script></head>
<body><h1>What the checks do</h1><p>Three checks now stop reports full of labels. Built with Node.js.</p>
<a href="research-tree/build/units/T8-REPORT/result.md">record</a><img src="x.png" alt="a chart of the checks">
<!-- r57-0056 research-tree/build/TOP8-STATE.md --></body></html>`;
test('a clean page passes: labels only in a link target, a comment or a style, code with $ in a script', () => {
  const r = run(page({ file_path: tmpFile('page.html', CLEAN), icon: 'chart' })); assert.equal(r.code, 0, r.err);
});
test('an id in a script string (text a script draws) is refused; an id in an alt text too', () => {
  assert.equal(run(page({ file_path: tmpFile('p.html', '<p>Hi</p><script>const rows=[{id:"t7-0608",t:"late hand-over"}];</script>') })).code, 2);
  assert.equal(run(page({ file_path: tmpFile('p.html', '<p>Hi</p><img src="a.png" alt="see r57-0017">') })).code, 2);
});
test('a "record" section of ids on the page is refused', () => {
  const r = run(page({ file_path: tmpFile('p.html', '<h2>Results</h2><p>Done.</p><h2>Record</h2><ul><li>r57-0056</li><li>t7-0608</li></ul>') }));
  assert.equal(r.code, 2); assert.match(r.err, /markdown record behind the page/);
});
test('supporting files and data files are read: an id in a data JSON is refused', () => {
  const html = tmpFile('index.html', '<p>Fine.</p>');
  const data = tmpFile('rows.json', JSON.stringify([{ name: 'cap check', src: 'r57-0002' }]));
  const r = run(page({ file_path: html, files: { 'rows.json': data, 'old.json': null, 'x.css': { artifact: 'https://claude.ai/artifact/abc', path: 'x.css' } } }));
  assert.equal(r.code, 2); assert.match(r.err, /r57-0002/);
});
test('a markdown page is read as text; a page that does not exist is let through (the tool reports it)', () => {
  assert.equal(run(page({ file_path: tmpFile('p.md', '# Results\nSee `library/INDEX.md`.\n') })).code, 2);
  assert.equal(run(page({ file_path: join(tmpdir(), 'no-such-page-owner-report.html') })).code, 0);
});
test('Artifact calls other than publish are not checked; a label in the description is', () => {
  assert.equal(run(page({ action: 'read', url: 'https://claude.ai/artifact/r57-0056' })).code, 0);
  assert.equal(run(page({ action: 'list' })).code, 0);
  assert.equal(run(page({ file_path: tmpFile('p.html', '<p>ok</p>'), description: 'The T8-REPORT page.' })).code, 2);
});

// ---- the last message ----
const RELAY = 'replay-L24 DONE (2.96 M): lapses 151.5 M of 927.4 M fresh (16.3 %); records t7-0100 to t7-0128 in library/journal/2026-11-23/t7.jsonl.';
test('a last message relaying a helper as labels and figures is refused once, with the figure count', () => {
  const r = run(stop(RELAY)); assert.equal(r.code, 2); assert.match(r.err, /holds \d+\)/); assert.match(r.err, /asked once/); assert.equal(r.err.trim().split('\n').length, 1);
});
test('the second stop (stop_hook_active) is let through and logged: no loop', () => {
  const d = fixture();
  assert.equal(run(stop(RELAY, { stop_hook_active: true }), d).code, 0);
  assert.equal(logOf(d).at(-1).note, 'second stop let through');
});
test("a helper's stop is not checked (its words go to its caller)", () => {
  assert.equal(run(stop(RELAY, { agent_id: 'a1b2c3', agent_type: 'general-purpose' })).code, 0);
});
test('a plain last message passes, an empty one too', () => {
  assert.equal(run(stop('The three checks are built and tested. They stop reports full of labels before you see them. Nothing is wired yet.')).code, 0);
  assert.equal(run(stop('')).code, 0);
});

// ---- failure ----
test('unreadable input, another tool or another event: let through', () => {
  assert.equal(run('not json').code, 0);
  assert.equal(run({ ...common(), hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'echo r57-0056' } }).code, 0);
  assert.equal(run({ ...common(), hook_event_name: 'SubagentStop', last_assistant_message: RELAY, stop_hook_active: false }).code, 0);
});
test('missing label sources still refuse ids; malformed fields are let through', () => {
  const d = fixture();
  rmSync(join(d, 'research-tree'), { recursive: true, force: true }); // no unit names to read: still runs
  assert.equal(run(box({ recap: 'See r57-0056.' }), d).code, 2);
  const r = run({ ...common(), hook_event_name: 'PreToolUse', tool_name: 'mcp__ccd_turn__wrap_up', tool_input: { recap: { not: 'a string' }, actions: 'x' } }, d);
  assert.equal(r.code, 0);
});
