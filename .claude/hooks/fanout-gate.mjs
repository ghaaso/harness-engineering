// Fan-out gate (version 1, 2026-11-24, unit T8-BASIS of top session 8). PreToolUse on Agent and Task: every new
// helper start, in the top session and inside helpers. Two rules of the method, both broken before (ENFORCEMENT-TABLE.md
// proposals 2 and 3):
//
// 1. A limit has a measured basis (r57-0038, r57-0002; broken r57-0617, r57-0614, t7-0602).
//    A start states its token limit on one line, in its prompt or, if the prompt states none, in the first brief file
//    the prompt names (a .md path in a folder named briefs, e.g. research-tree/build/briefs/X.md); the first such line
//    counts:   token limit 12 M (expected about 8 M, basis r57-0165)
//    Units K, M or B. Refused when that line has no expected figure; the limit is not above the expected figure
//    (r57-0038: need plus a buffer, never equal); the line cites no record id; a cited id is not in library/journal; or
//    none of the cited ids is a record with status measured or observed.
//    The cap (r57-0614): the session's state file is the .md file in research-tree/build/ that names this session as
//    "Session <first 8 characters of its id>" (most recently changed file if several). Its last line beginning with
//    "Cap" holding "<n> M tokens" is the cap; every session that file names the same way counts against it. Then
//      tokens spent (every transcript of those sessions and their helpers, input + cache creation + cache read +
//      output, once per message id, as r57-0170 counted)
//      + the rest of the limit of every helper still running (its stated limit less what it has used)
//      + this start's limit
//    must not pass the cap. Under a cap a start that states no limit is refused: the sum cannot be kept without it
//    (r57-0614). With no state file or no cap line a start with no limit passes (r57-0038 governs how a limit is set;
//    it does not make one where no cap is agreed) and the cap check is skipped.
//
// 2. The meter is read before a fan-out (CLAUDE.md rule 5, r57-0615). The transcript of the caller (the session, or
//    the helper's own file under <session>/subagents/) must show a get_usage result (mcp__ccd_session_mgmt__get_usage)
//      - from an assistant message earlier than the one making this start (a reading in the same message cannot
//        hold it, r57-0615). At PreToolUse the start's own message is often not in the transcript yet (seen live twice
//        on 2026-11-24: every first try refused, the retry passed; fix B2 of research-tree/build/refute/TOP8.md). The
//        app writes an "api-request" line each time it sends a request; the next request goes out only after every
//        tool of a message has returned. So an "api-request" line after the reading's result shows that the reading's
//        message is finished and this start is in a later one (measured: t8-0105).
//      - called after the previous wave of starts (the last earlier message with a start that was not refused),
//      - no older than SPAN_MIN, and
//      - if the state file has a line beginning "Meter line" with "<n> %" (all-models window; "Fable meter line" for
//        the Fable window): the reading plus what the meter can have moved since must be under it.
//
// Cannot see: a cost the plan left out (t7-0602: a cited role that fits on paper and a step nobody priced); whether
// the cited record is about similar work; the coordinator's own tokens still to come; a helper that died without the
// app marking it finished keeps its rest reserved until marked by hand (node .claude/hooks/count-gate.mjs --end <id> <why>); the owner's own use since the reading; a
// Fable-heavy wave, which moves the meter faster than the mixes measured (r57-0175); child sessions (start_session is
// not matched). Fails open: an error inside this hook is logged and the start passes. Log: .claude/logs/fanout-gate.jsonl.
import { readFileSync, readdirSync, statSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename, isAbsolute } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.FANOUT_GATE_ROOT ? resolve(process.env.FANOUT_GATE_ROOT) : resolve(here, '..', '..');
const NOW = process.env.FANOUT_GATE_NOW ? Date.parse(process.env.FANOUT_GATE_NOW) : Date.now();
const LOGDIR = resolve(ROOT, '.claude', 'logs');

// How fast the weekly meter can move: r57-0183 read 85 % at 18:10 and 88 % at 19:55 UTC (105 min); with whole-percent
// readings that is at most 4 points in 105 min, the fastest of the recorded intervals (r57-0170: at most 17 points in
// 15.1 h = 906 min; r57-0165: at most 3 points in 101 min, 14:50 to 16:31).
const RATE_PER_MIN = 4 / 105; // r57-0183
// A reading stays good while the meter cannot have moved one point (its resolution): 105 / 4 = 26.25 min.
const SPAN_MIN = 1 / RATE_PER_MIN; // r57-0183

