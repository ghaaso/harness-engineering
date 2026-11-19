// make-fixtures.mjs - writes SYNTHETIC records (no real path, id or message text) for testing stall-scan.mjs.
// Usage: node make-fixtures.mjs <out-dir>
// Everything is dated "today" (local) so the watcher log, whose lines carry only a time of day, is dated
// by the file's creation time exactly as the real one is.
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
fs.mkdirSync(path.join(out, 'app'), { recursive: true });
fs.mkdirSync(path.join(out, 'watch'), { recursive: true });

const now = new Date();
const Y = now.getFullYear(), M = now.getMonth(), D = now.getDate();
const p2 = (n) => String(n).padStart(2, '0');
const at = (hh, mm, ss = 0, plusDays = 0) => new Date(Y, M, D + plusDays, hh, mm, ss);
const stamp = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

// ------------------------------------------------------------ the app log
// cursor-based writer: fillTo() writes a process-memory line every 60 s after the cursor; mark() writes one line
// at an exact time and moves the cursor there; the only silences are the ones a scenario makes on purpose
const L = [];
let cur = null;
const raw = (d, lv, msg) => L.push(`${stamp(d)} [${lv}] ${msg}`);
const mark = (d, lv, msg) => { raw(d, lv, msg); cur = +d; };
const fillTo = (d) => { for (let t = cur + 60000; t <= +d; t += 60000) { raw(new Date(t), 'info', '[process-memory] trigger=interval tree_rss_sum=3000MB children(20)=900MB sys_free=18000MB/31860MB'); cur = t; } };

// run 1
mark(at(8, 0), 'info', 'Starting app {');
L.push('  appVersion: 1,'); L.push('}');       // continuation lines have no time stamp and must be skipped
fillTo(at(10, 0));
// B: a real sleep, 40 minutes; the app logs OS suspend / OS resume and then a "likely sleep" stall (not a block)
mark(at(10, 1), 'info', '[event-loop-stall] OS suspend');
mark(at(10, 41), 'info', '[event-loop-stall] OS resume');
mark(at(10, 41, 20), 'warn', '[event-loop-stall] main process blocked for 12000ms [likely sleep: duration_heuristic] (task spawn:git=12050ms, total 2, cumulative 12050ms, rss 400MB)');
fillTo(at(11, 30));
// C: a start stuck 30 s with the PC awake (the app mislabels it "likely sleep"): medium episode
mark(at(11, 31), 'warn', '[event-loop-stall] main process blocked for 30500ms [likely sleep: duration_heuristic] (task spawn:git=30600ms, total 3, cumulative 40000ms, rss 400MB)');
fillTo(at(11, 59));
// not blocks: a start under 5 s, and a loop stall that is not a program start
mark(at(12, 0), 'warn', '[event-loop-stall] main process blocked for 4800ms (task spawn:git=4900ms, total 4, cumulative 45000ms, rss 400MB)');
mark(at(12, 0, 30), 'warn', '[event-loop-stall] main process blocked for 20000ms (task os_entry_points:model=0ms, total 5, cumulative 65000ms, rss 400MB)');
fillTo(at(12, 18));
// D: silence of about 11 minutes ended by a refused start: strong episode
mark(at(12, 30), 'warn', '[git] heavy-work gitRun failed: Failed to spawn <git>: spawn EPERM');
fillTo(at(13, 28));
// E: a git call that did not return in 120 s (two identical lines, one piece of evidence): strong episode
mark(at(13, 30), 'warn', '[git] gitStatus timed out after 120000ms (onTimeout=none)');
mark(at(13, 30), 'warn', '[git] gitStatus timed out after 120000ms (onTimeout=none)');
fillTo(at(14, 29));
// not blocks: git's short-form timeout, and a network timeout
mark(at(14, 30), 'error', "[GitStatusService] Failed to check git status: git status timed out { code: 'EGITTIMEDOUT' }");
mark(at(14, 30, 30), 'warn', '[CCD] System proxy resolution failed: Error: resolveProxy timed out after 5000ms');
fillTo(at(15, 0));
// F: the PC goes to sleep and dies in it (KP41 with a sleep flag, 8 minutes after the last line): not a block
// run 2
mark(at(15, 10), 'info', 'Starting app {');
fillTo(at(15, 40));
// G: the app goes silent and the PC is reset 10 minutes later (KP41 plain): weak episode
// run 3
mark(at(15, 52), 'info', 'Starting app {');
fillTo(at(16, 30));
// H: a clean shutdown (session ending): not a block even though the next start is much later
mark(at(16, 30, 5), 'info', 'Windows session ending (shutdown) - quitting the app');
// run 4
mark(at(17, 0, 30), 'info', 'Starting app {');
fillTo(at(17, 29));
mark(at(17, 30), 'info', '[process-memory] last line before a short silence');
// I: 88 s of silence before a plain unclean restart, nothing after the boot: not an episode
// run 5
mark(at(17, 32, 30), 'info', 'Starting app {');
fillTo(at(17, 59));
mark(at(18, 0), 'info', '[process-memory] last line before a short silence');
// J: 78 s of silence before a plain unclean restart, then a start stuck 9 s after the boot: medium episode
// run 6
mark(at(18, 2), 'info', 'Starting app {');
mark(at(18, 3), 'warn', '[event-loop-stall] main process blocked for 9000ms [likely sleep: duration_heuristic] (task spawn:git=9100ms, total 1, cumulative 9100ms, rss 400MB)');
fillTo(at(18, 20));
// K: the app is silent for 6 minutes in a run with the PC awake and then logs again: strong episode
mark(at(18, 26), 'info', '[process-memory] back after the silence');
fillTo(at(18, 40));
fs.writeFileSync(path.join(out, 'app', 'main.log'), L.join('\r\n') + '\r\n');

