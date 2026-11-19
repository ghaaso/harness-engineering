#!/usr/bin/env node
// stall-scan.mjs - the measuring instrument of the multi-day "blocked program start" test (Node 24, no dependencies).
//
// It reads three kinds of records and prints, for a period, every EPISODE of blocked program starts and every
// UNCLEAN RESTART of the PC. Read-only: it reads log files, runs `wevtutil qe System` once (a Windows program,
// read-only, no elevation) and writes nothing. It prints no path, no session id and no message text: only times,
// kinds, durations and task names.
//
//   node stall-scan.mjs [--since <date>] [--until <date>] [--json] [--debug]
//                       [--app-dir <dir>] [--watch-dir <dir>]
//                       [--system-xml <file> | --system-json <file> | --no-system]
//
//   --since   a date "2026-11-01" (local midnight) or "2026-11-01 15:30"; default: 7 days before now
//   --until   same forms; a bare date means the END of that day; default: now
//   --json    the same result as JSON
//   --debug   also list every piece of evidence behind each episode, and what was ignored and why
//   --app-dir   the Claude app's logs folder; default %LOCALAPPDATA%\Claude\logs (found from the environment)
//   --watch-dir where av-watch.log / pc-watch.log are; default: the folder this script is in
//   --system-xml / --system-json  read System events from a file instead of calling wevtutil
//                (xml = `wevtutil qe System /f:xml` output; json = the PowerShell export format used on 2026-11-17)
//
// SOURCES
//   1. The app's log (main.log + rotations main1..main3.log): [event-loop-stall] lines, "spawn EPERM", git
//      "timed out after", and silences between lines.
//   2. The watcher logs (av-watch*.log, pc-watch*.log): BLOCK / UNBLOCK / SLOW events, a start probe that took
//      >= 5 s, and a pause between periodic lines.
//   3. The Windows System log through wevtutil: Kernel-Power 41 / 42 / 107, Power-Troubleshooter 1, EventLog
//      6005 / 6006 / 6008, User32 1074 (plus Kernel-General 12 for the boot time, WER 1001 for bugchecks).
//
// WHAT COUNTS AS A BLOCK (one piece of "evidence"; pieces within 10 minutes of each other are one episode)
//   stall    an [event-loop-stall] whose task is a program start (spawn:* or ccd:spawn_query*) lasting >= 5 s with
//            the PC awake. The app's own "[likely sleep: ...]" label is NOT trusted: only a real sleep (a Windows
//            sleep interval from the System log, or the app's own OS suspend/resume lines) cancels a stall.
//   eperm    a "spawn EPERM" line (a program start that was refused).
//   timeout  a git call that "timed out after N ms" (a git start or run that did not return). Network-proxy
//            timeouts ("resolveProxy timed out") are not program starts and are ignored.
//   silence  the app's log is silent for > 3 minutes between two lines of one run, with the PC awake; or, at the
//            end of a run, silent for > 3 minutes before an UNCLEAN restart that carries no sleep/standby flag
//            (a clean "Windows session ending" is excluded). Silent for only 65 s to 3 min before such a restart
//            counts only when stuck starts follow within 10 minutes after the boot (see below).
//   watch    a watcher BLOCK event, a start probe (start_ms) >= 5 s, or a pause of >= 30 s between its periodic
//            lines inside one watcher run.
//   NOT a block: a real sleep of the PC (sleep and resume around it); a loop stall whose task is not a program
//   start; a shutdown the app saw (Windows session ending); an app that was simply closed.
//
// WHAT IT CANNOT SEE: a block while the app is closed and no watcher runs; a block shorter than 5 s (the app's
// detector only names a task from 0.5 s, and starts under 5 s are not counted); a machine-wide hang that is not
// a stuck start looks the same as a stuck start when only "silence" shows (the table marks such episodes);
// anything before the oldest app log rotation or the oldest System event (the System log is circular); the
// watcher's clock has no date, so its dates are inferred from the file's creation time.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------- parameters (the rule, in one place)
const P = {
  STALL_MIN_S: 5,          // a program start must take at least this long
  GAP_MIN_S: 180,          // silence of the app log, in a run or before an unclean restart
  SHORT_SILENCE_S: 65,     // shorter silence before an unclean restart: needs stuck starts after the boot
  GROUP_S: 600,            // evidence this close together is one episode
  RESTART_LOOK_S: 3 * 3600,// "ran in the three hours before" / "ended in a restart within"
  SLEEP_PAD_S: 60,         // after a wake the app's loop is late for a while; a stall this close to a wake is sleep
  WATCH_GAP_S: 30,         // pause between the watcher's periodic lines (period 5 s)
  WATCH_START_SLOW_S: 5,
  AFTER_BOOT_S: 600,       // stuck starts this soon after a boot corroborate a short silence before it
  CLEARED_AFTER_S: 600,    // the app logging again this long after an episode means it cleared by itself
  SILENCE_MAX_S: 3 * 3600, // silence before an unclean restart longer than this is taken as "app was closed"
  STRONG_STALL_S: 60,      // a single stuck start this long is strong evidence by itself
};

