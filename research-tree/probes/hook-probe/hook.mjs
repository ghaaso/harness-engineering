// Probe hook (2026-11-18). It records what the app passes to a hook and refuses two things:
// a write outside ./inside, and a helper started on the model opus. It changes nothing else.
// The log holds key names, lengths and short ids only, never file content or prompts.
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, sep } from 'node:path';

const t0 = process.hrtime.bigint();
const here = dirname(fileURLToPath(import.meta.url));
const inside = (resolve(here, 'inside') + sep).toLowerCase();

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch {}
let j = {};
try { j = JSON.parse(raw); } catch {}

const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
const fp = typeof ti.file_path === 'string' ? ti.file_path : null;
const ev = j.hook_event_name || null;

let deny = null;
if (ev === 'PreToolUse') {
  if ((j.tool_name === 'Write' || j.tool_name === 'Edit') && fp) {
    const abs = (resolve(typeof j.cwd === 'string' ? j.cwd : here, fp)).toLowerCase();
    if (!abs.startsWith(inside)) deny = 'probe hook: writes are allowed only under inside/';
  }
  if ((j.tool_name === 'Agent' || j.tool_name === 'Task') && typeof ti.model === 'string' && /opus/i.test(ti.model)) {
    deny = 'probe hook: a helper on the model opus is refused';
  }
}

const line = {
  t: Date.now(),
  event: ev,
  tool: j.tool_name || null,
  keys: Object.keys(j),
  input_keys: Object.keys(ti),
  session: typeof j.session_id === 'string' ? j.session_id.slice(0, 8) : null,
  has_transcript_path: typeof j.transcript_path === 'string',
  agent_id: j.agent_id ? String(j.agent_id).slice(0, 8) : null,
  agent_type: j.agent_type || null,
  subagent_type: ti.subagent_type || null,
  model: ti.model || null,
  file_path: fp,
  content_len: typeof ti.content === 'string' ? ti.content.length : null,
  prompt_len: typeof ti.prompt === 'string' ? ti.prompt.length : null,
  has_tool_response: Object.prototype.hasOwnProperty.call(j, 'tool_response'),
  permission_mode: j.permission_mode || null,
  decision: deny ? 'deny' : 'allow',
  ms: Number(process.hrtime.bigint() - t0) / 1e6,
};
try { appendFileSync(resolve(here, 'hook-log.jsonl'), JSON.stringify(line) + '\n'); } catch {}

if (deny) {
  process.stderr.write(deny + '\n');
  process.exit(2);
}
process.exit(0);
