// Session monitor, read step (prototype, 2026-11-24). Reads what the machine already keeps and writes one data file.
// It starts no model and changes nothing: stored session transcripts, the helpers' transcripts beside them, and the
// hooks' own logs. Usage: node snapshot.mjs <out.json> <repo root> <transcript folder> [<transcript folder> ...]
import { readFileSync, readdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const ARGS = process.argv.slice(2), CUT = ARGS.indexOf('--page');
const [OUT, REPO, ...FOLDERS] = CUT < 0 ? ARGS : ARGS.slice(0, CUT);
const NOW = Date.now();
const lines = p => { try { return readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } };
const ms = t => (t ? Date.parse(t) : 0);
const short = id => (id || '').slice(0, 8);
const HOOK_RE = /hooks\/([a-z-]+)\.mjs/;

// ---- the harness parts (round 3): which file, tool or agent type stands for which part ----------------------------
const R3 = join(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'round3');
const readJson = p => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const PARTS_FILE = readJson(join(R3, 'harness-parts.json')), RULES_FILE = readJson(process.env.RULES_JSON || join(R3, 'rules.json'));
const PARTS = ((PARTS_FILE && PARTS_FILE.parts) || []).map(p => ({ id: p.id, paths: (p.match.paths || []).map(x => new RegExp(x, 'im')), tools: (p.match.tools || []).map(x => new RegExp(x)), agents: (p.match.agents || []).map(x => new RegExp('^' + x + '$')), commands: (p.match.commands || []).map(x => new RegExp(x)) }));
const norm = s => String(s == null ? '' : s).replace(/\\/g, '/').replace(/\/{2,}/g, '/');
// a text broken into path-like tokens, one per line, each also with a trailing slash (so a folder regex can match a folder named bare)
const tokensOf = s => norm(s).split(/[\s"'`()=;|&<>,{}\[\]*?]+/).filter(Boolean);
const lineText = s => tokensOf(s).map(t => t + '\n' + t + '/').join('\n');
const REDIR = /(?:>>?|\btee(?:\s+-a)?|Add-Content|Set-Content|Out-File)\s+(?:-\w+\s+)*["']?([^\s"'|;&<>]+)/g;
const MD = /\.md$/i;
const MDLOG = { writes: [], touches: [] };   // for the orphans: markdown written, and every later mention of a markdown path
// one tool call -> parts touched. kinds: r read, w write, n named. Returns nothing; adds to use (Map id -> [r, w, n, first]).
function touchParts(use, name, i, t, sid) {
  const hit = (ids, k) => { for (const id of ids) { const u = use.get(id) || use.set(id, [0, 0, 0, 0]).get(id); u[k]++; if (!u[3] || t < u[3]) u[3] = t; } };
  const match = text => PARTS.filter(p => p.paths.some(re => re.test(text))).map(p => p.id);
  const tn = PARTS.filter(p => p.tools.some(re => re.test(name))).map(p => p.id);
  const ag = (name === 'Agent' || name === 'Task') && typeof i.subagent_type === 'string' ? PARTS.filter(p => p.agents.some(re => re.test(i.subagent_type))).map(p => p.id) : [];
  const cm = (name === 'Bash' || name === 'PowerShell') && typeof i.command === 'string' ? PARTS.filter(p => p.commands.some(re => re.test(i.command))).map(p => p.id) : [];   // a command that runs the part (e.g. git commit runs the commit check): a read
  hit(new Set([...tn, ...ag, ...cm]), 0);
  let read = [], write = [], named = [], mdW = [], mdT = [];
  if (name === 'Read' || name === 'Grep' || name === 'Glob') { const txt = lineText([i.file_path, i.path, name === 'Glob' ? i.pattern : '', i.glob].filter(Boolean).join(' ')); read = match(txt); mdT = tokensOf(i.file_path || '').filter(x => MD.test(x)); }
  else if (name === 'Write' || name === 'Edit' || name === 'MultiEdit' || name === 'NotebookEdit') {
    const p = i.file_path || i.notebook_path || ''; write = match(lineText(p)); if (MD.test(p)) mdW = [norm(p)];
    const body = [i.content, i.new_string, ...(i.edits || []).map(e => e && e.new_string)].filter(x => typeof x === 'string').join(' ');
    if (body.includes('.md')) mdT = tokensOf(body).filter(x => MD.test(x) && x.toLowerCase() !== norm(p).toLowerCase());
  } else if (name === 'Bash' || name === 'PowerShell') {
    const cmd = typeof i.command === 'string' ? i.command : ''; const targets = []; for (const m of cmd.matchAll(REDIR)) targets.push(m[1]);
    const w = new Set(match(lineText(targets.join(' ')))); write = [...w]; named = match(lineText(cmd)).filter(id => !w.has(id));
    mdW = targets.map(norm).filter(x => MD.test(x)); mdT = tokensOf(cmd).filter(x => MD.test(x) && !mdW.includes(x));
  } else if (name === 'Agent' || name === 'Task' || /start_session$/.test(name)) {
    const txt = [i.prompt, i.description, i.initial_prompt, i.message, i.title].filter(x => typeof x === 'string').join(' '); named = match(lineText(txt)); mdT = tokensOf(txt).filter(x => MD.test(x));
  }
  hit(read, 0); hit(write, 1); hit(named, 2);
  for (const p of mdW) if (!/[$<>{}*]/.test(p)) MDLOG.writes.push([p, t, sid]);
  for (const p of mdT) MDLOG.touches.push([p, t, sid]);
}

// ---- round 5: the event log. Each call is placed in the harness by simple rules (inference, stated on the page) ------
// places are steps "<pipeline>.<step index>" of the owner's map; a move changes where the actor is, a touch only marks
// that the actor looked at a part there. Reads and plain commands stay where the actor already is.
const PLACES = ((PARTS_FILE && PARTS_FILE.pipelines) || []).flatMap(p => p.steps.map((s, i) => p.id + '.' + i));
const PIDX = Object.fromEntries(PLACES.map((p, i) => [p, i]));
const PART_STEP = Object.fromEntries(((PARTS_FILE && PARTS_FILE.parts) || []).map(p => [p.id, p.step]));
const HOOK_STEP = { 'library-start': 'C.0', 'tier-hook': 'C.1', 'plan-gate': 'C.1', 'creep-gate': 'C.1', 'record-guard': 'C.2', 'window-ceiling': 'E.2', 'count-gate': 'D.1', 'fanout-gate': 'E.3', 'owner-report': 'S3.3', 'journal-watch': 'B3.1' };
const CHECK_KIND = /^(refute|review|test|verify|check)$/;
const kindPlace = (k, research) => research ? (CHECK_KIND.test(k) ? 'G.2' : 'G.1') : k === 'test' ? 'S4.0' : CHECK_KIND.test(k) ? 'S4.2' : k === 'collect' ? 'G.1' : 'S3.2';
const kindOf = i => { const m = /^([a-z-]+):/.exec(i.description || '') || /^lean-([a-z-]+)$/.exec(i.subagent_type || ''); return m ? m[1] : ''; };
const RE_LAND = /(^|[;&|(]\s*|\s)git(\s+-[cC]\s+\S+)*\s+(commit|merge|push|rebase|cherry-pick)(\s|$)|\bgh\s+pr\s+(create|merge)\b/;
const RE_LEARN = /tools\/journal\.mjs[^|;&\n]*--append|(>>|tee -a|Add-Content)\s*["']?[^\s"'|]*library[\\/]+journal[\\/]/;
const RE_TEST = /node\s+(--test\b|\S*\.test\.(mjs|js|ts)\b|\S*(check-commit|selftest|model-check)\S*)|\bnpm\s+(run\s+)?test\b|\bnpx\s+(vitest|jest)\b|\bpytest\b|\btlc\b/;
function placeCall(name, i, ctx) {   // -> { move, touch: [] }
  const out = { move: null, touch: [] };
  const partsIn = text => PARTS.filter(p => p.paths.some(re => re.test(text))).map(p => PART_STEP[p.id]).filter(Boolean);
  if (/update_plan$|^TodoWrite$|PlanMode$/.test(name)) { if (!/update_plan$/.test(name) || i.items) out.move = 'S1.2'; }   // a progress tick (advance, done) is not a return to planning
  else if (/get_usage$/.test(name)) out.move = 'S2.0';
  else if (name === 'Agent' || name === 'Task') out.move = kindPlace(kindOf(i), ctx.research);
  else if (/start_session$/.test(name)) out.move = ctx.research ? 'G.1' : 'S3.0';
  // a closing report (wrap_up) does not move the session: it is not a place where work is done
  else if (name === 'Bash' || name === 'PowerShell') {
    const cmd = norm(typeof i.command === 'string' ? i.command : '');
    if (RE_LAND.test(cmd)) out.move = 'S5.1';
    else if (RE_LEARN.test(cmd)) out.move = 'S6.1';
    else if (RE_TEST.test(cmd)) out.move = ctx.research ? 'G.4' : 'S4.0';
    else { const tg = []; for (const m of cmd.matchAll(REDIR)) if (!/^\/dev\/null$|^nul$|tmp|temp|scratch/i.test(m[1])) tg.push(m[1]);
      const w = tg.length ? partsIn(lineText(tg.join(' '))) : []; if (w.length) out.move = w[0]; else out.touch = partsIn(lineText(cmd)); }
    if (cmd.includes('lookup.sh')) out.touch.push('B3.3');
  } else if (name === 'Write' || name === 'Edit' || name === 'MultiEdit' || name === 'NotebookEdit') {
    const w = partsIn(lineText(i.file_path || i.notebook_path || ''));
    out.move = w.length ? w[0] : (ctx.research || CHECK_KIND.test(ctx.kind || '')) ? null : 'S3.2';
  } else if (name === 'Read' || name === 'Grep' || name === 'Glob') out.touch = partsIn(lineText([i.file_path, i.path, name === 'Glob' ? i.pattern : '', i.glob].filter(Boolean).join(' ')));
  return out;
}
// raw call places and message tokens -> visits [t0, t1, place, tokens, calls] (consecutive same place merged)
function visitsOf(calls, msgs, usage) {
  const ev = [];   // [t, place, tokens, calls]
  const byMid = new Map(); for (const c of calls) (byMid.get(c.mid) || byMid.set(c.mid, []).get(c.mid)).push(c);
  for (const [mid, m] of msgs) { const u = usage.get(mid); const tk = u ? u.all : 0; const cs = byMid.get(mid);
    if (cs && cs.length) for (const c of cs) ev.push([c.t, c.place, tk / cs.length, 1]); else ev.push([m.t, m.place || 'S1.1', tk, 0]); }
  ev.sort((a, b) => a[0] - b[0]);
  const V = [];
  for (const [t, p, tk, n] of ev) { if (!p) continue; const l = V[V.length - 1]; if (l && l[2] === p && t - l[1] < 30 * 60000) { l[1] = t; l[3] += tk; l[4] += n; } else V.push([t, t, p, tk, n]); }
  return V;
}

// ---- one transcript (a session's or a helper's) ------------------------------------------------------------------
function readTranscript(path, sid, ctx = {}) {
  const r = { tc: [], use: new Map(), t0: 0, t1: 0, title: '', model: '', cwd: '', launchedBy: '', starts: [], agents: [], calls: [], plan: [], recap: '',
    recapAt: 0, tokens: 0, peak: 0, denials: {}, otherDenials: 0, startHook: false, owner: 0, hookErrors: 0, meter: null, steps: [], wraps: [], humans: [], lookups: 0, usageReads: 0, journalWrites: 0, denT: [] };
  const usage = new Map(); const pend = {};
  let cur = ctx.kind ? kindPlace(ctx.kind, ctx.research) : ctx.research ? 'G.1' : null; const rawCalls = [], msgs = new Map(), touches = new Map(); r.hookFailT = [];
  for (const o of lines(path)) {
    const t = ms(o.timestamp);
    if (o.type === 'system' && o.subtype === 'stop_hook_summary') for (const e of o.hookErrors || []) { const h = HOOK_RE.exec(norm(String(e))); r.hookFailT.push([t, h ? h[1] : '']); }
    if (o.type === 'assistant' && o.message && o.message.id && !msgs.has(o.message.id)) msgs.set(o.message.id, { t, place: cur });
    if (o.type === 'assistant' && o.message) for (const c of o.message.content || []) if (c.type === 'tool_use') {
      const pc = placeCall(c.name, c.input || {}, ctx); if (pc.move) cur = pc.move; else if (!cur) cur = 'S1.1';
      rawCalls.push({ t, mid: o.message.id, place: cur });
      const m = msgs.get(o.message.id); if (m && !m.place) m.place = cur;
      for (const p of pc.touch) if (p !== cur) { const k = p + '@' + Math.floor(t / 300000); if (!touches.has(k)) touches.set(k, [t, p]); }
    }
    if (t) { if (!r.t0) r.t0 = t; r.t1 = Math.max(r.t1, t); }
    if (o.cwd && !r.cwd) r.cwd = o.cwd;
    if (o.type === 'custom-title' && o.customTitle) r.title = o.customTitle;
    if (o.type === 'agent-name' && o.agentName && !r.title) r.title = o.agentName;
    if (o.type === 'derived-from') for (const s of o.sessions || []) if (s.via === 'launch' && s.started === o.sessionId) r.launchedBy = s.id;
    if (o.type === 'attachment' && o.attachment && o.attachment.type === 'hook_success' && o.attachment.hookEvent === 'SessionStart') r.startHook = true;
    if (o.type === 'system' && o.subtype === 'stop_hook_summary') r.hookErrors += (o.hookErrors || []).length;
    if (o.type === 'user' && o.turnOrigin === 'human') { r.owner++; r.humans.push(t); }
    if (o.toolDenialKind) {
      const txt = JSON.stringify(o.message && o.message.content || '');
      const h = o.permissionDecision && o.permissionDecision.source === 'hook' && HOOK_RE.exec(txt);
      if (h) { r.denials[h[1]] = (r.denials[h[1]] || 0) + 1; r.denT.push([t, h[1]]); } else if (o.toolDenialKind !== 'user-rejected' && o.toolDenialKind !== 'interrupted') r.otherDenials++;
    }
    if (o.type === 'user' && o.message && !o.isMeta) r.lastStop = 'user';
    if (o.type === 'assistant' && o.message) { r.lastStop = o.message.stop_reason || 'open';
      if (o.message.model && !/synthetic/.test(o.message.model)) r.model = o.message.model.replace('claude-', '');
      const u = o.message.usage;
      if (u && o.message.id) usage.set(o.message.id, { all: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0), ctx: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) });
      for (const c of o.message.content || []) if (c.type === 'tool_use') {
        r.calls.push(t); r.tc.push([t, c.name]); const i = c.input || {}; touchParts(r.use, c.name, i, t, sid); const cmd = typeof i.command === 'string' ? i.command : '';
        if (cmd.includes('lookup.sh') || /library[\\/]+INDEX\.md/.test(i.file_path || '')) r.lookups++;
        if ((cmd.includes('tools/journal.mjs') && cmd.includes('--append')) || /(>>|tee -a|Add-Content)\s*["']?[^\s"'|]*library[\\/]+journal[\\/][^\s"'|]*\.jsonl/.test(cmd)) r.journalWrites++;
        if (c.name === 'Agent' || c.name === 'Task') r.agents.push({ t, id: c.id, desc: i.description || '', model: i.model || '' });
        if (/start_session$/.test(c.name)) { pend[c.id] = r.starts.length; r.starts.push({ t, title: i.title || '', ok: false }); }
        if (/get_usage$/.test(c.name)) { pend[c.id] = 'usage'; r.usageReads++; }
        if (/update_plan$/.test(c.name)) {
          if (i.items) r.plan = i.items.map(x => ({ c: x.content, s: x.status }));
          if (i.advance) { const k = r.plan.findIndex(x => x.s === 'in_progress'); if (k >= 0) { r.plan[k].s = 'completed'; if (r.plan[k + 1]) r.plan[k + 1].s = 'in_progress'; } }
          for (const n of i.done || []) if (r.plan[n - 1]) r.plan[n - 1].s = 'completed';
          if (i.start && r.plan[i.start - 1]) r.plan[i.start - 1].s = 'in_progress';
          const cur = r.plan.find(x => x.s === 'in_progress'); if (cur && (!r.steps.length || r.steps[r.steps.length - 1][1] !== cur.c)) r.steps.push([t, cur.c]);
        }
        if (/wrap_up$/.test(c.name) && i.recap) { r.recap = i.recap; r.recapAt = t; r.wraps.push([t, i.recap, i.ask ? 1 : 0]); }
      }
    }
    if (o.type === 'user' && o.message && Array.isArray(o.message.content)) for (const c of o.message.content) if (c.type === 'tool_result' && c.tool_use_id in pend) {
      const txt = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
      if (pend[c.tool_use_id] === 'usage') { const m = /percentUsed\\?":\s*(\d+)/.exec(txt); if (m) r.meter = { t, pct: +m[1] }; }
      else if (/Started session/.test(txt)) r.starts[pend[c.tool_use_id]].ok = true;
    }
  }
  for (const u of usage.values()) { r.tokens += u.all; r.peak = Math.max(r.peak, u.ctx); }
  r.visits = visitsOf(rawCalls, msgs, usage); r.touches = [...touches.values()];
  return r;
}

// ---- sessions and their helpers --------------------------------------------------------------------------------
const sessions = [];
for (const F of FOLDERS) for (const f of readdirSync(F).filter(x => x.endsWith('.jsonl'))) {
  const id = f.replace('.jsonl', ''); const research = /research-runs/.test(F); const r = readTranscript(join(F, f), short(id), { research });
  if (!r.t0) continue;
  const helpers = []; const sub = join(F, id, 'subagents');
  if (existsSync(sub)) for (const m of readdirSync(sub).filter(x => x.endsWith('.meta.json'))) {
    let meta = {}; try { meta = JSON.parse(readFileSync(join(sub, m), 'utf8')); } catch {}
    const h = readTranscript(join(sub, m.replace('.meta.json', '.jsonl')), short(id), { kind: (/^([a-z-]+):/.exec(meta.description || '') || [0, ''])[1] || 'build', research });
    helpers.push({ id: m.replace('agent-', '').replace('.meta.json', ''), desc: meta.description || '', kind: (/^([a-z-]+):/.exec(meta.description || '') || [0, ''])[1], model: (h.model || meta.model || ''), depth: meta.spawnDepth || 1,
      finished: !!meta.finished, t0: h.t0, t1: h.t1, tokens: h.tokens, peak: h.peak, calls: h.calls, tc: h.tc, use: h.use, agents: h.agents, denials: h.denials, visits: h.visits, touches: h.touches, denT: h.denT, hookFailT: h.hookFailT });
  }
  helpers.sort((a, b) => a.t0 - b.t0);
  sessions.push({ id, folder: basename(F), ...r, helpers });
}
sessions.sort((a, b) => a.t0 - b.t0);
// who started whom: the app's own link first, then a start call whose title is the child's title
for (const s of sessions) {
  if (s.launchedBy && sessions.some(p => p.id === s.launchedBy)) { s.parent = s.launchedBy; continue; }
  const cands = sessions.filter(p => p.id !== s.id && p.starts.some(x => x.ok && x.title && x.title === s.title && x.t <= s.t0 + 60000));
  if (cands.length) s.parent = cands[cands.length - 1].id;
}

// ---- the hooks' own logs ---------------------------------------------------------------------------------------
const HOOKS = ['library-start', 'tier-hook', 'record-guard', 'plan-gate', 'window-ceiling', 'count-gate', 'fanout-gate', 'owner-report', 'journal-watch'];
const hookLog = {}; const installed = {};
for (const h of HOOKS) {
  const L = lines(join(REPO, '.claude', 'logs', h + '.jsonl'));
  hookLog[h] = L; installed[h] = L.length ? Math.min(...L.map(o => o.t || Infinity)) : 0;
}
const known = new Set(sessions.map(s => short(s.id)));
const perHook = {};
for (const h of HOOKS) {
  const by = {}; let stray = 0;
  for (const o of hookLog[h]) {
    const sid = short(o.session || o.sess || '');
    if (!known.has(sid)) { stray++; continue; }
    const b = by[sid] || (by[sid] = { n: 0, deny: 0, last: 0 });
    b.n++; if (o.decision === 'deny' || o.ev === 'deny' || o.ev === 'refuse') b.deny++; b.last = Math.max(b.last, o.t || 0);
  }
  perHook[h] = { lines: hookLog[h].length, installed: installed[h], stray, by };
}
// which folders have the hooks switched on at all
const folders = {};
for (const s of sessions) if (s.cwd && !(s.cwd in folders)) {
  let n = null; try { const j = readFileSync(join(s.cwd, '.claude', 'settings.json'), 'utf8'); n = [...new Set([...j.matchAll(/hooks\/([a-z-]+)\.mjs/g)].map(m => m[1]))]; } catch {}
  folders[s.cwd] = n;
}

// ---- expected against seen: a call that a hook should have checked, and whether its log shows the check ---------
for (const s of sessions) {
  const sid = short(s.id); const chk = {};
  const all = [{ calls: s.calls, agents: s.agents, starts: s.starts }, ...s.helpers.map(h => ({ calls: h.calls, agents: h.agents, starts: [] }))];
  // a call written in the last minute may still be in flight (its hook has not run yet): it is not counted as missed
  const count = (pick, from) => all.reduce((a, x) => a + pick(x).filter(t => t >= from && t < NOW - 60000).length, 0);
  const seen = h => (perHook[h].by[sid] || { n: 0 }).n;
  if (installed['tier-hook']) chk['tier-hook'] = { expected: count(x => [...x.agents.map(a => a.t), ...x.starts.map(a => a.t)], installed['tier-hook']), seen: hookLog['tier-hook'].filter(o => short(o.session) === sid && (o.what === 'helper' || o.what === 'session')).length };
  if (installed['window-ceiling']) chk['window-ceiling'] = { expected: count(x => x.calls, installed['window-ceiling']), seen: hookLog['window-ceiling'].filter(o => short(o.session) === sid && o.tool).length };
  if (installed['library-start']) chk['library-start'] = { expected: s.t0 >= installed['library-start'] ? 1 : 0, seen: s.startHook ? 1 : 0 };
  s.checks = chk; s.hookSeen = Object.fromEntries(HOOKS.map(h => [h, perHook[h].by[sid] || null]));
  s.hooksOn = s.cwd in folders ? folders[s.cwd] : null;
  s.ceil = null; for (const o of hookLog['window-ceiling']) if (short(o.session) === sid && !o.agent && o.ctx && o.line && (!s.ceil || o.ctx / o.line > s.ceil.ctx / s.ceil.line)) s.ceil = { ctx: o.ctx, line: o.line };
  const ts = [...s.calls].sort((a, b) => a - b); s.segs = [];
  for (const t of ts) { const l = s.segs[s.segs.length - 1]; if (l && t - l[1] < 20 * 60000) l[1] = t; else s.segs.push([t, t]); }
  if (!s.segs.length) s.segs = [[s.t0, s.t1]];
}

// ---- round 5: marks pinned where they happened: [t, place, kind, detail]. kinds: refused (a hook did its job), and the
// problems: hookfail (a hook failed and let the call through), noton (hook not switched on in the session's folder),
// window (the window passed its computed line), unchecked (a helper or session start with no line in the tier hook's log)
for (const s of sessions) {
  const sid = short(s.id), M = [];
  for (const x of [s, ...s.helpers]) { for (const [t, h] of x.denT || []) M.push([t, HOOK_STEP[h] || 'C.1', 'refused', h]); for (const [t, h] of x.hookFailT || []) M.push([t, HOOK_STEP[h] || 'C.5', 'hookfail', h]); }
  if (s.hooksOn) for (const h of Object.keys(HOOK_STEP)) if (installed[h] && installed[h] <= s.t1 && !s.hooksOn.includes(h)) M.push([s.t0, HOOK_STEP[h], 'noton', h]);
  const wl = hookLog['window-ceiling'].filter(o => short(o.session) === sid && !o.agent && o.ctx && o.line && o.ctx > o.line); if (wl.length) { const o = wl.reduce((a, b) => b.ctx / b.line > a.ctx / a.line ? b : a); M.push([wl[0].t, 'E.2', 'window', o.ctx + '/' + o.line]); }
  if (installed['tier-hook'] && !(s.hooksOn && !s.hooksOn.includes('tier-hook'))) {
    const exp = [...s.agents.map(a => a.t), ...s.starts.map(a => a.t), ...s.helpers.flatMap(h => h.agents.map(a => a.t))].filter(t => t >= installed['tier-hook'] && t < NOW - 60000).sort((a, b) => a - b);
    const seen = hookLog['tier-hook'].filter(o => short(o.session) === sid && (o.what === 'helper' || o.what === 'session')).map(o => o.t).sort((a, b) => a - b); const used = new Set();
    for (const t of exp) { const k = seen.findIndex((x, j) => !used.has(j) && x >= t - 5000 && x <= t + 120000); if (k >= 0) used.add(k); else M.push([t, 'C.1', 'unchecked', 'tier-hook']); }
  }
  s.marks = M.sort((a, b) => a[0] - b[0]);
}

// ---- round 3: parts touched (use), hook calls expected against seen (hk), documents never touched again (orphans) ----
const matcherRe = m => { try { return m === undefined || m === '' || m === '*' ? /.*/ : new RegExp('^(?:' + m + ')$'); } catch { return /^$/; } };
const ENF = ((RULES_FILE && RULES_FILE.enforcers) || []).filter(e => /^hook:/.test(e.id));
const ENFLOG = {};
for (const e of ENF) { const name = e.id.slice(5); const L = e.log ? lines(join(REPO, e.log)) : hookLog[name] || []; const f = e.logSessionField; const by = {}; let first = e.firstLog ? Date.parse(e.firstLog) : Infinity; if (!f || !e.logsTools) { ENFLOG[e.id] = { first: Infinity, by }; continue; } for (const o of L) { if (!e.firstLog && o.t) first = Math.min(first, o.t); if (!o[f]) continue; const sid = short(o[f]); const b = by[sid] || (by[sid] = [0, 0]); b[0]++; if (o.decision === 'deny' || o.ev === 'deny' || o.ev === 'refuse') b[1]++; }
  ENFLOG[e.id] = { first, by }; }
const wiredIn = (cwd, name) => { try { const j = JSON.parse(readFileSync(join(cwd, '.claude', 'settings.json'), 'utf8')); const out = [];
  for (const [ev, arr] of Object.entries(j.hooks || {})) for (const g of arr) if ((g.hooks || []).some(h => new RegExp('hooks/' + name + '\.mjs').test(h.command || ''))) out.push({ event: ev, matcher: g.matcher }); return out; } catch { return null; } };
for (const s of sessions) {
  const use = new Map(); const all = [[s, 0], ...s.helpers.map(h => [h, 1])];
  for (const [x, isH] of all) for (const [id, u] of x.use) { const a = use.get(id) || use.set(id, [0, 0, 0, 0, 0]).get(id); a[0] += u[0]; a[1] += u[1]; a[2] += u[2]; if (u[3] && (!a[3] || u[3] < a[3])) a[3] = u[3]; if (isH) a[4] += u[0] + u[1] + u[2]; }
  s.useOut = Object.fromEntries([...use.entries()].filter(([, a]) => a[0] + a[1] + a[2]).sort());
  s.hkOut = {};
  for (const e of ENF) { const name = e.id.slice(5); const lg = ENFLOG[e.id]; if (!e.logsEveryCheck || !isFinite(lg.first)) continue;
    const own = s.cwd ? wiredIn(s.cwd, name) : null; if (own === null) continue; /* no settings file read: cannot tell wired from bypassed */
    const wired = (own.length ? own : e.wired || []).filter(w => w.event === 'PreToolUse');
    const inLog = e.id === 'hook:owner-report' ? /wrap_up$/ : new RegExp(e.logsTools); /* owner-report: an Artifact call is logged only when it publishes, not visible here */
    let exp = 0; const tool = wired.map(w => matcherRe(w.matcher));
    if (tool.length) for (const [x] of all) exp += x.tc.filter(([t, n]) => t >= lg.first && t < NOW - 60000 && inLog.test(n) && tool.some(re => re.test(n))).length;
    const b = lg.by[short(s.id)] || [0, 0]; if (exp || b[0]) s.hkOut[e.id] = [exp, b[0], b[1]]; }
}
// orphans: markdown written and never read, named or pointed at afterwards (any session, any helper)
const SKIP_ORPHAN = /(^|\/)(CLAUDE|MEMORY)\.md$|\/\.claude\/projects\/|\/AppData\/|\/tmp\/|\/node_modules\/|(^|\/)library\/INDEX\.md$/i;
const base = p => p.slice(p.lastIndexOf('/') + 1).toLowerCase();
const touchBy = new Map(); for (const [p, t] of MDLOG.touches) { const k = base(p); (touchBy.get(k) || touchBy.set(k, []).get(k)).push([p.toLowerCase(), t]); }
const firstW = new Map(); for (const [p, t, sid] of MDLOG.writes) { const k = p.toLowerCase(); if (!firstW.has(k) || t < firstW.get(k)[0]) firstW.set(k, [t, sid, p]); }
const REPO_N = norm(REPO.startsWith('.') || !REPO.includes(':') ? join(process.cwd(), REPO) : REPO).toLowerCase().replace(/\/$/, '') + '/';
const orphanAll = [];
for (const [k, [t, sid, p]] of firstW) { if (SKIP_ORPHAN.test(p)) continue;
  const rel = k.startsWith(REPO_N) ? k.slice(REPO_N.length) : k;
  const hits = (touchBy.get(base(k)) || []).filter(([q, tq]) => tq > t && (q === k || k.endsWith('/' + q) || q.endsWith('/' + rel) || rel === q));
  if (!hits.length) orphanAll.push([k.startsWith(REPO_N) ? p.slice(REPO_N.length) : p, sid, t]); }
orphanAll.sort((a, b) => b[2] - a[2]);
const orphans = orphanAll.slice(0, 150);

// ---- write, with the bulky arrays dropped ----------------------------------------------------------------------
const BASE = Math.min(...sessions.map(s => s.t0)); const sec = t => Math.round((t - BASE) / 1000);
const pv = V => (V || []).filter(v => PIDX[v[2]] !== undefined).map(v => [sec(v[0]), Math.round((v[1] - v[0]) / 1000), PIDX[v[2]], Math.round(v[3] / 1000), v[4]]);
const pt = T => (T || []).filter(x => PIDX[x[1]] !== undefined).map(x => [sec(x[0]), PIDX[x[1]]]);
const slim = sessions.map(s => ({ ev: pv(s.visits), tch: pt(s.touches), marks: (s.marks || []).filter(m => PIDX[m[1]] !== undefined).map(m => [sec(m[0]), PIDX[m[1]], m[2], m[3]]), id: short(s.id), folder: s.folder, title: s.title, model: s.model, t0: s.t0, t1: s.t1, parent: s.parent ? short(s.parent) : '',
  plan: s.plan, tokens: s.tokens, peak: s.peak, denials: s.denials, otherDenials: s.otherDenials, owner: s.owner, hookErrors: s.hookErrors, meter: s.meter,
  segs: s.segs, nCalls: s.calls.length, steps: s.steps, wraps: s.wraps, humans: s.humans, lookups: s.lookups, usageReads: s.usageReads, journalWrites: s.journalWrites, denT: s.denT, ceil: s.ceil, startHook: s.startHook, turnOpen: !!s.lastStop && s.lastStop !== 'end_turn', nStarts: s.starts.length, checks: s.checks, hookSeen: s.hookSeen, hooksOn: s.hooksOn, use: s.useOut, hk: s.hkOut,
  helpers: s.helpers.map(h => ({ ev: pv(h.visits), tch: pt(h.touches), id: h.id.slice(0, 6), kind: h.kind, model: h.model.replace('claude-', ''), finished: h.finished, t0: h.t0, t1: h.t1, tokens: h.tokens, peak: h.peak })) }));
let next = ''; try { const m = /^\d+\. NEXT \S+ \[open\] (.*)$/m.exec(readFileSync(join(REPO, 'library', 'INDEX.md'), 'utf8')); if (m) next = m[1].split(/(?<=\.)\s/)[0].replace(/\s*\(see[^)]*\)/g, '').replace(/\s*\(?\b[a-z]\w*-\d{4}\)?/g, ''); } catch {}
// the page draws rule text, status and who enforces it; evidence is kept as file:line, a restated rule keeps only its text and pointer
const fl = a => (a || []).slice(0, 3).map(x => String(x).replace(/\s*\(.*$/, '').replace(/\s+and\s+.*$/, ''));
const trimRules = R => R && ({ made: R.made, sources: (R.sources || []).slice(0, 12).map(x => String(x).slice(0, 80)),
  enforcers: (R.enforcers || []).map(({ reads, logsEvents, logSessionChars, logAgentField, evidence, ...e }) => ({ ...e, evidence: fl(evidence) })),
  rules: (R.rules || []).map(({ trigger, cannotSee, evidence, source, ...r }) => r.same ? { ...r, source: String(source || '').slice(0, 40) } : { ...r, source, trigger, cannotSee, evidence: fl(evidence) }) });
const data = { made: Date.now(), base: BASE, places: PLACES, next, sessions: slim, hooks: Object.fromEntries(HOOKS.map(h => [h, { lines: perHook[h].lines, installed: perHook[h].installed, stray: perHook[h].stray }])), folders, harness: { parts: PARTS_FILE, rules: trimRules(RULES_FILE) }, orphans, orphansTotal: orphanAll.length };
writeFileSync(OUT, JSON.stringify(data));
console.log('sessions', slim.length, 'helpers', slim.reduce((a, s) => a + s.helpers.length, 0), 'bytes', statSync(OUT).size);
console.log('harness parts', PARTS.length, 'rules.json', RULES_FILE ? 'read (' + ENF.length + ' hook enforcers)' : 'ABSENT: hk left empty', 'orphans', orphanAll.length, '(kept ' + orphans.length + ')');
console.log('folders (hooks switched on in each; null = no settings file):', JSON.stringify(folders));
if (process.argv.includes('--page')) { const tpl = process.argv[process.argv.indexOf('--page') + 1], out = process.argv[process.argv.indexOf('--page') + 2];
  writeFileSync(out, readFileSync(tpl, 'utf8').replace('/*DATA*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'))); console.log('page written', out); }
for (const h of HOOKS) console.log(h.padEnd(15), 'lines', String(perHook[h].lines).padStart(5), 'not from a stored session', perHook[h].stray, 'since', perHook[h].installed ? new Date(perHook[h].installed).toISOString().slice(5, 16) : '-');
console.log('\nstart      id        parent    helpers  tier seen/exp  ceiling seen/exp  startHook  refusals  title');
for (const s of slim) { const c = s.checks; const f = k => c[k] ? `${c[k].seen}/${c[k].expected}` : '-';
  console.log(new Date(s.t0).toISOString().slice(5, 16), s.id, (s.parent || '-').padEnd(9), String(s.helpers.length).padStart(4), '   ', f('tier-hook').padEnd(12), f('window-ceiling').padEnd(16), f('library-start').padEnd(9), JSON.stringify(s.denials).slice(0, 40).padEnd(10), '|', s.title.slice(0, 44)); }
