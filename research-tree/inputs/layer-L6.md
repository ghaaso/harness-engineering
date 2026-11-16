# Layer 7: Completeness (version 2)

No method proves a list of failure modes complete. Completeness is always relative to a model, a fault list and a property list (D7-13, D4-05). So this layer claims four things and no more: (1) a stated model of the control structure; (2) two analyses of that model, done blind of each other; (3) an estimate of what remains, used only as a stop signal; (4) feedback from operation that reopens the list. The design is borrowed whole: STPA (Leveson 2011) checked against one FMEA matrix (MIL-STD-1629A rows, with the failure modes of Cristian and Avizienis et al. as columns), capture-recapture between the two (Eick et al. 1992; Chao 1987), a protocol model checked by breadth-first search (Holzmann's method, D7-06), and FRACAS (D4-05e).

## 1. Control structure (amendment 3 plus the frame)

| Controller | Control actions | Feedback it gets |
|---|---|---|
| Owner | O1 approve the go and the question lists; O2 set the cap and margin; O3 answer an escalation, restart after a reboot; O4 allow the snapshot fetcher | the coordinator's chat prose; status and synthesis built by scripts |
| Coordinator | C1 start a child (brief, worktree, epoch); C2 message it; C3 stop it; C4 admit a field; C5 start a watcher; C6 accept and merge; C7 start a checker, refuter or mapper; C8 hand over; C9 amend the protocol; C10 hold its turn open to keep the PC awake | **the harness pushes a 400-character free-text note into its turn**; watcher exits and status.json; script exit codes; the usage meter (only a session can read it, in whole percent); children's window sizes |
| Child | H1 start readers; H2 commit cards; H3 freeze the pack; H4 write the review; H5 ask for a repair or end its turn | reader results (schema-checked); messages; its own files |
| Reader / checker | return a card / return a verdict | search snippets and fetch summaries / a snapshot window chosen by a script |
| Watcher | W1 exit, which wakes its starter; W2 write status | files, transcripts, clock, free memory |
| Scripts (admission, acceptor, quote check, labels, synthesis, token count) | admit or refuse; accept or refuse; label; mark stale; build; count | their declared inputs |
| Harness | X1 refuse a tool call (hooks, permissions); X2 retry a helper whose result does not fit its schema | settings files |

Disturbances, which are not controllers: sleep and reboot, other tenants of the allowance and the memory, and pages that change.

## 2. Unsafe control actions found (N = not given, U = given when unsafe, T = wrong time or order, D = applied too long or stopped too soon)

Covered (the covering mapping is in brackets): C1/U the old attempt is still alive (D1-01 fencing); C1/U a duplicate start after a crash (D1-07); C1/U an auto-loaded input such as an instruction file or memory (D7-04); C3/N a stalled child is not stopped (P9); C3/U a stop on false suspicion after sleep (D1-02, D3-06); C3/D a stop leaves helpers running (D3 orphans; not verified); C4/N a field is never admitted (D3-14); C4/T a barrier waits for a straggler (D1-08); C5/N a turn ends with no live watcher, or C5/U the watcher wakes the old coordinator (D3-07, D7-06); C6/U a merge touches checks or settings (D5-08); C6/U a merge built on stale inputs (D2-07, D7-05); C7/N the post-review check does not run (D4 fail-safe); C9/U a schema changes under running work (D8 schema_version); H1/U a reader's brief carries project data (D5 confinement); H2/U one primary source is counted twice (D8); H3/T a pack is frozen too early or never (P13, D7-07); H4/U a review rests on our own files (D7-02); H5/D a child holds its slot while it waits (D3 hold and wait); checker/U it is steered by the page (D5-10); W2/U progress is measured by a signal that can be gamed (D1-02, D7-07); acceptor/U a bug in the script, or a crash read as a pass (D4 mutation test, fail-safe); synthesis/T it reads an uncommitted attempt (D1-03).

**Not covered by the frame, P1 to P21 or any missing_risks (gaps):**

- G1 O3/T: an escalation or a reboot waits for an absent owner while slots, escrow and the keep-awake are still held. This is hold and wait on an unbounded server.
- G2 O4/U: the snapshot fetcher is itself a web reader with no limits on scheme, size, time or private addresses.
- G3 quote check/U: the fail-safe check cannot read PDFs, cookie walls or paywalls. "Not-run" can flood, so few cards ever become trusted. Fail-safe defaults cost availability.
- G4 C4/U: the cap is a percent of a week that the owner's other sessions share, read only by a session in whole percent, while spend is counted in tokens by a script that may miss helper transcripts. Memory is shared too. This is the noisy-neighbour problem plus a mismatch of units.
- G5 C7/N: the checks run last, so they are the first thing cut when the budget runs short.
- G6 C10/D: each poll that keeps the turn open is a model call at the coordinator's full window.
- G7 reader/U: a reader sees only the fetch tool's summary, so the "quote" it returns can be a paraphrase. An honest card then fails the snapshot check.
- G8 C8/T: the coordinator enforces its own hand-over threshold.
- G9 X2/U: required schema fields plus automatic retries push a helper to invent a missing number.
- G10 X1/N: nobody has shown that hooks fire for helpers.
- G11 assurance/U: a seeded mutant can enter the real store.
- G12 the estimate rests on one mapper's choices of what counts as the same risk.

## 3. Rules

**R1 Blind STPA (pilot).** Runner: a fresh leaf session started by the coordinator from a fixed brief file. It gets the protocol and the list of components. It does not get P1 to P21, any missing_risks or this analysis. It writes control-structure.json and uca.jsonl. Basis: D4-05(a). It runs before the pilot, after the pilot, and on the changed part at each amendment. On failure: check-matrix exits 1 and nothing is admitted. My own pass above read the experts' lists first, so it cannot count as an independent capture.

**R2 One FMEA matrix, blind to R1 (pilot).** Runner: a second fresh leaf session. Rows are the components (D1-13's list plus hooks, the snapshot store and the transcripts), the shared data items (D2-11) and the four trust-boundary flows (D5-13). Component columns: crash, crash with amnesia, omission, timing, wrong value, common cause, fabrication, injected text, agreeing with the brief. Data columns: the Berenson anomalies plus torn write, stale derived data and mutable identity. Flow columns: STRIDE. Each cell holds a hazard id, or "n/a" with a reason. A refuter helper attacks a sample of the n/a cells. Basis: D1-13, D2-11, D5-13, D7-13, D4-05(b).

**R3 Map and gate (pilot).** A mapper helper with a fixed brief and a schema maps every UCA, cell and lens finding to an id in hazards.jsonl and records borderline merges. check-matrix.js passes only when every action has four type entries, every cell is filled, every problem id P1 to P21 appears in some row (a P-id with no row is a gap in the model), and every hazard of high severity is covered or accepted on the owner's word. gate.js binds the result to the protocol's sha256. The admission script (layer 1) refuses every wave unless gate.json says pass for the current protocol hash. A missing gate.json counts as not-run, never as a pass. Basis: D2-11 (an amendment is refused while a cell is empty), D4-05(c).

**R4 The residual is a stop signal (pilot).** estimate.js computes Chapman between the R1 and R2 lists and Chao2 over the lenses, with intervals and a sensitivity range over the borderline merges. If the residual is above the owner's threshold, or cannot be computed (no overlap), the list is "not complete". The coordinator then starts one more blind lens from a field not yet asked, from another provider if F3 allows. The result is never called "complete", only "no sign of incompleteness above the threshold". Basis: D6-04, D8-11. The source check warns that Chapman is biased when n1 + n2 is less than N.

**R5 Protocol model (pilot, execution layer only).** protocol-model.js does a breadth-first search over: coordinator epochs, the owner of each watcher, at most three sessions, child states, and the fault actions crash, sleep, allowance out, loop and owner absent. Invariants: at most three sessions; one accepted coordinator epoch; no replacement writes beside a live predecessor; every watcher exit reaches the active coordinator, or that coordinator reads status on its next wake; no admission without a passing gate. Bounded liveness: every admitted field ends frozen, dropped or parked for the owner within K steps, else an alarm state. Runner: a helper writes it before the pilot, the owner approves the property list, gate.js runs it. A counterexample means the amendment is not adopted and the trace becomes a hazard. Basis: D7-06 through D7-13, and Alpern and Schneider.

**R6 Seams (pilot).** Cross-field question ids, each owned by one field, are written by the coordinator and approved by the owner. The coverage script counts them over the union of all fields, and an uncovered id is listed as not covered. Basis: D8-09, D2-01.

**R7 Incidents and FRACAS (format pilot, fracas.js later).** Every refusal, timeout, restart or not-run that a script produces is appended as a typed line to that script's own incidents file. fracas.js runs after the pilot and after each wave. Unmapped incidents go to the mapper. The escape rate is incidents with no hazard divided by all incidents. A high-severity incident with no hazard stops admission until R1 to R4 are redone. Basis: D4-05(e).

**R8 Fault injection in the pilot.** The coordinator kills one child, lets the PC sleep once, forces one hand-over and runs one hook canary (a helper tries a forbidden write; canary-check.js reads the refusal from the transcript). Each outcome is recorded as an incident. Basis: the D4 risk "untested failover paths". This is shared with layer 5.

**R9 Gaps G1 to G12** go into hazards.jsonl with status "gap". Each gets a rule in its owning layer, or the owner's acceptance, before the pilot (see conflicts).

## 4. Standing procedure

| Trigger | Who | What |
|---|---|---|
| A protocol amendment | the coordinator starts R1 and R2 on the changed part, then the mapper, then gate.js and R5 | admission stays blocked until pass |
| A lens returns (refuter or expert) | mapper, then estimate.js | R4 |
| End of the pilot or of a wave | fracas.js | R7 |
| End of the pilot | full R1 to R4 with the pilot's log | before wave 1 |

The coordinator never fills the tables, because it is the party under analysis (D4-05; this departs from D7-13).

## 5. File formats (schema_version on every file; ids are immutable)

- control-structure.json: `{protocol_sha256, controllers:[{id, actions:[{id, target}], feedback:[{id, from, typed}]}]}`
- uca.jsonl: `{uca_id, action_id, type:N|U|T|D, context, case}`
- fmea.json: `{rows:[{row_id, kind}], cells:[{row_id, col, hazard_ids|null, na_reason|null}]}`
- lenses/<id>.json: `{lens_id, method, blind_to[], model, findings:[{finding_id, title, classical_name}]}`
- canon-map.json: `{brief_sha, entries:[{source_id, hazard_id, borderline, alt_hazard_id}]}`
- hazards.jsonl: `{hazard_id, supersedes, classical_name, statement, severity (judged), covered_by[], status:covered|partial|gap|accepted, owner_quote}`
- incidents/<writer>.jsonl: `{writer, seq, epoch, wall_time (information only), kind, field_id, hazard_id, outcome}`
- estimate.json, gate.json: input hashes, figures, `result: pass|fail|not_run`, reasons.
