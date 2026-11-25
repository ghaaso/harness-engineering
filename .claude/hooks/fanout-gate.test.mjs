// Self-tests of the fan-out gate. Run: node .claude/hooks/fanout-gate.test.mjs [hook file, default fanout-gate.mjs]
// Each case feeds real PreToolUse JSON on stdin; transcripts, the journal and the state file are small fakes in a
// temporary folder (FANOUT_GATE_ROOT), the clock is fixed (FANOUT_GATE_NOW). With KIT_HOOK_BIN_DIR set the cases run the
// Rust program kit-fanout-gate instead (.claude/hooks/hook-under-test.mjs). Before this hook every case below was
// allowed: the "deny" cases are the ones the old setup (no gate) let through.
import { runHook } from './hook-under-test.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(here, process.argv[2] || 'fanout-gate.mjs');
const base = mkdtempSync(join(tmpdir(), 'fanout-gate-'));
const T0 = Date.parse('2026-11-24T10:00:00Z');
const at = (min) => new Date(T0 + min * 60000).toISOString();
const SESS = 'abcd1234-0000-0000-0000-000000000000';

let n = 0, failed = 0;
function setup({ state = null } = {}) {
  const root = join(base, 'r' + (++n));
  mkdirSync(join(root, 'library', 'journal', '2026-11-19'), { recursive: true });
  mkdirSync(join(root, 'research-tree', 'build', 'briefs'), { recursive: true });
  writeFileSync(join(root, 'library', 'journal', '2026-11-19', 'r57.jsonl'), [
    '{"id":"r57-0165","kind":"fact","status":"measured","claim":"tokens per step"}',
    '{"id":"r57-0173","kind":"fact","status":"measured","claim":"tokens per unit"}',
    '{"id":"r57-0038","kind":"ruling","status":"owner","claim":"a limit is need plus a buffer"}',
    '{"id":"r57-0424","kind":"hypothesis","status":"reasoned","claim":"a guess"}',
  ].join('\n') + '\n');
  if (state) writeFileSync(join(root, 'research-tree', 'build', 'TOPX-STATE.md'), state);
  const proj = join(root, 'projects');
  mkdirSync(join(proj, SESS, 'subagents'), { recursive: true });
  return { root, proj, main: join(proj, SESS + '.jsonl') };
}
const asst = (msg, blocks, min, usage = null) => ({ parentUuid: 'p', type: 'assistant', timestamp: at(min), message: { id: msg, role: 'assistant', content: blocks, ...(usage ? { usage } : {}) } });
const user = (results, min) => ({ parentUuid: 'p', type: 'user', timestamp: at(min), message: { role: 'user', content: results } });
const use = (id, name, input = {}) => ({ type: 'tool_use', id, name, input });
const res = (id, content, is_error = false) => ({ type: 'tool_result', tool_use_id: id, content, ...(is_error ? { is_error } : {}) });
const usage = (pct, fable = 10) => [{ type: 'text', text: JSON.stringify({ plan: { status: 'ok', windows: [{ label: 'Weekly · all models', percentUsed: pct }, { label: 'Weekly · Fable', percentUsed: fable }] } }) }];
const tok = (n) => ({ input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: n, output_tokens: 0 });
const write = (p, objs) => writeFileSync(p, objs.map((o) => JSON.stringify(o)).join('\n') + '\n');
const GU = 'mcp__ccd_session_mgmt__get_usage';
const GOOD = 'Your token limit is 12 M (expected about 8 M, basis r57-0165).';
// A reading in message m1 (minute 0), its result, then message m2 starting the helper toolu_X.
const readThenStart = (prompt = GOOD, pct = 33) => [
  asst('m1', [use('tu_u', GU)], 0), user([res('tu_u', usage(pct))], 0),
  asst('m2', [use('toolu_X', 'Agent', { prompt })], 1),
];