// ------------------------------------------------------------ the System log (wevtutil xml)
const X = [];
const ev = (prov, id, d, data = {}) => {
  const dd = Object.entries(data).map(([k, v]) => `<Data Name='${k}'>${v}</Data>`).join('');
  X.push(`<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'><System><Provider Name='${prov}'/><EventID>${id}</EventID><TimeCreated SystemTime='${d.toISOString()}'/></System><EventData>${dd}</EventData></Event>`);
};
const KP = 'Microsoft-Windows-Kernel-Power', KG = 'Microsoft-Windows-Kernel-General', PT = 'Microsoft-Windows-Power-Troubleshooter';
ev(KP, 42, at(10, 1, 2)); ev(KP, 107, at(10, 1, 4));
ev(PT, 1, at(10, 41, 2), { SleepTime: at(10, 1).toISOString(), WakeTime: at(10, 41).toISOString() });
const kp41 = (d, o = {}) => { ev(KG, 12, new Date(+d - 2000)); ev(KP, 41, d, { BugcheckCode: 0, SleepInProgress: 0, ConnectedStandbyInProgress: 'false', PowerButtonTimestamp: 0, ...o }); };
kp41(at(15, 8, 0), { SleepInProgress: 4 });         // F
kp41(at(15, 50, 0));                                // G
ev(KG, 12, at(17, 0)); ev('EventLog', 6005, at(17, 0, 15));      // H: a clean boot (no KP41)
kp41(at(17, 31, 30));                               // I
kp41(at(18, 1, 20));                                // J
fs.writeFileSync(path.join(out, 'sys.xml'), X.join('\r\n'));

// ------------------------------------------------------------ the watcher log (a time of day only)
const W = [];
const tod = (d) => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
const per = (d, st = '16', fl = '2') => W.push(`${tod(d)} lag=5 free=17000 commit=36 cpu=10 procs=320 node=2 ps=2 wer=0 av=none av_vm=- start_ms=${st} file_ms=${fl}`);
const wev = (s, d) => W.push(`EVENT: ${s} t=${tod(d)}`);
wev('START pid=1 period=5s hours=168', at(9, 0, 0, -1));
for (let s = 0; s <= 120; s += 5) {
  const d = at(9, 0, s, -1);
  if (s === 45) { per(d, 'BLOCKED:15'); wev('BLOCK start since=15s', d); }
  else if (s === 60) { per(d, 'BLOCKED:30'); wev('BLOCK start since=30s', d); }
  else if (s > 45 && s < 65) per(d, 'BLOCKED:' + (s - 30));
  else if (s === 65) { per(d, '34200'); wev('UNBLOCK start after 34.2s', d); }
  else if (s === 90) { per(d, '7000'); wev('SLOW start=7000 create_ms=6900 slow_ms=2000', d); W.push('NEW: cmd.exe:123<456:node.exe'); W.push('SNAPSHOT begin reason=block15 t=09:01:30 phase=in-start query_ms=3'); W.push('  self tid=1 Running'); W.push('SNAPSHOT end lines=2 build_ms=4 recent=0/0'); } // a start that took 7 s; one SLOW event, a NEW line and a snapshot block as pc-watch writes them
  else if (s === 100) { per(d, '2500'); wev('SLOW start=2500 create_ms=2400 slow_ms=2000', d); }   // a 2.5 s start: under 5 s, not a block
  else per(d);
}
wev('STOP reason=stop-file pid=1', at(9, 2, 0, -1));
wev('START pid=2 period=5s hours=168', at(9, 20, 0, -1));          // the gap 09:02 -> 09:20 is bracketed by STOP/START
for (let s = 0; s <= 60; s += 5) per(at(9, 20, s, -1));
for (let s = 110; s <= 150; s += 5) per(at(9, 20, s, -1));     // pause of 50 s inside one run
wev('START pid=3 period=5s hours=168', at(23, 59, 0, -1));
for (let s = 0; s <= 70; s += 5) {
  const d = new Date(+at(23, 59, 0, -1) + s * 1000);            // crosses midnight
  per(d, d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 ? '6000' : '16');
}
fs.writeFileSync(path.join(out, 'watch', 'pc-watch.log'), W.join('\r\n') + '\r\n');
console.log('fixtures written for ' + stamp(at(0, 0)).slice(0, 10));
