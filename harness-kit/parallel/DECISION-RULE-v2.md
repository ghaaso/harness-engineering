# The decision rule, version 2 (decided 2026-11-19)

**Status: decided by the top session (task r57-0515); still a hypothesis.** Nothing in it was run, measured or tuned
here. No number is set; each is a measurement (section 4). Version 1 (`B:DECISION-RULE.md`; records r57-0406, r57-0408,
r57-0409) is replaced by this file and the records r57-0414 to r57-0416. The owner's page is `decision-rule-v2.html`
beside this file. `B:` = `docs/program/evidence/bottleneck-2026-11-18/`, `R:` = this folder.

**What version 2 is.** The draft `R:RULE-V2-DRAFT.md` as folded (145 statements: 86 confirmed, 53 held in part and
narrowed, 1 refuted and replaced, 5 not checked by the refuter), with the five decisions of section 2. Where this file
says nothing, the draft's wording stands, with its marks and verdicts. The draft is a record and was not edited.

## 1. How it was decided

1. The top session read the draft in full (`R:RULE-V2-DRAFT.md`, 703 lines), version 1's three records, and the 31
   adjudications r57-0810 to r57-0840. Those adjudications were decided **after** the draft was written (commit
   2b5d50dd wrote the draft, af910111 the adjudications), so the draft does not carry them. Three bear on the rule:
   r57-0813 (pacing), r57-0814 (fit and summed prices), r57-0838 (worktrees against one agent).
2. It checked the draft's positions K1 to K20 for a conflict between two parts of the rule that both apply at once.
   One was found (decision 2).
3. It searched the four lane reports for every item of V2-108 to V2-112 (the "not found" and "needs a sign-in" lists,
   which the refuter could not check): all 29 searched items stand in their reports (decision 4).
4. It took the positions below from records and quoted sources only. No design question went to the owner
   (r57-0001); the rule is shown by how each conclusion was reached (r57-0027).

## 2. Five decisions beyond the draft

### Decision 1. A token window is paced only to protect later demand (changes the draft's Step 1, rows 4-5, K1)

