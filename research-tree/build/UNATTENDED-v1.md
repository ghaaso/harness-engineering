# UNATTENDED: running the research run without the owner's typed "go"

Version 1, 2026-11-20, by a helper of top session 4 (kind analyse, Opus), from `research-tree/build/briefs/UNATTENDED.md`
(ruling r57-0042). Read only: nothing was started, set or probed. Written at the token limit, so it ends with "Left to do".

Marks: [m] measured (script or file named), [r] read (page:line or path), [c] computed (formula shown), [e] estimate (range).
**Docs** = `https://code.claude.com/docs/en/<page>.md`, fetched raw with `curl --ssl-no-revoke` on 2026-11-20 about 13:54 UTC;
line numbers are those of the copies in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/unattended/docs/`
(temporary; hashes in `sha.txt`). **Snapshot l.N** = the app's own instructions to top session 4 (Claude Code 2.1.325, desktop
app, 13:35 UTC), record 24 (`prompt_snapshot`) of
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/340b6a42-dea1-407f-9afb-f9d304e4f79e.jsonl`,
extracted to `.../scratchpad/unattended/top4-prompt.txt`, line N. **Tool texts** = the app's deferred tools' descriptions, loaded
with ToolSearch, none called. Transcript counts: `.../scratchpad/unattended/scripts/starts.mjs`, `seq.mjs`, over every
transcript under `C:/Users/User/.claude/projects/`. COMPLEXITY = `research-tree/build/COMPLEXITY.md` v2; PILOT-PLAN =
`research-tree/build/PILOT-PLAN.md` v2.

## 0. The answer

1. Yes: the app has its own ways for work to go on without your typing; the chosen path needs no trick and no hidden setting.
2. The run COMPLEXITY chose (e2) already needs no "go" per session: one Fable coordinator starts helpers, helpers start helpers.
3. Still yours, in one sitting at the desk: answer `approve:` and `cap:`, then open the Fable coordinator by typing the go.
4. The go can be typed any time before the reset (2026-11-23, 17:00 your time): the coordinator holds every start and waits itself.
5. In the same sitting, in the app's Settings: Keep computer awake; Remote Control for new sessions; phone push; Auto mode.
6. Then the run needs 0 typed turns: 5.0-8.4 h with nobody at the desk; you stay reachable by phone in case it stops.
7. It can stop on: a permission prompt after repeated blocks, the cap question, the 5-hour limit, an app restart.
8. From the phone (Remote Control) you answer these and watch helpers; while connected, the transcript is kept on the provider's servers.
9. The tree as planned (PILOT-PLAN) needs 37-58 typed turns (25-30 like for like); the app's session chain could cut that to about 2-26.
10. That chain ends after 10 continuations without your message (seen once) and at any helper report in between.
11. Not known: whether Keep awake holds while only helpers work; whether the run goes on after an app restart; whether a child session may start sessions.
12. Each is a small test on your word, 0.2-2 M tokens and 10-25 minutes (section 6); the first two touch e2.

## 1. The ways the app allows

