# Layer 6: Shape and cost (version 2)

Two borrowed designs, each used only where its assumptions hold. **A B+ tree bulk-loaded at a fill factor** (D2-01, D2-02) governs what must sit in one window together: a field's key range and its pack at review time. **The square-root checkpoint law** (Harris 1913, Young 1974; derived here: D3-01, D2-04) governs what does not: research windows and the coordinator, where every call re-reads the window, so small windows are cheap (SPLIT-RULE-2026-11.md:387-390). Around them sit load control (D3-03), value-over-cost order (D3-14) and a budget from an internal pilot (D6-13, D1-08).

**Tags.** M means measured on the record. E means computed from measured numbers. G means a guess the pilot replaces. Inputs and their sources are in `inputs.json`.

## Terms

- **Key:** an approved question id. **Leaf:** one field. **Root:** the coordinator.
- **t_q:** the research tokens a key costs, helpers included. **κ_q:** the pack tokens a key leaves behind.
- **P:** the fixed prefix of a session. **g:** the tokens a call adds to the window. **S:** the state a successor reloads. **σ:** how much S grows per epoch. **H0:** the fixed tokens of one hand-over.

## Rules

**R1. Key space** (pilot). A key is written `<field>-<group>-<nn>`. Keys sort by field, then mechanism group, then number. Every key has exactly one owning field. A cross-field key sorts under its owner and is listed as a read-only input of the other field (D8-09, Conway). *Runner:* `plan-tree.js`. *On failure:* a key with no owner, two owners or no group stops the plan with exit 3.