- **The draft.** From the moment a window's used share runs ahead of its time share (u > s), starts are capped at
  (1 − u)/(1 − s) of the even rate (re-planning, Yahoo's form; V2-004, V2-005 held in part).
- **The record against it.** r57-0813 (adjudicated after the draft): the published pacing gains come from spreading
  spend over a day; with equal value per token, spending at once finishes the same units sooner. Bid-price control
  (Talluri and van Ryzin, a1-0312, a1-0313, quoted): a request is accepted only if its value exceeds the summed bid
  prices of what it uses, and a bid price is the value the capacity would earn from later demand. Re-planning to the
  even rate is that rule under one assumption: later demand arrives evenly over the window and is worth as much as
  present demand, which holds for ad impressions over a day.
- **What arrives later in our windows.** The queued units are known now; they do not arrive later. What arrives later
  is the owner's own use of the same windows (all clients count, V2-013) and work he orders after the window opened.
  When the weekly window ran out on 2026-11-16 his work stopped for about 12 hours (x08-0140, from our own notes).
- **Position.** Per window: keep the reserve for running units (V2-008). Protect the expected later demand until the
  reset. If the queued units' expected usage fits in what is left after both, the window's price is zero and units
  start as fast as the other widths allow. If not, the price is the bid price (the value per token of the last unit
  that still fits) and units go in value-per-token order (V2-017). Until later demand is measured (Q37, new), the
  draft's re-planning rule is its stand-in, since it protects later use spread evenly over the window.
- **Why the stand-in, and not "spend at once".** Under the ruled objective (r57-0003, quality first) a stopped owner is
  the costlier error, and re-planning limits nothing while demand stays under the even rate. Once Q37 exists the
  stand-in goes: a round bigger than the window's even share then runs at full speed whenever the owner's later use
  fits beside it.
- **Mark.** Bid-price control `proven in the literature` for revenue management (analytic; asymptotically optimal at
  large volume, not at tens of units: r57-0413); its use for our windows `hypothesis`; the stand-in `hypothesis`.
- **Behaviour today.** The same as the draft until Q37; the change is what Q37 unlocks.

### Decision 2. Value order and the reservation, composed (changes the draft's Step 4 items 2-3, row 9)

- **The conflict.** Step 4 item 2: while a window limits, the highest value per token first. Item 3: where a unit needs
  a share of something not free (a window among them), a reservation for the oldest unit that does not fit. When a
  window limits, both apply and name different units first.
- **Position, from the definition of the reservation.** A reservation is the earliest time the held unit fits (EASY,
  a1-0406). For a window that resets in full (V2-013), that time is the window's reset. Units spent in this window do
  not delay a start at the reset, so the two do not compete: inside a short window, value per token orders the starts
  above the price; the oldest unit held back for that window is the first to start at its reset; for the nested
  windows, the reset of the window it does not fit. Where a unit waits for memory or the check, which units give back
  when they end, the reservation stays as drafted (V2-018).
- **Mark.** `hypothesis` on quoted forms (EASY's reservation; the provider's full reset, pages fetched 2026-11-19).

### Decision 3. The floor's evidence, corrected (changes V2-058 in Step 8 "The floor", row 22)

- **The draft.** Own worktrees led instruction-only separation by 3 points in CAID and scored below one agent in
  STORM's rerun.
- **The record.** r57-0838: CAID put own worktrees above one agent (w1-0356, quoted): 59.1 against 53.1 % on
  Commit0-Lite, at 1,583.2 s against 692.6 s and a cost of 8.1 against 1.9 as the paper counts it; STORM's rerun of
  the method (another model, 4 engineers) gave 63.8 against 66.4 % for one agent. One run per arm in both.
- **Position.** The floor stays (own copies; every landing through the check in one order, with undo). It is a safety
  floor, which keeps one session's half-done edit out of another's check, and not a claim that copies beat one agent:
  the two preprints point opposite ways on quality, and the one with figures paid about 2.3 times the time and 4.3
  times the cost for its gain. Running side by side at all is the owner's ruling (r57-0006); what it costs is a count
  (Q01, Q02).
- **Mark.** `proven in the literature` for engines and one mainline (self-reported); the two agent figures preprints,
  one run each; `hypothesis` for our sessions.

### Decision 4. The five unchecked statements (V2-108 to V2-112)

- Searched by name in the lane reports, 29 items, and every one stands there: c1 8 of 8 (the TSE and ICSME papers, the shifting bottleneck,
  Duclos, Reiser, drum-buffer-rope, affected build targets, splitting a suite), w1 7 of 7 (Adya, Cahill, Fekete,
  IntelliMerge, Korth, Agrawal's fake restart, semantic-conflict rate), t1 8 of 8 (Sagiv, Johnson and Shasha, Lanin,
  Bayer and Schkolnick, Yao 1978, Baeza-Yates, Graefe 2011, half-split), a1 6 of 6 (Balseiro, SIGMETRICS, Mu'alem,
  Kolisch, I.371, carry-over).
- Not checked: the lists' other items, and whether each "not found" names what was searched. These statements are about sources, not about the
  rule's behaviour; no decision rests on them. Marked "items present in the reports; search terms not checked".

### Decision 5. The second stop takes one form with checkpoints and the tree's hand-over (Step 3, row 3, K6)

- **The draft.** A unit that reaches its own cap is stopped; its form, commit and end, has no source (V2-003 held in
  part).
- **Position.** Commit-and-end is the checkpoint of Step 8 part 5 taken at the cap, followed by the end of the session;
  its successor resumes from that checkpoint, as the tree's hand-over at the window does (R50 in the tree's design,
  deferred and never built). One mechanism then serves three places of the rule (the stop at the cap, a refusal under
  version checks, a leaf that outgrows its window), and what a stop loses is the work since the last checkpoint plus
  the successor's reload (Q02, Q30).