function run(name, want, env, input, expectText) {
  const r = runHook(HOOK, [], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    env: { ...process.env, FANOUT_GATE_ROOT: env.root, FANOUT_GATE_NOW: env.now || at(2) }, encoding: 'utf8',
  });
  const got = r.status === 2 ? 'deny' : r.status === 0 ? 'allow' : 'exit ' + r.status;
  const ok = got === want && (!expectText || (r.stderr || '').includes(expectText));
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got}${r.stderr ? ' | ' + r.stderr.trim().slice(0, 150) : ''}`);
}
const hookIn = (s, prompt = GOOD, extra = {}) => ({
  session_id: SESS, transcript_path: s.main, cwd: s.root, hook_event_name: 'PreToolUse', tool_name: 'Agent',
  tool_use_id: 'toolu_X', tool_input: { description: 'build: x', model: 'sonnet', prompt }, ...extra,
});

// ---- 1. the limit and its basis ----
{ const s = setup(); write(s.main, readThenStart());
  run('L1 limit with a measured basis', 'allow', s, hookIn(s)); }
{ const s = setup(); const p = 'You are unit T8-CEIL of top session 8. Your token limit is 15 M (expected about 10 M). Return the short result.';
  write(s.main, readThenStart(p));
  run('L2 the real T8-CEIL start of 2026-11-24 (no basis on the line)', 'deny', s, hookIn(s, p), 'cites no record'); }
{ const s = setup(); const p = 'Your token limit is 12 M, basis r57-0165.'; write(s.main, readThenStart(p));
  run('L3 a limit with no expected figure', 'deny', s, hookIn(s, p), 'no expected figure'); }
{ const s = setup(); const p = 'token limit 8 M (expected about 8 M, basis r57-0165)'; write(s.main, readThenStart(p));
  run('L4 a limit equal to the expected figure (r57-0038: never equal)', 'deny', s, hookIn(s, p), 'not above'); }
{ const s = setup(); const p = 'token limit 12 M (expected about 8 M, basis r57-9999)'; write(s.main, readThenStart(p));
  run('L5 a cited id not in the journal', 'deny', s, hookIn(s, p), 'not in library/journal'); }
{ const s = setup(); const p = 'token limit 12 M (expected about 8 M, basis r57-0038, r57-0424)'; write(s.main, readThenStart(p));
  run('L6 cited ids that are a ruling and a hypothesis, none measured', 'deny', s, hookIn(s, p), 'measured or observed'); }
{ const s = setup(); const p = 'Read research-tree/build/briefs/B-GOOD.md and do what it says.';
  writeFileSync(join(s.root, 'research-tree', 'build', 'briefs', 'B-GOOD.md'), '# brief\nLimit 12 M tokens (expected about 8 M: r57-0165, the plan gate builder).\n');
  write(s.main, readThenStart(p));
  run('L7 the limit stated in the brief the prompt names', 'allow', s, hookIn(s, p)); }
{ const s = setup(); const p = 'Read briefs/B-BAD.md and do what it says.';
  writeFileSync(join(s.root, 'research-tree', 'build', 'briefs', 'B-BAD.md'), '# brief\nLimit 6 M tokens (expected 3 M).\n');
  write(s.main, readThenStart(p));
  run('L8 a brief whose limit cites nothing (r57-0617: 3 M and 6 M by guess)', 'deny', s, hookIn(s, p), 'B-BAD.md'); }
{ const s = setup(); const p = 'Find the file that defines X.'; write(s.main, readThenStart(p));
  run('L9 no limit and no cap: passes', 'allow', s, hookIn(s, p)); }
{ const s = setup(); const p = 'Summarise research-tree/build/NOTES.md for me.';
  writeFileSync(join(s.root, 'research-tree', 'build', 'NOTES.md'), 'The unit ran to its limit 20 M (expected 9.4 M).\n');
  write(s.main, readThenStart(p));
  run('L11 a named document that is not a brief: its narrative is not a limit', 'allow', s, hookIn(s, p)); }
{ const s = setup(); const p = 'Read research-tree\\build\\briefs\\B-BAD.md and do what it says.';
  writeFileSync(join(s.root, 'research-tree', 'build', 'briefs', 'B-BAD.md'), '# brief\nLimit 6 M tokens (expected 3 M).\n');
  write(s.main, readThenStart(p));
  run('L12 a brief named with backslashes', 'deny', s, hookIn(s, p), 'B-BAD.md'); }
{ const s = setup({ state: '# state\nSession abcd1234, Opus.\n- Cap agreed with the owner (answered "Approve 110 M"): 110 M tokens for this piece.\n' });
  const p = 'Find the file that defines X.'; write(s.main, readThenStart(p));
  run('L10 no limit under a cap', 'deny', s, hookIn(s, p), 'cap of 110.0 M'); }

// ---- 2. the meter ----
{ const s = setup(); write(s.main, [asst('m1', [{ type: 'text', text: 'starting' }, use('toolu_X', 'Agent', { prompt: GOOD })], 1)]);
  run('M1 no reading at all', 'deny', s, hookIn(s), 'read the meter'); }
{ const s = setup(); write(s.main, [asst('m1', [use('tu_u', GU)], 0), user([res('tu_u', usage(87))], 0), asst('m1', [use('toolu_X', 'Agent', { prompt: GOOD })], 0)]);
  run('M2 the reading in the same message as the start (r57-0615)', 'deny', s, hookIn(s), 'read the meter'); }
{ const s = setup(); write(s.main, [...readThenStart().slice(0, 2), asst('m2', [use('toolu_A', 'Agent', { prompt: GOOD })], 1), user([res('toolu_A', 'launched')], 1), asst('m3', [use('toolu_X', 'Agent', { prompt: GOOD })], 2)]);
  run('M3 a second wave with no new reading', 'deny', s, hookIn(s), 'previous wave'); }
{ const s = setup(); write(s.main, [...readThenStart().slice(0, 2), asst('m2', [use('toolu_A', 'Agent', { prompt: GOOD })], 1), asst('m2', [use('toolu_X', 'Agent', { prompt: GOOD })], 1)]);
  run('M4 the second start of one wave, read before it', 'allow', s, hookIn(s)); }
{ const s = setup(); write(s.main, [...readThenStart().slice(0, 2), asst('m2', [use('toolu_A', 'Agent', { prompt: GOOD })], 1), user([res('toolu_A', 'tier hook: pass the model', true)], 1), asst('m3', [use('toolu_X', 'Agent', { prompt: GOOD })], 2)]);
  run('M5 a refused start is not a wave', 'allow', s, hookIn(s)); }
{ const s = setup(); write(s.main, readThenStart());
  run('M6 a reading 30 min old (span 26 min, r57-0183)', 'deny', { ...s, now: at(30) }, hookIn(s), 'min old'); }
{ const s = setup(); write(s.main, readThenStart());
  run('M7 a reading 20 min old', 'allow', { ...s, now: at(20) }, hookIn(s)); }
{ const s = setup({ state: '# state\nSession abcd1234.\nMeter line: 86 % (r57-0037)\n' }); write(s.main, readThenStart(GOOD, 87));
  run('M8 the reading past the meter line (87 % against 86 %, r57-0615)', 'deny', s, hookIn(s), 'line'); }
{ const s = setup({ state: '# state\nSession abcd1234.\nMeter line: 86 % (r57-0037)\n' }); write(s.main, readThenStart(GOOD, 80));
  run('M9 the reading under the meter line', 'allow', s, hookIn(s)); }
{ const s = setup(); write(s.main, readThenStart().slice(0, 2));
  run('M10 the start not yet in the file, the reading the last message', 'deny', s, hookIn(s), 'same message as this start'); }
// T8-FIX, B2: at PreToolUse the start's own message is often not in the file; the app's api-request line, written when
// it sent the request for that message, shows the reading's message is finished (t8-0105). Before the fix: refused.
const apiReq = (min) => ({ type: 'api-request', sessionId: SESS, id: 'req', timestamp: at(min), querySource: 'sdk', params: { model: 'claude-opus-5-5' } });
{ const s = setup(); write(s.main, [...readThenStart().slice(0, 2), apiReq(1)]);
  run('M14 the start not yet in the file, a request sent after the reading (B2)', 'allow', s, hookIn(s)); }
{ const s = setup(); write(s.main, [apiReq(0), asst('m1', [use('tu_u', GU)], 0), user([res('tu_u', usage(33))], 0)]);
  run('M15 a request before the reading only: the reading may be in this start\'s message', 'deny', s, hookIn(s), 'same message as this start'); }
{ const s = setup(); write(s.main, [...readThenStart().slice(0, 2), apiReq(1), asst('m2', [use('toolu_A', 'Agent', { prompt: GOOD })], 1), user([res('toolu_A', 'fanout gate: no request', true)], 1), apiReq(1)]);
  run('M16 the retry after a refused first try (the live case of 2026-11-24)', 'allow', s, hookIn(s));
  const logged = readFileSync(join(s.root, '.claude', 'logs', 'fanout-gate.jsonl'), 'utf8').trim().split(String.fromCharCode(10)).pop();
  const ok = JSON.parse(logged).tu === 'toolu_X'; if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} M17 the log names the start's tool_use id (the count gate and a reader can match it)`); }
{ const s = setup(); write(s.main, [...readThenStart().slice(0, 2), asst('m2', [{ type: 'text', text: 'gate passes' }], 1)]);
  run('M11 the start not yet in the file, a later message after the reading', 'allow', s, hookIn(s)); }
{ const s = setup(); const sub = join(s.proj, SESS, 'subagents', 'agent-a1b2c3.jsonl');
  write(s.main, readThenStart()); // the session read the meter; the helper did not
  write(sub, [asst('h1', [use('toolu_X', 'Agent', { prompt: GOOD })], 1)]);
  run('M12 a helper starting a helper reads its own meter', 'deny', s, hookIn(s, GOOD, { agent_id: 'a1b2c3', agent_type: 'general-purpose' }), 'read the meter'); }
{ const s = setup(); const sub = join(s.proj, SESS, 'subagents', 'agent-a1b2c3.jsonl');
  write(s.main, [asst('m0', [{ type: 'text', text: 'hi' }], 0)]);
  write(sub, readThenStart());
  run('M13 a helper with its own reading', 'allow', s, hookIn(s, GOOD, { agent_id: 'a1b2c3', agent_type: 'general-purpose' })); }