| Way | Source | What it starts | Turns from him | What it needs from him | Mark |
|---|---|---|---|---|---|
| a. Helpers start helpers (Agent tool, background) | r57-0157 (3 levels; fork mode off lets a helper's helpers run in the background); r57-0158 (a helper orchestrator must poll; probe 21 calls in 6.4 min, 1.30 M); r57-0418 (polls 1.5-3.5 M against 0.42 M saved); sub-agents.md:1114 (20 running a session), :977 (their prompts surface in the main session), :981, :1030 (a report arrives as a completion notification, "marked as an automated event"); snapshot l.119 (reading, checking, reviewing run "here or in a subagent") | Helpers; no session | 0 | Nothing new (fork mode off is in `.claude/settings.json`); the go and the cap | [r]; [m] one probe (r57-0158) |
| b. A chain of sessions (start_session on a side-sessions turn; a started session starting sessions) | Snapshot l.112, l.119-120, l.130; transcripts (section 2) | Sessions, in this project only: b1 a step he asked to have in its own session; b2 one a started session's task names or plainly needs | 0 inside a chain; 1 to restart it after 10 continuations, after a turn begun by a helper report or a session's message, or after a stopped or failed turn | His go naming those steps as sessions, in his words | [r]; [m] one chain of 10 |
| c. A dynamic workflow (Workflow tool) | workflows.md:113 (his own words are the opt-in), :129-134 (only in a prompt he types, also from a Remote Control client; not `-p`, a scheduled task prompt or a relayed payload), :173 (Auto mode: approval on the first launch only), :350 (no input mid-run), :353 (16 agents at once by default), :356 (1,000 a run), :385 (stops if he backgrounds or exits the session), :397-405 (waits at a usage limit only in a local Code-tab session), :419 (a stalled agent restarts at most 5 times), :461, :469 ("medium" = fewer than 10 agents, advice, not a cap) | Agents from one script | 1 (his opt-in) | His typed words; the approval card; a larger size only if he sets it | [r]; not taken in COMPLEXITY s3 (l.179-182: resumes by position, tier hook not shown to see it) |
| d1. A local scheduled task (desktop app) | desktop-scheduled-tasks.md:9 (starts a new session), :13, :143 (only while the app is open and the PC awake; skipped if asleep), :36, :137 (Claude may set a single future run), :89 (model in the form), :141 (a fresh session, a few minutes' delay), :162 (one catch-up run), :168-170 (its own permission mode; a prompt stalls it until answered in its session), :181 (skipped while its last run or another task runs), :188 (a task changing itself needs his approval each time); create_scheduled_task text (no model or folder parameter); set_remote_control text (refused for unattended sessions) | A fresh session at a set time. Its turns are automated events, so it may start no session (snapshot l.120); helpers from it: not stated | 0 at the fire | His word; the task created or approved by him, with model, folder and Auto mode; the PC awake | [r]; helpers: P3 |
| d2. Self-paced wake-ups and session cron (/loop, ScheduleWakeup, CronCreate) | scheduled-tasks.md:42 (/loop is a bundled skill), :50-52 (a fire passes built-in commands as plain text), :71 (a wake from 1 minute to 1 hour), :178 (fires between turns), :180 (local time), :213 (7-day expiry), :240 (only while the session runs and is idle), :243 (cron tasks restored on resume); ScheduleWakeup in top session 4's tools [m: same transcript, record 29] | A later turn of the same session; no session | 0 | Nothing beyond the go | [r] [m] |
| d3. /goal | goal.md:28-30 (Auto mode approves within a turn; the goal starts the next), :50 (unattended only in Auto mode), :102-104 (restored on every resume route), :108 (desktop app and Remote Control), :120 (the small model judges the conversation after each turn), :126 (stops after several turns without tool use), :153 (no judgement while helpers run; their results start new turns), :155-158 (check-ins after 30 min, 1 h, then every 2 h; at most 3 idle check-ins between his prompts); interactive-mode.md:761 (at most 3 automatic continuations at usage limits) | Further turns of the same session | 1 (he types `/goal <condition>`; it can be the go) | His typed command; Auto mode | [r]; after an app restart: P4 |
| d4. A cross-session message (SendMessage, send_message) | send_message text ("arrives in the target session as a user turn"; "not to orchestrate background work"); SendMessage text (held for approval between different permission modes; no "cross-session permission laundering"); COMPLEXITY s3 l.182-183 (round 3's top session resumed lanes this way) | A turn of an existing session, on which it may start no session (snapshot l.120) | 0 | A sender he started; the same permission mode | [r]; [m] (COMPLEXITY's transcript) |
| d5. Cloud scheduled tasks, remote triggers | routines.md:11 (research preview), :13 (a prompt with repositories), :17 (once at a future time); desktop-scheduled-tasks.md:14, :32 (no local files: a fresh clone); tools-reference.md:50 | Cloud sessions | 0 at the fire | A GitHub repository, a cloud environment, his word | [r]; left out (section 4) |
| e. Remote Control (his phone or a browser) | remote-control.md:11-18 (drive the local session; helpers and workflows in sync), :163 (sees and can stop helpers), :260 (while connected the transcript is kept on the provider's servers), :354 (push "when actions required"), :367 (the app must keep running), :375 (prompts and questions wait for his answer); desktop.md:591 (Connect new sessions to Remote Control); interactive-mode.md:781, :785 (no automatic usage-limit wait; he runs /rate-limit-options); model-config.md:108 (a Fable credit prompt ends the turn after 5 min); set_remote_control text (his approval; a session that has run a turn; refused for unattended ones) | Nothing; his answers move to the phone | His answers, from the phone | The phone app signed in; the setting or his approval; the push toggles; the transcript kept by the provider while connected | [r] |
| e. Dispatch | desktop.md:606-623; mobile.md | A Code session Dispatch sets up | 1 a task | Pairing; his message | [r]; not needed |
| e. Notifications | desktop.md:519 (OS notice when a session finishes); set_setting text (`permission_request_notifications`, `question_notifications`, `task_complete_notifications`; he approves each change) | Nothing | 0 | His settings | [r] |

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

**Seen** [m]. 2026-11-17 20:48 UTC (cf83865e, round 3's top session): a start on a side-sessions turn after his typed turn of
20:21 succeeded. 21:58 the same evening: refused; helper notices had begun turns after his typed turn of 21:43. 2026-11-19
16:08 (34cb9690): refused; helper hand-backs came between the side-sessions turn of 15:17 and the start; it was then
proposed. 2026-11-17 12:21 (7abf9f82, a child of a child; memory note `reference-child-session-cannot-start-sessions.md`,
written from that session): refused on its task's turn, "this turn runs an automated event, another session's message, or
the task another session gave you". Chain length: build root 1 (8a7db643) got 10 side-sessions turns in a row, 02:09-04:57
UTC on 2026-11-20, one per turn end of root 2 (0be12bcd), whose turns its helpers began; root 2's turn ends at 05:08 and
05:28 brought none; notes waited after 10 (n = 1, checked by hand). Four other transcripts also top out at exactly 10
(49260710, cf83865e, e24f17dc, 34cb9690; script only). Every other successful start read was on a typed turn, except
7f348b2c on 2026-11-06 05:59 (a turn the script classes as a task notice, an older app version; not explained). Version
2.1.325 in every snapshot from 2026-11-19 (34cb9690, 8a7db643, 957a3bc0, 2e993f56); the 2026-11-17 version was not read.

**Where they differ.** b1 and what was seen agree. b2 does not: the text lets a started session start on its task's turn;
on 2026-11-17 the app refused exactly that. The rule may have changed since; only P1 settles it.

**What it is worth.** In e2 nothing: its coordinator starts no session. In path a a start rides the chain only if his go
named the children and successors as sessions, no helper of the coordinator reported in between, no other child is still
working (l.130), and fewer than 10 continuations have passed; successors are started sessions, so their starts rest on b2.

## 3. What stalls a run while he is away, and the app's own remedy

| Stall | Source | The app's remedy | Needs from him | Left |
|---|---|---|---|---|
| The PC sleeps after 15 idle minutes | CLAUDE.md "This machine"; request_keep_awake text (the app keeps the PC awake through each turn, lets go after about 5 idle minutes) | Keep computer awake (desktop-scheduled-tasks.md:143, "To prevent idle-sleep"); set_setting `keep_awake_while_working`, `keep_awake_on_battery` | The setting; the app open | The key reads "while working": with only helpers working, P5 |
| A permission prompt | permission-modes.md:32-39 (what no mode approves), :563 (auto mode resumes prompting after 3 blocks in a row or 20 in total), :976 (the desktop app denies a critical-path removal); sub-agents.md:977 | Auto mode; his allow rules | Auto mode, his choice; an answer by phone if prompting resumes | Rare stops |
| The cap, the weekly limit | COMPLEXITY s5 step 1; PILOT-PLAN s3; r57-0414; get_usage text; interactive-mode.md:782 (no automatic wait for a reset over 24 h away) | The coordinator reads usage before every start, holds what does not fit, stops at the cap | His answer to `cap:` (phone) | A planned stop |
| The 5-hour limit | interactive-mode.md:742 (a local session waits and continues), :756 (after a sleep over 30 min, Enter), :759 (prompts still ask), :761 (3 continuations at most), :781, :785 (not with Remote Control: he runs /rate-limit-options) | The gate fits every window (r57-0414); the automatic wait | With Remote Control: one answer from the phone | Window sizes not known (a1-0501, a1-0504) |
| A Fable credit prompt | model-config.md:99, :108 (held 5 min with Remote Control, then the turn ends), :113 | The gate's Fable line (PILOT-PLAN s3) | An answer | Only past the Fable line |
| A helper stalled past 180 s | memory note `reference-helper-commands-backgrounded-after-180s.md`; env-vars.md:194 (stall timeout, 10 min by default) | Calls under 150 s; field helpers wait in calls of at most 150 s (COMPLEXITY s5 step 3); goal.md:155 (a check-in fixes or stops stuck tasks) | Nothing | The timeout's effect outside a workflow: not stated |
| A stop with helpers running | r57-0519 P3.1 (ending a session with its helpers, seen once); remote-control.md:163 | In e2 the coordinator ends its own helpers | Nothing | Whether ending a field helper ends its readers: not stated |
| The app restarts and kills helpers | r57-0118; protocol v2 N7; remote-control.md:367 | Files first, commit at once; goal.md:102-104 (a goal survives a resume), :158 | A typed "resume" (phone) | Whether the app resumes and goes on alone: P4 |
| The coordinator's window | COMPLEXITY s2 (e2 ends at 153-243 K, under 247-273 K, r57-0171) | None needed | One turn only if every range tops out | - |

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

## 5. The research run under each combination

One coordinator wake = one call re-reading its window: e2 0.12-0.24 M [c: 124-169 K after orientation to 153-243 K, COMPLEXITY
s2-s3]; plan 0.07-0.13 M [c: F 70-90 K to W*_coord 133.2 K, PILOT-PLAN s2, s4].

| Combination | His typed turns, when | Desk or reachable | Tokens the ways add | Checks |
|---|---|---|---|---|
| A0 the plan as it stands | 37-58 (10 child starts, 17-38 successors, 10 relayed closes; PILOT-PLAN s2), one every 9-22 min [c: 8.5 h x 60 / 58; 13.8 h x 60 / 37] | At the desk 8.5-13.8 h plus drains | 0 | Protocol v2 as planned |
| A1 + W* computed (COMPLEXITY s1) | 25-30 (10 + 5-10 + 10), one every 17-33 min [c: 8.5 x 60 / 30; 13.8 x 60 / 25] | Same | 0 | Same |
| A2 = A1 + Keep awake, Remote Control, push, Auto mode | 25-30, from the phone | Desk only to open; reachable 8.5-13.8 h | 0 | Same |
| A3 = A2 + the chain (b1; b2 if P1 allows) | About 2-26 [e: child starts 1-6 (1 if the chain carries every wave of 2, 6 if a helper report breaks it before each of 5 waves), successors 0-10, closes 0-10 (0 only once the app's session id maps to the scripts', PILOT-PLAN s4)] | Reachable; a turn every 0.3-4 h [c: 8.5/26; 13.8/(2 to 4)] | About 0 (a continuation replaces a typed turn of the same size) | Same: a continuation comes at R12's quiet point |
| E0 path e2 as COMPLEXITY s5 has it | `approve:`, `cap:`; 1 go opening the Fable coordinator at the reset; 0 during the run | At the desk at the reset; without Remote Control, at the desk for any stop in 5.0-8.4 h | 0 (its polls, 24-50 M [c: 7 fields x 3.4-7.2 M, COMPLEXITY s2], are in its 985 M) | Q1-Q5, F1 (COMPLEXITY s3) |
| E1 = E0 + Keep awake, Remote Control, push, Auto mode | Same | Stops answered from the phone; 0 h at the desk during the run | 0 | Same |
| **E2 = E1 + the go typed before the reset** | The same answers and 1 go, in one sitting before the reset; 0 at the reset and during the run | 0 h at the desk from the sitting on | 0.03-0.06 M an hour of waiting [e: one wake an hour (d2) x a 30-60 K window before orientation] | Same |
| E3 = E1 + `/goal` as the go, typed at or after the reset (before it, the goal would turn instead of waiting) | 1 | As E1 | Judgements 0.3-2.4 M of the small model [e: 2-10 x 0.15-0.24 M]; idle check-ins 0-0.72 M [c: at most 3 x 0.12-0.24 M] | Same |
| E4 = E1 + a one-time local scheduled task opening the coordinator at the reset | 0 at the reset; the task set up by him before | Not reachable by Remote Control unless "Connect new sessions" reaches it (not stated) | 0 | Same, if P3 shows it may start helpers |

**Fewest turns, no check dropped: E2.** One sitting (two answers, four settings, the go), then nothing typed, everything by the
app's own means, no test needed first. E3 adds a restore after restarts but costs a turn at the reset; E4 saves nothing over
E2 and rests on P3. For the plan as it stands: A3 with A2, about 2-26 turns, all from the phone. `/goal` does not fit path a:
its coordinator waits on sessions, not on its own helpers, so the loop stops after turns without tool use (goal.md:126, :153).

## 6. Not known, and the probe for each (each a small test needing his word, r57-0506)

| # | Question | Probe | Cost [e] | Changes |
|---|---|---|---|---|
| P1 | May a session started by a session start a session on its task's turn (b2)? | A typed turn starts a Haiku child whose brief names one Haiku grandchild session writing one line, in a scratch folder with the tier hook | 1-2 M, 10 min | A3 only; the memory note |
| P2 | Is 10 the chain's cap; does one helper report end it? | Read the four other chains of 10 by hand (no run) | 0.3-0.8 M of reading, 10 min | A3's count |
| P3 | May a scheduled task's session start helpers? | A one-time local task (Haiku, Auto mode, scratch folder) starts one Haiku helper and tries one session (expected refused) | 0.5-1.5 M, 10 min | E4 only |
| P4 | After an app restart, does the app resume the coordinator's session (and goal, goal.md:102) and go on without a typed turn? | At a restart he makes anyway: a Haiku session with `/goal` and one 3-minute helper | 0.5-1 M, 10 min | Whether a restart costs a phone turn in E1-E3 |
| P5 | Does Keep computer awake hold while only background helpers work? | A Haiku session's one helper waits 20 min in calls under 150 s while nobody touches the PC; the Windows event log shows any sleep | 0.2-1 M, 25 min | Whether E1's settings suffice or his power plan is needed too |

## 7. Left to do

1. P2's reading; the app version of 2026-11-17.
2. agent-teams.md, channels.md, claude-code-on-the-web.md: fetched, not read in full (agent teams may be one more way).
3. Count helper-report turns between child starts in round 3's transcripts, to replace A3's 2-26 [e] by a count.
4. Whether stopping a field helper ends its readers (TaskStop's text not read).
5. The blind review (`briefs/UNATTENDED-refute.md`).

Tokens: 17.84 M at call 82 (`tools/tokens-self.mjs`); about 18.6 M with this file (one write refused unread, then redone)
and the return; limit 18.6 M. The counter was first read at call 65, not every 10 calls from call 30.