- **Mark.** Designed only, in our own record; no literature source; untested.

### Agreeing with the record, no change

- r57-0814: fit in every limit and summed prices are published for limits of one kind; joining a used-up allowance with
  widths that are given back stays reasoning. The draft says the same (V2-001, V2-010).
- K1 to K20 otherwise stand as the draft's section 3 states them: six points open with the measurement that settles
  each (K9, K10, K15, K16, K17, K20), and K7's order for one-worker units (Q34).

## 3. The rule in one page (version 2 as decided)

- **Step 0.** Per class of unit keep busy threads, peak memory, time in and outside the check, and window usage;
  predict length and usage as the mean of the last two units of its class and model, raised to the cap on overrun; the
  cap is a limit, never the prediction.
- **Step 1, the widths.** Memory (the hard limit), processor, bandwidth, ready work, as version 1. The check: it binds
  when N·S/c reaches a worker's cycle, S + Z if it waits, Z if it goes on. Each token window: reserve for running
  units, protected later demand (decision 1), price zero while the queue fits, else the bid price. The parent's window:
  children per epoch b ≤ (g·k* − own growth)/s_summary.
- **Step 2.** Run at the smallest width; a unit starts only if it fits in every window it draws on.
- **Step 3.** Act only at the gate; also show the budget in the prompt. Two stops: the memory floor, and a unit at its
  own cap (decision 5).
- **Step 4, the next unit.** Fit is a filter. Inside a short window: value per token above the price, the oldest held
  unit first at the reset (decision 2). Waiting for memory or the check: a reservation for the oldest, shorter units
  backfilled only if they do not delay it. Units that need only a worker: version 1's order (shortest expected check
  first, then oldest, with an age cap) until Q34. The model: value minus summed price × usage, a redo counted; the
  better model until Q16. A speculative copy only when the time saved is worth its tokens.
- **Steps 5 and 6.** A standing queue at the check is the signal; throughput against workers is the slow outer check
  (at least six points).
- **Step 7, the check's levers, in no order until Q21, Q05 and Q07:** shorten the run, batch what waits (capped by p),
  test ahead on the success path, let a waiting worker go on, make the queue visible.
- **Step 8, several writers.** The floor (decision 3); a fixed order only for what a plan declares; then, ranked:
  reshape shared places, version-checked writes, claims below the file, wait for a known hot pair per pair,
  checkpoints, every landing through the check, structured merge last. No default owner; a whole-file CRDT neither
  used nor ruled out (Q36).
- **Step 9, the tree.** Its kind by L against b and R against 1/f; f = 1/q_{1−p}(R); split or hand-over open (Q30);
  fewer parent wakes first; run-state files written by a script step.

## 4. Measurements

The draft's Q01 to Q36 (its section 5) stand, with one added:

| Q | Measurement | Sets | Kind | Until it exists |
|---|---|---|---|---|
| Q37 | Later demand per window: the usage that arrived after each window opened from the owner's own sessions and from work he ordered later, by time left to the reset; Claude Code sessions from transcript times and token counts, use from claude.ai or Desktop from meter readings (Q10) | The protected part of each window and so whether a window's price is zero (decision 1) | count over transcripts, with readings | Re-planning at (1 − u)/(1 − s) as the stand-in |

Order (r57-0515, r57-0028): counts over files that exist first (Q01, Q02, Q05, Q06, Q07, Q09, Q37's transcript
part), then simulations swept over project sizes (Q08, Q33 to Q35), then runs, each with the owner's word (rule 3).

## 5. Library

r57-0841 records this decision; r57-0414 (the frame and the windows), r57-0415 (several writers) and r57-0416 (the next
unit) supersede r57-0408, r57-0406 and r57-0409; r57-0516 supersedes r57-0513 as the measurement task; r57-0710 points
here and to the page.
