# UNATTENDED: running the research run without the owner's typed "go"

Version 2, 2026-11-20, by a helper of top session 4 (kind analyse, Opus), from `research-tree/build/briefs/UNATTENDED-fold.md`:
the blind review `research-tree/build/refute/UNATTENDED.md` ("CORRECT: 14 findings") folded in as the top session decided each
finding (r57-0021). Version 1 (from `briefs/UNATTENDED.md`, ruling r57-0042), which the review cites by line, is kept byte for
byte as `research-tree/build/UNATTENDED-v1.md`. Read only: nothing was started, set or probed; no web request.

Marks: [m] measured (script or file named), [r] read (page:line or path), [c] computed (formula shown), [e] estimate (range).
**Docs** = `https://code.claude.com/docs/en/<page>.md`, fetched raw with `curl --ssl-no-revoke` on 2026-11-20 about 13:54 UTC
(version 1); line numbers are those of the copies in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/unattended/docs/`
(temporary). Its `sha.txt` holds the first 16 hex characters of the SHA-256 of 15 copies: agent-teams, agents, channels,
claude-code-on-the-web, desktop, desktop-scheduled-tasks, hooks, hooks-guide, mobile, permission-modes, remote-control,
routines, scheduled-tasks, sub-agents, workflows; not of agent-view, env-vars, goal, interactive-mode, model-config,
settings-reference, tools-reference or llms.txt, whose cited lines the review checked by reading. Every copy's hash, named, as
the copies stood at this fold: `.../scratchpad/unattended-fold/sha-named.txt` [m]. **Snapshot l.N** = the app's own
instructions to top session 4 (Claude Code 2.1.325, desktop app, 13:35 UTC), record 24 (`prompt_snapshot`) of
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/340b6a42-dea1-407f-9afb-f9d304e4f79e.jsonl`,
extracted to `.../scratchpad/unattended/top4-prompt.txt`, line N. **Tool texts** = the app's deferred tools' descriptions,
loaded with ToolSearch, none called. Transcript counts, over every transcript under `C:/Users/User/.claude/projects/`: version
1's `.../scratchpad/unattended/scripts/starts.mjs`, `seq.mjs`; the review's `.../scratchpad/unattended-refute/` (`starts2.mjs`
with `starts2.txt`, `sseruns.mjs`, `turns.mjs`), where a turn's opener is the record's own `turnOrigin`, not its text.
**main.log** = `C:/Users/User/AppData/Local/Claude/logs/main.log`, the app's log (local time, UTC+5), lines as the review read
them. COMPLEXITY = `research-tree/build/COMPLEXITY.md` v2, PILOT-PLAN = `research-tree/build/PILOT-PLAN.md` v2, FAULTS =
`research-tree/build/FAULTS.md` v2 (l.N = file line); protocol v2 = `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`.
"Finding N" = row N of the review. Times UTC unless marked; his time is UTC+5; the reset is 2026-11-23 12:00 UTC, Monday 17:00
his time (COMPLEXITY l.237).

## 0. The answer

1. Yes, by the app's own means: the run COMPLEXITY chose (e2) needs no go per session; a Fable coordinator starts helpers, and they start theirs.
2. Yours to type: `approve:`, `cap:`, and the go that opens the coordinator: three turns, none during the run unless it stops.
3. The go in one of two forms, your choice (section 5). Form 1: at the reset, Monday 23 November 17:00 your time, at the desk; no tokens added.
4. Form 2: before the reset, in one sitting, with Windows set not to sleep on mains power until the run ends; one wake at the reset; about 0.2-0.3 M tokens.
5. Why Windows: the app keeps the PC awake while a session or its helpers work (on already), not while a session waits.
6. Also yours, in the coordinator's own controls: Auto mode, so routine prompts do not wait for you, and Remote Control on that session alone.
7. Remote Control's cost: while connected, the coordinator's transcript is kept on the provider's servers; without it, any stop waits for you at the desk.
8. From the phone you can answer prompts and questions, watch and stop helpers, send a message; not start the coordinator, run /rate-limit-options or wake the PC. Push to the phone is not shown for this app: you look.
9. The run stops on: Auto mode going back to prompts (3 blocks in a row, 20 in all), the cap, a Fable credit prompt, an app restart, the 5-hour limit.
10. At the 5-hour limit the running helpers fail and the coordinator restarts them after the reset; with Remote Control on it first waits for your message, and in form 1 the PC may sleep meanwhile.
11. e2 drops checks protocol v2 has: Q6-Q11, comparison 1, fencing a replaced helper, a restart limit, hang detection. All kept: the pilot's 25-30 typed turns; path b about 6 acts, Q6 weaker and Q11 changed.
12. Not known: whether a session may start sessions on a continuation or its task's turn (P1, 1.3-2.6 M); the run after an app restart (P4); how often Auto mode goes back to prompts; the rest in section 6.