// ---------------------------------------------------------------- small helpers
const p2 = (n) => String(n).padStart(2, '0');
function fmt(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}
const dayOf = (ms) => fmt(ms).slice(0, 10);
const hm = (ms) => fmt(ms).slice(11, 16);
function parseLocal(s, endOfDay) {
  const m = String(s).trim().match(/^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d)(?::(\d\d))?)?$/);
  if (!m) throw new Error(`cannot read date "${s}" (use 2026-11-01 or "2026-11-01 15:30")`);
  if (+m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31) throw new Error(`"${s}" is not a date`);
  if (m[4] === undefined) return new Date(+m[1], +m[2] - 1, +m[3], endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0).getTime();
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
}
function lineTime(s) { // "2026-11-17 15:43:23"
  return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16), +s.slice(17, 19)).getTime();
}
function fmtDur(s) {
  s = Math.round(s);
  if (s < 120) return `${s} s`;
  if (s < 7200) return `${Math.floor(s / 60)} min ${p2(s % 60)} s`;
  return `${Math.floor(s / 3600)} h ${p2(Math.floor((s % 3600) / 60))} min`;
}
// an error text may carry a path: nothing with a path is ever printed
const noPath = (s) => String(s).replace(/[A-Za-z]:[\\/][^\s'",;)]*/g, '<path>').replace(/\/[\w.-]+(\/[\w.-]+)+/g, '<path>');
const clean = (s) => String(s).replace(/[^A-Za-z0-9:_.\-]/g, '').slice(0, 48);

// ---------------------------------------------------------------- arguments
function parseArgs(argv) {
  const o = { json: false, debug: false, noSystem: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--json') o.json = true;
    else if (a === '--debug') o.debug = true;
    else if (a === '--no-system') o.noSystem = true;
    else if (a === '--since') o.since = val();
    else if (a === '--until') o.until = val();
    else if (a === '--app-dir') o.appDir = val();
    else if (a === '--watch-dir') o.watchDir = val();
    else if (a === '--system-xml') o.systemXml = val();
    else if (a === '--system-json') o.systemJson = val();
    else if (a === '-h' || a === '--help') o.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

// ---------------------------------------------------------------- source 3: the System log
const XPATH_IDS =
  "(Provider[@Name='Microsoft-Windows-Kernel-Power'] and (EventID=41 or EventID=42 or EventID=107 or EventID=109))" +
  " or (Provider[@Name='Microsoft-Windows-Power-Troubleshooter'] and EventID=1)" +
  " or (Provider[@Name='EventLog'] and (EventID=6005 or EventID=6006 or EventID=6008))" +
  " or (Provider[@Name='User32'] and EventID=1074)" +
  " or (Provider[@Name='Microsoft-Windows-Kernel-General'] and (EventID=12 or EventID=13))" +
  " or (Provider[@Name='Microsoft-Windows-WER-SystemErrorReporting'] and EventID=1001)";

function parseSystemXml(xml) {
  const evs = [];
  for (const m of xml.matchAll(/<Event [^>]*>(.*?)<\/Event>/gs)) {
    const b = m[1];
    const prov = (b.match(/<Provider Name='([^']*)'/) || [])[1];
    const id = +((b.match(/<EventID[^>]*>(\d+)</) || [])[1]);
    const ts = (b.match(/SystemTime='([^']*)'/) || [])[1];
    if (!prov || !id || !ts) continue;
    const data = {};
    for (const d of b.matchAll(/<Data Name='([^']*)'>([^<]*)</g)) data[d[1]] = d[2];
    evs.push({ t: new Date(ts).getTime(), prov: prov.replace('Microsoft-Windows-', ''), id, data });
  }
  return evs;
}
function parseSystemJson(txt) {
  const j = JSON.parse(txt.replace(/^\uFEFF/, ''));
  return j.map((e) => ({
    t: new Date(e.time).getTime(), // the export is local time without a zone, which Date reads as local
    prov: String(e.provider).replace('Microsoft-Windows-', ''),
    id: e.id,
    data: e.data || {},
  })).filter((e) => Number.isFinite(e.t));
}
function loadSystem(opts, sinceMs, untilMs) {
  const info = { ok: false, via: null, note: null };
  let evs = [];
  try {
    if (opts.noSystem) { info.note = 'System log not read (--no-system)'; return { evs, info }; }
    if (opts.systemXml) { evs = parseSystemXml(fs.readFileSync(opts.systemXml, 'utf8')); info.via = 'xml file'; }
    else if (opts.systemJson) { evs = parseSystemJson(fs.readFileSync(opts.systemJson, 'utf8')); info.via = 'json file'; }
    else {
      const lo = new Date(sinceMs - 2 * 86400000).toISOString();
      const hi = new Date(untilMs + 86400000).toISOString();
      const q = `*[System[(${XPATH_IDS}) and TimeCreated[@SystemTime>='${lo}' and @SystemTime<='${hi}']]]`;
      const out = execFileSync('wevtutil', ['qe', 'System', '/q:' + q, '/f:xml', '/rd:false'],
        { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 120000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      evs = parseSystemXml(out); info.via = 'wevtutil';
    }
    info.ok = true;
  } catch (e) {
    info.note = 'System log unavailable: ' + noPath(String(e.message || e).split('\n')[0]).slice(0, 80);
    evs = [];
  }
  evs.sort((a, b) => a.t - b.t);
  return { evs, info };
}

// restarts, boots and sleeps out of the System events
function digestSystem(evs) {
  const kp41 = evs.filter((e) => e.prov === 'Kernel-Power' && e.id === 41);
  const kg12 = evs.filter((e) => e.prov === 'Kernel-General' && e.id === 12);
  const r1074 = evs.filter((e) => e.prov === 'User32' && e.id === 1074);
  const bug1001 = evs.filter((e) => e.id === 1001);
  const restarts = kp41.map((e) => {
    const boot = kg12.filter((k) => k.t <= e.t + 5000 && k.t >= e.t - 60000).pop();
    const bc = parseInt(e.data.BugcheckCode || '0', 10) || 0;
    const sleepRaw = parseInt(e.data.SleepInProgress || '0', 10) || 0;
    return {
      t: e.t, boot: boot ? boot.t : e.t,
      bugcheck: bc ? '0x' + bc.toString(16).toUpperCase() : null,
      sleep_in_progress: sleepRaw,
      connected_standby: String(e.data.ConnectedStandbyInProgress).toLowerCase() === 'true',
      power_button: String(e.data.PowerButtonTimestamp || '0') !== '0',
      clean_request_before: r1074.some((r) => r.t <= e.t && e.t - r.t <= 300000),
      dump_logged: bug1001.some((b) => Math.abs(b.t - e.t) <= 120000),
    };
  });
  // sleep intervals: Power-Troubleshooter 1 gives the true SleepTime/WakeTime; Kernel-Power 42 -> 107 is
  // logged within seconds of each other even for hours of sleep, so it is only a fallback (a 42 with no
  // resume before the next boot is a PC that went to sleep and never woke).
  const sleeps = [];
  for (const e of evs.filter((x) => x.prov === 'Power-Troubleshooter' && x.id === 1)) {
    const a = Date.parse(e.data.SleepTime), b = Date.parse(e.data.WakeTime);
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) sleeps.push({ a, b, src: 'power-troubleshooter' });
  }
  const k42 = evs.filter((e) => e.prov === 'Kernel-Power' && e.id === 42);
  const k107 = evs.filter((e) => e.prov === 'Kernel-Power' && e.id === 107);
  const boots = restarts.map((r) => r.boot).concat(kg12.map((k) => k.t)).sort((x, y) => x - y);
  for (const s of k42) {
    const r = k107.find((x) => x.t >= s.t);
    const nb = boots.find((x) => x > s.t);
    const end = r && (!nb || r.t <= nb) ? r.t : (nb || s.t);
    sleeps.push({ a: s.t, b: end, src: r && (!nb || r.t <= nb) ? 'kernel-power' : 'no-wake' });
  }
  return { restarts, sleeps, boots: [...new Set(boots)] };
}

// ---------------------------------------------------------------- source 1: the app's log
function loadApp(opts, sinceMs, untilMs) {
  const info = { ok: false, lines: 0, note: null };
  const dir = opts.appDir || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Claude', 'logs');
  const names = ['main3.log', 'main2.log', 'main1.log', 'main.log'];
  const lo = fmt(sinceMs - 86400000), hi = fmt(untilMs + 1000);
  const lines = [];
  let found = 0;
  for (const n of names) {
    const f = path.join(dir, n);
    let st;
    try { st = fs.statSync(f); } catch { continue; }
    found++;
    if (st.mtimeMs < sinceMs - 2 * 86400000) continue; // wholly older than the period
    const txt = fs.readFileSync(f, 'utf8');
    for (const l of txt.split(/\r?\n/)) {
      if (l.length < 25 || l.charCodeAt(4) !== 45 || l.charCodeAt(19) !== 32) continue; // not "YYYY-MM-DD HH:MM:SS "
      const ts = l.slice(0, 19);
      if (ts < lo || ts > hi) continue;
      const m = l.match(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d \[(\w+)\] (.*)$/);
      if (!m) continue;
      lines.push({ t: lineTime(ts), lv: m[1], msg: m[2] });
    }
  }
  info.ok = found > 0;
  if (!found) info.note = 'no app log found';
  // keep file order (oldest rotation first); a clock step back inside the log is kept but never makes a gap
  info.lines = lines.length; info.first = lines.length ? lines[0].t : null; info.last = lines.length ? lines[lines.length - 1].t : null;
  return { lines, info };
}

// pieces of the app log: runs, stalls, EPERM, timeouts, suspend/resume
function digestApp(lines) {
  const runs = [];            // {i0,i1,start,cleanEnd}
  let cur = null;
  const stalls = [], eperm = [], timeouts = [], suspends = [];
  let pendingSuspend = null;
  const other = [];   // {t, key}: timeouts that are not program starts
  const reStall = /\[event-loop-stall\] main process blocked for (\d+)ms(?: \[likely sleep: (\w+)\])? \(task ([^=,)\s]+)(?:=(\d+)ms)?/;
  lines.forEach((ln, i) => {
    const msg = ln.msg;
    if (msg.startsWith('Starting app')) {
      cur = { i0: i, i1: i, start: ln.t, cleanEnd: false };
      runs.push(cur);
    }
    if (!cur) { cur = { i0: i, i1: i, start: ln.t, cleanEnd: false, partial: true }; runs.push(cur); }
    cur.i1 = i;
    if (/Windows session ending|beforeQuitForUpdate handler fired/.test(msg)) cur.cleanEnd = true;
    if (msg.includes('[event-loop-stall]')) {
      let m;
      if ((m = msg.match(reStall))) {
        stalls.push({ t: ln.t, blockedMs: +m[1], tag: m[2] || null, task: m[3], taskMs: m[4] ? +m[4] : null, i });
      } else if (/\[event-loop-stall\] OS suspend/.test(msg)) pendingSuspend = ln.t;
      else if (/\[event-loop-stall\] OS resume/.test(msg)) {
        suspends.push({ a: pendingSuspend ?? ln.t, b: ln.t, src: 'app suspend/resume' });
        pendingSuspend = null;
      }
    }
    if (msg.includes('spawn EPERM')) eperm.push({ t: ln.t, i });
    if (msg.includes('timed out after') && /\[git\]|GitStatusService/.test(msg) && !/resolveProxy/.test(msg)) {
      const m = msg.match(/timed out after (\d+)ms/);
      if (m) timeouts.push({ t: ln.t, ms: +m[1], i });
    } else if (msg.includes('timed out')) {
      // not counted: network timeouts, session-inactivity timeouts, and git's short-form limit
      // ("git status timed out", code EGITTIMEDOUT), which fires dozens of times a day under plain load
      if (/resolveProxy/.test(msg)) other.push({ t: ln.t, key: 'timeout_network_proxy' });
      else if (/EGITTIMEDOUT|git [a-z-]+ timed out/.test(msg)) other.push({ t: ln.t, key: 'timeout_git_short_form_EGITTIMEDOUT' });
      else other.push({ t: ln.t, key: 'timeout_other_not_a_start' });
    }
  });
  return { runs, stalls, eperm, timeouts, suspends, other };
}

// ---------------------------------------------------------------- source 2: the watcher logs
function loadWatch(opts, sinceMs, untilMs) {
  const info = { ok: false, files: 0, lines: 0, note: null };
  const dir = opts.watchDir || path.dirname(fileURLToPath(import.meta.url));
  const out = { blocks: [], slow: [], gaps: [], runs: [] };
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => /^(av|pc)-watch[^/\\]*\.log$/i.test(n)); } catch { info.note = 'no watcher folder'; return { out, info }; }
  for (const n of names) {
    const f = path.join(dir, n);
    let st, txt;
    try { st = fs.statSync(f); txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (st.mtimeMs < sinceMs - 86400000) continue;
    info.files++;
    const rows = txt.split(/\r?\n/).filter((l) => l.length > 6);
    info.lines += rows.length;
    // The watcher's lines carry a time of day only (a line that carries its own date is used as it is).
    // Dates are inferred from the END: the last line was written no later than the file's last write, so it
    // belongs to that day (or the day before, if its time of day is later than the write's); the day then steps
    // back once for every time the time of day goes backwards by more than 10 minutes (midnight).
    const w1 = parseWatchRows(rows, 0);
    const lm = new Date(st.mtimeMs);
    const mtod = lm.getHours() * 3600 + lm.getMinutes() * 60 + lm.getSeconds();
    const mday = new Date(lm.getFullYear(), lm.getMonth(), lm.getDate()).getTime();
    const lastDay = w1.lastTod !== null && w1.lastTod > mtod + 120 ? mday - 86400000 : mday;
    const startDay = new Date(lastDay); startDay.setDate(startDay.getDate() - w1.rollovers);
    const w = parseWatchRows(rows, startDay.getTime());
    out.blocks.push(...w.blocks); out.slow.push(...w.slow); out.gaps.push(...w.gaps); out.runs.push(...w.runs);
  }
  info.ok = info.files > 0;
  if (!info.ok && !info.note) info.note = 'no watcher log found';
  return { out, info };
}

// one pass over a watcher log; startDayMs = the date (local midnight) of its first undated line
function parseWatchRows(rows, startDayMs) {
  const r = { blocks: [], slow: [], gaps: [], runs: [], rollovers: 0, lastTod: null };
  let dayMs = startDayMs, prevTod = -1;
  const toMs = (hh, mm, ss, dated) => {
    if (dated) return dated + ((+hh) * 3600 + (+mm) * 60 + (+ss)) * 1000;
    const tod = (+hh) * 3600 + (+mm) * 60 + (+ss);
    if (prevTod >= 0 && tod + 600 < prevTod) { dayMs += 86400000; r.rollovers++; }   // next day (a DST step cannot occur here)
    prevTod = tod; r.lastTod = tod;
    return dayMs + tod * 1000;
  };
  let prev = null, runOpen = false;
  for (const l of rows) {
    let dated = 0, rest = l;
    const dm = l.match(/^(\d{4})-(\d\d)-(\d\d)[ T]/);
    if (dm) { dated = new Date(+dm[1], +dm[2] - 1, +dm[3]).getTime(); rest = l.slice(11); }
    let m;
    if (rest.startsWith('EVENT:')) {
      const tm = rest.match(/\bt=(\d\d):(\d\d):(\d\d)/);
      if (!tm) continue;
      const t = toMs(tm[1], tm[2], tm[3], dated);
      const kind = rest.slice(6).trim().split(/\s+/)[0];
      if (kind === 'START') { r.runs.push({ t, kind: 'start' }); runOpen = true; prev = null; }
      else if (kind === 'STOP') { r.runs.push({ t, kind: 'stop' }); runOpen = false; prev = null; }
      else if (kind === 'SLOW') {
        // "SLOW start=<ms> create_ms=<n> slow_ms=<n>" (pc-watch): a start probe over its own slow limit, which
        // may be well under 5 s; the same probe is on the period line as start_ms, so only a start of >= 5 s counts
        const sm = rest.match(/\bstart=(\d+)/);
        if (sm && +sm[1] >= P.WATCH_START_SLOW_S * 1000 && !r.slow.some((x) => x.what === 'start' && Math.abs(x.t - t) <= 3000)) r.slow.push({ t, ms: +sm[1], what: 'start', event: true });
      } else if (kind === 'BLOCK') {
        const w = rest.match(/\b(start|file)\b/); const s = rest.match(/since=(\d+)s/);
        r.blocks.push({ t, what: w ? w[1] : 'probe', since: s ? +s[1] : null, ev: kind });
      } else if (kind === 'UNBLOCK') {
        const w = rest.match(/\b(start|file)\b/); const a = rest.match(/after ([\d.]+)s/);
        r.blocks.push({ t, what: w ? w[1] : 'probe', after: a ? +a[1] : null, ev: 'UNBLOCK' });
      }
      continue;
    }
    if ((m = rest.match(/^(\d\d):(\d\d):(\d\d) lag=/))) {
      const t = toMs(m[1], m[2], m[3], dated);
      const sm = rest.match(/\bstart_ms=(\d+)\b/);
      if (sm && +sm[1] >= P.WATCH_START_SLOW_S * 1000) r.slow.push({ t, ms: +sm[1], what: 'start' });
      const fm = rest.match(/\bfile_ms=(\d+)\b/);
      if (fm && +fm[1] >= P.WATCH_START_SLOW_S * 1000) r.slow.push({ t, ms: +fm[1], what: 'file' });
      if (prev !== null && runOpen && t - prev >= P.WATCH_GAP_S * 1000) r.gaps.push({ a: prev, b: t });
      prev = t;
    }
  }
  return r;
}


// ---------------------------------------------------------------- the rule
const overlaps = (a0, a1, b0, b1) => a0 <= b1 && b0 <= a1;

function buildEvidence(app, appD, watch, sys, sinceMs, untilMs, ignored) {
  const ev = [];
  const add = (e) => { if (e.t1 >= sinceMs && e.t0 <= untilMs) ev.push(e); };
  const padMs = P.SLEEP_PAD_S * 1000;
  // a candidate the rule rejects: counted and listed (times, kinds and durations only) when it lies in the period
  const rej = (key, t, dur) => { if (t >= sinceMs && t <= untilMs) { ignored[key] = (ignored[key] || 0) + 1; ignored.list.push({ key, t, dur }); } };

  // sleep intervals: the System log, plus the app's own suspend/resume lines and "power_event" stalls
  const sleeps = sys.sleeps.slice();
  for (const s of appD.suspends) sleeps.push(s);
  for (const s of appD.stalls) if (s.tag === 'power_event') sleeps.push({ a: s.t - s.blockedMs, b: s.t, src: 'app power_event' });
  const asleep = (a, b) => sleeps.some((s) => overlaps(a, b, s.a - 5000, s.b + padMs));
  const bootNear = (t) => sys.boots.some((b) => Math.abs(b - t) <= 60000);

  // 1. stalls on program starts
  for (const s of appD.stalls) {
    const startTask = /^(spawn:|ccd:spawn_query)/.test(s.task);
    const durMs = s.taskMs != null ? Math.max(s.taskMs, 0) : s.blockedMs;
    if (!startTask) { if (s.blockedMs >= 5000) rej(s.tag === 'power_event' ? 'stall_power_event_sleep' : 'stall_not_a_start', s.t, s.blockedMs / 1000); continue; }
    if (durMs < P.STALL_MIN_S * 1000) { if (durMs >= 3000) rej('start_3_to_5s', s.t, durMs / 1000); continue; }
    const a = s.t - Math.max(s.blockedMs, durMs), b = s.t;
    if (s.tag === 'power_event' || asleep(a, b)) { rej('stall_asleep', s.t, durMs / 1000); continue; }
    add({ kind: 'stall', t0: a, t1: b, dur: durMs / 1000, task: clean(s.task), appLabel: s.tag === 'duration_heuristic' });
  }
  // 2. refused starts
  for (const e of appD.eperm) {
    const prevLine = app.lines[e.i - 1];
    const waitedMs = prevLine && e.t - prevLine.t > P.GAP_MIN_S * 1000 ? e.t - prevLine.t : 0;
    add({ kind: 'eperm', t0: e.t - waitedMs, t1: e.t, dur: waitedMs / 1000, task: 'spawn' });
  }
  // 3. git calls that did not return
  const seenTO = new Set();
  for (const e of appD.timeouts) {
    const key = `${e.t}|${e.ms}`;
    if (seenTO.has(key)) { continue; } seenTO.add(key);
    if (asleep(e.t - e.ms, e.t)) { rej('timeout_asleep', e.t, e.ms / 1000); continue; }
    add({ kind: 'timeout', t0: e.t - e.ms, t1: e.t, dur: e.ms / 1000, task: 'git' });
  }

  // 4. silences inside a run
  const L = app.lines;
  for (let i = 1; i < L.length; i++) {
    if (L[i].t - L[i - 1].t <= P.GAP_MIN_S * 1000) continue;
    const runPrev = appD.runs.find((r) => i - 1 >= r.i0 && i - 1 <= r.i1);
    if (!runPrev || i > runPrev.i1) continue;      // the gap spans a run boundary: handled as end-of-run below
    if (asleep(L[i - 1].t, L[i].t)) { rej('gap_asleep', L[i - 1].t, (L[i].t - L[i - 1].t) / 1000); continue; }
    add({ kind: 'silence', t0: L[i - 1].t, t1: L[i].t, dur: (L[i].t - L[i - 1].t) / 1000, task: null });
  }

  // 5. the end of a run before an UNCLEAN restart
  const stallsAfter = (b) => ev.filter((e) => e.kind === 'stall' && e.t0 >= b - 1000 && e.t0 <= b + P.AFTER_BOOT_S * 1000);
  appD.runs.forEach((r, k) => {
    const last = L[r.i1];
    if (r.cleanEnd) { rej('run_ended_cleanly_by_windows_session_end', last.t, 0); return; }
    const nextStart = appD.runs[k + 1] ? appD.runs[k + 1].start : Infinity;
    const rs = sys.restarts.filter((x) => x.boot > last.t && x.boot <= nextStart + 1000).sort((x, y) => x.boot - y.boot);
    // the boot that ended this run is the first boot after its last line (a clean boot ends it too)
    const firstBoot = sys.boots.filter((b) => b > last.t).sort((x, y) => x - y)[0];
    const x = rs[0];
    if (!x || (firstBoot !== undefined && firstBoot < x.boot - 60000)) return;   // ended by a clean restart or none
    if (x.sleep_in_progress || x.connected_standby) { rej('silence_before_restart_with_sleep_flag', last.t, (x.boot - last.t) / 1000); return; }
    const silent = (x.boot - last.t) / 1000;
    if (asleep(last.t, x.boot - 1000)) { rej('silence_before_restart_with_sleep_flag', last.t, silent); return; }
    if (silent > P.SILENCE_MAX_S) { rej('silence_over_3h_app_probably_closed', last.t, silent); return; }   // cannot tell a closed app from a stuck one
    if (silent >= P.GAP_MIN_S) add({ kind: 'silence', t0: last.t, t1: x.boot, dur: silent, task: null, toRestart: x.t });
    else if (silent >= P.SHORT_SILENCE_S) pendingShort.push({ last, x, silent });
  });
  for (const s of pendingShort) {
    if (stallsAfter(s.x.boot).length) add({ kind: 'silence', t0: s.last.t, t1: s.x.boot, dur: s.silent, task: null, toRestart: s.x.t, short: true });
    else rej('short_silence_alone_before_restart', s.last.t, s.silent);
  }

  // 6. the watcher
  for (const b of watch.blocks) {
    if (b.ev === 'UNBLOCK') { add({ kind: 'watch', t0: b.t - (b.after || 0) * 1000, t1: b.t, dur: b.after || 0, task: 'watch:' + b.what }); continue; }
    const since = b.since || 0;
    if (asleep(b.t - since * 1000, b.t)) { rej('watch_asleep', b.t, since); continue; }
    add({ kind: 'watch', t0: b.t - since * 1000, t1: b.t, dur: since, task: 'watch:' + b.what });
  }
  for (const s of watch.slow) {
    // the period line that reports a probe's end and its UNBLOCK event are the same probe: count it once
    if (watch.blocks.some((b) => b.ev === 'UNBLOCK' && b.what === s.what && Math.abs(b.t - s.t) <= 3000)) continue;
    if (asleep(s.t - s.ms, s.t)) { rej('watch_asleep', s.t, s.ms / 1000); continue; }
    add({ kind: 'watch', t0: s.t - s.ms, t1: s.t, dur: s.ms / 1000, task: 'watch:' + s.what });
  }
  for (const g of watch.gaps) {
    if (asleep(g.a, g.b) || bootNear(g.b)) { rej('watch_asleep', g.a, (g.b - g.a) / 1000); continue; }
    add({ kind: 'watch', t0: g.a, t1: g.b, dur: (g.b - g.a) / 1000, task: 'watch:gap', pause: true });
  }
  return ev;
}
let pendingShort = [];

function groupEpisodes(ev, sys, app, appD) {
  const sorted = ev.slice().sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
  const eps = [];
  for (const e of sorted) {
    const cur = eps[eps.length - 1];
    if (cur && e.t0 <= cur.t1 + P.GROUP_S * 1000) { cur.items.push(e); cur.t1 = Math.max(cur.t1, e.t1); }
    else eps.push({ items: [e], t0: e.t0, t1: e.t1 });
  }
  const L = app.lines;
  return eps.map((g) => {
    const it = g.items;
    const startish = it.filter((e) => e.kind === 'stall' || e.kind === 'eperm' || e.kind === 'timeout' || (e.kind === 'watch' && !e.pause));
    let longest = null;
    for (const e of startish) if (!longest || e.dur > longest.dur) longest = e;
    const sil = it.filter((e) => e.kind === 'silence' || (e.kind === 'watch' && e.pause)).sort((a, b) => b.dur - a.dur)[0];
    const tasks = {};
    for (const e of it) if (e.task) tasks[e.task] = (tasks[e.task] || 0) + 1;
    const kinds = {};
    for (const e of it) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
    // the last evidence that is not the silence that ran into a restart
    const toRestart = it.find((e) => e.toRestart);
    const nonRestart = it.filter((e) => !e.toRestart);
    const lastBlockEnd = nonRestart.length ? Math.max(...nonRestart.map((e) => e.t1)) : null;
    // closure: an unclean restart that the silence ran into, or the first unclean restart within 3 h after the
    // episode's end with the app not logging normally in between; else the app logged again (cleared) or the
    // record simply ends (open)
    let closure;
    const restartX = toRestart
      ? sys.restarts.find((r) => r.t === toRestart.toRestart)
      : sys.restarts.filter((r) => r.boot >= g.t1 - 1000 && r.boot <= g.t1 + P.RESTART_LOOK_S * 1000).sort((a, b) => a.boot - b.boot)[0];
    const resumed = L.some((l) => l.t > g.t1 + P.CLEARED_AFTER_S * 1000 && (!restartX || l.t < restartX.boot));
    const lastLine = L.length ? L[L.length - 1].t : 0;
    if (toRestart || (restartX && !resumed)) closure = { type: 'restart', restart: restartX, silentToRestart: !!toRestart };
    else if (resumed) closure = { type: 'cleared', restart: null };
    else if (lastLine - g.t1 < P.CLEARED_AFTER_S * 1000) closure = { type: 'open', restart: null };
    else closure = { type: 'log-ends', restart: null };
    // strength: strong = a stuck start is shown (refused start, git call that never returned, a start stuck a
    // minute or more, the app silent in a run and then back, a watcher BLOCK); medium = only starts of 5 to 60 s;
    // weak = only silence before an unclean restart (a stuck start, a power cut and a hang of the whole PC look
    // the same in the log)
    const strongItem = it.some((e) => e.kind === 'eperm' || e.kind === 'timeout' ||
      (e.kind === 'stall' && e.dur >= P.STRONG_STALL_S) || (e.kind === 'silence' && !e.toRestart) ||
      (e.kind === 'watch' && (e.dur >= 15 || e.pause)));
    const strength = strongItem ? 'strong' : (it.some((e) => e.kind === 'stall' || e.kind === 'watch') ? 'medium' : 'weak');
    return {
      start: g.t0, end: g.t1, strength,
      longest_s: longest ? Math.round(longest.dur) : null,
      longest_kind: longest ? longest.kind : null,
      longest_silence_s: sil ? Math.round(sil.dur) : null,
      tasks, kinds,
      stuck_start_evidence: startish.length > 0,
      app_said_sleep: it.some((e) => e.appLabel),
      last_block_end: lastBlockEnd,
      closure, items: it,
    };
  });
}

function endedText(e) {
  const c = e.closure;
  if (c.type === 'restart') {
    const r = c.restart;
    let s = `restart ${c.silentToRestart ? fmt(r.boot).slice(11) : hm(r.boot) + ' (+' + fmtDur(Math.max(0, (r.boot - e.end) / 1000)) + ')'}; ${kindOf(r)}`;
    if (e.last_block_end && e.last_block_end !== e.end) s += `; last stuck start ended ${fmt(e.last_block_end).slice(11)}`;
    return s;
  }
  if (c.type === 'open') return 'not over, or the log ends here';
  if (c.type === 'log-ends') return 'log ends, no restart seen';
  return 'cleared (app logged normally again)';
}

function kindOf(r) {
  const k = [];
  if (r.bugcheck) k.push(`bugcheck ${r.bugcheck}`);
  if (r.sleep_in_progress) k.push(`sleep in progress (${r.sleep_in_progress})`);
  if (r.connected_standby) k.push('connected standby');
  if (r.power_button) k.push('power button');
  if (r.clean_request_before) k.push('clean restart requested first');
  return k.length ? k.join(', ') : 'plain (no flag)';
}

// ---------------------------------------------------------------- main
function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 22).map((l) => l.slice(3)).join('\n')); return; }
  const untilMs = opts.until ? parseLocal(opts.until, true) : Date.now();
  const sinceMs = opts.since ? parseLocal(opts.since, false) : untilMs - 7 * 86400000;
  if (!(sinceMs < untilMs)) throw new Error('--since must be before --until');

  const sysRaw = loadSystem(opts, sinceMs, untilMs);
  const sys = digestSystem(sysRaw.evs);
  const app = loadApp(opts, sinceMs, untilMs);
  const appD = digestApp(app.lines);
  const watch = loadWatch(opts, sinceMs, untilMs);

  pendingShort = [];
  const ignored = { list: [] };
  for (const o of appD.other) if (o.t >= sinceMs && o.t <= untilMs) { ignored[o.key] = (ignored[o.key] || 0) + 1; ignored.list.push({ key: o.key, t: o.t, dur: 0 }); }
  const evidence = buildEvidence(app, appD, watch.out, sys, sinceMs, untilMs, ignored);
  const eps = groupEpisodes(evidence, sys, app, appD).filter((e) => e.end >= sinceMs && e.start <= untilMs);

  const restarts = sys.restarts.filter((r) => r.boot >= sinceMs && r.boot <= untilMs).map((r) => {
    const before = eps.filter((e) => e.start <= r.boot && e.end >= r.boot - P.RESTART_LOOK_S * 1000);
    return { ...r, block_before: before.map((e) => ({ start: e.start, ended_by_it: !!e.items.find((i) => i.toRestart === r.t) })) };
  });

  // per-day counts
  const perDay = new Map();
  for (let d = new Date(sinceMs); d.getTime() <= untilMs; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) perDay.set(dayOf(d.getTime()), { day: dayOf(d.getTime()), episodes: 0, restarts: 0 });
  for (const e of eps) { const r = perDay.get(dayOf(e.start)); if (r) r.episodes++; }
  for (const r of restarts) { const x = perDay.get(dayOf(r.boot)); if (x) x.restarts++; }
  const daysWith = [...perDay.values()].filter((d) => d.episodes > 0).length;

  const summaryLine = `blocks since ${dayOf(sinceMs)}: ${eps.length} on ${daysWith} days; unclean restarts: ${restarts.length}`;
  const byStrength = { strong: 0, medium: 0, weak: 0 };
  for (const e of eps) byStrength[e.strength]++;
  const strengthLine = `of the ${eps.length} episodes: ${byStrength.strong} strong, ${byStrength.medium} medium, ${byStrength.weak} weak (silence only)`;

  if (opts.json) {
    const out = {
      since: fmt(sinceMs), until: fmt(untilMs),
      sources: {
        app_log: { ok: app.info.ok, lines: app.info.lines, note: app.info.note },
        watcher: { ok: watch.info.ok, files: watch.info.files, lines: watch.info.lines, note: watch.info.note },
        system_log: { ok: sysRaw.info.ok, via: sysRaw.info.via, events: sysRaw.evs.length, note: sysRaw.info.note },
      },
      episodes: eps.map((e, i) => ({
        n: i + 1, start: fmt(e.start), end: fmt(e.end), strength: e.strength,
        longest_stuck_start_s: e.longest_s, longest_stuck_start_kind: e.longest_kind, longest_silence_s: e.longest_silence_s,
        tasks: e.tasks, evidence: e.kinds, stuck_start_evidence: e.stuck_start_evidence,
        app_labelled_likely_sleep: e.app_said_sleep,
        last_stuck_start_ended: e.last_block_end && e.last_block_end !== e.end ? fmt(e.last_block_end) : null,
        ended: e.closure.type,
        restart: e.closure.restart ? { time: fmt(e.closure.restart.boot), app_silent_until_it: e.closure.silentToRestart, after_end_s: Math.round((e.closure.restart.boot - e.end) / 1000), kind: kindOf(e.closure.restart) } : null,
      })),
      unclean_restarts: restarts.map((r) => ({
        time: fmt(r.boot), kernel_power_41: fmt(r.t), bugcheck: r.bugcheck, sleep_in_progress: r.sleep_in_progress,
        connected_standby: r.connected_standby, power_button: r.power_button, clean_restart_requested_first: r.clean_request_before,
        dump_logged: r.dump_logged, kind: kindOf(r),
        block_episode_in_3h_before: r.block_before.map((b) => ({ start: fmt(b.start), ended_by_this_restart: b.ended_by_it })),
      })),
      per_day: [...perDay.values()],
      rejected: { counts: Object.fromEntries(Object.entries(ignored).filter(([k]) => k !== 'list')), list: ignored.list.sort((a, b) => a.t - b.t).map((x) => ({ time: fmt(x.t), kind: x.key, seconds: Math.round(x.dur) })) },
      summary: { blocks: eps.length, strong: byStrength.strong, medium: byStrength.medium, weak: byStrength.weak,
        days_with_blocks: daysWith, unclean_restarts: restarts.length, line: summaryLine },
    };
    console.log(JSON.stringify(out, null, 1));
    return;
  }

  // ---- text
  const out = [];
  out.push(`stall-scan  ${fmt(sinceMs)}  to  ${fmt(untilMs)}   (local time)`);
  const src = [
    `app log: ${app.info.ok ? app.info.lines + ' lines' + (app.info.first ? ', ' + fmt(app.info.first).slice(0, 10) + ' to ' + fmt(app.info.last).slice(0, 10) : '') : 'NOT FOUND'}`,
    `watcher: ${watch.info.ok ? watch.info.files + ' file(s), ' + watch.info.lines + ' lines' : 'none'}`,
    `System log: ${sysRaw.info.ok ? sysRaw.evs.length + ' events via ' + sysRaw.info.via : (sysRaw.info.note || 'none')}`,
  ];
  out.push('sources: ' + src.join('; '));
  out.push('');
  out.push('BLOCK EPISODES (a program start stuck >= 5 s with the PC awake, a refused start, a watcher BLOCK, or the app silent > 3 min; evidence within 10 min = one episode)');
  if (!eps.length) out.push('  none');
  else {
    const rows = [['#', 'start', 'end', 'longest', 'tasks named', 'evidence', 'strength', 'ended']];
    eps.forEach((e, i) => {
      const lg = e.longest_s != null ? `${e.longest_s} s ${e.longest_kind}` : (e.longest_silence_s != null ? `silent ${e.longest_silence_s} s` : '-');
      const tk = Object.entries(e.tasks).map(([k, v]) => (v > 1 ? `${k} x${v}` : k)).join(', ') || '-';
      const kv = Object.entries(e.kinds).map(([k, v]) => (v > 1 ? `${k} x${v}` : k)).join(', ') + (e.app_said_sleep ? ' [app said likely sleep]' : '');
      rows.push([String(i + 1), fmt(e.start), fmt(e.end), lg, tk, kv, e.strength, endedText(e)]);
    });
    out.push(table(rows));
    out.push('  strength: strong = a stuck start is shown (refused start, git call never returned, start stuck >= 60 s, app silent in a run and back, watcher BLOCK);');
    out.push('            medium = only starts of 5 to 60 s; weak = only the app silent before an unclean restart (a stuck start, a power cut and a hang of the whole PC look the same).');
  }
  out.push('');
  out.push('UNCLEAN RESTARTS (Kernel-Power 41)');
  if (!restarts.length) out.push('  none');
  else {
    const rows = [['time', 'bugcheck', 'sleep / standby', 'power button', 'block episode in the 3 h before', 'note']];
    for (const r of restarts) {
      const sl = [r.sleep_in_progress ? `sleep in progress (${r.sleep_in_progress})` : null, r.connected_standby ? 'connected standby' : null].filter(Boolean).join(', ') || 'no';
      const bb = r.block_before.length ? r.block_before.map((b) => `yes, from ${hm(b.start)}${b.ended_by_it ? ' (this restart ended it)' : ''}`).join('; ') : 'no';
      const note = [r.clean_request_before ? 'clean restart was requested first' : null, r.dump_logged ? 'crash dump written' : null].filter(Boolean).join('; ') || '-';
      rows.push([fmt(r.boot), r.bugcheck || '-', sl, r.power_button ? 'yes' : 'no', bb, note]);
    }
    out.push(table(rows));
  }
  out.push('');
  out.push('PER DAY');
  out.push(table([['day', 'block episodes', 'unclean restarts'], ...[...perDay.values()].map((d) => [d.day, String(d.episodes), String(d.restarts)])]));
  if (opts.debug) {
    out.push('');
    out.push('REJECTED CANDIDATES (counts): ' + Object.entries(ignored).filter(([k]) => k !== 'list').map(([k, v]) => `${k}=${v}`).sort().join(', '));
    for (const x of ignored.list.filter((y) => y.key !== 'timeout_git_short_form_EGITTIMEDOUT' && y.key !== 'timeout_network_proxy').sort((a, b) => a.t - b.t)) out.push(`   rejected ${fmt(x.t)}  ${Math.round(x.dur)} s  ${x.key}`);
    eps.forEach((e, i) => {
      out.push(`episode ${i + 1} evidence:`);
      for (const it of e.items.sort((a, b) => a.t0 - b.t0)) out.push(`   ${it.kind.padEnd(8)} ${fmt(it.t0)} -> ${fmt(it.t1)}  ${Math.round(it.dur)} s ${it.task || ''}${it.short ? ' [short silence + stuck starts after boot]' : ''}`);
    });
  }
  out.push('');
  out.push(strengthLine);
  out.push(summaryLine);
  console.log(out.join('\n'));
}

function table(rows) {
  const w = rows[0].map((_, c) => Math.max(...rows.map((r) => String(r[c]).length)));
  return rows.map((r, i) => '  ' + r.map((v, c) => String(v).padEnd(w[c])).join('  ').trimEnd() + (i === 0 ? '\n  ' + w.map((x) => '-'.repeat(x)).join('  ') : '')).join('\n');
}

try { main(); } catch (e) { console.error('stall-scan: ' + noPath(e && e.message ? e.message : String(e))); process.exitCode = 1; }