const UNIT = { K: 1e3, M: 1e6, B: 1e9 };
const NUM = String.raw`(\d+(?:\.\d+)?)\s*([KMB])\b`;
const LIMIT_RE = new RegExp(String.raw`\blimit(?:\s+(?:is|of|at))?\s*[:=]?\s*(?:about\s+)?` + NUM, 'i');
const EXPECTED_RE = new RegExp(String.raw`\bexpected(?:\s+(?:is|of))?\s*[:=]?\s*(?:about\s+|around\s+|~\s*)?` + NUM, 'i');
const ID_RE = /\b([a-z][a-z0-9]*-\d{4})\b/g;
const fmt = (n) => (n / 1e6).toFixed(1) + ' M';

function log(o) {
  try { mkdirSync(LOGDIR, { recursive: true }); appendFileSync(join(LOGDIR, 'fanout-gate.jsonl'), JSON.stringify({ t: NOW, ...o }) + '\n'); } catch {}
}
function deny(rec, why) { log({ ...rec, decision: 'deny', why }); process.stderr.write(why + '\n'); process.exit(2); }
function allow(rec) { log({ ...rec, decision: 'allow' }); process.exit(0); }
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };

// ---- the stated limit -----------------------------------------------------------------------------------------
function limitIn(text, where) {
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = LIMIT_RE.exec(line);
    if (!m) continue;
    const e = EXPECTED_RE.exec(line);
    return {
      where, line: line.trim().slice(0, 160),
      limit: +m[1] * UNIT[m[2].toUpperCase()],
      expected: e ? +e[1] * UNIT[e[2].toUpperCase()] : null,
      ids: [...new Set([...line.matchAll(ID_RE)].map((x) => x[1]))],
    };
  }
  return null;
}
function briefPaths(prompt) {
  const out = [];
  for (const m of String(prompt || '').matchAll(/[A-Za-z0-9_.:\/\\-]+\.md\b/g)) {
    const p = m[0];
    if (!/(^|[\\/])briefs[\\/]/.test(p)) continue; // only brief files: another document's narrative is not a limit
    const cands = isAbsolute(p) || /^[A-Za-z]:/.test(p) ? [p] : [resolve(ROOT, p), resolve(ROOT, 'research-tree', 'build', p)];
    const hit = cands.find((c) => { try { return statSync(c).isFile(); } catch { return false; } });
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}
function statedLimit(prompt) {
  const own = limitIn(prompt, 'the prompt');
  if (own) return own;
  for (const p of briefPaths(prompt)) {
    const s = limitIn(read(p), basename(p));
    if (s) return s;
  }
  return null;
}
let journal = null;
function journalStatus(id) {
  if (!journal) {
    journal = new Map();
    const walk = (d) => {
      let es = []; try { es = readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of es) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.jsonl')) for (const l of (read(p) || '').split('\n')) {
          const m = /^\{"id":"([^"]+)","kind":"[^"]*"(?:,"status":"([^"]*)")?/.exec(l);
          if (m) journal.set(m[1], m[2] || '');
        }
      }
    };
    walk(resolve(ROOT, 'library', 'journal'));
  }
  return journal.has(id) ? journal.get(id) : undefined;
}