**R2. Bulk load at plan time** (pilot, with priors). The coordinator runs `plan-tree.js` once the question lists are approved. It packs in key order, and a mechanism group is never cut. A leaf is full when either **Σt_q ≥ f·A_leaf** (spend) or **Σκ_q ≥ f·C_node** (pack). The tree has two capacities, not one:
- **C_node = W_quality − P − R_rev** (180k under the stated guesses). It is the window budget of the reviewer that must hold the pack.
- **A_leaf = min(the leaf's share of the cap, spend at n_max)**, where n_max comes from R6.

The start is **f = 0.75**. The slack 1 − f pays for the one repair, the contrary-evidence reader, re-checks and redistribution, and f is retuned to the slack the pilot actually used (D2-01). f is a chosen slack, not a theorem: ln 2 holds only for high-order B-trees under random growth (sources-D2, Yao correction).

Leaves start as the lanes, because keys are not independent and expertise does not divide freely (D2-01). The script checks each lane and gives the lower bound on the number of leaves, max(⌈Σt/fA⌉, ⌈Σκ/fC⌉). The separator keys are the first group id of each leaf, and the plan is frozen with its hash.
- A lane over capacity is split before any spend, at a group boundary. After the pilot, the cut follows the boundary with the least source sharing (D8-08). The split goes to the owner as an amendment (exit 4).
- A lane under half of f is reported and is not merged, since a merge makes a new field.

*On failure:* a key with no estimate is not packed, and no wave starts while one exists (exit 3). Before the pilot, all estimates are priors, so only the pilot field runs.

**R3. Fan-out is computed** (pilot). There are three computed numbers.
1. **Leaves L** come from R2.
2. **Root capacity** = ⌊(W*_coord − P − S)/row⌋, about 246 rows. The tree therefore stays at height 2: a root and its leaves. Helpers are tool calls, not nodes. The B+ height and log properties add nothing here (D2-01).
3. **Epochs per leaf** = n_f/k* (D3-12). These are successive windows of one leaf, never extra fields.

*Runner:* `cost.js` and `plan-tree.js`.

**R4. Overflow, in the tree's standard order** (pilot). This replaces "cut the pack to its limit and list the rest as not covered".
- **(a) Check before insert.** Before each group, the child runs `capacity-check.js`. The watcher runs the same check at every poll, so a child that skips it is still caught. The group is allowed only if U + Σ_group t_q·(1+m) ≤ (1−r)·A_leaf and the projected pack is ≤ f·C_node. Here U is spend so far, counted from transcripts, and r is the reserve for a same-window review: zero unless F1 keeps the review in the researching session (D2-02).
- **(b) Out-of-line storage first** (TOAST, for the pack axis). `pack.md` becomes a two-level index: per mechanism, a summary of at most B/m tokens plus card ids. Card bodies stay in `cards.jsonl` and are read by id when needed. **Nothing confirmed is cut.**
- **(c) Redistribution** (B*-tree, for the spend axis). A cross-field key in the remaining range moves to its co-owner if that leaf has slack ≥ est. A plain key never moves, because another field's expertise cannot take it over.
- **(d) Split by key range.** The remaining whole groups become an overflow leaf of the same field. Its separator is the first moved group id. It gets one task-table row, and the old leaf's status gets a one-line forward pointer (the B-link idea, D2-02). It is admitted at the next slot and starts from the first leaf's frozen pack index. The research already paid for is kept.
  - **What a proper split costs:** one session start P, plus the index re-read on each of its calls (n_moved × S_index), plus the moved range's own research. Its smaller window saves about g·n_done per call against continuing.
  - **What the alternatives cost:** the withdrawn rule redid research already spent. A cut costs no tokens but drops confirmed cards from the reviewer's view.
- **(e)** Only the owner drops a range, by name, and it then appears as "not covered" with its reason. A key stopped by budget is marked "not saturated" (D6-12).

*On failure:* a missing estimate or an error in the script counts as an overflow. Insertion stops and the coordinator wakes (exit 10 or 2).

**R5. A roll-over is not a split** (pilot). When a window reaches W* (R6) and the range still fits, a successor of the same leaf continues from committed files with the same key range (copy-on-write, D2-02). *Runner:* the watcher exits "handover" and the coordinator starts the successor.
- If the reload would reach the useful growth of an epoch (S ≥ g·k*), the remaining range splits by R4(d) instead of rolling over again. This is the classical answer to thrashing (Denning; D3 missing risks).
- A leaf predicted to run past **n_max = k*·(g·k* − S0)/σ** calls is split at plan time.

**R6. The hand-over interval** (pilot).

*Derivation.* Within an epoch, call i reads P + S + g·i tokens. After k work calls, the session makes h_c hand-over calls at the full window. The successor then makes o orientation calls and q_f failed calls at P + S, and w tokens are written once.
- Tokens per work call: c(k) = (P+S) + g(k−1)/2 + h_c·g + H0/k, with H0 = (h_c+o+q_f)(P+S) + w.
- Setting dc/dk = 0 gives **k* = √(2H0/g)**, so **W* = P + S + √(2H0·g)**.
- If S grows by σ per epoch, every extra epoch makes the rest of the work re-read σ more, and **k* = √((2H0 + σ·n_rem)/g)**. Re-applied each epoch, this came within 1–3 % of the best interval found by simulation. The law without σ handed over too often: 16 calls against 35.
- For token cost, re-reads weigh 0.05 and a reloaded state is written to the cache at 1.25 (ratios from `pricing.json`, no currency). The cost optimum hands over later: W* of 145k against 115k at g = 2.8k.

*Measured inputs:*
- P = 79k for a session (SPLIT-RULE-2026-11.md:138-139, M) and about 60k for an agent (TOKEN-BOTTLENECK-2026-11.md:44, M).
- g = 2.8k per call (SPLIT-RULE-2026-11.md:609, M).
- o ≈ 2.6 calls (AFTER-COMPACTION-2026-11.md:772-779, E; transferred from compaction to a fresh successor).
- q_f ≈ 0.5 calls (AFTER-COMPACTION-2026-11.md:39, E).

*Guesses:* h_c, w, S, σ, and g for a research child (SPLIT-RULE-2026-11.md:472-475 are guesses too).

*Coordinator:* W* ≈ 133k (E). That is below the 200k line, against 333–396k per call on record (TOKEN-BOTTLENECK-2026-11.md:22). The coordinator becomes **stateless per wave**: its successor reads the protocol and a status file written by script (D2-04, D1-10).

**Handing over stops paying** in three cases:
- n < n_min, which is 16–29 calls under these inputs;
- S ≥ g·k* (split instead);
- W* ≥ W_quality, the owner's 300k ceiling, which then governs.

*Runner:* the watcher computes the window from the transcript at each poll. `cost.js` recomputes W* after the pilot and after each wave. *On failure:* a window past 1.5·W*, or W* < 2·(P+S), stops the session and splits its remaining range (D3-01).

**R7. Working set** (pilot). Anything read once (search results, a whole paper for one number) is read by a helper, which returns the extract (D3-02). *Runner:* the brief, plus a watcher flag on any tool result over a size set by the pilot.

**R8. Concurrency by load control** (pilot).
- A session starts only if freemem − reserve ≥ the peak memory of one session and fewer than 3 are running. If memory falls below the reserve, the newest session stops (D3-03).
- Fields are admitted per free slot, not in waves with a barrier (D1-08).
- After the pilot, the serial fraction s is read from the ledger. If S(3) − S(2) is within noise, the limit is 2 (D3-11; this is a reading of Amdahl's law, not a fit). Parallel children never lower token count.

*Runner:* the launcher check in the watcher (layer 1).

**R9. Order of work** (later). Precedence comes first: the problem sheet, then the pilot (the measurement field) with its single-session control. After that comes Smith's rule, **w_f/est_f** highest first, with w_f doubled for each wave a field was admissible but not run (D3-14). Inside a leaf, groups run in the same w/t order, so a budget cut drops the least value per token. *Runner:* `admit.js`. *On failure:* with no weights, all are equal and the cheapest goes first.

**R10. Budget from the internal pilot.**
- **Pilot:** `unit-costs.js` reads the pilot's transcripts and splits them into costs per unit: session start, reader call, card, check, review, hand-over, and t_q per key (attributed through the group-start lines of R4a) (D6-13).
- **Later:** the estimate is C_f = Σ n_u·c_u, and Var = Σ n_u·s_u² + 0.25·C_f² until two fields are measured. The escrow is e_f = C_f·(1 + max(m_owner, z·√0.25, worst overrun so far)), which is **1.82× the estimate** at z = 1.64.
- A field is admitted only if remaining − open escrows − reserve ≥ e_f (D1-08, D7-12).
- During the run, the watcher exits for re-planning when actual / (estimate over the keys covered) > 1.5 (D2-12). Estimates are updated by exponential averaging after each field (D3-04).
- Only a session can read the meter. The coordinator enters it, and if the transcript count and the meter disagree by more than 20 %, admission stops (D1-08).

**R11. A stated prediction for P18** (pilot). Before the pilot, `cost.js` predicts the single-session control's tokens against the tree's (D3-12). The tree is reported as two numbers: speed-up in time, and work ratio in tokens (D3-11). If the prediction is off by more than 2×, the cost model is wrong and no fan-out choice rests on it.

## File formats

- `tree-plan.json`, frozen with its sha256:
  `{hash, f, C_node, A_leaf, leaves:[{leaf, field, groups:[id], separator, est_t, est_k, status}], unpacked:[id], amendments:[...]}`.
- `overflow/<leaf>-<group>.json`:
  `{leaf, group, keys:[id], U, est, axis:"spend"|"pack", reason, action:null|"toast"|"redistribute:<leaf>"|"split:<newleaf>"|"dropped-by-owner"}`.
- `unit-costs.json`:
  `{roles:{coord|child|helper:{P,g,S,sigma,hc,o,qf}}, units:{name:{mean,sd,n}}, t_q:{id:{t,k}}, s, rss_mb, tokens_per_meter_point}`.
- `admission-<n>.json`:
  `{remaining, open_escrows:{f:e}, admitted:[f], refused:[{f,reason}], order:[{f,priority}]}`.

All four are written only by scripts.