// ---- 3. the cap ----
const CAP = '# state\nSession abcd1234, Opus.\n- Cap agreed with the owner: 20 M tokens for this piece.\n';
function capCase(name, want, { finished = false, limit = 6, expected = 4, extraStart = false, handEnd = false } = {}, text) {
  const s = setup({ state: CAP });
  const p = `token limit ${limit} M (expected about ${expected} M, basis r57-0173)`;
  write(s.main, [
    asst('m0', [use('toolu_H', 'Agent', { prompt: 'token limit 10 M (expected about 7 M, basis r57-0165)' })], -5, tok(3e6)),
    user([res('toolu_H', 'launched')], -5),
    asst('m1', [use('tu_u', GU)], 0, tok(2e6)), user([res('tu_u', usage(40))], 0),
    ...(extraStart ? [asst('m2', [use('toolu_B', 'Agent', { prompt: 'token limit 5 M (expected about 3 M, basis r57-0165)' })], 1)] : []),
    asst('m2', [use('toolu_X', 'Agent', { prompt: p })], 1),
  ]);
  const sub = join(s.proj, SESS, 'subagents', 'agent-h1');
  write(sub + '.jsonl', [asst('h1', [{ type: 'text', text: 'work' }], -4, tok(2e6))]);
  writeFileSync(sub + '.meta.json', JSON.stringify({ toolUseId: 'toolu_H', description: 'build: H', ...(finished ? { finished: true } : {}) }));
  if (handEnd) { mkdirSync(join(s.root, '.claude', 'logs'), { recursive: true }); writeFileSync(join(s.root, '.claude', 'logs', 'count-gate.jsonl'), JSON.stringify({ t: 1, ev: 'end', agent: 'h1', manual: true, why: 'killed by a restart' }) + String.fromCharCode(10)); }
  run(name, want, s, hookIn(s, p), text);
}
capCase('C1 spent 7 M + running rest 8 M + this 6 M = 21 M past a 20 M cap (r57-0614)', 'deny', {}, 'past the cap');
capCase('C2 the same with a 4 M limit: 19 M', 'allow', { limit: 4, expected: 3 });
capCase('C3 the helper finished: its rest is free', 'allow', { finished: true });
capCase('C5 a helper killed by a restart, ended by hand in the count gate: its rest is free', 'allow', { handEnd: true });
capCase('C4 a start of the same message with no helper file yet counts whole', 'deny', { limit: 4, expected: 3, extraStart: true }, 'past the cap');