// ---- the state file, cap and meter line -------------------------------------------------------------------------
function stateFile(sess8) {
  const dir = resolve(ROOT, 'research-tree', 'build');
  let names = []; try { names = readdirSync(dir).filter((n) => n.endsWith('.md')); } catch { return null; }
  const re = new RegExp(String.raw`\bsession\s+` + sess8 + String.raw`\b`, 'i');
  const hits = names.map((n) => join(dir, n)).filter((p) => re.test(read(p) || ''));
  if (!hits.length) return null;
  hits.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  const path = hits[0], text = read(path) || '';
  let cap = null, line = null, fableLine = null;
  for (const l of text.split(/\r?\n/)) {
    const s = l.replace(/^[\s>*_-]+/, '');
    if (/^cap\b/i.test(s)) { const m = /(\d+(?:\.\d+)?)\s*([KMB])\s+tokens\b/i.exec(s); if (m) cap = +m[1] * UNIT[m[2].toUpperCase()]; }
    let m = /^meter (?:stop )?line\b[^\n%]*?(\d+(?:\.\d+)?)\s*%/i.exec(s); if (m) line = +m[1];
    m = /^fable meter (?:stop )?line\b[^\n%]*?(\d+(?:\.\d+)?)\s*%/i.exec(s); if (m) fableLine = +m[1];
  }
  const sessions = [...new Set([...text.matchAll(/\bsession\s+([0-9a-f]{8})\b/gi)].map((x) => x[1].toLowerCase()))];
  return { path, rel: path.slice(ROOT.length + 1).replace(/\\/g, '/'), cap, line, fableLine, sessions };
}

// ---- transcripts ---------------------------------------------------------------------------------------------------
function lines(path) {
  const out = [];
  for (const l of (read(path) || '').split('\n')) {
    if (l.startsWith('{"type":"api-request"')) { out.push({ type: 'api-request' }); continue; } // a request sent (B2)
    if (!l.startsWith('{"parentUuid"')) continue; // the conversation's lines; app records start otherwise
    try { const o = JSON.parse(l); if (o.type === 'assistant' || o.type === 'user') out.push(o); } catch {}
  }
  return out;
}
// Tokens once per message id (r57-0170's count); the map is shared so a message seen in two files counts once.
function tokensOf(objs, per = new Map()) {
  let s = 0;
  const mine = new Map();
  for (const o of objs) {
    const u = o.type === 'assistant' && o.message && o.message.usage;
    if (u && o.message.id) mine.set(o.message.id, (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0));
  }
  for (const [id, v] of mine) { if (!per.has(id)) { per.set(id, v); s += v; } }
  return s;
}
function blocks(o) { return o.message && Array.isArray(o.message.content) ? o.message.content : []; }
function files(dir, pred, out = []) {
  let es = []; try { es = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) { const p = join(dir, e.name); if (e.isDirectory()) files(p, pred, out); else if (pred(e.name)) out.push(p); }
  return out;
}

// ---- the meter -----------------------------------------------------------------------------------------------------
function meterCheck(objs, tuId, st) {
  // Line index of every block, the message id of the start being decided, and where it begins.
  let curMsg = null, curIdx = objs.length;
  objs.forEach((o, i) => {
    if (o.type === 'assistant' && blocks(o).some((b) => b.type === 'tool_use' && b.id === tuId)) {
      curMsg = o.message.id;
    }
  });
  if (curMsg) curIdx = objs.findIndex((o) => o.type === 'assistant' && o.message.id === curMsg);
  const results = new Map(); // tool_use id -> { idx, err, o, b }
  objs.forEach((o, i) => {
    if (o.type !== 'user') return;
    for (const b of blocks(o)) if (b.type === 'tool_result') results.set(b.tool_use_id, { idx: i, err: !!b.is_error, o, b });
  });
  let lastWave = -1, reading = null;
  objs.forEach((o, i) => {
    if (o.type !== 'assistant' || i >= curIdx || o.message.id === curMsg) return;
    for (const b of blocks(o)) {
      if (b.type !== 'tool_use') continue;
      if ((b.name === 'Agent' || b.name === 'Task') && !(results.get(b.id) || {}).err) lastWave = i;
      if (/get_usage$/.test(b.name || '')) {
        const r = results.get(b.id);
        if (!r || r.err || r.idx >= curIdx) continue;
        const txt = typeof r.b.content === 'string' ? r.b.content : (r.b.content || []).map((c) => c.text || '').join('');
        let j; try { j = JSON.parse(txt); } catch { continue; }
        const ws = (j.plan && Array.isArray(j.plan.windows)) ? j.plan.windows : [];
        const all = ws.find((w) => /all models/i.test(w.label || '')), fab = ws.find((w) => /fable/i.test(w.label || ''));
        if (!all || typeof all.percentUsed !== 'number') continue;
        reading = { idx: i, msg: o.message.id, resIdx: r.idx, at: Date.parse(r.o.timestamp), all: all.percentUsed, fable: fab ? fab.percentUsed : null };
      }
    }
  });
  if (!reading) return 'read the meter (get_usage) in a message before this start, then start in a later message (rule 5, r57-0615)';
  if (reading.idx < lastWave) return 'the last meter reading came before the previous wave of starts: read it again before this wave (rule 5)';
  if (!curMsg && !objs.slice(reading.resIdx + 1).some((o) => o.type === 'api-request' || (o.type === 'assistant' && o.message.id !== reading.msg))) {
    return 'no request has gone out since the meter reading, so the reading is in the same message as this start (r57-0615): start in a later message';
  }
  const age = (NOW - reading.at) / 60000;
  if (!(age <= SPAN_MIN)) return `the last meter reading is ${Math.round(age)} min old; the meter can move a point in ${SPAN_MIN.toFixed(0)} min (r57-0183): read it again`;
  const moved = RATE_PER_MIN * Math.max(0, age);
  if (st && st.line != null && reading.all + moved >= st.line) {
    return `the meter read ${reading.all} % (up to ${(reading.all + moved).toFixed(1)} % now) and the line in ${st.rel} is ${st.line} %: start nothing; ask the owner with cap:`;
  }
  if (st && st.fableLine != null && reading.fable != null && reading.fable + moved >= st.fableLine) {
    return `the Fable meter read ${reading.fable} % and the Fable line in ${st.rel} is ${st.fableLine} %: start nothing; ask the owner with cap:`;
  }
  return null;
}