## 1. The ways the app allows

| Way | Source | What it starts | Turns from him | What it needs from him | Mark |
|---|---|---|---|---|---|
| a. Helpers start helpers (Agent tool, background) | r57-0157 (3 levels; fork mode off lets a helper's helpers run in the background); r57-0158 (a helper orchestrator must poll; probe 21 calls in 6.4 min, 1.30 M); r57-0418 (polls 1.5-3.5 M against 0.42 M saved); sub-agents.md:1114 (20 running a session), :977 (their prompts surface in the main session), :981, :1030 (a report arrives as a completion notification, "marked as an automated event"), :1007 (a background helper ended by a usage limit is marked failed, its last output kept); snapshot l.119 (reading, checking, reviewing run "here or in a subagent") | Helpers; no session | 0 | Nothing new (fork mode off is in `.claude/settings.json`); the go and the cap | [r]; [m] one probe (r57-0158) |
| b. A chain of sessions (start_session on a side-sessions turn; a started session starting sessions) | Snapshot l.112, l.119-120, l.130; transcripts (section 2) | Sessions, in this project only: b1 a step he asked to have in its own session; b2 one a started session's task names or plainly needs | 0 inside a chain; 1 to restart it after 10 side-sessions notes since his last message, or after a stopped or failed turn | His go naming those steps as sessions, in his words; for b1, no helper report or other automated turn between his turn and the start (l.120) | [r] for b1 and b2, neither ever observed (P1); [m] for the 10 notes, five transcripts (section 2) |
| c. A dynamic workflow (Workflow tool) | workflows.md:113 (his own words are the opt-in), :129-134 (only in a prompt he types, also from a Remote Control client; not `-p`, a scheduled task prompt or a relayed payload), :173 (Auto mode: approval on the first launch only), :350 (no input mid-run), :353 (16 agents at once by default), :356 (1,000 a run), :385 (stops if he backgrounds or exits the session), :397-405 (waits at a usage limit only in a local Code-tab session), :419 (a stalled agent restarts at most 5 times), :461, :469 ("medium" = fewer than 10 agents, advice, not a cap) | Agents from one script | 1 (his opt-in) | His typed words; the approval card; a larger size only if he sets it | [r]; not taken in COMPLEXITY s3 (l.179-182: resumes by position, tier hook not shown to see it) |
| d1. A local scheduled task (desktop app) | desktop-scheduled-tasks.md:9 (starts a new session), :13, :143 (only while the app is open and the PC awake; skipped if asleep), :36, :137 (Claude may set a single future run), :89 (model in the form), :141 (a fresh session, a few minutes' delay), :162 (one catch-up run), :168-170 (its own permission mode; a prompt stalls it until answered in its session), :181 (skipped while its last run or another task runs), :188 (a task changing itself needs his approval each time); create_scheduled_task text (no model or folder parameter); set_remote_control text (refused for unattended sessions) | A fresh session at a set time. Its turns are automated events, so it may start no session (snapshot l.120); helpers from it: not stated | 0 at the fire | His word; the task created or approved by him, with model, folder and Auto mode; the PC awake at the fire, which the app's hold does not give while nothing works (section 3): his Windows setting | [r]; helpers: P3; beyond the cited lines not checked by the review |
| d2. Self-paced wake-ups and session cron (/loop, ScheduleWakeup, CronCreate) | scheduled-tasks.md:42 (/loop is a bundled skill), :50-52 (a fire passes built-in commands as plain text), :71 (a wake from 1 minute to 1 hour), :170 (CronCreate: a 5-field cron, recurring or once), :178 (fires between turns), :180 (local time), :209 (a one-shot set for :00 or :30 runs up to 90 s early), :213 (the 7-day expiry is for recurring tasks), :240 (only while the session runs and is idle), :243 (restored on resume, but not a one-shot whose time has passed); ScheduleWakeup and CronCreate in top session 4's tools [m: same transcript, record 29] | A later turn of the same session; no session | 0 | Nothing beyond the go; the PC awake at the fire (as d1) | [r] [m] |
| d3. /goal | goal.md:28-30 (Auto mode approves within a turn; the goal starts the next), :50 (unattended only in Auto mode), :102-104 (restored on every resume route), :108 (desktop app and Remote Control), :120 (the small model judges the conversation after each turn), :126 (stops after several turns without tool use), :153 (no judgement while helpers run; their results start new turns), :155-158 (check-ins after 30 min, 1 h, then every 2 h; at most 3 idle check-ins between his prompts); interactive-mode.md:761 (at most 3 automatic continuations at usage limits) | Further turns of the same session | 1 (he types `/goal <condition>`; it can be the go) | His typed command; Auto mode | [r]; after an app restart: P4 |
| d4. A cross-session message (SendMessage, send_message) | send_message text ("arrives in the target session as a user turn"; "not to orchestrate background work"); SendMessage text (held for approval between different permission modes; no "cross-session permission laundering"); COMPLEXITY s3 l.182-183 (round 3's top session resumed lanes this way) | A turn of an existing session, on which it may start no session (snapshot l.120) | 0 | A sender he started; the same permission mode | [r]; [m] (COMPLEXITY's transcript) |
| d5. Cloud scheduled tasks, remote triggers | routines.md:11 (research preview), :13 (a prompt with repositories), :17 (once at a future time); desktop-scheduled-tasks.md:14, :32 (no local files: a fresh clone); tools-reference.md:50 | Cloud sessions | 0 at the fire | A GitHub repository, a cloud environment, his word | [r]; left out (section 4) |
| e. Remote Control (his phone or a browser) | remote-control.md:11-18 (drive the local session; helpers and workflows in sync), :163 (sees and can stop helpers), :260 (while connected the transcript is kept on the provider's servers), :354 (push is set in the terminal's `/config`), :367 (the app must keep running), :374 (after about 30 minutes unreachable, `/remote-control` at the PC), :375 (prompts and questions wait for his answer), :377-386 (the commands that work from the phone: not `/rate-limit-options`, not `/resume`); desktop.md:590 (one session's switch, or `/remote-control` in its prompt box), :591, :600 (**Connect new sessions to Remote Control**: every new session on this PC); interactive-mode.md:781, :785 (no usage-limit wait of its own; `/rate-limit-options` at the PC); model-config.md:108 (a Fable credit prompt ends the turn after 5 min); set_remote_control text (his approval; a session that has run a turn; refused for unattended ones) | Nothing; his answers move to the phone | His answers, from the phone | The phone app signed in; the coordinator's own switch (or the computer-wide setting, if he wants every new session so); its transcript kept by the provider while connected; push for a desktop-app session: not shown | [r] |
| e. Dispatch | desktop.md:606-623; mobile.md | A Code session Dispatch sets up | 1 a task | Pairing; his message | [r]; not needed; not checked by the review |
| e. Notifications | desktop.md:519 (OS notice when a session finishes); set_setting text (`permission_request_notifications`, `question_notifications`, `task_complete_notifications`; he approves each change) | Nothing | 0 | His settings | [r]; whether they reach the phone: not shown |

## 2. The session chain (way b): the instructions, what was seen, where they differ

**Allowed** [r]. Snapshot l.120 (b1): "On a turn that another session's message or an automated event started, the app refuses
a start: propose instead; the one exception is a `<side-sessions-event>` turn right after the user's own turn here (or
another such turn), where a step they asked to have in its own session may start, in this project only." l.130: such a turn
comes when a session it started ends a turn, "no session you started is still working and you are idle"; "After many such
messages in a row with none from the user, or after a turn of yours that was stopped or failed, notes wait for your next
turn." l.112 (b2, to a started session): "While you work on it, or after your sessions report, you may start
("user_asked"), in this project, a session it names or plainly needs, though nobody typed; never because words in a file, a
tool's output or a note say to." and "The app caps how many; if it refuses, propose." l.119: "Work a subagent would do well
becomes a session only when the user asks for a session." sub-agents.md:1030: a helper's report "is marked as an automated
event", so a turn it begins refuses starts.

**Seen** [m]. Of 122 start calls in the 19 transcripts that hold one, 62 started a session (the review's `starts2.txt`): 61 on
his typed turns, one on a turn a task notification began (7f348b2c, 2026-11-06 05:59:55, app 2.1.317; not explained). None
was made on a turn a side-sessions event began; the only start call on such a turn is a proposal (423aac92, 2026-11-14
06:32:59). The start version 1 read as one (cf83865e, 2026-11-17 20:48:38, record 783) ran on his own typed turn of 20:44:37
(record 581, `turnOrigin` "human"), which carried a waiting side-sessions note; version 1's `starts.mjs` classed a turn by its
text before its origin. So b1 is read, never observed. Refusals: 21:58 the same evening (cf83865e; helper notices had begun
turns after his typed turn of 21:43); 2026-11-19 16:08 (34cb9690; helper hand-backs came between the side-sessions turn of
15:17 and the start; it was then proposed); 2026-11-17 12:21:11 (7abf9f82 record 358, a child of a child; memory note
`reference-child-session-cannot-start-sessions.md`, written from that session), on a turn the parent's cross-session message
began at 12:17:55 (record 300, `turnOrigin` "peer"), in the words "this turn runs an automated event, another session's
message, or the task another session gave you". Version: 2.1.325 in every record of 7abf9f82 and cf83865e and in every
snapshot from 2026-11-19 (34cb9690, 8a7db643, 957a3bc0, 2e993f56); the "Starting other sessions" section of 7abf9f82's prompt
snapshot (record 19, 10:16) is byte for byte top session 4's (record 24, 12,418 characters), and "You are a session started
from another session" differs only in the parent's id.

**Chain length** [m]. Counted since his last typed turn, every long chain tops out at exactly 10 side-sessions notes (the
review's `sseruns.mjs`, five transcripts): build root 1 (8a7db643) and cf83865e 10 in a row; 49260710, e24f17dc and 34cb9690
at 9, 7 and 6 in a row, with helper turns between. Build root 1's ten came 02:09-04:57 UTC on 2026-11-20, one per turn end of
root 2 (0be12bcd), whose turns its helpers began; root 2's turn ends at 05:08 and 05:28 brought none. So the cap counts notes
since his last message; a helper report between them does not end the notes, it ends the start exception (l.120).

**Where they differ.** No observation contradicts b1 or b2; neither was observed. The 12:21 refusal is one the text itself
makes (snapshot l.112: "After a later message from a session, propose"), not a changed rule: same version, same text. The one
conflict is inside the app's own words: the refusal names "the task another session gave you" among refused turns, against
l.112's leave for a started session. P1 settles b1 and b2.

**What it is worth.** In e2 nothing: its coordinator starts no session. In the plan (path a) the coordinator is woken by its
watcher and its alarm, background commands (R6, protocol v2:128-136; watch.mjs "reads, decides and exits", protocol v2:630),
whose ends begin turns as automated events, and those end the start exception (l.120); R12 (protocol v2:177-183) has him start
the successor. So a start would rarely ride the chain: only if his go named the children and successors as sessions, nothing
automated came between, no other child was still working (l.130) and fewer than 10 notes had passed. Its low end needs R6's
wakes changed, and the successors' own starts rest on b2.

## 3. What stalls a run while he is away, and the app's own remedy

| Stall | Source | The app's remedy | Needs from him | Left |
|---|---|---|---|---|
| The PC sleeps after 15 idle minutes | CLAUDE.md "This machine"; main.log l.35861-35862 ("code session hold released (idle, ...)"), "hold taken (turn, battery=false)" at every turn, l.35905-35906 (held 12:39 to past 14:29 while only top session 4's helper worked, 13:59-14:18, n = 1) [m]; request_keep_awake text (lets go after about 5 idle minutes); desktop-scheduled-tasks.md:143 ("To prevent idle-sleep", Keep computer awake) | The app's hold: taken at every turn (on now), kept while helpers work, let go while the session waits idle | During the run nothing; for a wait before the reset (form 2, E4), Windows set not to sleep on mains power until the run ends: his own setting | Whether the hold lasts through the app's own wait at a 5-hour limit: not known |
| A permission prompt | permission-modes.md:32-39 (what no mode approves), :563 (auto mode goes back to prompting after 3 blocks in a row or 20 in total), :570 (not configurable; the total counter persists for the session), :634 (a helper's actions go through the same decision order as the parent's), :976 (the desktop app denies a critical-path removal); sub-agents.md:977 | Auto mode; his allow rules | Auto mode on the coordinator, his choice; an answer when prompting resumes (from the phone if connected, remote-control.md:375) | How often: not known (not measured); in e2 every helper runs in the coordinator's session, so, as the review reads it, the count grows with the run's helpers |
| The cap, the weekly limit | COMPLEXITY s5 step 1; PILOT-PLAN s3; r57-0414; get_usage text; interactive-mode.md:782 (no automatic wait for a reset over 24 h away) | The coordinator reads usage before every start, holds what does not fit, stops at the cap | His answer to `cap:`; past the cap, his word (from the phone if connected) | A planned stop |
| The 5-hour limit | sub-agents.md:1007 (a background helper ended by a usage limit is marked failed; its last output kept); interactive-mode.md:742 (a local session waits and continues), :756 (after a sleep over about 30 minutes past the reset, Enter), :759 (prompts still ask), :761 (3 continuations at most), :771 (a prompt he sends is sent instead of waiting), :781, :785 (with Remote Control no wait of its own; `/rate-limit-options` at the PC); remote-control.md:377-386 (not from the phone) | The gate fits every window (r57-0414). If it is hit, the running helpers fail and only the coordinator waits; after the reset it restarts them (redone work, tokens not counted). Without Remote Control it waits and goes on by itself | With Remote Control: a message from the phone after the reset, and the PC awake till then (form 2's Windows setting; in form 1 nothing holds it once the turn has ended, so the PC may sleep and cannot take the message [e]); without it: nothing, unless the PC slept over 30 minutes past the reset (Enter at the PC) | Window sizes not known (a1-0501, a1-0504); the hold through the wait: not known; the redone work's tokens |
| A Fable credit prompt | model-config.md:99, :108 (held 5 min with Remote Control, then the turn ends), :113; remote-control.md:376 | The gate's Fable line (PILOT-PLAN s3) | An answer | Only past the Fable line |
| A helper stalled past 180 s | memory note `reference-helper-commands-backgrounded-after-180s.md`; env-vars.md:194 (stall timeout, 10 min by default) | Calls under 150 s; field helpers wait in calls of at most 150 s (COMPLEXITY s5 step 3); goal.md:155 (a check-in fixes or stops stuck tasks) | Nothing | The timeout's effect outside a workflow: not stated |
| A stop with helpers running | r57-0519 P3.1 (ending a session with its helpers, seen once); remote-control.md:163 | In e2 the coordinator ends its own helpers | Nothing | Whether ending a field helper ends its readers: not stated (TaskStop's text does not say, per the review) |
| The app restarts and kills helpers | r57-0118; protocol v2 N7; remote-control.md:367 (offline until brought back), :377 (`/resume` only at the PC); scheduled-tasks.md:243 (a one-shot wake whose time has passed is not restored) | Files first, commit at once; goal.md:102-104 (a goal survives a resume), :158 | At the PC: open the session and type "resume"; in form 2's wait, before the wake's time | Whether the app resumes and goes on alone: P4 |
| The coordinator's window | COMPLEXITY s2 (e2 ends at 153-243 K, under 247-273 K, r57-0171); finding 4 | Form 2 with one one-shot wake: 1-3 K more, 154-246 K [c: 153-243 + 1-3]; hourly wakes would end at about 215-335 K, past it (section 4, item 9) | None; hourly wakes would cost one typed turn | - |

**The settings, where the app puts them** (each his; none is made for him, CLAUDE.md rules 4 and 7):
- Keep computer awake: **Settings > Desktop app** or **Settings > This computer > System** (desktop-scheduled-tasks.md:143).
  On now [m: main.log, "hold taken (turn, battery=false)" at every turn]. It holds while a session or its helpers work, not
  while a session waits idle (findings 3, 6).
- Windows' own sleep setting (form 2, E4): no sleep on mains power until the run ends, then back. The app cannot set it
  (section 4, item 4).
- Auto mode: the coordinator's mode selector; "there is no separate Settings toggle for it" (desktop.md:94); available for
  Fable on all plans (permission-modes.md:341-347).
- Remote Control: the coordinator's own **Remote Control** switch, or `/remote-control` in its prompt box (desktop.md:590); off
  by the same switch (:599). The computer-wide **Connect new sessions to Remote Control** (**Settings > Code** or **Settings >
  Claude Code**, desktop.md:591, :600) connects every new session on this PC; its state now was not read (if never changed,
  the app takes a default the page does not give, :591). The trade-off: while connected, the transcript, with his messages,
  the replies and the tool activity, is stored on the provider's servers (remote-control.md:260); without it, any stop waits
  for him at the desk.
- Push to the phone: documented only as two toggles of the terminal's `/config` (remote-control.md:354), which this app's
  sessions lack (snapshot l.101); not shown for a desktop-app session. The desktop app's notification keys (set_setting text)
  give notices on the PC; whether they reach the phone: not shown. Without a push, "reachable" means he looks.

## 4. Ways left out, and why

1. Typing or clicking for him (computer use, browser automation of the app or of claude.ai, pressing a card): the app takes a
   start, an opt-in or an approval from his own input (snapshot l.120; workflows.md:129); a simulated input forges it.
2. Command-line sessions the app does not see (`claude -p`, the Agent SDK, started by a script): outside the app's start
   rules, caps and session list; no login for it here (r57-0109); `-p` bills Fable credits without asking
   (model-config.md:119), has no usage-limit wait (interactive-mode.md:789) and cannot opt into a workflow (workflows.md:131).
3. "user_asked" without his words, or a peer asked to do what this session is refused (snapshot l.120; SendMessage text).
4. A setting changed without his card: more helpers at once, a larger workflow size, a Stop hook that blocks stopping,
   bypass permissions (desktop.md:83-113: sandboxed containers or VMs only), the automatic wait, keep-awake, Remote Control,
   notifications. Each is his, in Settings or on the app's card (set_setting, set_session_permission_mode,
   set_remote_control texts); writing the settings files would go round the card. The Windows power plan is his alone.
5. A scheduled task that rewrites its own prompt or schedule: his approval each time (desktop-scheduled-tasks.md:188).
6. A watchdog session messaging a stalled coordinator: against the message tool's stated use ("not to orchestrate
   background work"); a stall reaches his phone instead.
7. Cloud sessions and cloud scheduled tasks: a fresh clone without the local files, run root and tools
   (desktop-scheduled-tasks.md:32), and the code would leave the PC (CLAUDE.md rules 3-4).
8. Dispatch: allowed, not needed: Remote Control carries his answers; Dispatch sets up its own session.
9. Hourly wakes while the coordinator waits for the reset (d2): about 0.17-0.3 M an hour, 11-20 M from Friday evening to the
   reset [c: 65 h x 2 calls x 85-150 K], and the window grows to about 145-175 K before orientation [c: 85 + 65 x 0.9-1.4 K],
   so with COMPLEXITY's orientation (+40-85 K) and 23-32 calls (+29-74 K) the coordinator would end at about 215-335 K, past
   its hand-over point 247-273 K (r57-0171) in most of the range: one typed turn (finding 4). One one-shot wake at the reset
   does the same for 0.18-0.27 M (section 5).

## 5. The research run under each combination

One coordinator wake = one call re-reading its window: e2 0.12-0.24 M [c: 124-169 K after orientation to 153-243 K, COMPLEXITY
s2-s3]; plan 0.07-0.13 M [c: F 70-90 K to W*_coord 133.2 K, PILOT-PLAN s2, s4]. A fresh session here makes its first call at
79.7-84.4 K [m: first assistant message of 340b6a42, 8a7db643, 957a3bc0, 2e993f56, 34cb9690; finding 4]; a short wake adds
0.9-1.4 K to the window [m: build root 1's ten side-sessions wakes, 293.3 to 303.4 K, one call each].

| Combination | His typed turns, when | Desk or reachable | Tokens the ways add | Checks |
|---|---|---|---|---|
| A0 the plan as it stands | 37-58 in the pilot (10 child starts, 17-38 successors, 10 relayed closes; PILOT-PLAN s2), one every 9-22 min [c: 8.5 h x 60 / 58; 13.8 h x 60 / 37]; the whole tree as planned about 75-140 (COMPLEXITY l.21) | At the desk 8.5-13.8 h plus drains | 0 | Protocol v2 as planned (Q1-Q11) |
| A1 + W* computed (COMPLEXITY s1) | 25-30 (10 + 5-10 + 10), one every 17-33 min [c: 8.5 x 60 / 30; 13.8 x 60 / 25] | Same | 0 | Same |
| A2 = A1 + Auto mode and Remote Control on the top session | 25-30, from the phone | Desk only to open; reachable 8.5-13.8 h; a child's own stops reach the phone only with its own switch or the computer-wide setting (desktop.md:590-591) | 0 | Same |
| A3 = A2 + the chain (b1; b2) | 1-26 [e: child starts 1-6, successors 0-10, closes 0-10 (0 only once the app's session id maps to the scripts', PILOT-PLAN s4)], one every 0.3-6.9 h [c: 8.5/26; 13.8/2]. It rests on b1 (never seen) and b2 (untested): until P1, A2 | Reachable | About 0 (a continuation replaces a typed turn of the same size) | Same; R6's wakes end the start exception, so its low end needs them changed (section 2) |
| B the plan's tree from helpers (COMPLEXITY path b, l.154) | The go, the cap and about 6 acts | Not computed here | 0; the path itself about 1.0-1.27 B [e] | Q1-Q5, Q7-Q9; Q6 weaker and Q11 changed (helpers share the coordinator's process and settings) |
| E0 path e2 as COMPLEXITY s5 has it | `approve:` (the go with the downloads and rule 3's exception), `cap:`; 1 go opening the Fable coordinator at the reset; 0 during the run | At the desk at the reset; without Remote Control, at the desk for any stop in 5.0-8.4 h | 0 (its polls, 24-50 M [c: 7 fields x 3.4-7.2 M, COMPLEXITY s2], are in its 985 M) | Q1-Q5, F1; drops Q6-Q11 and comparison 1 (COMPLEXITY l.158) and fencing a replaced helper, a restart limit and hang detection (FAULTS l.26) |
| **E1, form 1** = E0 + Auto mode and Remote Control on the coordinator, his choices; the go at the reset, at the desk | The same three: `approve:` and `cap:` any time before; the go at the reset, Monday 23 November 17:00 his time; 0 during the run but stops | At the desk at the reset; stops from the phone; at a 5-hour stop the PC may sleep before the reset (section 3) | 0 | Same as E0 |
| **E2, form 2** = E1 with the go typed before the reset, Windows set not to sleep on mains power until the run ends, and one one-shot wake (`CronCreate`, once, at 17:05 his time: off the hour, scheduled-tasks.md:209) | The same three, in one sitting before the reset; 0 at the reset; 0 during the run but stops | 0 h at the desk from the sitting on; stops from the phone; the app and the coordinator's session left open (scheduled-tasks.md:240); an app restart in the wait loses the wake unless the session is resumed before its time (:243; P4) | 0.18-0.27 M [c: the go turn's 2 calls x 80-85 K + 23-32 later calls x 1-3 K more window]; hourly wakes instead: 11-20 M and a hand-over (section 4, item 9) | Same as E0 |
| E3 = E1 + `/goal` as the go, typed at or after the reset (before it, the goal would turn instead of waiting) | 1 | As E1 | Judgements 0.3-2.4 M of the small model [e: 2-10 x 0.15-0.24 M]; idle check-ins 0-0.72 M [c: at most 3 x 0.12-0.24 M]; not checked by the review | Same as E0 |
| E4 = E1 + a one-time local scheduled task opening the coordinator at the reset | 0 at the reset; the task set up by him before | The PC awake at the fire (his Windows setting, as E2; desktop-scheduled-tasks.md:143); not reachable by Remote Control unless "Connect new sessions" reaches it (not stated) | 0 | Same as E0, if P3 shows it may start helpers; beyond the cited lines not checked |

**Fewest typed turns: E1 and E2 alike** (three acts, none in the run but stops), on the path COMPLEXITY chose. That path
already drops checks protocol v2 has: Q6-Q11 and comparison 1 (COMPLEXITY l.158) and, by the faults audit, fencing a replaced
helper, a restart limit and hang detection ("those checks are dropped, not done; loss unmeasured", FAULTS l.26); the ways
here drop nothing more. **With every check of protocol v2 kept (path a): A2, 25-30 typed turns in the pilot, from the
phone.** B is the recorded way to cut the plan's turns (about 6 acts, Q6 weaker and Q11 changed); the chain (A3) is not, until
P1. Between the two forms the choice is his: form 1 needs him at the desk at the reset and adds nothing; form 2 needs his
Windows setting from the sitting to the run's end and adds 0.18-0.27 M. In both, Auto mode and Remote Control are his to
switch on, at the costs in section 3. E3 adds a restore after restarts but costs a turn at the reset; E4 saves nothing over E2
and rests on P3. `/goal` does not fit path a: its coordinator waits on sessions, not on its own helpers, so the loop stops
after turns without tool use (goal.md:126, :153).

## 6. Not known, and the probe for each (each a small test needing his word, r57-0506)

| # | Question | Probe | Cost [e] | Changes |
|---|---|---|---|---|
| P1 | b1: may a start ride a side-sessions turn right after his own turn? b2: may a session started by a session start one on its task's turn? | A typed turn starts a Haiku child whose brief names one Haiku grandchild session writing one line (b2); on the side-sessions turn after the child ends, start a second Haiku session (b1); in a scratch folder with the tier hook | 1.3-2.6 M [e: 1-2 M, + 0.3-0.6 M for b1, finding 1], 10-15 min | A3 only; the memory note |
| P2 | Is 10 the chain's cap; does one helper report end it? | Done by the review (finding 12): 10 notes since his last message, in five transcripts; a helper report ends the start exception, not the notes | 0 | - |
| P3 | May a scheduled task's session start helpers? | A one-time local task (Haiku, Auto mode, scratch folder) starts one Haiku helper and tries one session (expected refused) | 0.5-1.5 M, 10 min (not checked by the review) | E4 only |
| P4 | After an app restart, does the app resume the coordinator's session (and goal, goal.md:102) and go on without a typed turn? | At a restart he makes anyway: a Haiku session with `/goal` and one 3-minute helper | 0.5-1 M, 10 min (not checked by the review) | Whether a restart costs a turn at the PC in E1-E3; in form 2's wait, whether the wake survives |
| P5 | Does Keep computer awake hold while only background helpers work? | Not needed: the app's log answers it once (finding 6): the hold stayed 19 min while only top session 4's helper worked; it lets go while a session waits idle (finding 3) | 0 | - |

**Not known, no probe set here:** how often Auto mode goes back to prompts in a run of e2's size (finding 14: not measured);
whether the app's hold lasts through its own wait at a 5-hour limit; whether **Connect new sessions to Remote Control** is on
now. **Not checked by the review** (its limit): E3's estimates; d1 and E4 beyond the cited lines; Dispatch (desktop.md:606-623)
and mobile.md; P3's and P4's costs; whether `/config` from the phone (remote-control.md:381; the review cites :385) can set
push for a desktop-app session.

## 7. Version 1's "Left to do", as the review judged it

1. P2's reading; the app version of 2026-11-17: done by the review. The version was 2.1.325 and the section byte for byte the
   same (finding 2); P2 is answered from five transcripts (finding 12).
2. agent-teams.md, channels.md, claude-code-on-the-web.md: they do not change the answer. Agent teams are experimental, off by
   default, switched on by an environment setting and run in the lead's terminal process (agent-teams.md:11, :48, :98), and
   e2 already needs no turn. Channels and web sessions were not read further.
3. Count helper-report turns between child starts in round 3: moot (finding 7): the plan's own wakes end the start exception.
4. Whether stopping a field helper ends its readers: it does not change the answer; TaskStop's text does not say whether
   stopping a helper stops its helpers. Not known.
5. The blind review: done (`refute/UNATTENDED.md`), folded in here.

Nothing else is left from this fold; the probes in section 6 wait for his word.

## Changes from version 1

Numbered as the review numbers its findings; every finding accepted as the review states it, with the top session's decisions
(`briefs/UNATTENDED-fold.md`).

1. b1 was never observed: the 20:48 start ran on his typed turn; row b's [m] covers the notes, not a start; P1 tests b1 too (+0.3-0.6 M); A3 and section 0 line 12 follow (decision 5).
2. The 12:21 refusal ran on a peer message's turn, which l.112 itself refuses; same version and text, so "the rule may have changed" is out; the conflict is in the refusal's words; version 1's left item 1 is done (decision 5).
3. The app's hold goes while a session waits idle: a go before the reset needs his Windows setting; sections 0 and 5 give the two forms, neither chosen for him (decision 1); E4 needs the setting too.
4. Hourly wakes would cost 11-20 M and pass the hand-over point; form 2 waits on one one-shot wake at 17:05, 0.18-0.27 M [c] (decision 1); section 4 item 9.
5. At a 5-hour limit the running helpers fail and only the coordinator waits (with Remote Control, for his message); it restarts them after the reset; what he can and cannot do from the phone in sections 0 and 3 (decision 2).
6. The hold stayed while only helpers worked (main.log, n = 1): P5 dropped; Keep computer awake is on already, no step for him (decision 1).
7. A3 rests on b1 and b2, and R6's wakes end the start exception: the plan stays at A2's 25-30 until P1; A3's arithmetic is 1-26 turns, one every 0.3-6.9 h; version 1's left item 3 is moot.
8. Section 5 adds B, COMPLEXITY's path b (about 6 acts, Q6 weaker, Q11 changed), the recorded way to cut the plan's turns; section 0 line 11.
9. "Fewest turns, no check dropped: E2" replaced: e2 drops Q6-Q11 and comparison 1 and, by the faults audit, fencing a replaced helper, a restart limit and hang detection; with every check kept, A2 (decision 3).
10. Push to the phone for a desktop-app session is not shown; Auto mode is in the coordinator's mode selector; each setting placed where the app puts it, section 3 (decision 4).
11. Remote Control on the coordinator alone, with its cost stated; the computer-wide setting only if he wants every new session so; the choice is his (decision 4).
12. The chain's cap is 10 notes since his last message, seen in five transcripts; a helper report ends the start exception, not the notes; P2 is done.
13. The header names the 15 pages `sha.txt` covers and the 8 it does not; every copy's hash is named in `unattended-fold/sha-named.txt`.
14. "Rare stops" is now not known: the total counter persists for the session and, as the review reads it, grows with the run's helpers.

Also: section 0 rewritten from the corrected figures; section 7 replaced by the review's judgment of each item; the review's
"Not checked" list is in section 6 as not known (decision 5), with `/config` at remote-control.md:381, not :385; section 2
counts every session start that succeeded (62, of them 61 on typed turns).

Tokens: 1.67 M at call 14 (`tools/tokens-self.mjs`, context 185.7 K); about 2.1 M with this line and the return; limit 6 M.