// ---- 4. not the gate's business, and failures ----
{ const s = setup(); run('X1 another tool', 'allow', s, { ...hookIn(s), tool_name: 'Read', tool_input: { file_path: 'a' } }); }
{ const s = setup(); run('X2 unreadable input', 'allow', s, 'not json'); }
{ const s = setup(); run('X3 no transcript at all (fails open, logged)', 'allow', s, { ...hookIn(s), transcript_path: join(s.proj, 'missing.jsonl') }); }

// ---- 5. kit mode (harness kit, 2026-11-25): --harness-kit "--project=<folder>" [--no-usage-tool] ----
// A clone in the temp folder (its .claude/hooks/ holds a copy of this hook and kit-mode.mjs; its harness-kit/basis.json
// the kit's measured costs) and her project, with no library/: state, briefs and her own basis under .harness/.
if (existsSync(resolve(here, 'kit-mode.mjs'))) {
  const KC = join(base, 'kit-clone'), KH = join(KC, '.claude', 'hooks');
  mkdirSync(KH, { recursive: true }); mkdirSync(join(KC, 'harness-kit'), { recursive: true });
  copyFileSync(HOOK, join(KH, 'fanout-gate.mjs')); copyFileSync(resolve(here, 'kit-mode.mjs'), join(KH, 'kit-mode.mjs'));
  writeFileSync(join(KC, 'harness-kit', 'basis.json'), JSON.stringify([
    { id: 'r58-0104', status: 'measured', date: '2026-11-25', claim: 'a Sonnet builder of one small script used 0.20 M' },
    { id: 'r57-0418', status: 'reasoned', date: '2026-11-21', claim: 'a guess' }]));
  let kn = 0;
  const kitSetup = ({ state = null, own = true, journal = false } = {}) => {
    const P = join(base, 'her' + (++kn));
    mkdirSync(join(P, '.harness', 'briefs'), { recursive: true });
    if (own) writeFileSync(join(P, '.harness', 'basis.json'), JSON.stringify([{ id: 'own-0001', status: 'measured', date: '2026-11-26', claim: 'read: schema, 0.6 M' }]));
    if (state) writeFileSync(join(P, '.harness', 'TEAM-STATE.md'), state);
    if (journal) { mkdirSync(join(P, 'library', 'journal', 'd'), { recursive: true }); writeFileSync(join(P, 'library', 'journal', 'd', 'x.jsonl'), '{"id":"r57-0165","kind":"fact","status":"measured","claim":"x"}\n'); }
    const proj = join(P, 'transcripts');
    mkdirSync(join(proj, SESS, 'subagents'), { recursive: true });
    return { root: P, proj, main: join(proj, SESS + '.jsonl') };
  };
  const kitRun = (name, want, s, input, expectText, extra = [], logText) => {
    const r = runHook(join(KH, 'fanout-gate.mjs'), ['--harness-kit', `--project=${s.root}`, ...extra], {
      input: JSON.stringify(input), env: { ...process.env, FANOUT_GATE_ROOT: join(base, 'not-this'), FANOUT_GATE_NOW: at(2) }, encoding: 'utf8' });
    const got = r.status === 2 ? 'deny' : r.status === 0 ? 'allow' : 'exit ' + r.status;
    let ok = got === want && (!expectText || (r.stderr || '').includes(expectText));
    if (ok && logText) { let lg = ''; try { lg = readFileSync(join(s.root, '.claude', 'logs', 'fanout-gate.jsonl'), 'utf8'); } catch {} ok = lg.includes(logText); }
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got}${r.stderr ? ' | ' + r.stderr.trim().slice(0, 150) : ''}`);
  };
  const L = (basis, lim = 2, exp = 1) => `token limit ${lim} M (expected about ${exp} M, basis ${basis})`;
  { const s = kitSetup(); write(s.main, readThenStart(L('r58-0104')));
    kitRun('K1 kit: a basis from the clone\'s harness-kit/basis.json passes; the log is under the project', 'allow', s, hookIn(s, L('r58-0104')), null, [], '"decision":"allow"'); }
  { const s = kitSetup(); write(s.main, readThenStart(L('own-0001')));
    kitRun('K2 kit: a basis from her own .harness/basis.json passes', 'allow', s, hookIn(s, L('own-0001'))); }
  { const s = kitSetup(); write(s.main, readThenStart(L('r57-0165')));
    kitRun('K3 kit: a record in neither basis file, no record book: refused', 'deny', s, hookIn(s, L('r57-0165')), 'is not in library/journal, harness-kit/basis.json or .harness/basis.json'); }
  { const s = kitSetup({ journal: true }); write(s.main, readThenStart(L('r57-0165')));
    kitRun('K4 kit: the project\'s own library/journal counts where it exists', 'allow', s, hookIn(s, L('r57-0165'))); }
  { const s = kitSetup(); write(s.main, readThenStart(L('r57-0418')));
    kitRun('K5 kit: an entry of basis.json that is not measured or observed: refused', 'deny', s, hookIn(s, L('r57-0418')), 'is a measured or observed record'); }
  { const s = kitSetup(); write(s.main, [asst('m2', [use('toolu_X', 'Agent', { prompt: L('r58-0104') })], 1)]);
    kitRun('K6 kit: no meter reading, a usage tool exists: refused (rule 5 as today)', 'deny', s, hookIn(s, L('r58-0104')), 'read the meter'); }
  { const s = kitSetup(); write(s.main, [asst('m2', [use('toolu_X', 'Agent', { prompt: L('r58-0104') })], 1)]);
    kitRun('K7 kit --no-usage-tool: no meter reading passes and the log says the meter rule is off', 'allow', s, hookIn(s, L('r58-0104')), null, ['--no-usage-tool'], 'meter rule off: --no-usage-tool'); }
  { const s = kitSetup(); const p = L('r58-0104', 1, 1); write(s.main, [asst('m2', [use('toolu_X', 'Agent', { prompt: p })], 1)]);
    kitRun('K8 kit --no-usage-tool: a limit not above its expected figure is still refused', 'deny', s, hookIn(s, p), 'is not above the expected', ['--no-usage-tool']); }
  { const s = kitSetup({ state: '# her state\nSession abcd1234, Opus.\nCap agreed: 20 M tokens for this piece.\n' }); write(s.main, readThenStart('Build it.'));
    kitRun('K9 kit: a cap in .harness/TEAM-STATE.md refuses a start with no limit', 'deny', s, hookIn(s, 'Build it.'), '.harness/TEAM-STATE.md'); }
  { const s = kitSetup(); writeFileSync(join(s.root, '.harness', 'briefs', 'B1.md'), '# brief\n' + L('own-0001') + '\n'); const p = 'Read briefs/B1.md and build it.';
    write(s.main, readThenStart(p));
    kitRun('K10 kit: the limit line of a brief under .harness/briefs/ is read', 'allow', s, hookIn(s, p), null, [], '"in":"B1.md"'); }
  { const s = kitSetup(); write(s.main, readThenStart(L('r58-0104')));
    run('K11 without --harness-kit the kit\'s basis files are not read: refused', 'deny', { root: s.root }, hookIn(s, L('r58-0104')), 'is not in library/journal;'); }
  // Repair F2 (2026-11-26): at the cap, kit mode names the count gate's --end with this machine's paths, and --status.
  { const s = kitSetup({ state: '# her state\nSession abcd1234, Opus.\nCap agreed: 20 M tokens for this piece.\n' });
    const p = L('r58-0104', 6, 4);
    write(s.main, [
      asst('m0', [use('toolu_H', 'Agent', { prompt: L('r58-0104', 10, 7) })], -5, tok(3e6)), user([res('toolu_H', 'launched')], -5),
      asst('m1', [use('tu_u', GU)], 0, tok(2e6)), user([res('tu_u', usage(40))], 0),
      asst('m2', [use('toolu_X', 'Agent', { prompt: p })], 1)]);
    const sub = join(s.proj, SESS, 'subagents', 'agent-h1');
    write(sub + '.jsonl', [asst('h1', [{ type: 'text', text: 'work' }], -4, tok(2e6))]);
    writeFileSync(sub + '.meta.json', JSON.stringify({ toolUseId: 'toolu_H', description: 'build: H' }));
    const sl = (x) => x.replace(/\\/g, '/');
    const tail = ` --end <helper id> "<why>" --harness-kit "--clone=${sl(KC)}" "--project=${sl(s.root)}"`;
    const r = runHook(join(KH, 'fanout-gate.mjs'), ['--harness-kit', `--project=${s.root}`], {
      input: JSON.stringify(hookIn(s, p)), env: { ...process.env, FANOUT_GATE_ROOT: join(base, 'not-this'), FANOUT_GATE_NOW: at(2) }, encoding: 'utf8' });
    const e = r.stderr || '';
    const ok = r.status === 2 && e.includes('past the cap') && /count-gate[.a-z]*"$/.test(e.slice(0, e.indexOf(tail)))
      && e.includes(tail) && e.includes(`--status abcd1234 --harness-kit "--clone=${sl(KC)}" "--project=${sl(s.root)}"`);
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} K12 kit: the refusal at the cap names the count gate's --end and --status with this machine's paths: ${r.status} | ${e.trim().slice(0, 400)}`); }
} else console.log('skip  kit mode: kit-mode.mjs is not beside the hook');

rmSync(base, { recursive: true, force: true });
console.log(failed ? `${failed} FAILED of ${n} roots` : `all passed (${HOOK.split(/[\\/]/).pop()})`);
process.exit(failed ? 1 : 0);
