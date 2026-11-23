// The fan-out gate's meter check replayed on a real transcript (unit T8-FIX, 2026-11-24; fix B2). For every helper
// start in the transcript, the transcript is cut before the first line of the start's own message (the state at
// PreToolUse when none of that message is written yet) and each hook file named decides it; then, for every meter
// reading, the transcript is cut right after the reading's result (a start in the same message as the reading) and a
// start is decided there. Logs and copies go to a temporary root (FANOUT_GATE_ROOT); the repository is only read.
// Usage: node replay-fanout.mjs <transcript.jsonl> <hook file>...
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
const [tp, ...hooks] = process.argv.slice(2);
const REPO = 'C:/Users/User/Documents/projects/harness-engineering';
const T = mkdtempSync(join(tmpdir(), 'fanout-replay-'));
mkdirSync(join(T, 'library'), { recursive: true });
cpSync(join(REPO, 'library', 'journal'), join(T, 'library', 'journal'), { recursive: true });
mkdirSync(join(T, 'research-tree', 'build'), { recursive: true }); // no state file: no cap, the meter rule alone
const L = readFileSync(tp, 'utf8').split('\n');
const sess = basename(tp, '.jsonl');
const parsed = L.map((l) => { try { return JSON.parse(l); } catch { return null; } });
const blocks = (o) => (o && o.message && Array.isArray(o.message.content) ? o.message.content : []);
function decide(hook, cutAt, tu, input, ts) {
  const dir = join(T, 'proj'); mkdirSync(dir, { recursive: true });
  const f = join(dir, sess + '.jsonl');
  writeFileSync(f, L.slice(0, cutAt).join('\n') + '\n');
  const r = spawnSync(process.execPath, [resolve(hook)], { encoding: 'utf8', env: { ...process.env, FANOUT_GATE_ROOT: T, FANOUT_GATE_NOW: ts },
    input: JSON.stringify({ session_id: sess, transcript_path: f, cwd: REPO, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: tu, tool_input: input }) });
  return r.status === 0 ? 'allow' : 'deny: ' + String(r.stderr).trim().slice(14, 90);
}
const rows = [];
parsed.forEach((o, i) => {
  if (!o || o.type !== 'assistant') return;
  for (const b of blocks(o)) {
    if (b.type !== 'tool_use' || b.name !== 'Agent') continue;
    const first = parsed.findIndex((x) => x && x.type === 'assistant' && x.message && x.message.id === o.message.id);
    const res = parsed.find((x) => x && x.type === 'user' && blocks(x).some((c) => c.type === 'tool_result' && c.tool_use_id === b.id));
    const app = res ? (blocks(res).find((c) => c.tool_use_id === b.id).is_error ? 'refused' : 'ran') : '?';
    rows.push({ kind: 'start', line: i + 1, tu: b.id.slice(-8), desc: String(b.input.description || '').slice(0, 40), live: app,
      ...Object.fromEntries(hooks.map((h) => [basename(h), decide(h, first, b.id, b.input, o.timestamp)])) });
  }
  for (const b of blocks(o)) {
    if (b.type !== 'tool_use' || !/get_usage$/.test(b.name)) continue;
    const ri = parsed.findIndex((x) => x && x.type === 'user' && blocks(x).some((c) => c.type === 'tool_result' && c.tool_use_id === b.id));
    if (ri < 0) continue;
    const input = { description: 'same-message probe', prompt: 'token limit 2 M (expected about 1 M, basis r57-0173)' };
    rows.push({ kind: 'same message', line: ri + 1, tu: 'probe', desc: 'start in the reading\'s own message', live: '-',
      ...Object.fromEntries(hooks.map((h) => [basename(h), decide(h, ri + 1, 'toolu_probe_' + ri, input, parsed[ri].timestamp)])) });
  }
});
for (const r of rows) console.log(JSON.stringify(r));
rmSync(T, { recursive: true, force: true });
