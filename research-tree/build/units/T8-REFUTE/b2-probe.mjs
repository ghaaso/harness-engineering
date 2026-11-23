// A wave of 12 starts refused once by the fan-out gate (same-message rule) and retried: the count gate still counts
// the 12 refused starts as pending for 16.7 s. Usage: node cg-probe.mjs <temp dir> <repo>
import { mkdirSync, writeFileSync, copyFileSync, rmSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const [T, SRC] = process.argv.slice(2);
rmSync(T, { recursive: true, force: true });
const root = join(T, 'repo');
mkdirSync(join(root, '.claude', 'hooks'), { recursive: true });
mkdirSync(join(root, '.claude', 'logs'), { recursive: true });
copyFileSync(join(SRC, '.claude', 'hooks', 'count-gate.mjs'), join(root, '.claude', 'hooks', 'count-gate.mjs'));
const sid = '12345678-aaaa-bbbb-cccc-000000000001';
const proj = join(T, 'proj');
const sub = join(proj, sid, 'subagents');
mkdirSync(sub, { recursive: true });
writeFileSync(join(proj, sid + '.jsonl'), '');
const now = Date.now();
const log = join(root, '.claude', 'logs', 'count-gate.jsonl');
// first attempt: 12 starts admitted by the count gate, refused by the fan-out gate (no helper file ever appears)
for (let i = 0; i < 12; i++) appendFileSync(log, JSON.stringify({ t: now - 3000, ev: 'allow', sess: sid, by: null, tu: 'toolu_first' + i, desc: 'read: part ' + i, n: i, limit: 20 }) + '\n');
// the retry: 8 of the 12 already started (their meta and transcript are there)
for (let i = 0; i < 8; i++) {
  writeFileSync(join(sub, `agent-a${i}.meta.json`), JSON.stringify({ description: 'read: part ' + i, toolUseId: 'toolu_retry' + i, spawnDepth: 1 }));
  writeFileSync(join(sub, `agent-a${i}.jsonl`), '{}\n');
  appendFileSync(log, JSON.stringify({ t: now - 1000, ev: 'allow', sess: sid, by: null, tu: 'toolu_retry' + i, desc: 'read: part ' + i, n: 12 + i, limit: 20 }) + '\n');
}
const input = { session_id: sid, transcript_path: join(proj, sid + '.jsonl'), cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Agent',
  tool_input: { description: 'read: part 8', prompt: 'x', subagent_type: 'general-purpose' }, tool_use_id: 'toolu_retry8' };
const env = { ...process.env }; delete env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS;
const r = spawnSync('node', [join(root, '.claude', 'hooks', 'count-gate.mjs')], { input: JSON.stringify(input), encoding: 'utf8', env });
console.log('9th retry start (9 would run):', 'exit', r.status, String(r.stderr).trim().slice(0, 300));
