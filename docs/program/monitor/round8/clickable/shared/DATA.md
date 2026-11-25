# shared/data.js: the dummy data for the clickable prototypes

Load it with `<script src="../shared/data.js"></script>`. It sets `window.TOOL_DATA` (227 KB, plain script, no fetch).
Real names and real shape from the owner's sessions of Wed 18 to Tue 24 Nov 2026 (`monitor/app/data.json`); times are
real; only what is marked `dummy: true` is invented.

## Time
Every time is **minutes since Wed 18 Nov 2026 00:00**, local time of the PC, one decimal. No date strings.
Tue 24 Nov 00:00 = 8640 (`replayStart`); the replay ends at 9525 (Tue 14:45, `replayEnd`). Day 0 = Wed 18 ... day 6 = Tue 24.
- `TOOL_DATA.hm(m)` gives "03:29". `TOOL_DATA.dayName(m)` gives "Tue 24 Nov". `TOOL_DATA.minuteOf(day, hh, mm)`: `minuteOf(6, 3, 29)` = 8849.
- Replay loop: advance a number `m` from 8640 to 9525 on a timer and call `stateAt(m)`.

## Top level
| field | what |
|---|---|
| `replayStart`, `replayEnd` | minutes, 8640 and 9525 |
| `parts` | 79 working parts (below) |
| `sessions` | 20 sessions of Tue 24 Nov (below) |
| `events` | 1389 events of hooks and parts (below), sorted by `t` |
| `owner` | his messages and absences (below) |
| `week` | 7 days of counts per 5 minutes (below) |
| `waiting` | 25 moments a session waited for him (below) |

## parts[]
`{ id, name, group, file, model?, dummy? }`. Example: `{"id":"hook:window-ceiling","name":"Window ceiling","group":"Hooks","file":".claude/hooks/window-ceiling.mjs"}`.
- `id` is the key used everywhere else (`kind:` helper kind, `hook:`, `doc:`, `script:`, `store:`, `tool:`, `setting:`, `skill:`, `cmd:`, `git:`).
- `group` (the board's zones): `Hooks` (10, with Creep gate), `Helper kinds` (12; `model` = haiku, sonnet or opus), `Commands` (6, the tools the
  session calls: usage meter, plan steps, start session, start helper, closing report, ask the owner), `Tests and git`, `Scripts` (12),
  `Stores and settings` (8), `Documents` (17), `Skills` (7), `Slash commands` (1).
- `file`: repository-relative path. Real for hooks, scripts, stores, documents, tests, commands (some are patterns such as `.claude/hooks/*.test.mjs`).
- **dummy: true** (16): the 7 skills (`~/.claude/skills/<folder>/SKILL.md`), the slash command `monitor`, the four git parts (commit, branch, merge, push; `file` "(git)"), and
  the 4 helper kinds with no agent file (their path is a guess).
- Lookup: `TOOL_DATA.partById[id]`.

## sessions[]
Sorted by start. Example head:
`{"id":"f6ee0985","tag":"BR5","name":"Big run, fifth coordinator","parent":"8cc1608b","model":"opus","start":9456.7,"end":9465.7, ...}`
| field | unit and meaning |
|---|---|
| `id`, `tag` | short id; 2 to 4 letter tag (T9, BR4, MB, UX ...) for strips and part tags |
| `name` | readable title |
| `parent` | id of the session that started it, or null (also null when the parent is outside the 20) |
| `model` | opus, sonnet, haiku |
| `start`, `end` | minutes; `end` is null if it is still running at the replay's end. Some start on Mon 23 |
| `segs` | `[[from, to], ...]` minutes where the session was in a turn (working) |
| `waits` | `[[from, to, closingReportSentence], ...]` it waited for him; ends at his next message |
| `steps` | `[[minute, text], ...]` plan step in progress, from that minute |
| `plan` | `[{text, status}]` final plan (`completed`, `in_progress`, `pending`); no times |
| `tokens` | `[[minute, cumulativeTokens], ...]` every 15 minutes, session plus its helpers (tokens the transcript counted per tool call; a trend, not the bill) |
| `tokensTotal` | whole-life token count, session plus helpers |
| `owner` | minutes of his messages to this session |
| `helpers` | 248 in all: `{id, kind, model, start, end, tokens, parts:[partIds]}` (`kind` is a helper kind name, `model` haiku/sonnet/opus, `parts` up to 5: the kind part first, then parts it touched) |

