# Live feed: what the data comes from

Run `node server.mjs` (port 7419, this machine only). The server runs the round 7 read step (`monitor/build/snapshot.mjs`)
when the session files change, at most once every 30 s, writes `live/snapshot.json`, and `live/convert.mjs` turns it into
the TOOL_DATA shape of `round8/clickable/shared/DATA.md`. Time unit and base are the same as in `data.js`
(minutes since Wed 18 Nov 2026 00:00 local time, one decimal); the top level also has `baseMs`, `live: true`, `madeMs`.
Events carry one extra field, `ms` (the real time in epoch milliseconds), so a page can tell a pushed `hook` event from one
already in `data.json`.

## Where each field comes from
| field | source |
|---|---|
| `parts` | `data.js` as it is (read, not edited) |
| `sessions` | the read step: title, parent, model, plan, steps, his messages, helpers, token counts |
| `sessions[].tag` | the tag `data.js` gives for a known id; else initials of the title (a leading "word:" dropped), unique, digit on a clash |
| `sessions[].segs` | the read step's call clusters (20-minute gap rule); the last one is stretched to now while the turn is open and the last line is under 10 minutes old |
| `sessions[].waits` | a closing report (`wrap_up`) until his next message. Dropped: a report after which the session went on by itself before he wrote, and an open report while one of its own helpers runs |
| `sessions[].end` | `null` while open: a wait is open, a helper runs, or the last line is under 30 minutes old; else the last line |
| `sessions[].tokens` | the 15-minute trend is built from the read step's visits (tokens with times), scaled to end at `tokensTotal` |
| `helpers[].end` | a helper not marked finished with a line in the last 20 minutes gets `replayEnd + 100000` |
| `events` (hooks) | every line of `.claude/logs/*.jsonl` of a shown session: allow, start, run, end, resume, note, notice, library start = `passed`; deny = `refused`. One event per line, no thinning |
| `events` (failures) | the read step's marks: hook failure and window over the line = `failed`; hook not switched on = `not-on`; a helper start missing in the tier hook's log = `failed` (kind `unchecked`) |
| `events` (other parts) | the read step's per-session use counts (`agent:lean-X` is `kind:X`): one `passed` event at the first use, `n` = all calls |
| `owner` | all his messages the read step saw; `away` = gaps of 45 minutes or more between two of them (a gap still open is not listed) |
| `week` | the 7 days ending today: sessions in a turn, helpers running, refused + failed, per 5 minutes, from segs, helper spans and the hook logs |
| `waiting` | today's waits; `question` is the report's own sentence with a "?" if there is one, else the invented `Shall I go on with "<last plan step>"?` with `dummy: true`, as in `data.js` |

## Empty, approximate, or not done
- **Helper parts**: only the helper kind part. The read step drops each helper's touched parts from its output, so the "up to 5 parts" are not there.
- **Non-hook parts**: the read step gives first use and a count, not the times of each call, so there is one event per session and part (not one per 5 minutes); the page sees these parts lit only around the first use. A fix needs the read step to keep call times (not edited here).
- **Hook events from helpers**: `helper` is always null (as in `data.js`); the logs name the helper in some files but the page has no use for it yet.
- **Hook log lines without a session** (library start) are not events.
- **Waiting** counts every unanswered closing report, also from child sessions he never writes to and from a session not seen for hours (shown up to 24 h back). A report followed by a quiet session that was woken by something other than him is not detected unless the read step shows later calls.
- **Failure of the hook itself** has no value in the logs; it comes only from the read step's marks.
- `D.dayName` in `data.js` knows only 18 to 24 Nov; from Wed 25 Nov the page's own copy must extend it.
- `/outbox` writes `live/outbox.jsonl`; nothing reads it. `/open` and `/outbox` refuse a request from another site or host name.

## Measured (2026-11-24, this PC)
- One read step: 7.1 s and 8.6 s (about 56 sessions, 540 helpers). Conversion: 65 to 130 ms. `data.json`: about 1 MB.
- Hook line appended to a copy of the logs (HOOK_LOGS) to the `hook` event leaving the server: 3 to 5 ms (12 lines, via fs.watch; the 500 ms poll is the fallback and was not the path measured).
- Not measured: a read step while the machine is busy; the poll fallback alone.