// ---- the cap -------------------------------------------------------------------------------------------------------
function capCheck(st, projDir, thisTu, newLimit) {
  let spent = 0, reserve = 0, running = 0;
  const starts = new Map(); // tool_use id -> limit or null, from every transcript of the piece
  const answered = new Map(); // tool_use id -> refused (true) or answered
  const metas = [];
  const per = new Map();
  for (const s8 of st.sessions) {
    let names = []; try { names = readdirSync(projDir).filter((n) => n.startsWith(s8) && n.endsWith('.jsonl')); } catch {}
    for (const n of names) {
      const main = join(projDir, n);
      const sub = files(join(projDir, n.replace(/\.jsonl$/, ''), 'subagents'), (x) => x.endsWith('.jsonl') || x.endsWith('.meta.json'));
      for (const f of [main, ...sub.filter((x) => x.endsWith('.jsonl'))]) {
        const objs = lines(f);
        const used = tokensOf(objs, per);
        spent += used;
        for (const o of objs) for (const b of blocks(o)) {
          if (o.type === 'assistant' && b.type === 'tool_use' && (b.name === 'Agent' || b.name === 'Task')) {
            const s = statedLimit((b.input || {}).prompt);
            starts.set(b.id, s ? s.limit : null);
          }
          if (o.type === 'user' && b.type === 'tool_result') answered.set(b.tool_use_id, !!b.is_error);
        }
        const meta = f.replace(/\.jsonl$/, '.meta.json');
        if (f !== main) { let m = null; try { m = JSON.parse(read(meta)); } catch {} metas.push({ used, m, id: basename(f).replace(/^agent-/, '').replace(/\.jsonl$/, '') }); }
      }
    }
  }
  // A helper killed by an app restart never gets "finished" (r57-0118); the count gate's hand-written end marks it.
  const ended = new Set();
  for (const l of (read(join(LOGDIR, 'count-gate.jsonl')) || '').split('\n')) {
    try { const o = JSON.parse(l); if (o.ev === 'end' && o.manual && o.agent) ended.add(String(o.agent).replace(/^agent-/, '')); } catch {}
  }
  const seen = new Set();
  for (const { used, m, id } of metas) {
    if (!m || !m.toolUseId) continue;
    seen.add(m.toolUseId);
    if (m.finished === true || ended.has(id)) continue;
    running++;
    const lim = starts.get(m.toolUseId);
    if (lim != null) reserve += Math.max(0, lim - used);
  }
  // A start with no helper file: refused, or answered without a helper file (ended; its tokens, if any, are counted
  // above), or not yet answered: a start of the same message a moment earlier, which runs with its whole limit.
  for (const [tu, lim] of starts) {
    if (tu === thisTu || seen.has(tu) || answered.has(tu)) continue;
    running++;
    if (lim != null) reserve += lim;
  }
  return { spent, reserve, running, total: spent + reserve + newLimit };
}