## events[]
`{ t, session, helper, part, result, n?, kind? }`, sorted by `t`. Example: `{"t":8670.5,"session":"6d4e3fd7","helper":null,"part":"hook:window-ceiling","result":"failed","kind":"window"}`.
- `result`: `passed`, `refused`, `failed`, `not-on` (hook was not running).
- `refused`, `failed`, `not-on` are **all real ones** (83), `t` to a tenth of a minute. `kind` holds the original kind (`window`, `hookfail`, `noton`, `unchecked`).
- `passed` are **thinned**: one event per 5 minutes (`t` is the bucket start) per session per part, `n` = calls in that bucket. Parts touched are derived from the
  tool calls of the session and its helpers. Hook passes are **derived, not logged**: Tier hook at each helper start, Plan gate at each plan step, Owner report at each closing
  report, Record guard on evidence/journal use, Window ceiling every 5 minutes of a turn.
- `helper` is always null (the data does not say which helper a hook call came from).

## owner
`{ messages: [minutes of all his messages, all sessions, sorted], away: [{left, back, minutes}] }`. `away` = gaps of 45 minutes or more between two of his messages in any session
(26 in the week; the last: left 9457.5, back 9512.7). Use as "you left / you came back" moments.

## week
`{ bucketMinutes: 5, days: [ {day, label, sessions:[288], helpers:[288], trouble:[288]} x7 ] }`. Day 0 = Wed 18 ... 6 = Tue 24; label like "Tue 24 Nov".
Index `i` (0..287) = minutes `day*1440 + i*5` to +5. `sessions` = most sessions in a turn at once in that bucket; `helpers` = most helpers running; `trouble` = refused plus failed marks
(not-on excluded). Example: the busiest `sessions` value in the week is 4.

## waiting[]
Sessions that waited for him on Tue 24 (a closing report that ends the turn, until his next message). Sorted by `from`; 25, among them long ones:
Round 6 04:26 to 10:33, Session monitor build 11:34 to 13:00, 11:00 to 11:23; short ones too (a turn and his quick reply).
`{ session, from, to, minutes, report, question, dummy }`: `report` = first sentence of the session's closing report (real). `question` = one line for the Answer box.
`dummy: true` when the report holds no question mark (all 25 today): then `question` is invented as `Shall I go on with "<last plan step>"?`.
`stateAt` copies `question` and `dummy` into a waiting session's `wait`.

## stateAt(minute)
Fast (about 0.05 ms): indexed once at load. Returns, never mutate it:
```
{ minute, clock:"03:29", day:"Tue 24 Nov",
  counts: {working, waiting, quiet, ended, helpers},     // helpers = running now
  tokens,                                                 // sum over sessions shown, up to this minute
  lastOwnerMessage,                                       // minute or null
  sessions: [ { id, tag, name, state, step, stepIndex, stepCount, since, wait, helpersRunning:[helper objects], helpersDone,
                tokens, parts:[partIds], hooks:[hookIds], marks:[...], parent, lastOwner } ],
  helpersRunning: [ {session, tag, id, kind, model, start, tokens, parts} ],
  partUse: { partId: [sessionIds] },                      // non-hook parts used in the last 10 minutes by a working session, plus the helpers' parts
  hookUse: { hookId: [sessionIds] },                      // hooks that passed in the last 5 minutes
  marks: [ {t, session, tag, part, result, kind} ] }      // refused/failed/not-on since he last wrote to that session, within 3 hours, newest first
```
- `state`: `waiting` (blue; `wait = {from, report, question, dummy}`, `since` = from), `working`, `quiet` (open but idle), `ended` (up to 6 hours after its end).
  Sessions not started or ended more than 6 hours ago are left out. Order: waiting, working, quiet, ended.
- Checked: 03:29: 3 working, 1 waiting (UX), 2 quiet, 4 helpers running; 13:03: working BR3b (Big run third coordinator), Session monitor build (MB), BR4 (fourth coordinator); 3 helpers.
- `tokens` there are tool-call counts per the data, not billed tokens; use for trends.
