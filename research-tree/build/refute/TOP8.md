# Blind review of the enforcement built on 2026-11-24 (unit T8-REFUTE, top session 8)

Read: the six briefs, CLAUDE.md, ORCHESTRATION.md section 5, the records the code cites, all seven hook/tool files and
their tests. Findings were formed before reading any `units/*/result.md` or `TOP8-STATE.md`. Self-tests, run once at the
end: window-ceiling 89/89, count-gate 19/19, fanout-gate all passed, owner-report 23/23, journal-watch 12/12,
tools/journal 22/22, record-guard selftest 245/245, plan-gate 37/37. Replays used the hooks' own code (copied functions)
over this project's 30 main transcripts and 459 helper transcripts, read only. Probes ran on copies in temp folders.
One live refusal of my own was logged in `.claude/logs/record-guard.jsonl` by accident (finding N5); nothing else was
written to the repository's logs or journal.

## Breaking

**B1. Window ceiling refuses at a session's or helper's 2nd or 3rd call, then tells a helper to return LIMIT.**
`.claude/hooks/window-ceiling.mjs` lines 147-153 (helper: `hard = A - K*g`, g the mean growth since the first call) and
157-164 (main session: before 17 work calls `g = gAll`, `hard = min(W*+Kg, A - K*g)`). One large early result (a big
Read, parallel reads, a helper's return, or the re-reads after a compaction) makes g tens of K, so `A - 10g` falls
below the context, even below zero. Classes 1 and 5: section 5 sets a helper's checkpoint at 368 K less 10 calls at the
builders' recorded growth of 3.8 K (= 330 K), not at the helper's own running mean.
Reproduction (temp folder, logs away from the repository): a helper transcript with two assistant lines, context 30 K
then 75 K, model claude-opus-5-5, autoCompactWindow 400000; PreToolUse Read with `agent_id` → exit 2, "context 75 K is
past this helper's line of -82 K ... return LIMIT". The same transcript as a main session (30 K, 70 K) → exit 2, line
-32 K. Script: `node research-tree/build/units/T8-REFUTE/b1-probe.mjs <empty temp dir>`; the input is `{"session_id":"11111111-2222-3333-4444-555555555555",
"transcript_path":"<tmp>/proj/s1.jsonl","hook_event_name":"PreToolUse","tool_name":"Read","tool_input":{"file_path":
"<repo>/CLAUDE.md"},"agent_id":"abc123"}` with `WINDOW_CEILING_LOGDIR` and `WINDOW_CEILING_SETTINGS` set.
On history (`node research-tree/build/units/T8-REFUTE/ceiling-replay.mjs <transcript> [helper]`, the hook's own line
functions over a whole transcript): 4 of 459 helpers would have been refused at calls 2-7 (lines 74 K, -59 K, 112 K, 126 K; helpers of sessions
340b6a42, 78d1c9ad, ad4e59df, 6a2a6154); 2 main sessions right after a compaction at 141-160 K (lines -85 K, -9 K,
-36 K), one of them for 11 calls running. A helper that obeys the message returns LIMIT with its work lost.
Smallest fix: use the recorded growth (3.8 K, ORCHESTRATION.md section 5) for `A - K*g` until the session or segment has
ORIENT (17) calls of its own, and never let the hard line fall below the recorded checkpoint form; add a test with a
40 K jump at call 2.

**B2. The fan-out gate and the count gate together refuse a retried wave of more than 10 starts at the app's limit.**
`.claude/hooks/fanout-gate.mjs` lines 204-206 refuse every start whose own message is not yet in the transcript; that
is always so at PreToolUse (seen live: the start of this review was refused once, `fanout-gate.jsonl` t 1795463047311,
and passed 4 s later). The count gate runs in parallel, logs the refused start as `allow`
(`.claude/hooks/count-gate.mjs` lines 170, 243-251, 277) and counts it as pending for 16.7 s: the live log shows the
retry admitted as `"n":1` with no helper running. A wave of k starts retried within 16.7 s counts 2k; with k > 10, or
running + 2k > 20, the retry is refused as "number 21", with the advice "retry after the next finish notice, not by
polling", so the wave waits for a finish although the slots are free. Class 4.
Reproduction: `node research-tree/build/units/T8-REFUTE/b2-probe.mjs <empty temp dir> <repo>`: 12 refused first attempts and 8 admitted retries in the
copied gate's log, then the 9th retry → exit 2, "8 helpers run ... and 12 were just admitted ... number 21".
Smallest fix: in `tailAllows`, keep only the latest allow per session and description (a retry repeats the
description), or drop a pending start once the caller's transcript holds its error result; and in the fan-out gate,
treat a start whose own message is not yet written as being in a later message than any reading whose result is
already in the transcript (or say in its message that one retry is expected).

**B3. The root's hand-over formula is applied to every main session, against section 5.**
`.claude/hooks/window-ceiling.mjs` lines 156-164: any session without `agent_id` gets W* = F + sqrt(2 R g). Section 5
adopts W* for the root only; for builders and refuters it is "not adopted ... a hand-over mid-edit loses the invariant
reasoning", the checkpoint at about 330 K is. Child sessions (start_session, r57-0034 builds) and the owner's own
sessions are main sessions: replayed over this project's main sessions with a start context of 106-129 K, the hard
line falls at 181-232 K. A build child session would be made to hand over mid-edit at about 200 K. Classes 4 and 5.
Reproduction: `node .claude/hooks/window-ceiling.mjs --show <transcript>` on 3f32429e or 53e109f9 (hard 181-182 K).
Smallest fix: W* only for a session a state file names as coordinating ("Session <id>", as the fan-out gate already
finds it); every other session the checkpoint form A - K x 3.8 K.

**B4. Numbers without a record id.** Class 5 (COMMON: a number carries the record id of its measurement).
`count-gate.mjs` lines 56, 59, 62: T_QUIET 10.8 min, REVIVED 1 s, PENDING 16.7 s cite `units/T8-COUNT/result.md`, not
a journal record; lines 63-65 (lock stale 5 s, wait 4 s, log tail 256 KB), `tools/journal-rules.mjs` line 197 (lock stale
60 s) and `journal-watch.mjs` line 22 (3 s, "covers one with room") are typed. Fix: write the three measurements as
measured records and cite them; derive the lock times from the measured hold times or mark them as not method
parameters in the record.

## Non-breaking

- N1. Top session 7 replayed (ad4e59df): notice from 283 K, refusal at 309 K (call 80): it would have stopped 28 K before
  where it ended, but about 50 K above the brief's "about 250 K", because its F (about 185 K) is above r57-0171's 169 K.
- N2. Early notices: 4 of 12 large main sessions get the warning from call 2-3 (warning line negative), same cause as B1.
- N3. Above the line, hand-over paths omit `research-tree/build/refute/`, a run folder outside the repository and
  `library/INDEX.md` (the board, NEXT); `git -C`, `git diff`, and the journal tool's stdin (heredoc) are refused, so
  records must go through a file in the scratchpad or `units/`; the refusal message does not say so.
- N4. Main sessions' lines use the session's own first 17 calls as R; a session started heavy (F 218 K after a
  compaction) gets W* near the compaction line.
- N5. Record guard: any command holding the word "journal" (a file name like journal-watch.test.mjs) refuses a loop
  variable or unset variable as a path (`for t in ... journal.test.mjs; do node $t; done`; `grep ... > "$OUT/x"`), and
  `node -e <code> "$1"` takes "$1" as a script. One retry each; seen live in this review.
- N6. Writes the guard passes and only the watch and commit check catch: a script file that computes the path
  (`["library","journal",...].join("/")`), inline code with a split literal (`'library/jour'+'nal/...'`), base64.
- N7. `node tools/journal.mjs --adopt ... --apply` launders any valid appended lines at any time, not only lines
  written before 2026-11-24 (rewrites and reused ids are still refused).
- N8. Journal watch: a flagged file makes every later shell call run git twice and rewrite the seal until it is fixed.
- N9. Count gate: WIDTHS.md binds every session of the repository, and one malformed line refuses every start in all
  of them; a plan's hold is enforced only if the session copies it there (the 2026-11-23 break needs that copy).
- N10. Fan-out gate: the first line matching "limit <n> K/M/B" is taken, so a prose mention of another limit before
  the token line is mis-read and refused; if get_usage's window label stops reading "all models", every start in
  the repository is refused with "read the meter".
- N11. Owner report: the Stop check asks once in every session, child sessions included (whose last message goes to
  a coordinator), and in a hand-over message that must name the successor's brief; unit names like L2, W3, S2, P0
  can match plain text.
- N12. Speed is fine: window ceiling 100-140 ms on a first read of a 20-30 MB transcript (incremental after), the cap
  scan 290-360 ms over 173 helper transcripts (133 MB), journal watch 76-92 ms (bare node 63 ms).
- N13. `library/.claude/settings.json` has no plan gate (as before today).
