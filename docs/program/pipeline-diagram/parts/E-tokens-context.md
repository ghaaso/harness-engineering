## Where the tokens go
Measured over 14.6k (FixFlow) + 21.2k (Clinic) = 35.8k API calls, 7.35 B context tokens (TOKEN-BOTTLENECK).
- Usage = calls x window size. 96.8% of context tokens are cache reads (re-reads of a window already there); output is 0.75% (55.4 M; 45% of it thinking).
- Window content (share of all context tokens, both/FixFlow/Clinic): fixed prefix re-read every call 27/47/19%; model's own earlier output carried forward 26/15/31% (Clinic: thinking 12, echoed commands 9, written file contents 8); fetched content from reads/searches 26/23/27%; compaction summaries re-read 8/2/11%; other 13/13/12%.
- Calls carrying most: main session averages 396k (FixFlow) / 333k (Clinic) per call; agents 113-156k. Main session holds 22% (FixFlow) / 74% (Clinic) of tokens. Calls past 200k hold 39% / 74% of cache-read tokens; past 400k 15% / 37%. Read-only/search calls = 64% of calls, 55% of tokens (FixFlow); 52%, 41% (Clinic). FixFlow: 1,118 agent windows of ~12 calls; 56% of each agent's tokens = fixed prefix (~60k, ~50k of it tool/connector schemas). Compactions in main sessions: 9 and 48.
- Ranked levers: (1) cap orchestrator window at 150-200k, one phase per session, earlier compaction; (2) strip subagent prefix (~60k/agent, 27% of all tokens, 47% of FixFlow's): deferred tool schemas, fewer connectors, no skills in agent sessions; (3) fewer steps: batch two lookups in one command, removes ~1/3 of calls and re-reads (58% of calls only read/search); (4) stop carrying own output: write big files via script, compact after write-heavy phase (31% of Clinic).
- Not the bottleneck: model mix (Opus 65% of calls / 52% tokens; routing changes rate, not count); file reads (only 0.5-1.5% of a window is re-fetched inside the same window, a session read cache saves almost nothing); any one file (<=1.5%); human prompts (~162 calls each).
- Caveats: how cache reads count against the 5-hour limit is unknown; window-content split is estimated, 5-8% unclassified.
- Split replay (SPLIT-RULE, 97 session windows, 22,962 calls, 7.49 B tokens): session windows hold 52.1% of context tokens; a window grows 2.8k tokens/call; share of session cache-read tokens in calls past 300/400/500k = 65.1/44.6/36.8%; calls past line 42.6/22.9/17.2%. First call of a main session reads 75-88k (median 79k), an agent 51-67k. Agent windows barely reach the lines.
- After-compaction (116 hand-overs, 30 calls before vs after): mistakes 0.58 -> 1.35 per 100 calls; state-changing calls 24.0% -> 15.4%; read calls 4.8% -> 9.8%.

## Parts
Cap on orchestrator window (lever 1) | keep the coordinating session's window small so each call re-reads less | in: window fill | out: earlier compaction / one phase per session | when: while working | status: designed only (replay measured exposure; no live use) | src: TOKEN-BOTTLENECK Levers
Strip subagent prefix (lever 2) | make helper sessions start with a much smaller fixed start | in: agent session config | out: ~60k fewer tokens per agent window | when: at session start | status: designed only (this repo's settings already switch FixFlow skills off per CLAUDE.md; effect not measured here) | src: TOKEN-BOTTLENECK lever 2
Deferred tool schemas / fewer connectors / no skills in agent sessions | load tool definitions only when needed so the prefix shrinks | in: tool list | out: smaller prefix | when: at session start | status: idea only | src: TOKEN-BOTTLENECK lever 2
Batching lookups (lever 3) | run two read/search lookups in one command so the window is re-read once | in: planned reads | out: ~1/3 fewer calls | when: while working | status: idea only | src: TOKEN-BOTTLENECK lever 3
Write large files through a script (lever 4a) | avoid inline big file contents so the model's own output does not pile up | in: file to write | out: smaller carried output | when: while working | status: idea only | src: TOKEN-BOTTLENECK lever 4
Compact after a write-heavy phase (lever 4b) | summarise right after a phase that filled the window with the model's own output | in: window | out: summary | when: when window fills / phase ends | status: idea only | src: TOKEN-BOTTLENECK lever 4
Model routing | pick the model by job kind (changes rate per token, not token count) | in: job | out: model | when: at session start | status: built (tier hook per CLAUDE.md); measured as not the bottleneck | src: TOKEN-BOTTLENECK Not the bottleneck
Session-local read cache | remember files already read inside a session | in: reads | out: saved re-reads | when: while working | status: tested, no gain (saves almost nothing) | src: TOKEN-BOTTLENECK Not the bottleneck
Node (session) | one Claude Code session with its own window; subagents are tool calls of it, not nodes | in: brief | out: work/report | when: all | status: designed only | src: SPLIT-RULE 1.1
Scope | a named, separate part of the work with its own durable home (lane, phase, file set, question); the key space | in: work list | out: unit given to a leaf | when: at split | status: designed only | src: SPLIT-RULE 1.1, 1.4
Leaf session | session that does the work of one scope | in: brief | out: work, report file, key-row update | when: while working | status: designed only | src: SPLIT-RULE 1.1
Inner session / root | session that holds routing facts and gates results, does no scope work; root is the one the owner talks to | in: key table, children's reports | out: routing, starts children, closes old sessions | when: while working | status: designed only | src: SPLIT-RULE 1.1, 1.6
Fill gauge (`fill`) | a script that prints how full the session's window is, the line, the ceiling, and one of three states | in: session id, latest call's usage | out: carry on / due / past ceiling | when: at every step boundary | status: built (stage of replay.js.txt, dry run only) | src: SPLIT-RULE 1.3, 6.3
Split line | share of window (300k = 30% of 1M chosen) past which a session must hand over; set per model | in: fill | out: "due" | when: while working | status: approved for one trial (300k) | src: SPLIT-RULE 1.2, Part 5, 6.1
Floor under the line | line in tokens must be >= 3x a new session's measured start | in: measured start | out: valid line | when: design time | status: designed only (factor is a guess) | src: SPLIT-RULE 1.2
Due-session procedure | seven steps: stop intake, drain, make state durable, write briefs and key rows, parent starts children, child checks brief, parent closes old session | in: due session | out: new sessions | when: at hand-over | status: designed only | src: SPLIT-RULE 1.8
Split by scope | replace a due session by two fresh leaves, one per file-disjoint group of open scopes, balanced on open load | in: open items | out: two briefs | when: at the line | status: approved for one trial | src: SPLIT-RULE 1.3, 1.4
Cut at a checkpoint | split one scope into two parts that share no files | in: one open scope | out: two leaves | when: at the line | status: designed only | src: SPLIT-RULE 1.3
Roll-over | one fresh session continues from state on disk when scope cannot be cut (or an inner session filled with traffic) | in: state on disk | out: successor | when: at the line | status: designed only | src: SPLIT-RULE 1.3
Close without successor | no open work: report and close | when: at the line | status: designed only | src: SPLIT-RULE 1.3
Hard ceiling | line + 10 points of window [guess]; session stops and writes only its keys | in: fill | out: forced key write | when: after the line | status: designed only | src: SPLIT-RULE 1.3
Compaction as backstop | automatic compaction trigger set above the ceiling; if it fires the rule failed and is logged | in: window | out: summary + rule-failure log | when: when window fills | status: designed only; needs Opus setting >= ~433k | src: SPLIT-RULE 1.3, 6.2
Brief | one-page start document for a child: scope, pointers to durable state, open items with next step, binding decisions by id, done condition and where to report | in: durable state | out: child's start | when: at hand-over | status: approved for one trial (not yet run) | src: SPLIT-RULE 1.5
Point, do not assert | anything the repository can show goes as a pointer; brief asserts only intent, next step, why a path was dropped | in: facts | out: pointers | when: at hand-over | status: designed only | src: SPLIT-RULE 1.5
Child does not inherit list | parent's conversation, read files, own output, tool results, finished scopes, siblings' scope, any summary stay out of the new window (settles TOK-44) | out: smaller new window | when: at session start | status: designed only | src: SPLIT-RULE 1.5
Fixed start of a child | system prompt, tool schemas, CLAUDE.md, skills, memory index (measured median 79k) | when: at session start | status: built (harness) | src: SPLIT-RULE 1.5
Key table / key row | repository file, one row per scope: id, owner, state, result pointer, verdict, blocked-on; the inner session's whole state; child writes only its own row | in: events | out: lets any inner session be replaced from disk | when: while working / at hand-over | status: designed only (machine form "manifest" used by trial script) | src: SPLIT-RULE 1.6, 6.3
"Taken" acknowledgement | child writes "taken" in its row after checking the brief; ownership moves then | when: at hand-over | status: designed only | src: SPLIT-RULE 1.8
One owner per scope | parent, not the due leaf, starts children so the tree does not deepen | status: designed only | src: SPLIT-RULE 1.8
Crash restart path | parent restarts only children whose row has a brief and no "taken" | status: designed only | src: SPLIT-RULE 1.8
Messages for a closed session routed by parent from key table | status: designed only | src: SPLIT-RULE 1.8
Capped hand-back | child's report beyond ~2,500 characters is not a key (TOK-03) | status: not stated whether built | src: SPLIT-RULE 1.6
Root hand-over by owner | owner opens each new root; old root writes key table + pointer and closes after "taken" | status: designed only | src: SPLIT-RULE 1.6
Merge | two small sibling leaves (<=2 open items each) merge, in place (fill under half the line) or by a fresh session | in: open load | out: one leaf | when: while working | status: designed only (not in replay) | src: SPLIT-RULE 1.7
Wrong-split merge | siblings needing each other's files or >3 messages per item are one scope | status: designed only | src: SPLIT-RULE 1.7
Remove one-child inner session | status: designed only | src: SPLIT-RULE 1.7, 1.9
Borrowing between siblings | move one item to a sibling with room | status: dropped (not in the rule) | src: SPLIT-RULE 1.7
Fan-out cap (3 running children) and depth cap (3 levels) | limit tree shape; depth grows only at root; a split past a cap makes parent divide its key range, or roll over and tell owner | status: designed only (replay applies neither) | src: SPLIT-RULE 1.9
Subagents are not levels | a subagent at the line returns what it has; its caller starts a fresh one | status: designed only | src: SPLIT-RULE 1.9
Traffic goes around inner sessions | results go via repository / key row, not through root's window | status: designed only | src: SPLIT-RULE 1.9
Split by time / tokens / function / hashing / fork | alternative divisions | status: dropped (reasons given) | src: SPLIT-RULE 1.4
Three-way division | divide in three at a hand-over | status: idea only (replayed only) | src: SPLIT-RULE 1.4, 3.3
Earlier compaction window (arm B) | compact at the same token count as the line (window 333k) as the comparison method | in: window | out: harness summary + kept tail | when: when window fills | status: designed only (replay; trial arm B) | src: SPLIT-RULE 2.3, 6.2
Compaction (harness) | harness replaces old history with a summary when window fills (default at window minus 33k; Opus compacts ~367k) | in: window | out: summary; window restarts ~105k | when: when window fills | status: built (harness) and measured | src: SPLIT-RULE 1.2, 3.1
Compaction summary | model-written text of older history; ends with a line saying it did not see the kept messages | status: built, measured (0 wrong of 2,727 recheckable claims; 74 of 117 behind kept tail) | src: SUMMARY-CHECK 2.3, 2.7
Kept tail | last messages kept word for word after the summary; summary does not cover them | status: built (harness) | src: SUMMARY-CHECK 1.2, 2.3
Git status in next window | fresh git status given with the hand-over | status: built (harness) | src: SUMMARY-CHECK 1.2
Prepared-ahead summary | harness writes summary while session idle (median 65 min before), applies it at next message; all 18 on record were behind | status: built (harness) | src: SUMMARY-CHECK 2.2
Opus compaction setting (autoCompactWindow 400,000) | owner's setting making Opus compact ~367k | status: built; must go to >=433k for arm A; arm B needs 333k; whether two sessions can differ not traced | src: SPLIT-RULE 1.2, 6.2
Replay (no model calls) | counts where recorded windows pass a line and simulates split vs earlier compaction | status: built and measured | src: SPLIT-RULE Part 3
Pointers check (`pointers`) | script rechecks path, line, commit, PR number and PR state in a hand-over against the repo at that time | in: hand-over doc | out: counts flagged | when: at hand-over | status: built, tested; floor check only (16 of 1,265 flagged in 61 summaries, at most 14 truly) | src: SPLIT-RULE 6.3
Trial measure (`trial`) | reads sessions named in the manifest; prints first call, context at call 20, fill, hand-overs, rule failures | status: built, dry run | src: SPLIT-RULE 6.3
Reader's check of latest state (main fidelity measure) | an agent reads each hand-over's statements of where work stood and its open loops against the last 30 turns, marks right/wrong/overtaken/cannot tell and carried/dropped | status: designed; prompt frozen; no agent run yet (waits on D07) | src: SPLIT-RULE 6.4, 6.7
Reader extract / list / tally / cost stages | scripts that prepare, sample, combine and cost the readings | status: built | src: SPLIT-RULE 6.7
Trial wave at 300k | one live wave under the rule vs a matched wave under earlier compaction window | status: approved for one trial (not run) | src: SPLIT-RULE Part 5, 6
Rule-failure log | counts automatic compaction, session past ceiling, session over line with no successor | status: designed (trial measure counts them) | src: SPLIT-RULE 6.3
Summary-check script (check.js.txt) | pulls 7 kinds of claim (commit id, head, PR state, test result, path, count, merged-as) from summaries and rechecks them | status: built; all 84 flags were its own errors, so hand read decides | src: SUMMARY-CHECK 1.4-1.6, 2.5
Repeat check | did the next window redo what the kept tail did (0 of 117) | status: built and measured | src: SUMMARY-CHECK 1.10, 2.8
After-compaction counter (after.js.txt) | counts error results, repeats, re-reads in 30 calls before vs after compaction, plus placebo points | status: built and measured | src: AFTER-COMPACTION 1
Facts in the project instruction file | put PC facts (no python on PATH; long commands are cut so use a file; wait tool not sleep) where every window reads them | status: idea only (nearer step, not run) | src: AFTER-COMPACTION 3.7(6)
Count of what a summary leaves out / dropped open loops | list open items before and after a boundary | status: not built (baseline waits on owner's go, D07) | src: SUMMARY-CHECK 3.5, SPLIT-RULE 6.7
Check whether a stale pending item reaches the next window's plan | status: not checked | src: SUMMARY-CHECK 3.4

## Flow
1. Session starts with fixed prefix (system prompt, tool schemas, CLAUDE.md; ~79k main, ~60k agent) plus a brief (rule) or a prompt.
2. Each call re-reads the whole window; window grows ~2.8k tokens/call with prefix, own output and fetched content.
3. At every step boundary the fill gauge compares context to the line (300k) and ceiling (line + 10 points).
4. Under line: carry on. Over line: session is due: takes no new item, drains subagents/commands, commits work, updates board/PR.
5. Picks hand-over: two+ scopes -> split; one cuttable scope -> split at checkpoint; uncuttable -> roll-over; no work -> close. If a cap would be passed: parent divides its key range, or roll over and tell owner.
6. Writes two briefs and key rows, commits. Parent (not the due session) starts children; the owner opens any new root.
7. Each child checks its brief against the repo, writes "taken"; parent closes old session. Pointers check runs as a floor check.
8. If hand-over not written by hard ceiling: only keys are written. If automatic compaction fires: logged as rule failure.
9. Baseline today (arm B): at the line the harness compacts; summary (written without the kept tail) + kept tail verbatim + git status go to next window, which restarts ~105k. Prepared-ahead variant while idle.
10. After compaction: first ~30 calls show more mistakes (1.35 vs 0.58/100), more reads, fewer state changes; fades over ~150 calls.
11. Small siblings merge when open load is low; finished leaves close; one-child inners removed.
12. Trial scoring: reader's check of latest state and open loops, tokens, rule failures, owner's root hand-overs.

## Loops
- Fill gauge (context / window) -> triggers hand-over over the line.
- Open load of siblings -> triggers merge.
- Sibling message count / file overlap -> merge as wrong split.
- Live children vs fan-out cap -> parent splits its key range.
- Rule-failure log (compaction fired, no successor) -> marks rule failed.
- Trial measure (first call, call-20 reading, drain calls) -> replaces replay guesses; N1/N2 re-read.
- Pointers check flags -> floor check on every hand-over.
- Reader run: measured tokens vs estimate -> stop for owner if >1.5x upper figure.
- Proposed: re-run after-compaction counter on later transcripts after PC facts go into the instruction file.

## Jargon
- Context window: all text the model reads on one call.
- Cache read: re-reading already-processed window text at a cheap rate.
- Fixed prefix: start text re-read every call: system prompt, tools, CLAUDE.md.
- Fill: tokens read in a call divided by window size.
- Split line: fill share at which a session must hand over.
- Hard ceiling: ten window-points above the line; last allowed fill.
- Compaction: harness replaces old history with a model-written summary.
- Kept tail: last messages kept verbatim beside the summary.
- Brief: one-page start document for a new session.
- Key table: repository file, one row per scope, holds routing state.
- Leaf / inner session: worker session / routing session.
- Roll-over: one fresh session continues from files on disk.
- Fan-out cap: most running children one session may have.
- Overtaken in kept tail: summary says pending; kept tail shows it done.
- Placebo: same count at points that are not compactions.
- Drain: letting running agents/commands finish before hand-over.
- Prepared ahead: summary written during idle, applied later.
- Hand-over: what the next window receives.

## Unclear
- Prefix size: ~60k per agent (token report), TK-PREFIX ~70k, measured first call 51-67k agents, 75-88k main.
- All four models show a 1M window, so "per model" lines are really per compaction setting; Opus's window is the weakest evidence.
- Opus setting needs >=433k for arm A yet arm B needs 333k; whether concurrent sessions can hold different values was not traced.
- Rule vs earlier compaction on tokens: 1.05-1.06 in middle case, 0.53-1.24 across cases; record does not settle it.
- Summary check: 0 wrong claims vs 63.2% behind kept tail; which count scores the trial is the owner's call (undecided).
- Whether the next window acted on a stale pending item is not checked.
- Capped hand-back (TOK-03, ~2,500 chars) is cited [S]; not said to be built.
- A brief is predicted to lose less than a summary; nothing can show it before the trial.
- After-compaction: placebo behaved like a slope; one reader; the loss (PC facts) is not what the split rule targets and a new session loses it too.
- Whether judgement falls with window share or absolute tokens: unmeasured (TK-FILL).
- Compile page 7 text contradicts the rule ("root stays small"); correction listed, not stated as applied.
- Inner-session cost is not charged in the replay.
