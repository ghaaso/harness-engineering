// The count gate's lock hold under a wave (unit T8-FIX, 2026-11-24): copies the hook (HOLD_MAX set to 1000 for the
// measurement only) into a temporary folder and runs WAVE checks at once, ROUNDS times, against a real session folder
// (read only; only the copy's own log is written). Usage: node measure-lock.mjs <hook file> <session id> [wave] [rounds]
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
const [hookSrc, sid, waveA, roundsA] = process.argv.slice(2);
const WAVE = Number(waveA || 21), ROUNDS = Number(roundsA || 5);
const P = 'C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering';
const T = mkdtempSync(join(tmpdir(), 'cg-lock-'));
const hook = join(T, 'repo', '.claude', 'hooks', 'count-gate.mjs');
mkdirSync(join(T, 'repo', '.claude', 'hooks'), { recursive: true });
mkdirSync(join(T, 'repo', 'research-tree', 'build'), { recursive: true });
writeFileSync(hook, readFileSync(resolve(hookSrc), 'utf8').replace('const HOLD_MAX_MS = HOLD_MAX;', 'const HOLD_MAX_MS = 1000;'));
const env = { ...process.env }; delete env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS;
const one = (i) => new Promise((ok) => {
  const p = spawn(process.execPath, [hook], { env, stdio: ['pipe', 'ignore', 'ignore'] });
  p.on('close', ok);
  p.stdin.end(JSON.stringify({ session_id: sid, transcript_path: join(P, sid + '.jsonl'), cwd: T, hook_event_name: 'PreToolUse', tool_name: 'Agent',
    tool_use_id: 'toolu_m' + i + '_' + Date.now(), tool_input: { description: 'measure ' + i, prompt: 'x' } }));
});
for (let r = 0; r < ROUNDS; r++) { await Promise.all(Array.from({ length: WAVE }, (_, i) => one(r * 100 + i))); }
const L = readFileSync(join(T, 'repo', '.claude', 'logs', 'count-gate.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const hold = L.filter((o) => o.hold != null).map((o) => o.hold).sort((a, b) => a - b);
const wait = L.filter((o) => o.wait != null).map((o) => o.wait).sort((a, b) => a - b);
console.log(JSON.stringify({ wave: WAVE, rounds: ROUNDS, checks: L.length, errors: L.filter((o) => o.ev === 'error').length,
  hold_ms: { n: hold.length, median: hold[hold.length >> 1], max: hold[hold.length - 1] }, wait_ms: { median: wait[wait.length >> 1], max: wait[wait.length - 1] } }));
for (const o of L.filter((o) => o.ev === "error")) console.log("error:", o.why); rmSync(T, { recursive: true, force: true });
