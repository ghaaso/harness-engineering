// B1 of research-tree/build/refute/TOP8.md: the window ceiling refuses at a helper's (and a session's) 2nd call after
// one large result. Usage: node b1-probe.mjs <empty temp dir>. Logs and state go to the temp dir, never .claude/logs.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const T = resolve(process.argv[2] || 'b1-tmp');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
rmSync(T, { recursive: true, force: true });
mkdirSync(join(T, 'proj', 's1', 'subagents'), { recursive: true });
const line = (n, read, side) => JSON.stringify({ parentUuid: 'x', isSidechain: side, type: 'assistant', uuid: 'u' + n,
  message: { id: 'msg_' + n, model: 'claude-opus-5-5', role: 'assistant', content: [],
    usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: read, output_tokens: 100 } } });
writeFileSync(join(T, 'proj', 's1', 'subagents', 'agent-abc123.jsonl'), line(1, 30000, true) + '\n' + line(2, 75000, true) + '\n');
writeFileSync(join(T, 'proj', 's1.jsonl'), line(1, 30000, false) + '\n' + line(2, 70000, false) + '\n');
writeFileSync(join(T, 'settings.json'), JSON.stringify({ modelSettings: { 'claude-opus-5-5': { autoCompactWindow: 400000 } } }));
const env = { ...process.env, WINDOW_CEILING_LOGDIR: join(T, 'logs'), WINDOW_CEILING_SETTINGS: join(T, 'settings.json') };
const base = { session_id: '11111111-2222-3333-4444-555555555555', transcript_path: join(T, 'proj', 's1.jsonl'), cwd: repo,
  hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: join(repo, 'CLAUDE.md') }, tool_use_id: 'toolu_1' };
for (const [name, input] of [['helper', { ...base, agent_id: 'abc123', agent_type: 'general-purpose' }], ['main session', base]]) {
  const r = spawnSync('node', [join(repo, '.claude', 'hooks', 'window-ceiling.mjs')], { input: JSON.stringify(input), encoding: 'utf8', env });
  console.log(`${name}: exit ${r.status} ${String(r.stderr).trim()}`);
}
