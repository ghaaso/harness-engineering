// run-tests.mjs - builds synthetic fixtures, runs stall-scan.mjs on them and checks the result.
// Usage: node run-tests.mjs   (writes fixtures into ./fixtures, prints PASS / FAIL per check)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scan = path.join(here, '..', 'stall-scan.mjs');
const fx = path.join(here, 'fixtures');
fs.rmSync(fx, { recursive: true, force: true });
execFileSync(process.execPath, [path.join(here, 'make-fixtures.mjs'), fx], { stdio: 'inherit' });

const p2 = (n) => String(n).padStart(2, '0');
const now = new Date();
const day = (plus = 0) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + plus); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const since = `${day(-1)} 00:00`, until = `${day(1)} 23:59`;
const base = ['--since', since, '--until', until, '--app-dir', path.join(fx, 'app'), '--watch-dir', path.join(fx, 'watch'), '--system-xml', path.join(fx, 'sys.xml')];
const run = (extra = []) => execFileSync(process.execPath, [scan, ...base, ...extra], { encoding: 'utf8' });

let fail = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   ' + detail}`); if (!ok) fail++; };

const j = JSON.parse(run(['--json']));
console.log(j.episodes.map((e) => `   episode ${e.start} -> ${e.end}  ${e.strength.padEnd(6)} longest ${e.longest_stuck_start_s} ${e.longest_stuck_start_kind || ''}  ${e.ended}`).join('\n'));
// an episode whose start lies in [a, b] (hh:mm:ss) of the fixture day
const inWin = (a, b, plus = 0) => j.episodes.filter((e) => e.start >= `${day(plus)} ${a}` && e.start <= `${day(plus)} ${b}`);
const one = (a, b, plus = 0) => { const x = inWin(a, b, plus); return x.length === 1 ? x[0] : null; };

check('9 episodes in all', j.episodes.length === 9, `got ${j.episodes.length}`);
check('on 2 days (an episode is dated by its start; the watcher run crosses midnight)', j.summary.days_with_blocks === 2, `got ${j.summary.days_with_blocks}`);
check('watcher BLOCK/UNBLOCK/SLOW -> one strong episode at 09:00', one('09:00:00', '09:01:00', -1) && one('09:00:00', '09:01:00', -1).strength === 'strong');
check('SLOW event of pc-watch is not counted twice and a 2.5 s SLOW start is not a block (4 pieces of watcher evidence in that episode: 2 BLOCK, 1 UNBLOCK, 1 slow start; the UNBLOCK probe is not counted again from its period line)', one('09:00:00', '09:01:00', -1) && one('09:00:00', '09:01:00', -1).evidence.watch === 4, JSON.stringify(one('09:00:00', '09:01:00', -1) && one('09:00:00', '09:01:00', -1).evidence));
check('watcher pause of 50 s inside a run -> strong episode at 09:21', one('09:20:30', '09:21:10', -1) && one('09:20:30', '09:21:10', -1).strength === 'strong');
check('the gap between a watcher STOP and START (09:02-09:20) is not an episode', inWin('09:02:00', '09:20:00', -1).length === 0);
check('watcher slow start across midnight: dated from the file last write, ends after midnight', (() => { const e = one('23:59:00', '23:59:59', -1); return e && e.strength === 'medium' && e.longest_stuck_start_s === 6 && e.end.startsWith(day(0)) && e.start.startsWith(day(-1)); })());
check('real sleep 10:01-10:41 and the "likely sleep" stall after it are NOT episodes', inWin('10:00:00', '10:59:59').length === 0);
check('30 s start with the PC awake -> medium episode at 11:30, longest 31 s', (() => { const e = one('11:30:00', '11:31:30'); return e && e.strength === 'medium' && e.longest_stuck_start_s === 31; })());
check('a start of 4.8 s and a non-start loop stall are NOT episodes', inWin('11:59:30', '12:10:00').length === 0);
check('silence + EPERM -> strong episode, longest >= 600 s from eperm', (() => { const e = one('12:17:00', '12:20:00'); return e && e.strength === 'strong' && e.longest_stuck_start_kind === 'eperm' && e.longest_stuck_start_s >= 600; })());
check('git timeout of 120 s (two identical lines) -> one strong episode, one timeout counted', (() => { const e = one('13:27:00', '13:30:00'); return e && e.strength === 'strong' && e.evidence.timeout === 1 && e.longest_stuck_start_s === 120; })());
check('EGITTIMEDOUT and resolveProxy timeouts are NOT episodes', inWin('14:29:00', '14:40:00').length === 0);
check('restart with a sleep flag is NOT an episode (app silent 15:00 -> 15:08)', inWin('14:59:00', '15:09:00').length === 0);
check('plain unclean restart after 10 min of silence -> weak episode that names the restart', (() => { const e = one('15:38:00', '15:41:00'); return e && e.strength === 'weak' && /^restart/.test(e.ended) && e.restart && e.restart.app_silent_until_it; })());
check('clean "Windows session ending" is NOT an episode', inWin('16:25:00', '17:00:00').length === 0);
check('88 s of silence before a restart with nothing after the boot -> no episode', inWin('17:29:00', '17:33:00').length === 0);
check('78 s of silence before a restart + a 9 s start after the boot -> medium episode', (() => { const e = one('17:59:00', '18:01:00'); return e && e.strength === 'medium' && /^restart/.test(e.ended); })());
check('app silent 6 min inside a run, then back -> strong episode, "cleared"', (() => { const e = one('18:19:00', '18:21:00'); return e && e.strength === 'strong' && /^cleared/.test(e.ended); })());
check('4 unclean restarts listed', j.unclean_restarts.length === 4, `got ${j.unclean_restarts.length}`);
const r = (hhmm) => j.unclean_restarts.find((x) => x.time.startsWith(`${day(0)} ${hhmm}`));
check('restart 15:08 carries sleep in progress (4) and no block before', r('15:07') && r('15:07').sleep_in_progress === 4 && r('15:07').block_episode_in_3h_before.every((b) => !b.ended_by_this_restart));
check('restart 15:50 plain, with a block episode that this restart ended', r('15:49') && r('15:49').kind.startsWith('plain') && r('15:49').block_episode_in_3h_before.some((b) => b.ended_by_this_restart));
check('restart 17:31 plain, no block episode ended by it', r('17:31') && r('17:31').block_episode_in_3h_before.every((b) => !b.ended_by_this_restart));
check('summary line has the required shape', /^blocks since \d{4}-\d\d-\d\d: \d+ on \d+ days; unclean restarts: \d+$/.test(j.summary.line), j.summary.line);

const txt = run();
check('text output ends with the one summary line', txt.trim().split('\n').pop() === j.summary.line);
check('no path, drive letter, session id or message text in the output', !/[A-Za-z]:\\|local_[0-9a-f]|Tempest|Users/.test(txt + JSON.stringify(j)));

// fallback when the System log cannot be read: the app's own suspend/resume lines still cancel the sleep
const jn = JSON.parse(execFileSync(process.execPath, [scan, '--since', since, '--until', until, '--app-dir', path.join(fx, 'app'), '--watch-dir', path.join(fx, 'watch'), '--no-system', '--json'], { encoding: 'utf8' }));
check('--no-system: no restart table, the sleep is still not an episode', jn.unclean_restarts.length === 0 && jn.episodes.filter((e) => e.start >= `${day(0)} 10:00:00` && e.start <= `${day(0)} 10:59:59`).length === 0);
console.log(fail ? `\n${fail} check(s) FAILED` : '\nall checks passed');
process.exitCode = fail ? 1 : 0;
