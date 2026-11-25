// Test of harness-kit/setup.mjs. Run: node harness-kit/setup.test.mjs
// Each case copies setup.mjs into a made-up clone in a temp folder (stub hooks, no git), runs it as a separate process
// from another folder, and checks the settings file it leaves. Nothing is written in the repository.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepStrictEqual } from 'node:assert';

const SETUP = join(dirname(fileURLToPath(import.meta.url)), 'setup.mjs');
const base = mkdtempSync(join(tmpdir(), 'kit-setup-test-'));
let n = 0, pass = 0, fail = 0;
function check(name, cond, extra = '') { cond ? pass++ : fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : '  ' + extra}`); }

function clone(name = 'c' + ++n) {
  const root = join(base, name);
  mkdirSync(join(root, '.claude', 'hooks'), { recursive: true });
  mkdirSync(join(root, 'harness-kit'), { recursive: true });
  for (const h of ['window-ceiling', 'tier-hook', 'creep-gate']) writeFileSync(join(root, '.claude', 'hooks', h + '.mjs'), '');
  writeFileSync(join(root, '.claude', 'hooks', 'tier-routes.json'), '{}');
  copyFileSync(SETUP, join(root, 'harness-kit', 'setup.mjs'));
  return { root, file: join(root, '.claude', 'settings.local.json') };
}
const run = (c, ...args) => spawnSync(process.execPath, [join(c.root, 'harness-kit', 'setup.mjs'), ...args], { cwd: base, encoding: 'utf8' });
const json = (f) => JSON.parse(readFileSync(f, 'utf8'));
const cmds = (s) => Object.values(s.hooks || {}).flat().flatMap((g) => g.hooks.map((h) => h.command));

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

// 1. dry run changes nothing
{
  const c = clone();
  const r = run(c);
  check('dry run exits 0 and writes no file', r.status === 0 && !existsSync(c.file), r.stderr);
  check('dry run prints the three commands with the clone path in double quotes',
    ['window-ceiling', 'tier-hook', 'creep-gate'].every((h) => r.stdout.includes(`node "${c.root.replace(/\\/g, '/')}/.claude/hooks/${h}.mjs" --harness-kit`)), r.stdout);
}
// 2. new file: apply, apply again, remove
{
  const c = clone();
  let r = run(c, '--apply');
  const s = json(c.file);
  const pre = s.hooks.PreToolUse;
  check('apply writes three entries with the right matchers in order',
    r.status === 0 && pre.length === 3 && pre.map((g) => g.matcher).join(',') === '*,*,Agent|Task'
      && /window-ceiling/.test(pre[0].hooks[0].command) && /tier-hook/.test(pre[1].hooks[0].command) && /creep-gate/.test(pre[2].hooks[0].command), JSON.stringify(s));
  run(c, '--apply');
  check('apply twice leaves one set', cmds(json(c.file)).length === 3);
  r = run(c, '--remove');
  check('remove deletes a file that held only the kit entries', r.status === 0 && !existsSync(c.file), r.stdout + r.stderr);
  r = run(c, '--remove');
  check('remove with no file is a no-op', r.status === 0 && !existsSync(c.file));
}
// 3. merge into an existing file, then remove: the file is as it was
{
  const c = clone();
  writeFileSync(c.file, JSON.stringify(USER, null, 2));
  run(c, '--apply');
  const s = json(c.file);
  check('merge keeps every user entry and key', s.env.X === '1' && s.permissions.allow[0] === 'Bash(ls)'
    && cmds(s).includes('node "/elsewhere/mine.mjs"') && cmds(s).includes('echo stop') && cmds(s).includes('node "/x/.claude/hooks/tier-hook.mjs"')
    && cmds(s).filter((x) => x.endsWith(' --harness-kit')).length === 3);
  run(c, '--apply');
  check('merge twice: still one kit set', cmds(json(c.file)).filter((x) => x.endsWith(' --harness-kit')).length === 3);
  const r = run(c, '--remove');
  let same = false; try { deepStrictEqual(json(c.file), USER); same = true; } catch {}
  check('remove restores the file to what it held (an unmarked tier-hook entry of the user stays)', r.status === 0 && same, readFileSync(c.file, 'utf8'));
}
// 4. a kit entry inside a user's group: only it goes
{
  const c = clone();
  const mixed = { hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'echo keep' }, { type: 'command', command: 'node "/old/place/.claude/hooks/tier-hook.mjs" --harness-kit' }] }] } };
  writeFileSync(c.file, JSON.stringify(mixed));
  run(c, '--remove');
  const s = json(c.file);
  check('remove takes a marked entry out of a mixed group, keeps the rest', s.hooks.PreToolUse.length === 1 && s.hooks.PreToolUse[0].hooks.length === 1 && s.hooks.PreToolUse[0].hooks[0].command === 'echo keep');
}
// 5. refusals change nothing
{
  const c = clone();
  writeFileSync(c.file, '{ not json');
  let r = run(c, '--apply');
  check('invalid JSON: refused, file unchanged', r.status === 1 && readFileSync(c.file, 'utf8') === '{ not json');
  writeFileSync(c.file, '{"hooks": []}');
  r = run(c, '--apply');
  check('hooks not an object: refused, file unchanged', r.status === 1 && readFileSync(c.file, 'utf8') === '{"hooks": []}');
  const d = clone('with$dollar');
  r = run(d, '--apply');
  check('a clone path with $ is refused', r.status === 1 && !existsSync(d.file) && /cannot stand inside double quotes/.test(r.stderr), r.stderr);
  const e = clone();
  rmSync(join(e.root, '.claude', 'hooks', 'tier-routes.json'));
  r = run(e, '--apply');
  check('a clone without tier-routes.json is refused', r.status === 1 && !existsSync(e.file));
  r = run(e, '--bogus');
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
  run(c, '--apply');
  const s = json(c.file);
  check('apply: skill folders off, lean-* and README not', s.skillOverrides['fixflow-orchestration'] === 'off' && s.skillOverrides['odoo-accounting-import'] === 'off'
    && !('lean-thing' in s.skillOverrides) && Object.keys(s.skillOverrides).length === 2, JSON.stringify(s.skillOverrides));
  check('apply: fixflow agents denied by frontmatter name, lean-read not', JSON.stringify(s.permissions.deny) === JSON.stringify(['Agent(fixflow-explorer)', 'Agent(fixflow-odd)']), JSON.stringify(s.permissions));
  run(c, '--apply');
  check('apply twice: no duplicates', json(c.file).permissions.deny.length === 2);
  r = run(c, '--remove');
  check('remove on a new file deletes it', r.status === 0 && !existsSync(c.file), r.stdout);
}
{
  const c = withFixflow(clone());
  const mine = { skillOverrides: { 'fixflow-orchestration': 'on', other: 'off' }, permissions: { deny: ['Agent(fixflow-explorer)', 'Bash(rm *)'], allow: ['Read'] }, env: { X: '1' } };
  writeFileSync(c.file, JSON.stringify(mine));
  run(c, '--apply');
  const s = json(c.file);
  check('her own settings stay hers: her "on" kept, her deny not duplicated', s.skillOverrides['fixflow-orchestration'] === 'on' && s.skillOverrides['odoo-accounting-import'] === 'off'
    && s.permissions.deny.filter((d) => d === 'Agent(fixflow-explorer)').length === 1 && s.permissions.deny.includes('Agent(fixflow-odd)'), JSON.stringify(s));
  run(c, '--remove');
  let same = false; try { deepStrictEqual(json(c.file), mine); same = true; } catch {}
  check('remove leaves exactly her settings (her deny of fixflow-explorer stays)', same, readFileSync(c.file, 'utf8'));
}

rmSync(base, { recursive: true, force: true });
console.log(`setup.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
