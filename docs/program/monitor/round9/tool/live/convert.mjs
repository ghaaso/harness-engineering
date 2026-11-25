// Round 9, the live feed: turns the read step's JSON (monitor/build/snapshot.mjs) into the TOOL_DATA shape of
// monitor/round8/clickable/shared/DATA.md, plain data only. Node built-ins only. What each field comes from and what is
// left empty: NOTES.md in this folder.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_DEFAULT = join(HERE, '..', '..', '..', '..', '..', '..');
const DATA_JS = join(REPO_DEFAULT, 'docs', 'program', 'monitor', 'round8', 'clickable', 'shared', 'data.js');
export const BASE_MS = new Date(2026, 10, 18).getTime();          // Wed 18 Nov 2026 00:00 local time
const MIN = 60000, DAY = 1440, BUCKET = 5, OPEN_PAD = 100000;

// ---- the replay copy: its parts list and the tags it already gives (read only) --------------------------------------
let replay = null;
export function loadReplay(path = DATA_JS) {
  if (replay && replay.path === path) return replay;
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(readFileSync(path, 'utf8'), ctx);
  const D = ctx.window.TOOL_DATA;
  replay = { path, parts: D.parts, tags: Object.fromEntries(D.sessions.map(s => [s.id, s.tag])) };
  return replay;
}

// ---- hook logs -----------------------------------------------------------------------------------------------------
// One log line -> {part, session, result} or null (a line that is not a hook call: no session, or a test marker).
export function hookLine(name, o) {
  const sid = String(o.session || o.sess || '').slice(0, 8);
  const d = o.decision !== undefined ? o.decision : o.ev;
  if (!sid) return null;
  if (name === 'window-ceiling' && o.ev && o.decision === undefined) return null;      // test-on / test-off markers
  let result = 'passed';
  if (/^(deny|refuse|refused|block|blocked)$/.test(d)) result = 'refused';
  else if (/^(error|fail|failed|crash)$/.test(d) || o.error) result = 'failed';
  return { part: 'hook:' + name, session: sid, result };
}
export function readHookLogs(dir) {
  const out = [];
  let files = []; try { files = readdirSync(dir).filter(f => f.endsWith('.jsonl')); } catch { return out; }
  for (const f of files) {
    const name = f.replace(/\.jsonl$/, '');
    let text = ''; try { text = readFileSync(join(dir, f), 'utf8'); } catch { continue; }
    for (const l of text.split('\n')) {
      if (!l) continue; let o; try { o = JSON.parse(l); } catch { continue; }
      const h = hookLine(name, o); if (h && o.t) out.push({ ms: o.t, ...h });
    }
  }
  return out;
}

// ---- small helpers ---------------------------------------------------------------------------------------------------
const r1 = x => Math.round(x * 10) / 10;
const modelOf = m => { const x = /(opus|sonnet|haiku|fable)/.exec(String(m || '')); return x ? x[1] : String(m || '').replace(/^claude-/, ''); };
const firstSentence = t => { const s = String(t || '').trim(); const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(s); return (m ? m[0] : s).slice(0, 300); };

