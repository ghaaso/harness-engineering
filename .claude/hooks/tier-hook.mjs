// Tier hook (version 0, 2026-11-18).
// Refuses a helper or a child session that is started
//   - without a named kind of job at the start of its description (helper) or title (session),
//   - without an explicit model,
//   - or on a model the route for that kind does not allow.
// The routes are data: tier-routes.json beside this file. Every decision is logged to ../logs/tier-hook.jsonl.
// It checks nothing else and changes nothing. What it cannot see: a job given the wrong kind.
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// Kit mode (harness kit, 2026-11-25; docs/program/harness-kit-2026-11-25/CONTRACT.md section 2): only with --harness-kit,
// the log goes to <project>/.claude/logs and a child session's folder without the hook is told to run the kit's set-up;
// the routes stay beside this file. A missing or broken kit-mode.mjs leaves the hook as it is without the argument.
let KIT = null;
if (process.argv.includes('--harness-kit')) { try { KIT = (await import('./kit-mode.mjs')).kitMode(import.meta.url); } catch { KIT = null; } }
const LOGDIR = KIT ? KIT.logs : resolve(here, '..', 'logs');
function log(o) {
  try {
    mkdirSync(LOGDIR, { recursive: true });
    appendFileSync(resolve(LOGDIR, 'tier-hook.jsonl'), JSON.stringify(o) + '\n');
  } catch {}
}
function allow(rec) { log({ ...rec, decision: 'allow' }); process.exit(0); }
function deny(rec, why) { log({ ...rec, decision: 'deny', why }); process.stderr.write(why + '\n'); process.exit(2); }

let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch {
  log({ t: Date.now(), decision: 'allow', note: 'hook input unreadable' });
  process.exit(0);
}
if (j.hook_event_name !== 'PreToolUse') process.exit(0);
const tool = typeof j.tool_name === 'string' ? j.tool_name : '';
const isHelper = tool === 'Agent' || tool === 'Task';
const isSession = /start_session$/.test(tool);
if (!isHelper && !isSession) process.exit(0);

const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
const rec = {
  t: Date.now(),
  session: typeof j.session_id === 'string' ? j.session_id.slice(0, 8) : null,
  agent_id: j.agent_id ? String(j.agent_id).slice(0, 8) : null,
  what: isHelper ? 'helper' : 'session',
};

let routes;
try { routes = JSON.parse(readFileSync(resolve(here, 'tier-routes.json'), 'utf8')); } catch {
  deny(rec, 'tier hook: the routes file .claude/hooks/tier-routes.json cannot be read. Nothing is started until it is fixed.');
}
const kinds = routes.kinds || {};
const table = Object.keys(kinds).map((k) => `${k}: ${kinds[k].models.join(' or ')}`).join('; ');

// r57-0026 (added 2026-11-19): a session started in another folder on this PC must find the tier hook there.
if (isSession && typeof ti.cwd === 'string' && ti.cwd.trim() && !['ssh', 'cloud'].includes(String(ti.target || ''))) {
  const dir = ti.cwd.trim();
  const wired = ['settings.json', 'settings.local.json'].some((f) => {
    try { return readFileSync(resolve(dir, '.claude', f), 'utf8').includes('tier-hook.mjs'); } catch { return false; }
  });
  if (!wired) {
    deny({ ...rec, cwd: dir.slice(0, 80) }, KIT
      ? `tier hook: the folder ${dir} does not carry the kit's hooks. Wire them there first: node "${KIT.clone.replace(/\\/g, '/')}/harness-kit/setup.mjs" --apply --project "${dir}"`
      : `tier hook (r57-0026): the folder ${dir} does not carry the tier hook. Check and install it first: bash tools/ensure-tier-hook.sh "${dir}" (outside this repository only with the owner's word and --force).`);
  }
}

// A card shown to the owner, or the start of a card he approved, carries no model to check.
if (isSession && (ti.initiation === 'offer' || ti.proposal_id)) allow({ ...rec, note: 'a card or an approved proposal, not checked' });

const where = isHelper ? 'description' : 'title';
const label = String(isHelper ? (ti.description ?? '') : (ti.title ?? '')).trim();
const m = /^([a-z-]+)\s*:/i.exec(label);
const kind = m ? m[1].toLowerCase() : '';
if (!kind || !kinds[kind]) {
  deny({ ...rec, label: label.slice(0, 60) },
    `tier hook: start the ${where} with the kind of job and a colon, for example "extract: ...". Kinds and their models: ${table}.`);
}
const want = kinds[kind].models.join(' or ');
const model = typeof ti.model === 'string' ? ti.model.toLowerCase() : '';
if (!model) {
  deny({ ...rec, kind },
    `tier hook: pass the model explicitly. A ${rec.what} started with no model inherits the caller's model. For "${kind}" use ${want}.`);
}
const family = ['haiku', 'sonnet', 'opus', 'fable', 'mythos'].find((f) => model.includes(f)) || model;
if ((routes.never || []).includes(family)) {
  deny({ ...rec, kind, model: family },
    `tier hook: ${family} is never used for a helper or a child session. For "${kind}" use ${want}.`);
}
if (!kinds[kind].models.includes(family)) {
  deny({ ...rec, kind, model: family },
    `tier hook: "${kind}" runs on ${want}, not on ${family} (${kinds[kind].for}). If the job is of another kind, name that kind.`);
}
allow({ ...rec, kind, model: family });
