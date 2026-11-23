// Helpers for the tests: a temporary run root, a fake transcript tree, and a script runner.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const TOOLS = path.dirname(fileURLToPath(import.meta.url));
export const SAMPLE = JSON.parse(fs.readFileSync(path.join(TOOLS, 'fixtures', 'config.sample.json'), 'utf8'));

export function tmpRun(cfg = SAMPLE) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtools-'));
  const projects = path.join(root, '_projects');
  fs.mkdirSync(path.join(root, 'run'), { recursive: true });
  fs.mkdirSync(projects);
  if (cfg) fs.writeFileSync(path.join(root, 'run', 'config.json'), JSON.stringify(cfg));
  return { root, projects, folder: path.join(projects, path.resolve(root).replace(/[^A-Za-z0-9]/g, '-')) };
}

// one assistant line per [id, input, cacheCreation, cacheRead, output]
export function jsonl(msgs) {
  return msgs.map(([id, i, c, r, o]) => JSON.stringify({ type: 'assistant', message: { id, usage: { input_tokens: i, cache_creation_input_tokens: c, cache_read_input_tokens: r, output_tokens: o } } })).join('\n') + '\n';
}

export function helper(folder, session, agent, description, msgs, extra = {}) {
  const d = path.join(folder, session, 'subagents');
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, `agent-${agent}.meta.json`), JSON.stringify({ description, ...extra }));
  fs.writeFileSync(path.join(d, `agent-${agent}.jsonl`), jsonl(msgs));
}

export function run(script, args, t, env = {}) {
  const r = spawnSync(process.execPath, [path.join(TOOLS, script), ...args], {
    encoding: 'utf8', timeout: 60000,
    env: { ...process.env, RUN_ROOT: t.root, CLAUDE_PROJECTS: t.projects, ...env },
  });
  return { out: r.stdout.trim(), code: r.status };
}
