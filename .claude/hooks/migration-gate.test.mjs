// Self-tests of the migration gate. Run: node .claude/hooks/migration-gate.test.mjs
// Each refusal case fails if its rule is taken out of migration-gate.mjs; each allow case shows the rule does not reach
// unrelated work. It builds a made-up repository (a git checkout) in a temporary folder, with copies of the real PLAN.md,
// SRS.md, CHECKS.md, FAILURE-MODES.md and SKILLS.md, made-up transcripts and journal records, and removes it at the end.
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, rmSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), REPO = resolve(here, '..', '..');
const HOOK = join(here, 'migration-gate.mjs');
const ROOT = mkdtempSync(join(tmpdir(), 'migration-gate-'));
const MIG = 'docs/program/monitor/round9/migration', RUST = 'docs/program/monitor/round9/rust', CK = MIG + '/checks';
const P = (...a) => join(ROOT, ...a);
const SESS = 'feedf00d-0000-0000-0000-000000000000', PROJ = P('projects'), MAIN = join(PROJ, SESS + '.jsonl'), SUB = join(PROJ, SESS, 'subagents');
const PREFLIGHT = P('ctl', 'preflight.json');
let pass = 0, fail = 0;

// ---- the made-up repository ----------------------------------------------------------------------------------------
const w = (rel, text) => { mkdirSync(dirname(P(rel)), { recursive: true }); writeFileSync(P(rel), text); };
for (const f of ['PLAN.md', 'SRS.md', 'CHECKS.md', 'FAILURE-MODES.md', 'SKILLS.md']) { mkdirSync(P(MIG), { recursive: true }); copyFileSync(join(REPO, MIG, f), P(MIG, f)); }
appendFileSync(P(MIG, 'SRS.md'), '\nowner: r57-9001\n'); // an approved change of the past: a later change must name its own
w(CK + '/run.mjs', "import fs from 'node:fs';\nconst ids = ['C-001', 'C-003', 'FM-05.refuse'];\nconst ctl = process.env.MG_CTL;\nif (ctl) { fs.appendFileSync(ctl + '/called.txt', process.argv.slice(2).join(' ') + '\\n'); process.exit(Number(fs.readFileSync(ctl + '/exit.txt', 'utf8'))); }\n");
w(CK + '/README.md', '# checks\n');
w(CK + '/allow-list.txt', '#[allow(clippy::exit)] // the hook program returns its code\n');
w('.gitignore', '.claude/logs/\nctl/\nprojects/\nlibrary/\n');
w('ctl/exit.txt', '1');
const rec = (id, status) => JSON.stringify({ id, kind: 'ruling', status, claim: 'x' });
w('library/journal/2026-11-24/r57.jsonl', [rec('r57-9001', 'owner'), rec('r57-9002', 'reasoned')].join('\n') + '\n');
w('library/journal/2026-11-20/r57.jsonl', rec('r57-9003', 'owner') + '\n');
const g = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'core.autocrlf', 'false');
g('add', '-A'); g('commit', '-q', '-m', 'base');