function makeTags(snapSessions, known) {
  const used = new Set(), out = {};
  for (const s of snapSessions) if (known[s.id]) { out[s.id] = known[s.id]; used.add(known[s.id]); }
  for (const s of snapSessions) {
    if (out[s.id]) continue;
    const words = String(s.title || '').replace(/^[a-z-]+:\s+(?=\S)/i, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
    let base = words.slice(0, 4).map(w => w[0]).join('').toUpperCase();
    if (base.length < 2) base = ((words[0] || 'S') + 'XX').slice(0, 2).toUpperCase();
    let tag = base, n = 1;
    while (used.has(tag)) { n++; tag = base.slice(0, 3) + n; }
    used.add(tag); out[s.id] = tag;
  }
  return out;
}

// ---- the conversion --------------------------------------------------------------------------------------------------
// opts: { logsDir, now (ms, default snapshot.made), dataJs, hookLines (already read lines, optional),
//         asks ({session id: live/asks.mjs lastAsk}, optional: without it only the read step's ask flag is used) }
export function toToolData(snap, opts = {}) {
  const { parts, tags: knownTags } = loadReplay(opts.dataJs);
  const partIds = new Set(parts.map(p => p.id));
  const made = snap.made, now = opts.now || made, SB = snap.base;
  const m = ms => r1((ms - BASE_MS) / MIN);
  const todayMs = new Date(now); todayMs.setHours(0, 0, 0, 0);
  const todayStart = todayMs.getTime();
  const replayStart = m(todayStart), replayEnd = m(now), farEnd = r1(replayEnd + OPEN_PAD);
  const sb = sec => SB + sec * 1000;                                  // the read step stores seconds from its own base

  // which sessions are shown
  const info = new Map();
  for (const s of snap.sessions) {
    const humans = (s.humans || []).slice().sort((a, b) => a - b);
    const lastAct = Math.max(s.t1 || 0, ...s.helpers.map(h => h.t1 || 0));
    const runH = s.helpers.map(h => !h.finished && now - (h.t1 || 0) < 20 * MIN);
    // waits: from a closing report to his next message, or still open. A report after which the session itself went on
    // (its own next call, or a later report) before he wrote was not a wait for him: it is dropped.
    const waits = [], a = (opts.asks || {})[s.id];
    const wraps = (s.wraps || []).slice().sort((a, b) => a[0] - b[0]);
    wraps.forEach((w, k) => {
      const t = w[0], self = [];
      const nh = humans.find(x => x > t);
      if (wraps[k + 1]) self.push(wraps[k + 1][0]);
      const v = (s.ev || []).map(e => sb(e[0])).find(x => x > t + 15000); if (v) self.push(v);
      const sg = (s.segs || []).map(g => g[1]).find(x => x > t + 15000); if (sg && !v) self.push(sg);
      if (self.length && (!nh || Math.min(...self) < nh)) return;
      // A report waits for him only when it asks him something: the call carries an `ask`, or (seen in the transcript's
      // end, opts.asks) `blocked: true`. A closing report with no question is finished, not waiting.
      const open = !nh, la = open && a && a.wrapT === t ? a : null;
      if (!(w[2] || (la && (la.ask || la.blocked)))) return;
      waits.push({ from: t, to: nh || null, report: firstSentence(w[1]), ask: true, askText: la ? la.askText : '' });
    });
    // a question tool call with no answer yet is a wait too
    if (a && a.question && !(waits.length && waits[waits.length - 1].to === null)) waits.push({ from: a.question.t || s.t1, to: null, report: a.question.text, ask: true, askText: a.question.text });
    // an open report while one of its own helpers still runs: it waits for the helper, not for him
    if (waits.length && waits[waits.length - 1].to === null && runH.some(Boolean)) waits.pop();
    const openWait = waits.length && waits[waits.length - 1].to === null;
    const turnLive = !!s.turnOpen && now - (s.t1 || 0) < 10 * MIN;
    const open = openWait || runH.some(Boolean) || now - lastAct < 30 * MIN;
    info.set(s.id, { humans, lastAct, runH, waits, openWait, turnLive, open });
  }
  const shown = snap.sessions.filter(s => { const i = info.get(s.id); return i.lastAct >= todayStart || (i.openWait && now - i.lastAct < 24 * 3600e3); });
  const shownIds = new Set(shown.map(s => s.id));
  const tags = makeTags(shown, knownTags);

  // sessions
  const sessions = shown.map(s => {
    const i = info.get(s.id);
    const segs = (s.segs || []).map(g => [m(g[0]), m(g[1])]);
    if (i.turnLive && segs.length) segs[segs.length - 1][1] = replayEnd;
    const waits = i.waits.map(w => [m(w.from), w.to === null ? farEnd : m(w.to), w.report]);
    const helpers = s.helpers.map((h, k) => {
      const kind = h.kind || 'build';
      return { id: h.id, kind, model: modelOf(h.model), start: m(h.t0), end: i.runH[k] ? farEnd : m(h.t1), tokens: h.tokens || 0,
        parts: partIds.has('kind:' + kind) ? ['kind:' + kind] : [] };
    });
    const tokensTotal = (s.tokens || 0) + s.helpers.reduce((a, h) => a + (h.tokens || 0), 0);
    // cumulative token trend every 15 minutes: the read step's visits carry tokens with times; scaled so the end equals the total
    const pts = [];
    for (const x of [s, ...s.helpers]) for (const e of x.ev || []) pts.push([sb(e[0] + e[1]), (e[3] || 0) * 1000]);
    pts.sort((a, b) => a[0] - b[0]);
    const sum = pts.reduce((a, p) => a + p[1], 0), scale = sum > 0 ? tokensTotal / sum : 0;
    const tokens = [];
    if (tokensTotal > 0 && pts.length) {
      const endMs = i.open ? now : Math.max(i.lastAct, pts[pts.length - 1][0]);
      let acc = 0, k = 0;
      for (let tm = Math.ceil(m(s.t0) / 15) * 15; BASE_MS + tm * MIN <= endMs; tm += 15) {
        while (k < pts.length && pts[k][0] <= BASE_MS + tm * MIN) acc += pts[k++][1];
        tokens.push([tm, Math.round(acc * scale)]);
      }
      tokens.push([m(endMs), tokensTotal]);
    }
    return {
      id: s.id, tag: tags[s.id], name: s.title || s.id,
      parent: s.parent && shownIds.has(s.parent) ? s.parent : null,
      model: modelOf(s.model), start: m(s.t0), end: i.open ? null : m(i.lastAct),
      segs, waits, steps: (s.steps || []).map(x => [m(x[0]), x[1]]),
      plan: (s.plan || []).map(p => ({ text: p.c, status: p.s })),
      tokens, tokensTotal, owner: i.humans.map(m), helpers,
    };
  }).sort((a, b) => a.start - b.start);

  // events: hook calls (real times), failures the read step reports, and parts used (first use, with the count)
  const lines = opts.hookLines || (opts.logsDir ? readHookLogs(opts.logsDir) : []);
  const events = [];
  for (const h of lines) if (shownIds.has(h.session)) events.push({ t: m(h.ms), ms: h.ms, session: h.session, helper: null, part: h.part, result: h.result });
  for (const s of shown) {
    for (const mk of s.marks || []) {                                   // [sec, place, kind, detail]
      const kind = mk[2], detail = String(mk[3] || '');
      if (kind === 'refused') continue;                                 // already one event per denial in the hook logs
      const part = kind === 'window' ? 'hook:window-ceiling' : kind === 'unchecked' ? 'hook:tier-hook' : 'hook:' + detail;
      if (!partIds.has(part)) continue;
      const ms = sb(mk[0]);
      events.push({ t: m(ms), ms, session: s.id, helper: null, part, result: kind === 'noton' ? 'not-on' : 'failed', kind: kind === 'hookfail' ? 'hookfail' : kind });
    }
    for (const [pid, u] of Object.entries(s.use || {})) {
      const id = pid.replace(/^agent:lean-/, 'kind:');
      if (id.startsWith('hook:') || !partIds.has(id)) continue;         // hooks come from their own logs
      const n = (u[0] || 0) + (u[1] || 0) + (u[2] || 0); if (!n || !u[3]) continue;
      const bucket = Math.floor(m(u[3]) / BUCKET) * BUCKET;
      events.push({ t: bucket, ms: u[3], session: s.id, helper: null, part: id, result: 'passed', n });
    }
  }
  events.sort((a, b) => a.t - b.t || a.ms - b.ms);

  // owner: all his messages the read step saw, and gaps of 45 minutes or more between two of them
  const msgs = [...new Set(snap.sessions.flatMap(s => s.humans || []))].sort((a, b) => a - b).map(m);
  const away = [];
  for (let k = 1; k < msgs.length; k++) if (msgs[k] - msgs[k - 1] >= 45) away.push({ left: msgs[k - 1], back: msgs[k], minutes: r1(msgs[k] - msgs[k - 1]) });

  // week: the 7 days ending today, counts per 5 minutes
  const lastDay = Math.floor(replayStart / DAY), firstDay = lastDay - 6;
  const NB = DAY / BUCKET;
  const days = []; for (let d = firstDay; d <= lastDay; d++) days.push({ day: d, label: dayLabel(d), sessions: new Array(NB).fill(0), helpers: new Array(NB).fill(0), trouble: new Array(NB).fill(0) });
  const addRange = (field, a, b) => {                                    // a, b in ms; every bucket touched once
    const ba = Math.floor((a - BASE_MS) / MIN / BUCKET), bb = Math.floor((b - BASE_MS) / MIN / BUCKET);
    for (let g = ba; g <= bb; g++) { const d = Math.floor(g / NB) - firstDay; if (d >= 0 && d < 7) days[d][field][g % NB]++; }
  };
  for (const s of snap.sessions) {
    const seen = new Set();
    for (const g of s.segs || []) for (let b = Math.floor((g[0] - BASE_MS) / MIN / BUCKET); b <= Math.floor((g[1] - BASE_MS) / MIN / BUCKET); b++) seen.add(b);
    for (const b of seen) addRange('sessions', BASE_MS + b * BUCKET * MIN, BASE_MS + b * BUCKET * MIN);
    for (const h of s.helpers) addRange('helpers', h.t0, Math.max(h.t0, h.t1));
  }
  const trouble = (opts.hookLines || (opts.logsDir ? readHookLogs(opts.logsDir) : [])).filter(h => h.result !== 'passed');
  const knownIds = new Set(snap.sessions.map(s => s.id));
  for (const h of trouble) if (knownIds.has(h.session)) addRange('trouble', h.ms, h.ms);

  // waiting: today's waits for him
  const waiting = [];
  for (const s of sessions) {
    const full = shown.find(x => x.id === s.id), i = info.get(s.id);
    const lastStep = (s.plan[s.plan.length - 1] || {}).text || (s.steps[s.steps.length - 1] || [0, ''])[1];
    i.waits.forEach(w => {
      const to = w.to === null ? replayEnd : m(w.to), from = m(w.from);
      if (to <= replayStart) return;
      const q = w.askText || (/[^.!?]*\?/.exec(w.report) || [])[0];
      const dummy = !q;
      waiting.push({ session: s.id, from, to, minutes: r1(to - from), report: w.report, question: dummy ? `Shall I go on with "${lastStep}"?` : q.trim(), dummy });
    });
  }
  waiting.sort((a, b) => a.from - b.from);

  return {
    generated: new Date(made).toISOString(), timeUnit: 'minutes since Wed 18 Nov 2026 00:00 local time, one decimal',
    baseMs: BASE_MS, live: true, madeMs: made, replayStart, replayEnd,
    parts, sessions, events,
    owner: { messages: msgs, away },
    week: { start: firstDay * DAY, bucketMinutes: BUCKET, days },
    waiting,
  };
}
function dayLabel(d) {
  const t = new Date(BASE_MS + d * DAY * MIN);
  return t.toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' + t.getDate() + ' ' + t.toLocaleDateString('en-GB', { month: 'short' });
}
