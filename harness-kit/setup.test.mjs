// Test of harness-kit/setup.mjs. Run: node harness-kit/setup.test.mjs
// Each case copies setup.mjs into a made-up clone in a temp folder (stub hooks, a stub Rust workspace, no git), runs it
// as a separate process from another folder, and checks what it leaves. cargo is a stand-in (HARNESS_KIT_CARGO): a
// small Node script that logs its arguments and writes empty "programs" into CARGO_TARGET_DIR/release, or fails the
// way cargo fails offline. Nothing is written in the repository and nothing is built or downloaded.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, rmSync, readdirSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepStrictEqual } from 'node:assert';
import { isOurs, hookOf, KIT } from './setup.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SETUP = join(HERE, 'setup.mjs');
const EXAMPLE = join(HERE, 'parallel', 'kit.example.json');
const EXE = process.platform === 'win32' ? '.exe' : '';
const base = mkdtempSync(join(tmpdir(), 'kit-setup-test-'));
let n = 0, pass = 0, fail = 0;
function check(name, cond, extra = '') { cond ? pass++ : fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : '  ' + String(extra).slice(0, 600)}`); }
const fwd = (p) => p.replace(/\\/g, '/');

// ---- the stand-in for cargo ----
const FAKE = join(base, 'fake-cargo.mjs');
const LOG = join(base, 'fake-cargo.log');
writeFileSync(FAKE, `import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
const a = process.argv.slice(2), mode = process.env.FAKE_CARGO || 'ok';
appendFileSync(${JSON.stringify(LOG)}, JSON.stringify({ a, cwd: process.cwd(), target: process.env.CARGO_TARGET_DIR, auto: process.env.RUSTUP_AUTO_INSTALL ?? null }) + '\\n');
if (a[0] === '--version') {
  if (mode === 'toolchain') { console.error("error: toolchain '1.100.0-x86_64' is not installed"); process.exit(1); }
  console.log('cargo 1.100.0 (stand-in)'); process.exit(0);
}
if (mode === 'offline' && a.includes('--offline')) { console.error('error: no matching package named \`regex\` found\\nlocation searched: registry \`crates-io\`\\nAs a reminder, you\\'re using offline mode (--offline)'); process.exit(101); }
if (mode === 'broken') { console.error('error[E0308]: mismatched types'); process.exit(101); }
const skip = (process.env.FAKE_CARGO_SKIP || '').split(',');
const dir = join(process.env.CARGO_TARGET_DIR, 'release'); mkdirSync(dir, { recursive: true });
for (const p of ${JSON.stringify(KIT.map((k) => k.program).concat('kit-tokens'))}) if (!skip.includes(p)) writeFileSync(join(dir, p + ${JSON.stringify(EXE)}), 'x');
`);
const CARGO = JSON.stringify([process.execPath, FAKE]);
const logLines = () => (existsSync(LOG) ? readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const clearLog = () => rmSync(LOG, { force: true });

const LOCK = `version = 4

[[package]]
name = "kit-core"
version = "0.1.0"

[[package]]
name = "regex"
version = "1.11.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "00"

[[package]]
name = "serde_json"
version = "1.0.140"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "00"
`;
function clone(name = 'c' + ++n) {
  const root = join(base, name);
  mkdirSync(join(root, '.claude', 'hooks'), { recursive: true });
  mkdirSync(join(root, 'harness-kit', 'parallel'), { recursive: true });
  for (const h of ['window-ceiling', 'tier-hook', 'creep-gate', 'count-gate', 'fanout-gate']) writeFileSync(join(root, '.claude', 'hooks', h + '.mjs'), '');
  writeFileSync(join(root, '.claude', 'hooks', 'tier-routes.json'), '{}');
  copyFileSync(SETUP, join(root, 'harness-kit', 'setup.mjs'));
  copyFileSync(EXAMPLE, join(root, 'harness-kit', 'parallel', 'kit.example.json'));
  const rd = join(root, 'harness-kit', 'rust');
  for (const p of KIT.map((k) => k.program).concat('kit-core', 'kit-tokens')) { mkdirSync(join(rd, 'crates', p, 'src'), { recursive: true }); writeFileSync(join(rd, 'crates', p, 'src', 'main.rs'), '// x'); }
  writeFileSync(join(rd, 'Cargo.toml'), '[workspace]\n');
  writeFileSync(join(rd, 'Cargo.lock'), LOCK);
  writeFileSync(join(rd, 'rust-toolchain.toml'), '[toolchain]\nchannel = "1.100.0"\n');
  return { root, file: join(root, '.claude', 'settings.local.json'), R: fwd(root) };
}
function project(name = 'p' + ++n, git = false) {
  const root = join(base, name);
  mkdirSync(root, { recursive: true });
  if (git) spawnSync('git', ['init', '-q'], { cwd: root });
  return { root, file: join(root, '.claude', 'settings.local.json'), R: fwd(root) };
}
const run = (c, args = [], env = {}) => spawnSync(process.execPath, [join(c.root, 'harness-kit', 'setup.mjs'), ...args],
  { cwd: base, encoding: 'utf8', env: { ...process.env, HARNESS_KIT_CARGO: CARGO, FAKE_CARGO: 'ok', FAKE_CARGO_SKIP: '', ...env } });
const json = (f) => JSON.parse(readFileSync(f, 'utf8'));
const cmds = (s) => Object.values(s.hooks || {}).flat().flatMap((g) => g.hooks.map((h) => h.command));
const kitCmds = (s) => cmds(s).filter((x) => isOurs({ command: x }));
const prog = (c, p) => `"${c.R}/harness-kit/rust/target/release/${p}${EXE}"`;

const USER = {
  permissions: { allow: ['Bash(ls)'] },
  env: { X: '1' },
  hooks: {
    PreToolUse: [
      { matcher: '*', hooks: [{ type: 'command', command: 'node "/elsewhere/mine.mjs"' }] },
      { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo a' }, { type: 'command', command: 'node "/x/.claude/hooks/tier-hook.mjs"' }] },
    ],
    Stop: [{ hooks: [{ type: 'command', command: 'echo stop' }] }],
    PostToolUse: [],
  },
};

// ======== the 22 cases of the first set-up (commands are now the programs; six hooks, not three) ========
// 1. dry run changes nothing
{
  const c = clone();
  const r = run(c);
  check('dry run exits 0 and writes no file', r.status === 0 && !existsSync(c.file) && !existsSync(join(c.root, '.harness')) && !existsSync(join(c.root, 'harness-kit', 'rust', 'target')), r.stderr);
  check('dry run prints the six commands with the clone path in double quotes',
    KIT.every((k) => r.stdout.includes(`${prog(c, k.program)} --harness-kit "--clone=${c.R}" "--project=${c.R}"`)), r.stdout);
}
// 2. new file: apply, apply again, remove
{
  const c = clone();
  let r = run(c, ['--apply']);
  const s = json(c.file);
  const pre = s.hooks.PreToolUse;
  check('apply writes the six entries with the right events and matchers in order',
    r.status === 0 && pre.length === 5 && pre.map((g) => g.matcher).join(',') === '*,*,Agent|Task|SendMessage,Agent|Task,Agent|Task'
      && ['kit-window-ceiling', 'kit-tier-hook', 'kit-count-gate', 'kit-fanout-gate', 'kit-creep-gate'].every((p, i) => pre[i].hooks[0].command.startsWith(prog(c, p)))
      && s.hooks.SessionStart.length === 1 && !('matcher' in s.hooks.SessionStart[0]) && s.hooks.SessionStart[0].hooks[0].command.startsWith(prog(c, 'kit-start')), r.stdout + r.stderr + JSON.stringify(s));
  run(c, ['--apply']);
  check('apply twice leaves one set', cmds(json(c.file)).length === 6);
  r = run(c, ['--remove']);
  check('remove deletes a file that held only the kit entries', r.status === 0 && !existsSync(c.file), r.stdout + r.stderr);
  r = run(c, ['--remove']);
  check('remove with no file is a no-op', r.status === 0 && !existsSync(c.file));
}
// 3. merge into an existing file, then remove: the file is as it was
{
  const c = clone();
  writeFileSync(c.file, JSON.stringify(USER, null, 2));
  run(c, ['--apply']);
  const s = json(c.file);
  check('merge keeps every user entry and key', s.env.X === '1' && s.permissions.allow[0] === 'Bash(ls)'
    && cmds(s).includes('node "/elsewhere/mine.mjs"') && cmds(s).includes('echo stop') && cmds(s).includes('node "/x/.claude/hooks/tier-hook.mjs"')
    && kitCmds(s).length === 6, JSON.stringify(s));
  run(c, ['--apply']);
  check('merge twice: still one kit set', kitCmds(json(c.file)).length === 6);
  const r = run(c, ['--remove']);
  let same = false; try { deepStrictEqual(json(c.file), USER); same = true; } catch {}
  check('remove restores the file to what it held (an unmarked tier-hook entry of the user stays)', r.status === 0 && same, readFileSync(c.file, 'utf8'));
}
// 4. a kit entry inside a user's group: only it goes
{
  const c = clone();
  const mixed = { hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'echo keep' }, { type: 'command', command: 'node "/old/place/.claude/hooks/tier-hook.mjs" --harness-kit' }] }] } };
  writeFileSync(c.file, JSON.stringify(mixed));
  run(c, ['--remove']);
  const s = json(c.file);
  check('remove takes a marked entry out of a mixed group, keeps the rest', s.hooks.PreToolUse.length === 1 && s.hooks.PreToolUse[0].hooks.length === 1 && s.hooks.PreToolUse[0].hooks[0].command === 'echo keep');
}
// 5. refusals change nothing
{
  const c = clone();
  writeFileSync(c.file, '{ not json');
  let r = run(c, ['--apply']);
  check('invalid JSON: refused, file unchanged', r.status === 1 && readFileSync(c.file, 'utf8') === '{ not json');
  writeFileSync(c.file, '{"hooks": []}');
  r = run(c, ['--apply']);
  check('hooks not an object: refused, file unchanged', r.status === 1 && readFileSync(c.file, 'utf8') === '{"hooks": []}');
  const d = clone('with$dollar');
  r = run(d, ['--apply']);
  check('a clone path with $ is refused', r.status === 1 && !existsSync(d.file) && /cannot stand inside double quotes/.test(r.stderr), r.stderr);
  const e = clone();
  rmSync(join(e.root, '.claude', 'hooks', 'tier-routes.json'));
  r = run(e, ['--apply']);
  check('a clone without tier-routes.json is refused', r.status === 1 && !existsSync(e.file));
  r = run(e, ['--bogus']);
  check('an unknown argument is refused', r.status === 1);
}
// 6. the archived FixFlow skills and agents: switched off from what the clone holds, taken back exactly
function withFixflow(c) {
  for (const s of ['fixflow-orchestration', 'odoo-accounting-import', 'lean-thing']) mkdirSync(join(c.root, '.claude', 'skills', s), { recursive: true });
  writeFileSync(join(c.root, '.claude', 'skills', 'README.md'), 'x');
  mkdirSync(join(c.root, '.claude', 'agents'), { recursive: true });
  writeFileSync(join(c.root, '.claude', 'agents', 'fixflow-explorer.md'), '---\nname: fixflow-explorer\ntools: Read\n---\nx');
  writeFileSync(join(c.root, '.claude', 'agents', 'fixflow-odd-file.md'), '---\nname: fixflow-odd\n---\nx');
  writeFileSync(join(c.root, '.claude', 'agents', 'lean-read.md'), '---\nname: lean-read\n---\nx');
  return c;
}
{
  const c = withFixflow(clone());
  let r = run(c);
  check('dry run counts 2 skills and 2 agents', r.status === 0 && /switched off: 2 skills .* 2 agents/.test(r.stdout) && !existsSync(c.file), r.stdout);
  run(c, ['--apply']);
  const s = json(c.file);
  check('apply: skill folders off, lean-* and README not', s.skillOverrides['fixflow-orchestration'] === 'off' && s.skillOverrides['odoo-accounting-import'] === 'off'
    && !('lean-thing' in s.skillOverrides) && Object.keys(s.skillOverrides).length === 2, JSON.stringify(s.skillOverrides));
  check('apply: fixflow agents denied by frontmatter name, lean-read not', JSON.stringify(s.permissions.deny) === JSON.stringify(['Agent(fixflow-explorer)', 'Agent(fixflow-odd)']), JSON.stringify(s.permissions));
  run(c, ['--apply']);
  check('apply twice: no duplicates', json(c.file).permissions.deny.length === 2);
  r = run(c, ['--remove']);
  check('remove on a new file deletes it', r.status === 0 && !existsSync(c.file), r.stdout);
}
{
  const c = withFixflow(clone());
  const mine = { skillOverrides: { 'fixflow-orchestration': 'on', other: 'off' }, permissions: { deny: ['Agent(fixflow-explorer)', 'Bash(rm *)'], allow: ['Read'] }, env: { X: '1' } };
  writeFileSync(c.file, JSON.stringify(mine));
  run(c, ['--apply']);
  const s = json(c.file);
  check('her own settings stay hers: her "on" kept, her deny not duplicated', s.skillOverrides['fixflow-orchestration'] === 'on' && s.skillOverrides['odoo-accounting-import'] === 'off'
    && s.permissions.deny.filter((d) => d === 'Agent(fixflow-explorer)').length === 1 && s.permissions.deny.includes('Agent(fixflow-odd)'), JSON.stringify(s));
  run(c, ['--remove']);
  let same = false; try { deepStrictEqual(json(c.file), mine); same = true; } catch {}
  check('remove leaves exactly her settings (her deny of fixflow-explorer stays)', same, readFileSync(c.file, 'utf8'));
}

// ======== new: the mark, the programs, the project, the config, the build, --status ========
// 7. the mark anywhere in a command
check('isOurs: the mark second, with arguments after it', isOurs({ command: '"/a/kit-tier-hook" --harness-kit "--clone=/a" "--project=/b"' })
  && isOurs({ command: 'node "/a/.claude/hooks/x.mjs" --harness-kit' }) && !isOurs({ command: 'node x.mjs --harness-kitten' }) && !isOurs({ command: 'node "/a/--harness-kit/x.mjs"' }));
check('hookOf names the hook of a program and of an old .mjs command', hookOf('"/a/target/release/kit-count-gate.exe" --harness-kit') === 'count-gate'
  && hookOf('node "/x/.claude/hooks/tier-hook.mjs" --harness-kit') === 'tier-hook' && hookOf('"/a/kit-start" --harness-kit') === 'kit-start' && hookOf('echo a') === null);
{
  const c = clone();
  const old = { hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: `node "${c.R}/.claude/hooks/window-ceiling.mjs" --harness-kit "--project=${c.R}"` }] }] } };
  writeFileSync(c.file, JSON.stringify(old));
  const r = run(c, ['--apply']);
  const s = json(c.file);
  check('apply replaces an old JavaScript kit entry (mark before --project=) with the program', r.status === 0 && cmds(s).length === 6 && !cmds(s).some((x) => x.includes('.mjs')) && /1 old ones replaced/.test(r.stdout), r.stdout + JSON.stringify(s));
}
// 8. --project: another repository
{
  const c = withFixflow(clone());
  const p = project();
  const r = run(c, ['--apply', '--project', p.root]);
  const s = existsSync(p.file) ? json(p.file) : {};
  check('--project: the settings file is written in the project, not in the clone', r.status === 0 && existsSync(p.file) && !existsSync(c.file), r.stdout + r.stderr);
  check('--project: nothing else under the project\'s .claude', JSON.stringify(readdirSync(join(p.root, '.claude'))) === '["settings.local.json"]');
  check('--project: every command carries --clone=<clone> and --project=<project>', kitCmds(s).length === 6 && kitCmds(s).every((x) => x.includes(`"--clone=${c.R}" "--project=${p.R}"`)), JSON.stringify(s));
  check('--project: no FixFlow switch in another project', !s.skillOverrides && !s.permissions && !s.env && /nothing of the archived FixFlow material/.test(r.stdout), JSON.stringify(s));
  const r2 = run(c, ['--apply', `--project=${p.root}`]);
  check('--project=<folder> form works, and a second apply keeps one set', r2.status === 0 && kitCmds(json(p.file)).length === 6);
  const q = project('proj$x');
  const r3 = run(c, ['--apply', '--project', q.root]);
  check('a project path with $ is refused, nothing written', r3.status === 1 && !existsSync(join(q.root, '.claude')) && !existsSync(join(q.root, '.harness')) && /project's path/.test(r3.stderr), r3.stderr);
  const r4 = run(c, ['--apply', '--project', join(base, 'no-such-folder')]);
  check('a project that is not a folder is refused', r4.status === 1 && /is not a folder/.test(r4.stderr), r4.stderr);
  const r5 = run(c, ['--remove', '--project', p.root]);
  check('--remove in the project: entries out, .harness/ left and said so', r5.status === 0 && !existsSync(p.file) && existsSync(join(p.root, '.harness', 'kit.json')) && /\.harness\/ is left as it is/.test(r5.stdout), r5.stdout);
}
// 9. --no-usage-tool goes to the fan-out gate only
{
  const c = clone();
  run(c, ['--apply', '--no-usage-tool']);
  const ks = kitCmds(json(c.file));
  check('--no-usage-tool: on the fan-out gate, on no other hook', ks.filter((x) => x.endsWith(' --no-usage-tool')).length === 1 && ks.find((x) => x.endsWith(' --no-usage-tool')).includes('kit-fanout-gate'), JSON.stringify(ks));
  run(c, ['--apply']);
  check('apply without it takes it off again', !kitCmds(json(c.file)).some((x) => x.includes('--no-usage-tool')));
}
// 10. .harness/
{
  const c = clone();
  const p = project();
  const r = run(c, ['--apply', '--project', p.root]);
  const H = join(p.root, '.harness');
  check('.harness: kit.json is a copy of the example', existsSync(join(H, 'kit.json')) && readFileSync(join(H, 'kit.json'), 'utf8') === readFileSync(EXAMPLE, 'utf8'));
  const w = existsSync(join(H, 'WIDTHS.md')) ? readFileSync(join(H, 'WIDTHS.md'), 'utf8') : '';
  let fence = false;
  const decl = w.split(/\r?\n/).filter((s) => { if (/^[ \t]*```/.test(s)) { fence = !fence; return false; } return !fence && /^(?:[-*][ \t]+)?(width|hold)[ \t]+"/i.test(s.slice(0, 40)); });
  check('.harness: WIDTHS.md explains both forms and declares nothing', /width "<pattern>" <n>: <reason>/.test(w) && /hold "<pattern>" while "<pattern>": <reason>/.test(w) && decl.length === 0, decl.join('|'));
  check('.harness: briefs/ is made', existsSync(join(H, 'briefs')));
  check('apply prints each file it made', ['.harness/kit.json', '.harness/WIDTHS.md', '.harness/briefs/'].every((f) => r.stdout.includes(`made: ${p.R}/${f}`)), r.stdout);
  writeFileSync(join(H, 'kit.json'), '{"mine":1}');
  const r2 = run(c, ['--apply', '--project', p.root]);
  check('a second apply overwrites nothing in .harness and makes nothing', readFileSync(join(H, 'kit.json'), 'utf8') === '{"mine":1}' && !/made:/.test(r2.stdout), r2.stdout);
}
// 11. the ignore lines
{
  const c = clone();
  const p = project(undefined, true);
  const r = run(c, ['--project', p.root]);
  check('dry run prints the lines git should ignore, says .harness/ is hers, edits no .gitignore',
    /add this line .*\.claude\/settings\.local\.json/.test(r.stdout) && /add this line .*\.claude\/logs\//.test(r.stdout) && /\.harness\/ .*yours to commit or not/.test(r.stdout)
      && !existsSync(join(p.root, '.gitignore')) && !existsSync(p.file), r.stdout);
}
// 12. the build
{
  const c = clone();
  clearLog();
  run(c, ['--apply']);
  const b = logLines().find((l) => l.a[0] === 'build');
  check('apply builds: cargo build --release --locked --offline in harness-kit/rust, into its target/, rustup auto-install off',
    b && ['--release', '--locked', '--offline'].every((x) => b.a.includes(x)) && fwd(b.cwd).toLowerCase() === `${c.R}/harness-kit/rust`.toLowerCase()
      && fwd(b.target).toLowerCase() === `${c.R}/harness-kit/rust/target`.toLowerCase() && b.auto === '0', JSON.stringify(b));
  clearLog();
  run(c);
  check('a dry run does not build', !logLines().some((l) => l.a[0] === 'build'));
  clearLog();
  const r = run(c, ['--apply', '--fetch']);
  const f = logLines().find((l) => l.a[0] === 'build');
  check('--fetch builds without --offline, says what may be fetched from crates.io', r.status === 0 && f && !f.a.includes('--offline') && f.auto === null && /crates\.io/.test(r.stdout) && /regex 1\.11\.1/.test(r.stdout), r.stdout + JSON.stringify(f));
  check('--fetch without --apply is refused', run(c, ['--fetch']).status === 1);
  check('--apply with --remove is refused', run(c, ['--apply', '--remove']).status === 1);
}
{
  const c = clone();
  const r = run(c, ['--apply'], { HARNESS_KIT_CARGO: JSON.stringify([join(base, 'no-cargo-here')]) });
  check('no cargo: apply stops, says to install rustup, changes nothing', r.status === 1 && /rustup/.test(r.stderr) && /1\.100\.0/.test(r.stderr) && !existsSync(c.file) && !existsSync(join(c.root, '.harness')), r.stderr);
  const d = run(c, [], { HARNESS_KIT_CARGO: JSON.stringify([join(base, 'no-cargo-here')]) });
  check('no cargo: a dry run still exits 0 and says so', d.status === 0 && /cargo was not found/.test(d.stdout), d.stdout);
  const t = run(c, ['--apply'], { FAKE_CARGO: 'toolchain' });
  check('pinned toolchain missing: apply stops, names rustup toolchain install, changes nothing', t.status === 1 && /rustup toolchain install 1\.100\.0/.test(t.stderr) && !existsSync(c.file), t.stderr);
  const o = run(c, ['--apply'], { FAKE_CARGO: 'offline' });
  check('a crate not in the cache: prints the locked crates and crates.io and --fetch, changes nothing',
    o.status === 1 && /regex 1\.11\.1/.test(o.stderr) && /serde_json 1\.0\.140/.test(o.stderr) && !/kit-core 0/.test(o.stderr) && /crates\.io/.test(o.stderr) && /--fetch/.test(o.stderr) && !existsSync(c.file) && !existsSync(join(c.root, '.harness')), o.stderr);
  const k = run(c, ['--apply'], { FAKE_CARGO: 'broken' });
  check('a failing build: refused with cargo\'s error, nothing changed', k.status === 1 && /E0308/.test(k.stderr) && !/--fetch/.test(k.stderr) && !existsSync(c.file), k.stderr);
  const s = run(c, ['--apply'], { FAKE_CARGO_SKIP: 'kit-count-gate' });
  check('a program not built is not wired: refused, names it, nothing changed', s.status === 1 && /kit-count-gate/.test(s.stderr) && !existsSync(c.file) && !existsSync(join(c.root, '.harness')), s.stderr);
}
// 13. --status
{
  const c = clone();
  const p = project();
  let r = run(c, ['--status', '--project', p.root]);
  check('--status on a project with nothing: NOT WIRED for each hook, config missing, exit 1', r.status === 1 && (r.stdout.match(/NOT WIRED/g) || []).length === 6 && /kit\.json: MISSING/.test(r.stdout), r.stdout);
  run(c, ['--apply', '--project', p.root]);
  r = run(c, ['--status', '--project', p.root]);
  check('--status after apply: six wired, built and newer than sources, config there, exit 0', r.status === 0 && (r.stdout.match(/built, newer than its sources/g) || []).length === 6 && /kit\.json: there/.test(r.stdout), r.stdout);
  const future = new Date(Date.now() + 3600e3);
  utimesSync(join(c.root, 'harness-kit', 'rust', 'crates', 'kit-creep-gate', 'src', 'main.rs'), future, future);
  r = run(c, ['--status', '--project', p.root]);
  check('--status: a program older than its sources is named, exit 1', r.status === 1 && /creep-gate .*OLDER than its sources/.test(r.stdout) && (r.stdout.match(/OLDER/g) || []).length === 1, r.stdout);
  utimesSync(join(c.root, 'harness-kit', 'rust', 'crates', 'kit-core', 'src', 'main.rs'), future, future);
  r = run(c, ['--status', '--project', p.root]);
  check('--status: a newer kit-core makes every program old', (r.stdout.match(/OLDER/g) || []).length === 6, r.stdout);
  rmSync(join(c.root, 'harness-kit', 'rust', 'target', 'release', 'kit-tier-hook' + EXE));
  r = run(c, ['--status', '--project', p.root]);
  check('--status: a missing program file is named', r.status === 1 && /tier-hook .*MISSING/.test(r.stdout), r.stdout);
  const ws = readFileSync(p.file, 'utf8');
  check('--status changes nothing', readFileSync(p.file, 'utf8') === ws);
}

rmSync(base, { recursive: true, force: true });
console.log(`setup.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
