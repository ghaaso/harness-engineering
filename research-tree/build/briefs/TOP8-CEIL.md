# T8-CEIL: the window ceiling, as a hook (build-invariant, Opus)

Read `briefs/TOP8-COMMON.md` first.

## The rule and how it was broken
A session does not run on past its context ceiling; at the line it writes its hand-over and a fresh session goes on
(r57-0008, r57-0056). Broken: r57-0604 (404 K), t7-0608 (top session 7 at 337.6 K against about 250 K, it saw the
line at 234 K and 265 K and went on), r57-0171 (roots past their points). Nothing measured the window.

## The fact this rests on (measured 2026-11-24 by the top session, `research-tree/build/TOP8-STATE.md`)
Every hook input carries `transcript_path`. The last `"type":"assistant"` line of that JSONL with `message.usage`
gives the context of the last call: input_tokens + cache_creation_input_tokens + cache_read_input_tokens (+ output).
The session file is large (about 1 MB at 16 calls): read only its tail. Find out, by probing, what a hook sees
inside a helper (agent_id is set; is transcript_path the parent's? is the helper's own file under
`<session>/subagents/`?), and handle helpers by their own transcript if it can be found, else say so.

## The line is computed, not typed
ORCHESTRATION.md section 5 (`research-tree/ORCHESTRATION.md`): W* = F + sqrt(2 R g), F the context at the session's
first call, g the growth per call, R the cost to orient a fresh successor; the real point is the first quiet point
after W*. Measured: r57-0171 (Opus roots' hand-over points 247-273 K), section 5's table (F, g, R per role),
r57-0175 (meter weights). Decide from the record how F and g are taken (the session's own transcript is the natural
source) and which R; write the derivation in your result; keep the line under the app's autocompaction (368 K for
Opus on a 400 K window, read the window from the record or the usage). Give a warning line before the hard line, a
number of calls at the session's own g that leaves room to reach a quiet point and write a hand-over (computed).

## What happens at and above the line
Between the warning line and the line: every call passes, and the hook adds a short notice (additionalContext or
stderr as the hook API allows; check how a PreToolUse hook adds context without refusing) that says the context, the
line, and that a hand-over is due.
Above the line: refuse every call except those that serve the hand-over: writes to hand-over files (the session's
STATE or TOP-STATE file, a brief under `research-tree/build/briefs/`, a result under `research-tree/build/units/`,
files in the shared notes folder `C:/Users/User/AppData/Local/Claude-Data/*/side-session-notes/`), the journal
(whatever command another unit makes the only way to add a record: allow `node tools/journal.mjs`), `git status`,
`git add`, `git commit`, start_session (a successor), wrap_up and update_plan (the closing box), and reads of those
same files. Refuse new helpers (Agent, Task) and everything else, with a one-line reason that names the line and the
hand-over. Decide carefully what else must pass so a session can always end cleanly (for example ending its helpers);
list what you chose and why.
Log every decision (context, line, decision) to `.claude/logs/window-ceiling.jsonl`.

## For the live check
Provide a way for the top session to see the refusal live without filling a window: for example an environment or a
file that scales the line for one session id only, logged when used, that the self-tests prove cannot be left on by
accident (expires, or names the session). The top session will also watch the log of its own calls.

Files: `.claude/hooks/window-ceiling.mjs`, `.claude/hooks/window-ceiling.test.mjs`. Limit 15 M tokens.