// transcripts: the main session (the owner's, not a migration session) and helpers
const user = (text) => JSON.stringify({ type: 'user', timestamp: new Date().toISOString(), message: { role: 'user', content: text } });
mkdirSync(SUB, { recursive: true });
writeFileSync(MAIN, user('Look at the session tool and tell me what changed today.') + '\n');
function helper(id, desc, prompt, extra = '') { writeFileSync(join(SUB, `agent-${id}.jsonl`), user(prompt) + '\n' + extra); writeFileSync(join(SUB, `agent-${id}.meta.json`), JSON.stringify({ description: desc, toolUseId: 'tu-' + id })); }
const MPROMPT = `build: step 1.1, the reader. Port into ${RUST}/crates/reader. Read SRS.md, FAILURE-MODES.md, rust-best-practices.`;
for (const id of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']) helper(id, 'build: step 1.1 reader', MPROMPT, id === 'm3' ? JSON.stringify({ type: 'attachment', attachment: { type: 'hook_additional_context', content: ['MIGRATION-GATE-CONTEXT ...'] } }) + '\n' : '');
helper('u1', 'build: the floor checks runner', 'build: write the checks runner; read docs/x/brief.md.');
helper('bi', 'build-invariant: step 2.0 checks', `build-invariant: step 2.0, the level-2 checks in ${CK}. SRS.md, FAILURE-MODES.md, rust-guidelines.`);

// ---- running the hook ----------------------------------------------------------------------------------------------
const env = { ...process.env, MIGRATION_GATE_ROOT: ROOT, MIGRATION_GATE_PREFLIGHT: PREFLIGHT, MG_CTL: P('ctl') };
const ev = (event, tool, input, agent, extra = {}) => ({ hook_event_name: event, session_id: SESS, transcript_path: MAIN, cwd: ROOT, tool_name: tool, tool_input: input, ...(agent ? { agent_id: agent } : {}), ...extra });
const hook = (input, raw) => spawnSync(process.execPath, [HOOK], { input: raw ?? JSON.stringify(input), env, encoding: 'utf8' });
function expect(name, r, want, re) {
  const got = r.status === 2 ? 'deny' : r.status === 0 ? 'allow' : 'exit ' + r.status;
  const ok = got === want && (!re || re.test(r.stdout + r.stderr));
  ok ? pass++ : fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got}${ok ? '' : ' | ' + (r.stderr || r.stdout).trim().slice(0, 200)}`);
}
const pre = (tool, input, agent) => hook(ev('PreToolUse', tool, input, agent));
const bash = (command, agent, tool = 'Bash') => pre(tool, { command }, agent);
const abs = (rel) => P(rel);
const NAMES = 'Read SRS.md and FAILURE-MODES.md first.';

// 1. Context: migration starts name the requirements; the helper is given the floors
const start = (description, prompt, model = 'sonnet', tool = 'Agent') => pre(tool, tool === 'Agent' ? { description, prompt, model } : { title: description, prompt, model });
expect('1 a step 1.1 build start naming no requirement is refused', start('build: step 1.1 reader', `Port ${RUST}/crates/reader.`), 'deny', /SRS\.md, FAILURE-MODES\.md, rust-best-practices/);
expect('1 the same start naming SRS, FAILURE-MODES and its skill passes', start('build: step 1.1 reader', `Port ${RUST}/crates/reader. ${NAMES} Skill: rust-best-practices.`), 'allow');
expect('1 step 1.3 without the Microsoft excerpt (skill M) is refused', start('build-invariant: step 1.3 the fences', `${RUST}/crates/server/src/guard.rs. ${NAMES} rust-best-practices.`, 'opus'), 'deny', /rust-guidelines/);
expect('1 step 1.3 with skills R and M passes', start('build-invariant: step 1.3 the fences', `${RUST}/crates/server/src/guard.rs. ${NAMES} rust-best-practices, rust-guidelines excerpt.`, 'opus'), 'allow');
w(MIG + '/briefs/STEP-1.1.md', `# Step 1.1\nRead SRS.md, FAILURE-MODES.md and skills/vendor/rust-best-practices/SKILL.md.\n`);
expect('1 the names may come from the brief the prompt points at', start('build: step 1.1 reader', `Read your brief ${MIG}/briefs/STEP-1.1.md.`), 'allow');
expect('1 PLAN.md is not a brief: pointing at it does not name the skills', start('build: step 1.1 reader', `Follow ${MIG}/PLAN.md.`), 'deny');
expect('1 a build start pointed at the Rust workspace with no step is refused', start('build: reader', `Port ${RUST}/crates/reader. ${NAMES}`), 'deny', /name its step/);
expect('1 a step PLAN.md does not have is refused', start('build: step 1.9 extra', `${RUST}/crates/x. ${NAMES}`), 'deny', /not a step/);
expect('1 a child session for the migration naming nothing is refused', start('orchestrate: the migration', `Run ${MIG}/PLAN.md level 1.`, 'opus', 'mcp__ccd_session__start_session'), 'deny', /session/);
expect('1 the development session naming SRS and FAILURE-MODES passes (steps it coordinates are not its own)', start('orchestrate: the migration', `Run ${MIG}/PLAN.md: step 0.1, then step 1.1 to step 1.6. ${NAMES}`, 'opus', 'mcp__ccd_session__start_session'), 'allow');
expect('1 an unrelated start passes untouched', start('read: the library board', 'Summarise library/INDEX.md.'), 'allow');
const ss = hook(ev('SubagentStart', undefined, undefined, 'm1'));
expect('1 SubagentStart gives a migration helper the floors and failure-mode rules', ss, 'allow', /MIGRATION-GATE-CONTEXT[\s\S]*R-001[\s\S]*FM-05/);
const su = hook(ev('SubagentStart', undefined, undefined, 'u1'));
expect('1 SubagentStart gives an unrelated helper nothing', { ...su, stdout: su.stdout || 'EMPTY' }, 'allow', /^EMPTY$/);
expect('1 a migration helper\'s first gated call gets the context if it is not in its transcript', bash('ls', 'm2'), 'allow', /MIGRATION-GATE-CONTEXT/);
const second = bash('ls', 'm2');
expect('1 ... and only once', { ...second, stdout: second.stdout || 'EMPTY' }, 'allow', /^EMPTY$/);
const m3 = bash('ls', 'm3');
expect('1 no second copy when the transcript already holds it', { ...m3, stdout: m3.stdout || 'EMPTY' }, 'allow', /^EMPTY$/);

// 2. Floors cannot be weakened by builders
const srs = abs(MIG + '/SRS.md');
expect('2 an Edit of SRS.md naming no owner record is refused', pre('Edit', { file_path: srs, old_string: 'R-001', new_string: 'R-001 lower' }), 'deny', /owner/);
expect('2 an owner line already in the file does not pass a new change', pre('Edit', { file_path: srs, old_string: 'R-002', new_string: 'R-002 lower' }), 'deny');
expect('2 an Edit naming an owner record (status owner, dated 2026-11-24 or later) passes', pre('Edit', { file_path: srs, old_string: 'R-001', new_string: 'R-001 raised\nowner: r57-9001' }), 'allow');
expect('2 a record that is not the owner\'s does not pass', pre('Edit', { file_path: srs, old_string: 'R-001', new_string: 'x\nowner: r57-9002' }), 'deny');
expect('2 an owner record from before the migration files does not pass', pre('Edit', { file_path: srs, old_string: 'R-001', new_string: 'x\nowner: r57-9003' }), 'deny');
expect('2 a Write over FAILURE-MODES.md by a helper is refused', pre('Write', { file_path: abs(MIG + '/FAILURE-MODES.md'), content: 'x' }, 'm1'), 'deny');
expect('2 a shell append to SRS.md is refused', bash(`echo x >> ${MIG}/SRS.md`), 'deny', /owner/);
expect('2 a shell append naming an owner record passes', bash(`echo x >> ${MIG}/SRS.md # owner: r57-9001`), 'allow');
expect('2 sed -i on FAILURE-MODES.md is refused', bash(`sed -i 's/a/b/' ${MIG}/FAILURE-MODES.md`), 'deny');
expect('2 PowerShell Set-Content on SKILLS.md is refused', bash(`Set-Content -Path ${MIG.replace(/\//g, '\\')}\\SKILLS.md -Value x`, null, 'PowerShell'), 'deny');
expect('2 git checkout -- CHECKS.md is refused', bash(`git checkout -- ${MIG}/CHECKS.md`), 'deny');
expect('2 a bare name after cd into the folder is refused', bash(`cd ${MIG} && printf x > CHECKS.md`), 'deny');
expect('2 reading SRS.md passes', bash(`cat ${MIG}/SRS.md | head -5; grep -n Floor ${MIG}/SRS.md`), 'allow');
expect('2 copying SRS.md elsewhere passes (only the destination is written)', bash(`cp ${MIG}/SRS.md /tmp/srs-copy.md`), 'allow');
const run = abs(CK + '/run.mjs'), runText = readFileSync(run, 'utf8');
expect('2 while the checks builder works (no tokens line yet), a build helper may write checks/', pre('Edit', { file_path: run, old_string: 'const ids', new_string: 'const idz' }, 'u1'), 'allow');
w(CK + '/README.md', '# checks\n\nbuild: RCHK checks | calls 40 | tokens 3.10 M | context now 120 K\n');
expect('2 once it has finished, a build helper may not change checks/*.mjs', pre('Edit', { file_path: run, old_string: "'C-001', ", new_string: "'C-001', 'C-002', " }, 'u1'), 'deny', /build-invariant/);
expect('2 a build-invariant helper dropping a listed check id is refused', pre('Edit', { file_path: run, old_string: "'C-003', ", new_string: '' }, 'bi'), 'deny', /C-003/);
expect('2 a build-invariant helper adding a check passes', pre('Edit', { file_path: run, old_string: "'C-001', ", new_string: "'C-001', 'C-002', " }, 'bi'), 'allow');
w(CK + '/more.mjs', "export const moved = ['C-003'];\n");
expect('2 moving an id to another checks file passes', pre('Edit', { file_path: run, old_string: "'C-003', ", new_string: '' }, 'bi'), 'allow');
expect('2 the main session dropping an id is refused too', pre('Write', { file_path: run, content: runText.replace("'FM-05.refuse'", '') }), 'deny', /FM-05\.refuse/);
expect('2 a shell write to checks/run.mjs is refused (its ids cannot be read)', bash(`echo '//' >> ${CK}/run.mjs`), 'deny', /Write or Edit/);
expect('2 running the floor check passes', bash(`node ${CK}/run.mjs --level 1 > /tmp/out.txt 2>&1 | tee log.txt`), 'allow');

// 4. Routes
expect('4 a migration start on Fable is refused (r57-0082)', start('build: step 1.1 reader', `${RUST}/crates/reader. ${NAMES} rust-best-practices.`, 'fable'), 'deny', /r57-0082/);
expect('4 step 1.3 (build-invariant in PLAN.md) as build is refused', start('build: step 1.3 the fences', `${RUST}/crates/server. ${NAMES} rust-best-practices rust-guidelines.`), 'deny', /build-invariant/);
expect('4 step 1.1 raised to build-invariant (the trial\'s Opus retry) passes', start('build-invariant: step 1.1 reader retry', `${RUST}/crates/reader. ${NAMES} rust-best-practices.`, 'opus'), 'allow');

// 5. Failure modes at the call
for (const c of ['git stash', 'git stash pop', 'cargo clean', 'git -C x reset HEAD --hard', `git checkout -- ${RUST}/crates/reader/src/lib.rs`, 'git clean -fd', 'git restore .'])
  expect(`5 FM-05 a migration builder's "${c}" is refused`, bash(c, 'm1'), 'deny', /FM-05/);
expect('5 FM-05 the same command from an unrelated helper passes', bash('git stash list', 'u1'), 'allow');
expect('5 FM-05 git status passes', bash('git status --short', 'm1'), 'allow');
const post = (agent, command, stdout) => hook(ev('PostToolUse', 'Bash', { command }, agent, { tool_response: { stdout, stderr: '' } }));
const errs = (n) => Array.from({ length: n }, (_, i) => `error[E0308]: mismatched types ${i}`).join('\n');
post('m4', 'cargo build', errs(3)); post('m4', 'cargo check --message-format short', errs(3).replace(/^/gm, 'src/a.rs:1:1: ')); post('m4', 'cargo build', errs(4));
expect('5 FM-06 a cargo run after two runs without fewer errors is refused', bash('cargo build', 'm4'), 'deny', /FM-06/);
post('m5', 'cargo build', errs(3)); post('m5', 'cargo build', errs(2));
expect('5 FM-06 errors falling: cargo runs on', bash('cargo build', 'm5'), 'allow');
const rs = abs(RUST + '/crates/reader/src/lib.rs');
expect('5 FM-02 an added #[allow( line in a .rs file is refused', pre('Write', { file_path: rs, content: '#[allow(dead_code)]\nfn a() {}\n' }, 'm1'), 'deny', /FM-02/);
expect('5 FM-03 an added todo!() is refused', pre('Write', { file_path: rs, content: 'fn a() { todo!() }\n' }, 'm1'), 'deny', /FM-03/);
expect('5 a line the allow-list holds passes', pre('Write', { file_path: rs, content: '#[allow(clippy::exit)] // the hook program returns its code\nfn a() {}\n' }, 'm1'), 'allow');
expect('5 plain code passes', pre('Write', { file_path: rs, content: 'pub fn a() -> u32 { 1 }\n' }, 'm1'), 'allow');
post('m6', 'cargo build --release', 'LINK : fatal error LNK1104: cannot open file reader.exe');
expect('5 FM-07 a .rs edit after an environment error is refused', pre('Edit', { file_path: rs, old_string: 'a', new_string: 'b' }, 'm1'), 'deny', /FM-07/);
w('ctl/preflight.json', JSON.stringify({ pass: true }));
expect('5 FM-07 ... until the preflight passes again', pre('Write', { file_path: rs, content: 'pub fn b() {}\n' }, 'm1'), 'allow');
expect('2 a migration builder may not edit the hooks', pre('Edit', { file_path: abs('.claude/hooks/tier-hook.mjs'), old_string: 'a', new_string: 'b' }, 'm1'), 'deny', /hooks/);
expect('2 ... nor the settings through the shell', bash('echo {} > .claude/settings.json', 'm1'), 'deny');
expect('2 an unrelated helper editing a hook is not this gate\'s business', pre('Edit', { file_path: abs('.claude/hooks/tier-hook.mjs'), old_string: 'a', new_string: 'b' }, 'u1'), 'allow');

// 3. Nothing counts as done while a floor fails
const gate = (...a) => { const r = spawnSync(process.execPath, [HOOK, '--gate', ...a], { cwd: ROOT, env, encoding: 'utf8' }); return { ...r, status: r.status === 1 ? 2 : r.status }; }; // the gate refuses with exit 1, as git wants
const called = () => (existsSync(P('ctl/called.txt')) ? readFileSync(P('ctl/called.txt'), 'utf8') : '');
w(MIG + '/facts/F1.md', 'x'); g('add', '-A');
expect('3 before rust/Cargo.toml exists the gate lets migration commits through', gate(), 'allow'); g('commit', '-q', '-m', 'prep');
w('notes/a.md', 'x'); g('add', 'notes/a.md');
expect('3 a commit touching no migration file passes without the floor check', gate(), 'allow');
expect('3 ... and run.mjs was not run', { status: called() ? 1 : 0, stdout: '', stderr: called() }, 'allow'); g('commit', '-q', '-m', 'notes');
w(RUST + '/Cargo.toml', '[workspace]\n'); w(RUST + '/crates/reader/src/lib.rs', 'pub fn a() {}\n'); g('add', '-A');
expect('3 a commit touching the Rust workspace is refused while run.mjs --level 1 fails', gate(), 'deny', /level 1/);
w(RUST + '/crates/reader/src/lib.rs', 'pub fn a() { 1; }\n');
expect('3 unstaged changes under rust/ are refused (the tested tree is the committed tree)', gate(), 'deny', /staged/);
g('add', '-A'); w('ctl/exit.txt', '0');
expect('3 the floor check passing lets it through', gate(), 'allow');
w('ctl/exit.txt', '1');
expect('3 a pass is kept for the same files (no second run)', gate(), 'allow');
w(RUST + '/crates/picture/src/lib.rs', 'pub fn p() {}\n'); g('add', '-A'); w('ctl/exit.txt', '0'); writeFileSync(P('ctl/called.txt'), '');
expect('3 files of crates/picture run level 2', { ...gate(), stdout: called() }, 'allow', /--level 2/);
w('ctl/exit.txt', '1'); g('commit', '-q', '-m', 'rust base');
w(RUST + '/crates/reader/src/lib.rs', 'pub fn a() { 2; }\n'); g('add', '-A');
expect('3 in a session: a migration commit with --no-verify is refused', bash('git commit --no-verify -m "reader"'), 'deny', /no-verify/);
expect('3 in a session: a migration commit while pre-commit does not run the gate is refused', bash('git commit -m "reader"'), 'deny', /core\.hooksPath/);
const fwd = (x) => x.replace(/\\/g, '/');
w('ctl/hooks/pre-commit', `#!/bin/sh\nMIGRATION_GATE_ROOT='${fwd(ROOT)}' MG_CTL='${fwd(P('ctl'))}' node '${fwd(HOOK)}' --gate || exit 1\n`); g('config', 'core.hooksPath', P('ctl/hooks'));
expect('3 in a session: a plain migration commit goes on to pre-commit', bash('git commit -m "reader"'), 'allow');
expect('3 in a session: --no-verify with an owner record passes', bash('git commit --no-verify -m "reader" -m "owner: r57-9001"'), 'allow');
g('commit', '-q', '--no-verify', '-m', 'reader 2');
g('checkout', '-q', '-b', 'feat'); w(RUST + '/crates/reader/src/lib.rs', 'pub fn a() { 3; }\n'); g('add', '-A'); g('commit', '-q', '--no-verify', '-m', 'feat'); g('checkout', '-q', 'main');
expect('3 merging a branch whose migration files never passed is refused', bash('git merge feat'), 'deny', /never passed/);
expect('3 merge --no-commit passes (the commit after it runs the gate)', bash('git merge --no-commit feat'), 'allow');
g('checkout', '-q', 'feat'); w('ctl/exit.txt', '0'); gate('--level', '1'); w('ctl/exit.txt', '1'); g('checkout', '-q', 'main');
expect('3 merging it after its files passed the gate passes', bash('git merge feat -m "land feat"'), 'allow');
w(RUST + '/crates/reader/src/lib.rs', 'pub fn a() { 4; }\n'); g('add', '-A'); g('commit', '-q', '--no-verify', '-m', 'main side');
expect('3 a merge where both sides changed the migration is refused', bash('git merge feat'), 'deny', /both/);
expect('3 git pull is refused once the migration has started', bash('git pull'), 'deny', /fetch/);
expect('3 an unrelated merge passes', (() => { g('checkout', '-q', '-b', 'other', 'main'); w('notes/b.md', 'y'); g('add', '-A'); expect('3 an unrelated commit with --no-verify passes', bash('git commit --no-verify -m o'), 'allow'); g('commit', '-q', '-m', 'o'); g('checkout', '-q', 'main'); return bash('git merge other'); })(), 'allow');

// failing open on unrelated calls
expect('unreadable input passes', hook(null, 'not json'), 'allow');
expect('an unrelated Bash call passes', bash('ls -la', 'u1'), 'allow');
expect('an unrelated Write passes', pre('Write', { file_path: abs('notes/c.md'), content: 'TODO' }), 'allow');

try { rmSync(ROOT, { recursive: true, force: true }); } catch {}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