// ---- main ----------------------------------------------------------------------------------------------------------
let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
const rec = {};
try {
  if (!j || j.hook_event_name !== 'PreToolUse' || !['Agent', 'Task'].includes(String(j.tool_name))) process.exit(0);
  const ti = j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
  const sess = String(j.session_id || '');
  Object.assign(rec, { session: sess.slice(0, 8), tu: typeof j.tool_use_id === 'string' ? j.tool_use_id : null, agent_id: j.agent_id ? String(j.agent_id).slice(0, 17) : null, desc: String(ti.description || '').slice(0, 60) });

  // 1. The limit and its basis.
  const st = sess ? stateFile(sess.slice(0, 8).toLowerCase()) : null;
  const s = statedLimit(ti.prompt);
  const form = 'token limit L M (expected about E M, basis <record id>)';
  if (s) {
    Object.assign(rec, { limit: s.limit, expected: s.expected, ids: s.ids, in: s.where });
    if (s.expected == null) deny(rec, `fanout gate (r57-0038): the limit in ${s.where} has no expected figure on its line; write "${form}".`);
    if (!(s.limit > s.expected)) deny(rec, `fanout gate (r57-0038): the limit ${fmt(s.limit)} is not above the expected ${fmt(s.expected)}; a limit is the measured need plus a buffer.`);
    if (!s.ids.length) deny(rec, `fanout gate (r57-0038, r57-0617): the limit in ${s.where} cites no record for its expected figure; write "${form}", the record being one that measured similar work.`);
    const missing = s.ids.filter((id) => journalStatus(id) === undefined);
    if (missing.length) deny(rec, `fanout gate (r57-0038): ${missing.join(', ')} cited in ${s.where} is not in library/journal; cite an existing record.`);
    if (!s.ids.some((id) => ['measured', 'observed'].includes(journalStatus(id)))) {
      deny(rec, `fanout gate (r57-0038, r57-0617): none of ${s.ids.join(', ')} is a measured or observed record; cite the record that measured similar work.`);
    }
  } else if (st && st.cap != null) {
    deny(rec, `fanout gate (r57-0614): this session runs under a cap of ${fmt(st.cap)} (${st.rel}); state the helper's limit in its prompt as "${form}".`);
  }

  // 2. The meter, read in an earlier message, after the previous wave.
  const projDir = dirname(String(j.transcript_path || ''));
  let own = String(j.transcript_path || '');
  if (j.agent_id && !/[\\/]subagents[\\/]/.test(own)) {
    const id = String(j.agent_id).replace(/^agent-/, '');
    const found = files(join(projDir, basename(own).replace(/\.jsonl$/, ''), 'subagents'), (n) => n === `agent-${id}.jsonl`);
    own = found[0] || '';
  }
  if (!own || !existsSync(own)) { rec.note = 'caller transcript not found; meter not checked'; }
  else {
    const why = meterCheck(lines(own), j.tool_use_id, st);
    if (why) deny(rec, `fanout gate: ${why}.`);
  }

  // 3. The cap.
  if (st && st.cap != null && s) {
    const main = /[\\/]subagents[\\/]/.test(String(j.transcript_path)) ? resolve(projDir, '..', '..') : projDir;
    const c = capCheck(st, main, j.tool_use_id, s.limit);
    Object.assign(rec, { cap: st.cap, spent: c.spent, reserve: c.reserve, running: c.running });
    if (c.total > st.cap) {
      deny(rec, `fanout gate (r57-0614): spent ${fmt(c.spent)} + the rest of ${c.running} running helpers' limits ${fmt(c.reserve)} + this limit ${fmt(s.limit)} = ${fmt(c.total)}, past the cap of ${fmt(st.cap)} in ${st.rel}; wait for a helper to end, or ask the owner with cap:.`);
    }
  }
  allow(rec);
} catch (e) {
  log({ ...rec, decision: 'allow', note: 'error: ' + String((e && e.message) || e).slice(0, 160) });
  process.exit(0);
}
