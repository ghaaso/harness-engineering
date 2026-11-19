// review helper: one wevtutil call (same query family as stall-scan), reduced to time / provider / id / chosen
// data fields. No computer name, no user SID, no message text is kept.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const ids =
  "(Provider[@Name='Microsoft-Windows-Kernel-Power'] and (EventID=41 or EventID=42 or EventID=107 or EventID=109 or EventID=566 or EventID=506 or EventID=507))" +
  " or (Provider[@Name='Microsoft-Windows-Power-Troubleshooter'] and EventID=1)" +
  " or (Provider[@Name='EventLog'] and (EventID=6005 or EventID=6006 or EventID=6008))" +
  " or (Provider[@Name='User32'] and EventID=1074)" +
  " or (Provider[@Name='Microsoft-Windows-Kernel-General'] and (EventID=12 or EventID=13))" +
  " or (Provider[@Name='Microsoft-Windows-WER-SystemErrorReporting'] and EventID=1001)";
const q = `*[System[(${ids}) and TimeCreated[@SystemTime>='2026-10-30T00:00:00.000Z']]]`;
const out = execFileSync('wevtutil', ['qe', 'System', '/q:' + q, '/f:xml', '/rd:false'], { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 120000, windowsHide: true });
const keep = ['SleepTime', 'WakeTime', 'BugcheckCode', 'SleepInProgress', 'ConnectedStandbyInProgress', 'PowerButtonTimestamp', 'TargetState', 'EffectiveState', 'Reason', 'OldState', 'NewState', 'StartTime', 'StopTime'];
const evs = [];
for (const m of out.matchAll(/<Event [^>]*>(.*?)<\/Event>/gs)) {
  const b = m[1];
  const prov = (b.match(/<Provider Name='([^']*)'/) || [])[1];
  const id = +((b.match(/<EventID[^>]*>(\d+)</) || [])[1]);
  const ts = (b.match(/SystemTime='([^']*)'/) || [])[1];
  const data = {};
  for (const d of b.matchAll(/<Data Name='([^']*)'>([^<]*)</g)) if (keep.includes(d[1])) data[d[1]] = d[2];
  evs.push({ utc: ts, prov: prov.replace('Microsoft-Windows-', ''), id, data });
}
fs.writeFileSync(process.argv[2], JSON.stringify(evs, null, 0).replace(/},{/g, '},\n{'));
console.log('events', evs.length, 'rawSystemTimeSample', evs[0] && evs[0].utc);
