// review helper: list the app log's lines between two local times as KINDS only (time, level, bracket tags,
// numbers of stall/timeout lines, and fixed markers). No message text, no path, no id is printed.
// node applines.mjs "2026-11-13 22:50" "2026-11-14 01:10" [--compact]
import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(process.env.LOCALAPPDATA, 'Claude', 'logs');
const [a, b] = process.argv.slice(2);
const compact = process.argv.includes('--compact');
const out = [];
for (const n of ['main3.log', 'main2.log', 'main1.log', 'main.log']) {
  let txt; try { txt = fs.readFileSync(path.join(dir, n), 'utf8'); } catch { continue; }
  for (const l of txt.split(/\r?\n/)) {
    const ts = l.slice(0, 19);
    if (!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(ts) || ts < a || ts > b) continue;
    const m = l.match(/^\S+ \S+ \[(\w+)\] (.*)$/); if (!m) { out.push(`${ts} ?? (unparsed line, len ${l.length})`); continue; }
    const msg = m[2];
    const tags = (msg.match(/^(\[[\w:.-]+\]\s*)+/) || [''])[0].replace(/\s+/g, '');
    let k = tags || '(untagged)';
    const st = msg.match(/blocked for (\d+)ms(?: \[likely sleep: (\w+)\])? \(task ([^=,)\s]+)(?:=(\d+)ms)?/);
    if (st) k += ` blocked=${st[1]} sleep=${st[2] || '-'} task=${st[3].replace(/[^\w:.-]/g, '')} taskms=${st[4] || '-'}`;
    for (const [re, word] of [[/Starting app/, 'START-APP'], [/Windows session ending/, 'SESSION-ENDING'], [/beforeQuitForUpdate/, 'QUIT-UPDATE'],
      [/on quit/, 'ON-QUIT'], [/previous quit/, 'PREV-QUIT'], [/spawn EPERM/, 'EPERM'], [/OS suspend/, 'OS-SUSPEND'], [/OS resume/, 'OS-RESUME'],
      [/process-memory/, 'PM'], [/fired \d+s late/, 'TIMER-LATE'], [/inactivity/, 'INACTIVITY']]) if (re.test(msg)) k += ' ' + word;
    const to = msg.match(/timed out after (\d+)ms/); if (to) k += ` TIMEOUT=${to[1]}`;
    else if (/timed out/.test(msg)) k += ' TIMEDOUT-other';
    const late = msg.match(/fired (\d+)s late/); if (late) k += ` late=${late[1]}s`;
    out.push(`${ts} ${m[1]} ${k}`);
  }
}
if (!compact) { console.log(out.join('\n')); }
else { // collapse runs of identical kinds
  let prev = null, cnt = 0, first = null, last = null;
  const flush = () => { if (prev) console.log(cnt > 1 ? `${first} .. ${last.slice(11)} x${cnt} ${prev}` : `${first} ${prev}`); };
  for (const r of out) { const t = r.slice(0, 19), k = r.slice(20).replace(/\d+/g, 'N'); if (k === prev) { cnt++; last = t; } else { flush(); prev = k; cnt = 1; first = t; last = t; } }
  flush();
}
