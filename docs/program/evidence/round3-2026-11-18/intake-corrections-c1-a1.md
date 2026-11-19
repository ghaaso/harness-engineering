# Intake corrections: lanes c1 (a shared serial check) and a1 (a refilling token allowance, a few long units)

Step 2 of the intake (`R:intake-state.md`), written 2026-11-19 by an Opus `analyse` child. `R:` =
`docs/program/evidence/round3-2026-11-18/`, `E:` = `docs/program/evidence/harness-method-status-2026-11-18/`,
`Q:` = `docs/program/evidence/bottleneck-2026-11-18/`, `PC:` = `R:papers/check/`, `PB:` = `R:papers/budget/`.
Read: `library/README.md`, `library/journal/2026-11-19/c1.jsonl` and `a1.jsonl`, the extractor files x30-x34, x43,
x44-x48, the 23 target records, and the place each piece of evidence cites. No journal file was edited. These are
recommendations; the top session decides and writes the adjudications.

## The answer

| Lane | Open records | Proposed corrections | Open tasks | Right | Right in part | Wrong |
|---|---|---|---|---|---|---|
| c1 (`c1.jsonl`) | 16 | 15 (c1-0500 to c1-0514) | 1 (c1-0515) | 14 | 1 (c1-0503) | 0 |
| a1 (`a1.jsonl`) | 19 | 8 (a1-0511 to a1-0518) | 11 (a1-0500 to a1-0510) | 4 | 4 (a1-0511, a1-0514, a1-0515, a1-0518) | 0 |
| extractor files x30-x34, x43, x44-x48 | 0 | 0 | 0 | | | |

Command: `grep -c '"kind":"open"'` on each of the 13 files (c1 16, a1 19, every x file 0).

What to know before writing:

- **Ids are tentative.** The w1-t1 packet (`R:intake-corrections-w1-t1.md`) already uses r57-0310 to r57-0314 and
  r57-0410, r57-0411, so this packet starts at results r57-0315, hypotheses r57-0412, open r57-0514, mistakes
  r57-0611, pointers r57-0708 (last r57 ids on 2026-11-19: 0150, 0210, 0309, 0409, 0513, 0610, 0707, 0809). Check
  again at write time.
- **Fewer records than rows.** Four pairs of proposals target two records that say the same thing; one replacement
  supersedes both: x15-0405 and x15-0406 (rows 2, 3), x06-0333 and x15-0353 (rows 7, 8), x06-0354 and x06-0511
  (rows 12, 13). 23 rows give 20 replacement records. The full text is repeated in each row of a pair, marked
  "write once".
- Each accepted row also needs an adjudication (r57-08xx) that names the proposal in `see` (README rule 3).
- Slips found while checking, none of which changes a mark: c1-0500 says BUILD-IN.md line 110 carries "reasoned";
  it reads "case B hyp (C147)". c1-0510 left the 81 % unchecked; it stands in the same paper's abstract
  (`PC:beheshtian2021/paper.txt` lines 43-45, 155-158). a1-0518 says Dolly copies only the tail; Dolly clones every
  task of small jobs from the start within a 5 % budget (a1-0348). The a1 records cite collect-file sections, not
  lines; the papers' text was read instead. RouteLLM and Hybrid LLM are read only through the o2 collector's
  quotation (`Q:o2-quota.md`); their paper text is not in `PB:`.

## Open tasks (not corrections)

- **c1-0515**: change the decision-rule page, `Q:DECISION-RULE.md` lines 42-44, which still lists "a check shared by
  separate programs" among the parts with no paper among those read (the mistake r57-0610). Name the finite-source
  queue, batch testing and merge queues there. A page, not a record. Checked: `sed -n 41,44p` shows the words at
  line 44.
- **a1-0500**: count window usage per unit of work, by class of work and model, estimated before and counted after;
  from the session transcripts on disk, no run.
- **a1-0501**: measure the size in tokens of the five-hour, weekly and per-model weekly windows and the weight of
  each model and effort level (gives k = weekly / five-hour); needs the owner's word.
- **a1-0502**: measure whether a unit on Fable also moves the all-models weekly meter; needs the owner's word.
- **a1-0503**: measure how cached input counts against the Claude Code windows; needs the owner's word.
- **a1-0504**: find out whether an unspent part of a window is lost at its reset and what starts the next five-hour
  period (owner's word), and read this account's weekly reset time in Settings (no run).
- **a1-0505**: measure units per window by class, five-hour windows opened per week, and the error of forecasting
  the units ready; needs the owner's word.
- **a1-0506**: measure the largest unit's share of each window (eps0, gamma); needs the owner's word.
- **a1-0507**: measure, per kind of unit and model, the share passing the check, window usage per unit and the
  token cost of a redo; needs the owner's word.
- **a1-0508**: define and record a value, or at least a ranking, per unit of work.
- **a1-0509**: measure the length distribution of units per class and model, the share of last-two predictions
  that run short, the tail, and the spread across reruns of one unit; needs the owner's word.
- **a1-0510**: measure the window usage of units still running and how far the provider's usage figure lags;
  needs the owner's word.

`R:a1-report.md` section 6 also lists six DECISION-RULE.md lines (77, 117, 150, 171, 175 and 42-44) to change.
They are page lines with no open record of their own.

## The rows

| # | Proposal | Target | Recommendation | Reason, one line |
|---|---|---|---|---|
| 1 | c1-0500 | o1-0402 | right | The one-slot point is published (Denning and Buzen, Lazowska ch. 5) and the c-slot form follows from two bounds; the formula stands, the mark and "where waiting starts" change |
| 2 | c1-0501 | x15-0405 | right | The condition is Dorfman's table and formula; 29 % holds for pools of 2 and 4, 30.7 % for 3 |
| 3 | c1-0502 | x15-0406 | right | (1 - p)^k > 1/k is Dorfman's cost per item below 1; the record's 0.29 and 0.24 are right arithmetic of a published result |
| 4 | c1-0503 | x06-0404 | right in part | The numbers stand, but only Dorfman's model shows a loss (near 30 %); Najafi and the thesis show smaller savings up to 22.51 %, not a loss |
| 5 | c1-0504 | x06-0402 | right | Zuul's page and Uber 2025 state it; a run whose base passes is not lost |
| 6 | c1-0505 | x06-0400 | right | "Unless batched" leaves out testing ahead, which Zuul's page describes with the serial result kept |
| 7 | c1-0506 | x06-0333 | right | Zuul's page read: window 20, +1 per merge, halved per failure; summary becomes quoted |
| 8 | c1-0507 | x15-0353 | right | Same page, same words; one record with row 7 |
| 9 | c1-0508 | x06-0334 | right | GitHub's page read; 1 to 100 for both settings stands, wait time and no combining added |
| 10 | c1-0509 | x06-0335 | right | 42 % is the flaky-test figure (41 % in the text), 47 % is one project's maximum; author order is Najafi, Rigby, Shang |
| 11 | c1-0510 | x06-0336 | right | 91 % is BatchAll at Chrome, 72 % batch-of-4 at Chrome, -14.29 % at Ericsson; the 81 % also stands (abstract) |
| 12 | c1-0511 | x06-0354 | right | Paper read: 201 commits examined, 45/20/12 % of 161 classified fixes |
| 13 | c1-0512 | x06-0511 | right | The check the open task asked for is done; one record with row 12 |
| 14 | c1-0513 | x05-0501 | right | DeWitt's technical report is in `PC:dewitt/` and says what the lane says |
| 15 | c1-0514 | x05-0607 | right | DeWitt calls group commit folklore and IMS/VS Fast Path did it first; neither DeWitt nor the preprint is the origin |
| 16 | a1-0511 | o2-0501 | right in part | Pacing over a horizon, daily budgets and the window anchoring are documented; but no paper read joins a used-up budget with resources given back (processor, memory), so that half of o2-0501 stands |
| 17 | a1-0512 | o2-0404 | right | The bounds are stated per number of decisions for any clock length; the replacement must carry a1-0410 (no usable number at tens of units) |
| 18 | a1-0513 | o2-0317 | right | Only the note changes, as in row 17 |
| 19 | a1-0514 | r57-0408 | right in part | Right about what the published pacing rules do, but their measured gain comes from spreading spend over a day; with equal value per token, spending at once finishes the same units sooner |
| 20 | a1-0515 | r57-0409 | right in part | Fit-in-every-limit and summed prices are published for limits of one kind; joining a used-up allowance with widths given back stays reasoning; the reservation alternative to the age cap is right |
| 21 | a1-0516 | o2-0321 | right | o2-quota.md line 87: the saving is against a random router; 95 % is MT Bench only |
| 22 | a1-0517 | o2-0320 | right | o2-quota.md lines 96, 98: 13.8/13.1/10.3 %, only the transformed router beat random |
| 23 | a1-0518 | x19-0701 | right in part | The pointer's words stand at their line, and the reason holds for each copied unit; the papers cap copies at a small share of capacity (Dolly is not tail-only) |

---

### Row 1. c1-0500 → o1-0402 (right)

- **Target says** (o1-0402, hypothesis, reasoned): "when the check runs once per change it caps output at c changes
  per T_check and workers past c (T_out + T_check) / T_check only queue; T_out per piece or change was never
  measured here."
- **Lane says:** for one slot (T_out + T_check)/T_check is published (Denning and Buzen 1978; Lazowska 1984 ch. 5;
  Kleinrock via Sztrik). For c slots it is computed on the exact model and follows from two operational bounds for
  any distribution. It is where the bounds cross, not where waiting starts.
- **Checked:**
  - `sed -n 941,967p PC:denning-buzen/paper.txt`: "beyond which queueing is certain to be observed, we call N* the
    saturation point". Lines 1030-1032: "Mb* = (Ro + Z}/VbSb ... queueing is certain". Stands.
  - `PC:lazowska/chap05.txt` lines 100-106: "depends on only a single assumption: that the service demand of a
    customer at a center does not depend on how many other customers". Lines 260-264: "a particular population size
    N* ... This crossover point occurs where the values of the two bounds are equal". Stands.
  - `PC:sztrik-fsqs/paper.txt` lines 559-571: "called the saturation number by [42] (sec.4.12)", "N = (b + 1/λ)/b",
    "the maximum number of messages that could be scheduled without causing mutual interference". Stands.
  - `Q:DECISION-RULE.md` line 74: "Case B: a textbook queueing bound, reasoned". Stands. `Q:BUILD-IN.md` line 110:
    "case B hyp (C147)". The mark there is "hyp", not "reasoned".
  - Hand check of c1-0401's busy shares: M/M/1//2 at Z/S = 1 gives p0 = 0.2, 80 % busy; M/M/1//11 at Z/S = 10
    gives about 84 %. Both inside the stated 79 to 84 %.
  - `Q:o1-report.md` line 63 already names QSP (Lazowska) for case B: the o1 report had the source, the record kept
    "reasoned".
- **Recommendation: right.** o1-0402's formula stands. Its mark should say the one-slot case is published, and it
  should not suggest that nothing waits below the point.
- **Replacement:**

```json
{"id":"r57-0412","kind":"hypothesis","status":"reasoned","claim":"Untested for our check: its width is round(sqrt(T_out / T_check)) only when one task is split into pieces that each pass the check once (Suleman's model); when the check runs once per change, c slots cap output at c changes per T_check and workers past c (T_out + T_check) / T_check only queue, a point published for one slot (Denning and Buzen 1978, Lazowska and others 1984 ch. 5, Sztrik citing Kleinrock) and following for c slots from the bounds X <= c / T_check and X <= N / (T_out + T_check) for any distribution of times; it is where the two bounds cross, not where waiting starts (the exponential model already waits there, the check 79 to 92 % busy); T_out per piece or change was never measured here.","evidence":["docs/program/evidence/bottleneck-2026-11-18/o1-report.md#Derived decision rule (HYPOTHESIS, untested; every step names its source)","docs/program/evidence/bottleneck-2026-11-18/o1-report.md#Table: bottleneck to method","docs/program/evidence/round3-2026-11-18/papers/check/denning-buzen/paper.txt#lines 941-967, 1030-1042","docs/program/evidence/round3-2026-11-18/papers/check/lazowska/chap05.txt#lines 100-106, 238-264","docs/program/evidence/round3-2026-11-18/papers/check/sztrik-fsqs/paper.txt#lines 555-571","docs/program/evidence/round3-2026-11-18/c1-refute.md#C07","docs/program/evidence/round3-2026-11-18/c1-refute.md#C08"],"see":["o1-0301","o1-0309","r57-0103","o1-0101","r57-0307","c1-0300","c1-0301","c1-0302","c1-0400","c1-0401","c1-0500"],"note":"The c-slot form assumes check time and outside time do not change with the number of workers and the slots run side by side at full speed, not measured on this PC. DECISION-RULE.md line 74 still marks case B 'a textbook queueing bound, reasoned' and BUILD-IN.md line 110 'hyp'; those pages are not records.","handles":["check","suite","serial step","square root","worker count","lane","saturation point","case B"],"supersedes":["o1-0402"],"date":"2026-11-19","by":"r57"}
```

### Row 2. c1-0501 → x15-0405 (right)

- **Target says** (x15-0405, hypothesis, reasoned): "Checking several ready fixes in one suite run pays while fewer
  than about 29 % of merges fail (2 to 4 per run)."
- **Lane says:** it is Dorfman's 1943 published result, not reasoning. The threshold depends on the pool: pools of 3
  beat one-by-one below p = 0.307, a pool of 2 is never optimal, and the best pool at 1 % failing is 11.
- **Checked:**
  - `E:several-writers-options.md` line 20: "pays while fewer than about 29 % of merges fail (2 to 4 per run). [R]".
    The target's words stand.
  - `PC:dorfman/paper.txt` lines 112-121: "E(T) = N/n + n(N/n)p'". Lines 152-187, the table: "1 11 20 80", "10 4 59
    41", "30 3 99 1". Stands.
  - `PC:aldridge/paper.txt` lines 7610-7613: "With m = 3, this improves on individual testing for p < 1 - 3^-1/3 ≈
    0.307. (It turns out that m = 2 is never optimal here". Stands.
  - Arithmetic: (1 - p)^k > 1/k gives p < 0.293 for k = 2 and k = 4, 0.307 for 3, 0.243 for 7.
- **Recommendation: right.** The 29 % is correct only for pools of 2 and 4; the source is Dorfman's.
- **Replacement** (one record for rows 2 and 3; write once):

```json
{"id":"r57-0315","kind":"result","status":"quoted","claim":"Dorfman 1943 (pooled tests; independent items with one known failure rate p, a pool costing one test, a failed pool retested one by one): pooling k items costs 1/k + 1 - (1 - p)^k tests per item, so a pool saves tests when (1 - p)^k > 1/k, which holds below p = 0.307 for pools of 3, 0.293 for 2 or 4 and 0.243 for 7 (computed); a pool of 2 is never optimal (Aldridge and others 2019), and the best pool is 11 at 1 % failing (80 % saved), 4 at 10 % (41 %) and 3 at 30 % (1 %); not tested on our check, whose failures may not be independent and whose run over k changes may cost more than one run.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/dorfman/paper.txt#lines 112-121, 152-187, 196-206","docs/program/evidence/round3-2026-11-18/papers/check/aldridge/paper.txt#lines 7602-7615","https://webpages.tuni.fi/uta_statistics/liski-arkisto/mtt-perusteet10/mttp-kurssi10/Materiaalia/Dorfman-Ann1943.pdf","https://arxiv.org/pdf/1902.06002"],"see":["c1-0311","c1-0312","c1-0402","c1-0501","c1-0502"],"note":"several-writers-options.md lines 20 and 121 mark the condition [R], reasoned; it is Dorfman's.","handles":["batch","batch formula","29 percent","Dorfman","pool size","failure rate"],"supersedes":["x15-0405","x15-0406"],"date":"2026-11-19","by":"r57"}
```

### Row 3. c1-0502 → x15-0406 (right)

- **Target says** (x15-0406, hypothesis, reasoned): "A batch of k fixes saves suite runs when (1 - p)^k > 1/k, with
  a failed batch retested singly: p below 0.29 for k = 2 or 4, below 0.24 for k = 7."
- **Lane says:** it is Dorfman's 1943 cost condition (1/k + 1 - (1 - p)^k below 1 test per item), published with its
  table of best pools (11 at 1 %, 4 at 10 %, 3 at 30 %), and a batch of 2 is never optimal (Aldridge and others 2019).
- **Checked:** `E:several-writers-options.md` line 121: "(1 - p)^k > 1/k: p below 0.29 for k = 2 or 4, below 0.24
  for k = 7 [R]". Stands. Dorfman and Aldridge as in row 2. Stand. The target's numbers are right arithmetic.
- **Recommendation: right.** Only the mark is wrong: the result is published.
- **Replacement:** the record of row 2, r57-0315, which supersedes both (write once):

```json
{"id":"r57-0315","kind":"result","status":"quoted","claim":"Dorfman 1943 (pooled tests; independent items with one known failure rate p, a pool costing one test, a failed pool retested one by one): pooling k items costs 1/k + 1 - (1 - p)^k tests per item, so a pool saves tests when (1 - p)^k > 1/k, which holds below p = 0.307 for pools of 3, 0.293 for 2 or 4 and 0.243 for 7 (computed); a pool of 2 is never optimal (Aldridge and others 2019), and the best pool is 11 at 1 % failing (80 % saved), 4 at 10 % (41 %) and 3 at 30 % (1 %); not tested on our check, whose failures may not be independent and whose run over k changes may cost more than one run.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/dorfman/paper.txt#lines 112-121, 152-187, 196-206","docs/program/evidence/round3-2026-11-18/papers/check/aldridge/paper.txt#lines 7602-7615","https://webpages.tuni.fi/uta_statistics/liski-arkisto/mtt-perusteet10/mttp-kurssi10/Materiaalia/Dorfman-Ann1943.pdf","https://arxiv.org/pdf/1902.06002"],"see":["c1-0311","c1-0312","c1-0402","c1-0501","c1-0502"],"note":"several-writers-options.md lines 20 and 121 mark the condition [R], reasoned; it is Dorfman's.","handles":["batch","batch formula","29 percent","Dorfman","pool size","failure rate"],"supersedes":["x15-0405","x15-0406"],"date":"2026-11-19","by":"r57"}
```

### Row 4. c1-0503 → x06-0404 (right in part)

- **Target says** (x06-0404, hypothesis, reasoned): "Batching loses when the failure rate per change is high,
  because batches fail and retests pile up (the file's own reasoning; not tested here)." Note: "The file gives no
  measured number for this method."
- **Lane says:** it has published numbers: Dorfman's best pool saves 1 % at 30 % failing. Najafi's Ericsson project
  with 2.4 times the culprit rate saved 46 % at batch 4, against 72 % at batch 9. The thesis behind TSE 2021 left
  out projects over 25 % failing and found the smallest best batch, four, at 19.36 and 22.51 %.
- **Checked:**
  - `E:concurrency-lit-5-integration.md` line 105: "Loses: high failure rate (batches fail, retests pile up)". The
    target's words stand.
  - `PC:dorfman/paper.txt` line 187: "30 3 99 1". Stands.
  - `PC:najafi2019/paper.txt` lines 126-130: "Project A has a CulpritRate 2.4 times higher than Project C and with a
    BatchSize of 4, the savings are 46%. In contrast, Project C can have a BatchSize up to 9 and saves 72%". Lines
    421-422: 6.8 %, 8.6 % and 2.8 %. Stands.
  - `PC:beheshtian-thesis-2020/paper.txt` lines 710-711: "We do not consider projects with a failure rate above 25%
    as batching is not effective with high failure rates". Lines 1129-1130: "22.51% and 19.36% ... the best batch
    size is the lowest at four and the savings are lowest at 32.97% and 29.51%". Stands.
  - Also found: `PC:pbatch/paper.txt` lines 33-35: "when fewer than 40% of builds fail, batching and bisection
    effectively reduce overall feedback time [9]" ([9] = Beheshtian and others, TSE 2021; its text is only a PDF in
    `PC:beheshtian-tse2021/`, not read).
- **Recommendation: right in part.** Every number stands. But they show the saving shrinking, not a loss. A loss
  appears only in Dorfman's two-round model, past about 30 %. The measured projects stop at 22.51 %. The replacement
  says so.
- **Replacement:**

```json
{"id":"r57-0316","kind":"result","status":"quoted","claim":"Batching's saving shrinks as the failure rate rises and is gone only in Dorfman's two-round model, near 30 % failing (best pool 3 saves 1 % at 30 %); measured by simulation, Najafi, Rigby and Shang 2019 (Ericsson, bisection) saved 46 % at batch 4 in the project with 2.4 times the culprit rate against 72 % at batch 9, and Beheshtian 2020 (nine open-source projects) found the smallest best batch, four, and the lowest savings, 32.97 and 29.51 %, at the highest failure rates, 22.51 and 19.36 %, having left out projects over 25 % failing; no loss was measured in the sources read.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/dorfman/paper.txt#lines 152-187","docs/program/evidence/round3-2026-11-18/papers/check/najafi2019/paper.txt#lines 126-132, 421-422","docs/program/evidence/round3-2026-11-18/papers/check/beheshtian-thesis-2020/paper.txt#lines 709-713, 1128-1134","docs/program/evidence/round3-2026-11-18/papers/check/pbatch/paper.txt#lines 31-37"],"see":["c1-0311","c1-0312","c1-0314","c1-0315","c1-0503"],"note":"Fallahzadeh and others 2023 cite Beheshtian and others 2021 for batching with bisection reducing feedback time while fewer than 40 % of builds fail (pbatch lines 33-35); the cited paper's text was not read.","handles":["batching high failure rate","batch loses","culprit rate","best batch size","measured numbers"],"supersedes":["x06-0404"],"date":"2026-11-19","by":"r57"}
```

### Row 5. c1-0504 → x06-0402 (right)

- **Target says** (x06-0402, hypothesis, reasoned): "Zuul-style speculative gating loses when tests are flaky or
  failure rates are high, because one failure discards the work of all later changes (the file's own reasoning;
  not tested here)."
- **Lane says:** the sources state it. Zuul's documentation retests the changes behind a failed one without it and
  says the window should be small when builds often fail. Uber 2025 (self-reported) says GitHub's and GitLab's
  success-path queues delay later changes when the failure rate is high. A speculative run whose base passes is not
  lost.
- **Checked:**
  - `E:concurrency-lit-5-integration.md` line 64: "Loses: when tests are flaky or failure rates are high; a failure
    discards the work of all later changes." The target's words stand.
  - `PC:zuul-gating/paper.txt` lines 921-923: "if one fails, then changes that were expecting it to succeed are
    re-tested without the failed change". Lines 962-968: "build results are discarded ... if they frequently fail,
    it should be small in order to minimize waste". Stands.
  - `PC:uber-ci-at-scale/paper.txt` lines 199-202: "these systems only speculate the success paths ... which causes
    delays, especially when the failure rate is high". Stands.
  - "Flaky" is not in either source. Zuul and Uber speak of failures; a flaky failure is one of them.
- **Recommendation: right.**
- **Replacement:**

```json
{"id":"r57-0317","kind":"result","status":"quoted","claim":"Speculative gating wastes runs when changes often fail: Zuul's documentation (fetched 2026-11-19, no figures) says the changes behind a failed one are retested without it and their build results discarded, so frequent failures use much test resource for little gain and the window should then be small, and Uber 2025 (self-reported) says GitHub's merge queue and GitLab's merge train speculate only the success path, so later changes are retested after a failure, with delays when the failure rate is high; a speculative run whose base passes is the real check and is not lost; no source read measures the loss.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/zuul-gating/paper.txt#lines 916-926, 961-968","docs/program/evidence/round3-2026-11-18/papers/check/uber-ci-at-scale/paper.txt#lines 197-203","https://zuul-ci.org/docs/zuul/latest/gating.html","https://arxiv.org/pdf/2501.03440"],"see":["c1-0325","c1-0326","c1-0405","c1-0504"],"handles":["Zuul flaky","speculative gating loss","failure discards later changes","success path","window small"],"supersedes":["x06-0402"],"date":"2026-11-19","by":"r57"}
```

### Row 6. c1-0505 → x06-0400 (right)

- **Target says** (x06-0400, hypothesis, reasoned): "A Bors-style serial gate keeps trunk green but caps throughput
  at one full check per merge unless batched (the file's own reasoning from its Wins and Loses lines; not tested
  here)."
- **Lane says:** testing ahead also lifts the cap. Zuul tests queued changes on top of those ahead and at best merges
  as many at once as execution contexts allow, so with few failures it carries several checks at once. Batching
  (Rust's hand-built rollups, with a CI run of about 3 hours) is the other way.
- **Checked:**
  - `E:concurrency-lit-5-integration.md` line 53: "throughput is capped at one check duration per merge unless
    batched". The target's words stand.
  - `PC:zuul-gating/paper.txt` lines 916-926: "exactly as if they had been tested one at a time ... In the best case,
    as many changes as execution contexts are available may be tested in parallel and merged at once". Stands.
  - `PC:rust-rollups/rollups.txt` lines 4-6: "every pull request must be tested after merge ... this can scale
    poorly, especially given the long (~3hr) current CI duration". Lines 34-36: the failed rollup is recreated
    "without the offending PR". Stands.
- **Recommendation: right.** Testing ahead keeps the serial result and runs several checks at once. It lifts the cap
  on merges per hour, not the cost of one check per merge.
- **Replacement:**

```json
{"id":"r57-0318","kind":"result","status":"quoted","claim":"A gate that tests each change on the main line before it lands keeps trunk green and caps output at one check time per merge per slot unless changes are batched or tested ahead: Zuul (documentation, fetched 2026-11-19, no figures) tests queued changes in parallel on top of those ahead, with the result of testing them one at a time, merging at best as many at once as execution contexts and at worst one at a time, and Rust (forge documentation, self-reported, no figures) puts small low-risk changes in hand-built rollups because testing each one after merge 'can scale poorly' with a CI run of about 3 hours.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/zuul-gating/paper.txt#lines 916-926","docs/program/evidence/round3-2026-11-18/papers/check/rust-rollups/rollups.txt#lines 4-11, 34-41","https://zuul-ci.org/docs/zuul/latest/gating.html","https://forge.rust-lang.org/release/rollups.html"],"see":["c1-0326","c1-0328","c1-0405","c1-0505"],"note":"Testing ahead lifts the cap on merges per hour, not the cost of one check per merge.","handles":["serial gate throughput cap","Bors trunk green","testing ahead","rollups","one check per merge"],"supersedes":["x06-0400"],"date":"2026-11-19","by":"r57"}
```

### Row 7. c1-0506 → x06-0333 (right)

- **Target says** (x06-0333, result, summary): "Zuul speculative gating (OpenStack project docs, summary): each
  project queue starts with a window of 20 changes, grows by 1 per merge and halves per failure; the page gives no
  throughput numbers."
- **Lane says:** read at the Zuul page itself (fetched 2026-11-19), the window of 20, plus one per merge and halved
  per failure, stands. The page also says queued changes are tested in parallel assuming all pass and are retested
  without a failed one.
- **Checked:** `E:concurrency-lit-5-integration.md` line 63: "A window starts at 20 changes, grows by 1 per merge,
  halves per failure". The target's words stand. `PC:zuul-gating/paper.txt` lines 971-973: "(twenty changes by
  default). Each time a change successfully merges, the window is increased by one. Each time a change fails, the
  window is halved." Lines 982-984: "each project queue within that pipeline maintains its own window". Lines
  975-977: a floor and an optional ceiling. Stands.
- **Recommendation: right.** The summary becomes quoted.
- **Replacement** (one record for rows 7 and 8; write once):

```json
{"id":"r57-0319","kind":"result","status":"quoted","claim":"Zuul documentation, Project Gating (fetched 2026-11-19, no throughput figures): queued changes are tested in parallel assuming all will pass and those behind a failed change are retested without it; a pipeline's window, kept by each project queue on its own, starts at twenty changes by default, grows by one each time a change merges and halves each time one fails, above a floor and below an optional ceiling.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/zuul-gating/paper.txt#lines 916-926, 953-984","https://zuul-ci.org/docs/zuul/latest/gating.html"],"see":["c1-0326","c1-0506","c1-0507"],"handles":["Zuul window 20","speculative gating window","width rule","OpenStack Zuul"],"supersedes":["x06-0333","x15-0353"],"date":"2026-11-19","by":"r57"}
```

### Row 8. c1-0507 → x15-0353 (right)

- **Target says** (x15-0353, result, summary): "Zuul's window (lit5 #4, summary) is cited in the file as growing by
  one per clean merge and halving after a failed one."
- **Lane says:** read at the page: it starts at twenty changes, grows by one per merge and halves per failure.
- **Checked:** `E:several-writers-options.md` line 143: "grows by 1 per clean merge, halves after a failed one, as
  Zuul's window does [L lit5 #4, sum]". The target's words stand. The Zuul page as in row 7. Stands.
- **Recommendation: right.**
- **Replacement:** the record of row 7, r57-0319, which supersedes both (write once):

```json
{"id":"r57-0319","kind":"result","status":"quoted","claim":"Zuul documentation, Project Gating (fetched 2026-11-19, no throughput figures): queued changes are tested in parallel assuming all will pass and those behind a failed change are retested without it; a pipeline's window, kept by each project queue on its own, starts at twenty changes by default, grows by one each time a change merges and halves each time one fails, above a floor and below an optional ceiling.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/zuul-gating/paper.txt#lines 916-926, 953-984","https://zuul-ci.org/docs/zuul/latest/gating.html"],"see":["c1-0326","c1-0506","c1-0507"],"handles":["Zuul window 20","speculative gating window","width rule","OpenStack Zuul"],"supersedes":["x06-0333","x15-0353"],"date":"2026-11-19","by":"r57"}
```

### Row 9. c1-0508 → x06-0334 (right)

- **Target says** (x06-0334, result, summary): "GitHub merge queue (GitHub docs, summary): merge limit and build
  concurrency each range from 1 to 100, and the page gives no performance numbers."
- **Lane says:** read at the GitHub page (fetched 2026-11-19), build concurrency and merge limits of 1 to 100 stand.
  Merge limits carry a wait time and do not combine merge_group builds.
- **Checked:** `E:concurrency-lit-5-integration.md` line 72: "merge limits (1 to 100) set group size; build
  concurrency (1 to 100)". The target's words stand. `PC:github-mq/paper.txt` line 179: "Build concurrency: The
  maximum number of merge_group webhooks to dispatch (between 1 and 100)". Line 185: "Merge limits ... (between 1 and
  100), and a timeout". Line 187: "Merge limits do not combine merge_group builds." Line 183: the setting "useful if
  you have intermittent test failures". Stands.
- **Recommendation: right.**
- **Replacement:**

```json
{"id":"r57-0320","kind":"result","status":"quoted","claim":"GitHub documentation, Managing a merge queue (fetched 2026-11-19, no performance figures): each pull request is grouped with the latest base branch and the pull requests ahead of it and checked on a temporary branch; build concurrency (merge_group builds dispatched at once) and merge limits (pull requests merged at once) each range from 1 to 100, merge limits carry a wait time for reaching the minimum group and do not combine merge_group builds, and a setting lets a later passing group carry an earlier failing pull request for intermittent test failures.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/github-mq/paper.txt#lines 176-194","https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue"],"see":["c1-0327","c1-0508"],"handles":["GitHub merge queue limits","1 to 100 concurrency","merge limits","testing ahead"],"supersedes":["x06-0334"],"date":"2026-11-19","by":"r57"}
```

### Row 10. c1-0509 → x06-0335 (right)

- **Target says** (x06-0335, result, summary): "Najafi, Shang and Rigby 2019 (FSE, Ericsson, summary): constant
  batch sizes cut execution or resource use by 42 percent or 47 percent, and which of the two figures is right was
  not confirmed."
- **Lane says:** Najafi, Rigby and Shang 2019 state 72 % of runs saved at batch 9 without flaky tests and 41 % (42 %
  in the abstract) with them, and maximum savings of 50, 47 and 74 % in their three projects. Both figures appear,
  for different things.
- **Checked:** `E:concurrency-lit-5-integration.md` line 104: "cut execution/resource use by 42% (one source) or 47%
  (another)". The target's words stand. `PC:najafi2019/paper.txt` lines 37-42: "saves 72% ... reduces the cost
  savings to 42%". Lines 542-543: "The maximum saving is 50%, 47%, and 74%". Lines 619-621: "from a BatchSize of 9
  and execution savings of 72% to 4 and 41%". Lines 2-19: authors Najafi, Rigby, Shang. Stands.
- **Recommendation: right.**
- **Replacement:**

```json
{"id":"r57-0321","kind":"result","status":"quoted","claim":"Najafi, Rigby and Shang 2019 (FSE; simulation over 9 months of three Ericsson projects, a failing batch bisected, cost in test runs): batching saved 72 % of runs at batch 9 in the project with the fewest culprits (2.8 %), and 41 % at batch 4 there once flaky tests were modelled (42 % in the abstract); the maximum savings were 50, 47 and 74 % in the three projects, so the 42 and 47 % are different figures.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/najafi2019/paper.txt#lines 35-43, 532-554, 614-621","https://ece.uwaterloo.ca/~wshang/pubs/Armin_FSE_2019.pdf"],"see":["c1-0314","c1-0509"],"handles":["Ericsson batch 42 47 percent","constant batch size","Najafi Rigby 2019","flaky tests"],"supersedes":["x06-0335"],"date":"2026-11-19","by":"r57"}
```

### Row 11. c1-0510 → x06-0336 (right)

- **Target says** (x06-0336, result, summary): "Concordia 2023 (...): a constant batch of 4 needs up to 72 percent
  fewer machines at the same average feedback time, dynamic batching up to 91 percent fewer, and test-case batching
  up to 81 percent fewer."
- **Lane says:** in Fallahzadeh, Bavand and Rigby 2023 the 91 % is batching every waiting change (90.78 % fewer
  machines at Chrome). The 72 % is a fixed batch of 4 at Chrome (71.89 %), which at Ericsson needed more machines
  (-14.29 %). The 81 % was not checked in this round.
- **Checked:** `PC:beheshtian2021/paper.txt` (the 2023 paper; authors at line 109) lines 846-848: "for Chrome,
  BatchAll achieves the feedback baseline at 36.48 minutes with 20 machines, resulting in an impressive 90.78%".
  Lines 767-774: "Batch4 achieves the same average feedback time using 8 machines, resulting in a negative reduction
  (-14.29%) ... using 61 machines, resulting in a 71.89%". Lines 43-44 and 155-156: "TestCaseBatching holds the line
  of the actual average feedback time with up to 81% fewer machines". Line 33: "276 million test outcomes". Stands,
  the 81 % included.
- **Recommendation: right.** The 81 % stands too, in the abstract.
- **Replacement:**

```json
{"id":"r57-0322","kind":"result","status":"quoted","claim":"Fallahzadeh, Bavand and Rigby 2023 (ESEC/FSE, Concordia; replay on Ericsson data and 276 million Chrome test outcomes, about 8.5 % of Chrome builds failing): keeping the actual average feedback time, batching every waiting change needed up to 91 % fewer machines (Chrome 20, 90.78 % fewer; Ericsson 5, 28.57 % fewer), a fixed batch of 4 needed 71.89 % fewer at Chrome but 14.29 % more at Ericsson, and test-case batching up to 81 % fewer.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/beheshtian2021/paper.txt#lines 30-45, 150-158, 202, 643-650, 764-774, 838-848","https://arxiv.org/pdf/2308.13129"],"see":["c1-0316","c1-0510"],"note":"The paper's text is filed under papers/check/beheshtian2021/. The 81 % was read in the abstract and the contributions list, not in a results table.","handles":["Concordia 72 91 81 percent","parallel batch testing","276 million Chrome outcomes","machines"],"supersedes":["x06-0336"],"date":"2026-11-19","by":"r57"}
```

### Row 12. c1-0511 → x06-0354 (right)

- **Target says** (x06-0354, result, textbook): "Luo et al. FSE 2014 (writer's recall, to be checked): of 201
  flaky-test fixes, the leading causes are async wait, concurrency and test order, at about 45, 20 and 12 percent."
- **Lane says:** read in the paper, it examined 201 commits, and the 45, 20 and 12 % are shares of the 161
  classified fixes (74, 32 and 19).
- **Checked:** `PC:luo/paper.txt` line 23: "a total of 201 commits that likely fix flaky tests in 51 open-source
  projects". Line 346: "74 out of 161 (45%) commits are from the Async Wait". Line 352: "32 out of 161 (20%)". Line
  417: "19 out of 161 (12%)". Lines 31-38: Google's 4.56 % and the rerun 10 times. Stands.
- **Recommendation: right.**
- **Replacement** (one record for rows 12 and 13; write once):

```json
{"id":"r57-0323","kind":"result","status":"quoted","claim":"Luo, Hariri, Eloussi and Marinov 2014 (FSE; 201 commits likely fixing flaky tests in 51 Apache projects): of the 161 classified fixes, 74 (45 %) were async wait, 32 (20 %) concurrency and 19 (12 %) test order; at Google (personal communication, self-reported) 73 thousand of 1.6 million test failures a day (4.56 %) were flaky and a failing test is rerun 10 times.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/luo/paper.txt#lines 20-39, 112-118, 346, 352, 417","https://huang.isis.vanderbilt.edu/cs8395/paper/flakytest.pdf"],"see":["c1-0333","c1-0511","c1-0512"],"handles":["Luo FSE 2014 flaky causes","async wait 45 percent","161 classified fixes","Luo check done"],"supersedes":["x06-0354","x06-0511"],"date":"2026-11-19","by":"r57"}
```

### Row 13. c1-0512 → x06-0511 (right)

- **Target says** (x06-0511, open): "The Luo et al. FSE 2014 cause shares of 45, 20 and 12 percent are recalled from
  memory and need checking against the paper."
- **Lane says:** checked in the paper: 45, 20 and 12 % of 161 classified fixes, out of 201 commits examined.
- **Checked:** `E:concurrency-lit-5-integration.md` line 168: "(shares of 45%, 20%, 12% recalled; TEXTBOOK, check)".
  The target's words stand. The paper as in row 12. Stands.
- **Recommendation: right.** The task is done.
- **Replacement:** the record of row 12, r57-0323, which supersedes both (write once):

```json
{"id":"r57-0323","kind":"result","status":"quoted","claim":"Luo, Hariri, Eloussi and Marinov 2014 (FSE; 201 commits likely fixing flaky tests in 51 Apache projects): of the 161 classified fixes, 74 (45 %) were async wait, 32 (20 %) concurrency and 19 (12 %) test order; at Google (personal communication, self-reported) 73 thousand of 1.6 million test failures a day (4.56 %) were flaky and a failing test is rerun 10 times.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/luo/paper.txt#lines 20-39, 112-118, 346, 352, 417","https://huang.isis.vanderbilt.edu/cs8395/paper/flakytest.pdf"],"see":["c1-0333","c1-0511","c1-0512"],"handles":["Luo FSE 2014 flaky causes","async wait 45 percent","161 classified fixes","Luo check done"],"supersedes":["x06-0354","x06-0511"],"date":"2026-11-19","by":"r57"}
```

### Row 14. c1-0513 → x05-0501 (right)

- **Target says** (x05-0501, open): "DeWitt, Katz, Olken, Shapiro, Stonebraker and Wood 1984 (group commit origin) was
  not opened; the file cites it only through the 2026 preprint."
- **Lane says:** it was opened as its technical report. Its group-commit passage computes 100 commits a second for
  one log device and 1000 with 10 per group, and calls the notion database folklore.
- **Checked:** `E:concurrency-lit-4-scheduling.md` line 5: "No paper was found open for DeWitt 1984". The target's
  words stand. `PC:dewitt/paper.txt` lines 829-831: "could commit at most 100 transactions per second". Lines 860-863:
  "up to ten transactions per commit group ... to 1000 transactions per second". Lines 875-876: "The notion of group
  commits appears to be part of the unwritten database folklore. The System-R implementors claim to have implemented
  it." Lines 887-889: "A commit group cannot be written to disk, and thus commit, until all the groups it depends on
  have previously been committed." Stands.
- **Recommendation: right.** The task is done.
- **Replacement:**

```json
{"id":"r57-0324","kind":"result","status":"quoted","claim":"DeWitt, Katz, Olken, Shapiro, Stonebraker and Wood 1984 (technical report of the SIGMOD paper, opened in round 3; a back-of-envelope calculation): one log device at 10 ms a write allows at most 100 commits a second, and about ten transactions committed by one log-page write give 1000; a commit group may commit only after the groups it depends on; a footnote calls group commit 'part of the unwritten database folklore' and says System R's implementors claim to have implemented it.","evidence":["docs/program/evidence/round3-2026-11-18/papers/check/dewitt/paper.txt#lines 829-831, 856-869, 875-876, 886-889","https://www2.eecs.berkeley.edu/Pubs/TechRpts/1984/Archive/ERL-m-84-5.pdf"],"see":["c1-0320","c1-0513"],"handles":["DeWitt 1984","DeWitt opened","group commit","folklore","log device"],"supersedes":["x05-0501"],"date":"2026-11-19","by":"r57"}
```

### Row 15. c1-0514 → x05-0607 (right)

- **Target says** (x05-0607, mistake, quoted): "The first pass attributed group commit to DeWitt 1984; the source
  found is a 2026 preprint, whose result runs against the 'tune the batch' idea."
- **Lane says:** it holds in part. DeWitt does describe and size group commit but calls it "part of the unwritten
  database folklore". IMS/VS Fast Path committed groups before the name existed (Gawlick and Kinkade 1985). So
  neither DeWitt nor the 2026 preprint is the origin.
- **Checked:** `E:concurrency-lit-4-scheduling.md` line 17: "the group commit source found is a 2026 preprint, not
  DeWitt". The target's words stand. DeWitt lines 875-876 as in row 14. `PC:gawlick/paper.txt` line 191: "IBM
  introduced the Fast Path feature of IMS/VS in 1976". Lines 604-608: "a group of transactions all become committed
  at one time. This was named ??Group Commit?? long after the development of IMS/VS Fast Path." Stands.
- **Recommendation: right.**
- **Replacement:**

```json
{"id":"r57-0611","kind":"mistake","status":"quoted","claim":"The first pass attributed group commit to DeWitt 1984 without opening it, and the source it then found was a 2026 preprint; DeWitt sizes group commit but calls it folklore, IMS/VS Fast Path (1976) committed groups long before the name existed (Gawlick and Kinkade 1985), and the preprint, whose result runs against tuning the batch timer, is a source for that result, not the origin.","when":"when citing the origin of group commit or tuning a batch timer","evidence":["docs/program/evidence/harness-method-status-2026-11-18/concurrency-lit-4-scheduling.md#line 17","docs/program/evidence/round3-2026-11-18/papers/check/dewitt/paper.txt#lines 875-876","docs/program/evidence/round3-2026-11-18/papers/check/gawlick/paper.txt#lines 191, 594-608"],"see":["x05-0501","x05-0355","c1-0320","c1-0322","c1-0514"],"handles":["group commit origin","DeWitt attribution","IMS Fast Path","tune the batch","preprint result"],"supersedes":["x05-0607"],"date":"2026-11-19","by":"r57"}
```

### Row 16. a1-0511 → o2-0501 (right in part)

- **Target says** (o2-0501, open): "No paper read schedules under a token allowance that refills in windows of hours
  or days, or treats tokens beside processor and memory; the window's semantics (fixed or rolling, how cache reads
  count) must be measured here before any token rule is set."
- **Lane says:** the papers read do pace a budget over a known horizon (Balseiro-Lu-Mirrokni, Gaitonde and others).
  Yahoo and LinkedIn paced 24-hour budgets in production (self-reported). Bandits with knapsacks treats several
  budgets at once. No source models a refill inside a horizon, so a window that resets is one horizon (reasoned).
  The window semantics are documented, not to be measured. Still open: two windows counting the same tokens,
  carry-over, cache weight in Claude Code, and the sizes.
- **Checked:**
  - `Q:o2-quota.md` line 126: "No paper found in this search covers scheduling under a cumulative budget that
    refills in windows". The target's source stands.
  - `PB:claude-limits/p1.txt` line 107: "The period starts when you send your first message, and your limit resets in
    full five hours later." Line 111: "Weekly limits reset at a fixed time each week that is assigned to your
    account". `PB:claude-limits/p5.txt` lines 112, 139: projects' cached content "counts less", no ratio, nothing on
    Claude Code. Stands.
  - `PB:dmd/paper.txt` line 102: "deplete resources exactly at the end of the horizon". `PB:smart-pacing/paper.txt`
    line 443: "the timespan and time slot interval are 24 hours and 15 minutes". `PB:linkedin/paper.txt` line 53:
    "a daily budget di. The day is discretized into T equal length time windows". `PB:bwk/paper.txt` line 159: "a
    known, finite time horizon T. We model it as one of the resources". Stands.
  - `grep -i 'renewable\|reusable'` over a1.jsonl and every `R:a1-*.md`: no hit. Every budget in BwK, Talluri and
    van Ryzin, and the pacing papers is used up. None is a resource given back after use, as processor and memory
    are.
- **Recommendation: right in part.** The refill and semantics parts are right. "Tokens beside processor and memory"
  still has no paper among those read: the several budgets of bandits with knapsacks are all used up. The
  `R:a1-report.md` section 6 row for DECISION-RULE line 171 claims that A25 covers this; it does not.
- **Replacement:**

```json
{"id":"r57-0514","kind":"open","status":"open","claim":"Before the numbers of a token rule are set, find out whether a unit on the separately limited model also moves the all-models weekly meter, whether an unspent part of a window is lost at its reset and what starts the next five-hour period, how cached input counts in Claude Code, and the size of each window; the window's anchoring is documented (the five-hour period starts at the first message and resets in full five hours later; the weekly reset is at a fixed time per account), and the papers read pace a budget over a known horizon, including daily budgets in production (self-reported), and several budgets at once, but none treats a used-up allowance beside resources given back after use (processor, memory), and no pacing paper read models a refill inside its horizon, so a window that resets is one horizon (reasoned).","evidence":["docs/program/evidence/round3-2026-11-18/papers/budget/claude-limits/p1.txt#lines 107, 111","docs/program/evidence/round3-2026-11-18/papers/budget/claude-limits/p5.txt#lines 112, 139","docs/program/evidence/round3-2026-11-18/papers/budget/dmd/paper.txt#line 102","docs/program/evidence/round3-2026-11-18/papers/budget/smart-pacing/paper.txt#line 443","docs/program/evidence/round3-2026-11-18/papers/budget/linkedin/paper.txt#line 53","docs/program/evidence/round3-2026-11-18/papers/budget/bwk/paper.txt#lines 149, 159","docs/program/evidence/bottleneck-2026-11-18/own-data.md#4. What was never measured"],"see":["o2-0501","a1-0300","a1-0302","a1-0304","a1-0306","a1-0314","a1-0324","a1-0325","a1-0329","a1-0501","a1-0502","a1-0503","a1-0504","a1-0511"],"note":"A token bucket (RFC 2698, Parekh and Gallager) refills continuously, not in full at a reset, so it is not this kind of window.","handles":["tokens","window","refill","pacing","carry-over","cache weight","measure","gap"],"supersedes":["o2-0501"],"date":"2026-11-19","by":"r57"}
```

### Row 17. a1-0512 → o2-0404 (right)

- **Target says** (o2-0404, hypothesis, reasoned): "... spend before a window resets if its unspent part is lost at
  the reset (not known for this allowance); untested, and no paper bounds a window of hours or days."
- **Lane says:** "no paper bounds a window of hours or days" does not hold. The bounds read are stated per number
  of decisions for a horizon of any clock length: Balseiro-Lu-Mirrokni's Theorem 1 for any T >= 1 (constants
  unread), Gallego-van Ryzin at 1 to 400 items for known demand, Zhou and others in the worst case at any scale. And
  LinkedIn measured daily budgets (self-reported). Its other part stands: whether an unspent part is lost at a reset
  is still not documented.
- **Checked:** `PB:dmd/paper.txt` lines 370-374: "Theorem 1 ... Then it holds for any T ≥ 1 that" (symbols garbled).
  `PB:gvr/paper.txt` lines 571-578: "at least 97.5% ... For 100 items, the guarantee drops to 95%, while for 25
  items, it is only 90% ... these guarantees are in fact quite pessimistic". `PB:zhou/paper.txt` line 259:
  "competitive ratio ln( U=L ) + 1". `PB:claude-limits/p1.txt` lines 107, 111: "resets in full", "you receive your
  full weekly allowance each cycle", nothing on carry-over. Stands.
- **Recommendation: right.** The replacement must carry a1-0410: at tens to hundreds of units per window these
  bounds give no usable number, beyond the known-demand and worst-case ones.
- **Replacement:**

```json
{"id":"r57-0413","kind":"hypothesis","status":"reasoned","claim":"Token allowance scarce: charge every token to the task that caused it (sub-agents and retries included), give agents shares with a deficit counter for turns of uneven size, and spend before a window resets if its unspent part is lost at the reset (not documented: the provider's pages say only that limits reset in full); untested; the pacing and fixed-stock bounds read are stated per number of decisions for a horizon of any clock length (Balseiro, Lu and Mirrokni for any T >= 1, constants unread; Gallego and van Ryzin at least 90 % at 25 items and 95 % at 100 with known demand; Zhou and others in the worst case), but at tens to hundreds of units per window they give no usable number beyond those known-demand and worst-case ones.","evidence":["docs/program/evidence/bottleneck-2026-11-18/o2-report.md#The table","docs/program/evidence/bottleneck-2026-11-18/o2-refute.md#C6","docs/program/evidence/round3-2026-11-18/papers/budget/dmd/paper.txt#lines 370-374","docs/program/evidence/round3-2026-11-18/papers/budget/gvr/paper.txt#lines 570-578","docs/program/evidence/round3-2026-11-18/papers/budget/zhou/paper.txt#line 259","docs/program/evidence/round3-2026-11-18/papers/budget/claude-limits/p1.txt#lines 107, 111","docs/program/evidence/round3-2026-11-18/a1-refute-2.md#A78"],"see":["o2-0316","o2-0317","o2-0318","o2-0319","a1-0301","a1-0308","a1-0310","a1-0316","a1-0410","a1-0512"],"note":"LinkedIn measured pacing of daily budgets (self-reported): campaign life +44 % and +149 %.","handles":["C6","tokens","allowance","window","quota","rule","bounds"],"supersedes":["o2-0404"],"date":"2026-11-19","by":"r57"}
```

### Row 18. a1-0513 → o2-0317, its note only (right)

- **Target says** (o2-0317, result, quoted), note: "Needs the resource divisible and work-conserving; no paper read
  bounds a window of hours or days."
- **Lane says:** that sentence does not hold, for the reason of row 17. The result itself (Parekh and Gallager) is
  not questioned.
- **Checked:** `Q:o2-quota.md` line 22: the Parekh and Gallager result ("Generalized Processor Sharing ... Leaky
  Bucket admission control"). The claim's source stands. The bounds as in row 17. Stand.
- **Recommendation: right.** Only the note changes. It also carries the scale limit of row 17.
- **Replacement:**

```json
{"id":"r57-0325","kind":"result","status":"quoted","claim":"Parekh and Gallager 1993 (analytic): a session shaped by a token bucket (depth sigma, rate rho) under weighted processor sharing gets a guaranteed rate and a worst-case delay, the worst case arising when every session is greedy from the start of a busy period.","evidence":["docs/program/evidence/bottleneck-2026-11-18/o2-quota.md#line 22"],"see":["a1-0301","a1-0310","a1-0316","a1-0410","a1-0513"],"note":"Needs the resource divisible and work-conserving. The earlier note 'no paper read bounds a window of hours or days' does not hold: the pacing and fixed-stock bounds read are stated per number of decisions for a horizon of any clock length, though at tens of units they give no usable number beyond known-demand and worst-case ones.","handles":["token bucket","sigma rho","delay bound","GPS","Parekh Gallager"],"supersedes":["o2-0317"],"date":"2026-11-19","by":"r57"}
```

### Row 19. a1-0514 → r57-0408 (right in part)

- **Target says** (r57-0408, hypothesis, reasoned): "The token allowance is a budget and not a rate: units side by
  side cost the same tokens in total as one after another, so it limits how many run at once only when a window is
  nearly spent, and otherwise decides how many units can be done before the reset and on which model".
- **Lane says:** it limits starts earlier than that. Under both the re-planning form and the price form, when demand
  exceeds the window it limits starts from the moment spend runs ahead of the window's time share (u > s). LinkedIn
  found a rule on spent over budget alone slow to react.
- **Checked:** `PB:linkedin/paper.txt` line 64: "this form of PTR does not depend on the rate of budget spend and
  can therefore be slow to react"; with it, "an improvement in revenue but not a significant increase in campaign
  life". Stands. `R:a1-refute-2.md` A82: CONFIRMED as an inference ("it starts no later than the claim says"). The
  re-planned rate (1 - u)/(1 - s) is in `R:a1-claims.md` A69, from Yahoo's re-planning (`PB:smart-pacing/paper.txt`
  line 196). Stands.
- **Recommendation: right in part.** It describes the published pacing rules correctly. But the gain they measured
  comes from spreading spend over a day: campaign life, reach and cost per click (Yahoo, LinkedIn, self-reported).
  Here, when every unit is worth the same per token, spending at once finishes the same units by the reset, and
  each one sooner. Pacing then gains only when units differ in value and admission is by value (a1-0401). r57-0408
  already replaced r57-0405 for "mixing a rate into a budget". The replacement keeps the budget frame and adds the
  u > s limit under that condition.
- **Replacement:**

```json
{"id":"r57-0414","kind":"hypothesis","status":"reasoned","claim":"Untested decision rule by bottleneck: at every start and finish of a unit of work, work out for each resource how many units it can carry now (memory: the peaks that fit in free memory above a reserve, a hard cap; processor: expected busy threads at most 24; the check: from its share of time or from its slots; shared files: conflict counts; tokens: the units the current window can still pay for above a reserve; and the units ready) and run at the smallest of these; the resource that gives the smallest is the bottleneck, so scheduling follows a moving bottleneck without any switch; act only at the gate, and stop running work only when memory reaches its floor. The token allowance is a budget and not a rate: units side by side cost the same tokens in total as one after another, so it decides how many units can be done before the reset and on which model; when demand exceeds a window and units differ in value, it also limits starts from the moment spend runs ahead of the window's time share (u > s), as the published pacing rules do, and otherwise only when the window is nearly spent, since with equal value per token spending at once finishes the same units sooner; side-by-side work costs extra tokens only through redone work and a waiting session re-reading its context.","when":"Before deciding how many helpers, sessions or heavy commands to run at once, or what to do when a job is slow.","evidence":["docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md#The rule, step by step","docs/program/evidence/bottleneck-2026-11-18/o1-report.md#Derived decision rule","docs/program/evidence/bottleneck-2026-11-18/o2-report.md#The table","docs/program/evidence/round3-2026-11-18/a1-report.md#(a) The rule for spending a refilling allowance","docs/program/evidence/round3-2026-11-18/a1-refute-2.md#A82","docs/program/evidence/round3-2026-11-18/papers/budget/linkedin/paper.txt#line 64","docs/program/evidence/round3-2026-11-18/papers/budget/smart-pacing/paper.txt#lines 196, 443"],"see":["o1-0401","o1-0403","o2-0400","o2-0401","o2-0403","o2-0406","r57-0003","r57-0123","r57-0407","a1-0302","a1-0304","a1-0306","a1-0400","a1-0401","a1-0514"],"note":"Replaces r57-0408, which said the allowance limits starts only when a window is nearly spent; the pacing rules read limit from u > s, but the gain they measured (campaign life, reach, cost per click; Yahoo and LinkedIn, self-reported) comes from spreading spend over a day, and a rule on spent over budget alone was slow to react at LinkedIn. r57-0405 before it mixed a rate into a budget. The minimum of the widths is argued in one paper for two limits; no program it tested had both. No number in the rule is set: each must be computed from measurements here (r57-0511).","handles":["decision rule","bottleneck","width","minimum","gate","admission","scheduling","tokens","budget","u against s","pacing"],"supersedes":["r57-0408"],"date":"2026-11-19","by":"r57"}
```

### Row 20. a1-0515 → r57-0409 (right in part)

- **Target says** (r57-0409, hypothesis, reasoned): "... with a cap on age so that none starves ... the token
  allowance enters the rule as one more width, which no paper read covers, so that part is reasoning alone."
- **Lane says:** papers read cover it in part. A unit must fit in every bucket (RFC 2698, ATM Forum TM 4.0) and is
  priced at the sum of the prices of the budgets it uses (Talluri and van Ryzin, bandits with knapsacks). Only the
  assembly for our windows is reasoning. Its age cap has a published alternative, a reservation for the oldest
  waiting unit (Lifka, Tsafrir).
- **Checked:**
  - `PB:rfc2698/paper.txt` lines 136-141: "If Tp(t)-B < 0, the packet is red, else ... the packet is green and both
    Tp and Tc are decremented by B." Stands.
  - `PB:gcra2/tm40.txt` line 1408: "if it conforms to all instances of the GCRA". Line 1412: "conforming only if it
    conforms to both instances". Stands.
  - `PB:talluri/paper.txt` lines 257-258: "if and only if there is available capacity and the fare exceeds the sum of
    the bid prices for all the units of capacity used". Stands.
  - `PB:lifka95/paper.txt` line 248: "which will not delay the start of User D, so it is allowed to start".
    `PB:tsafrir/paper.txt` lines 4119-4120: "keep reservation order FCFS ... no job will be backfilled if it delays
    the oldest job in the wait queue". Stands.
- **Recommendation: right in part.** Fit-in-every-limit and summed prices are published, but for limits of one kind:
  token buckets, rate contracts, and seats that are used up. Joining an allowance that is used up with widths that
  are given back (memory, processor, the check) is in no source read; it stays reasoning beside the assembly across
  windows. The reservation alternative is right.
- **Replacement:**

```json
{"id":"r57-0415","kind":"hypothesis","status":"reasoned","claim":"Untested: the next unit to start is chosen among the units whose needs fit what is free on every resource (fit is a filter, not the order), by the shortest expected check time, then the oldest, with a cap on age so that none starves, or instead a reservation for the oldest waiting unit that does not fit, which a later unit may not delay (published for parallel jobs: Lifka 1995, Tsafrir 2006); a unit queued for the check holds nothing else; the cheaper model does a unit only where its quality gap on that kind of work was measured small; the token allowance enters the rule as one more width: fitting every limit and pricing a unit at the sum of the prices of the budgets it uses are published for limits of one kind (RFC 2698, ATM Forum TM 4.0, Talluri and van Ryzin 1998, bandits with knapsacks), while their assembly for our five-hour and weekly windows and the joining of an allowance that is used up with widths that are given back (memory, processor, the check) are reasoning alone.","evidence":["docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md#The rule, step by step","docs/program/evidence/bottleneck-2026-11-18/BUILD-IN.md#1.4","docs/program/evidence/bottleneck-2026-11-18/o2-report.md#The table","docs/program/evidence/round3-2026-11-18/papers/budget/rfc2698/paper.txt#lines 134-141","docs/program/evidence/round3-2026-11-18/papers/budget/gcra2/tm40.txt#lines 1408-1412","docs/program/evidence/round3-2026-11-18/papers/budget/talluri/paper.txt#lines 255-258","docs/program/evidence/round3-2026-11-18/papers/budget/lifka95/paper.txt#lines 240-248","docs/program/evidence/round3-2026-11-18/papers/budget/tsafrir/paper.txt#lines 4118-4122"],"see":["o2-0310","o2-0403","o2-0404","o2-0405","o2-0407","o2-0501","b1-0410","b1-0506","r57-0005","a1-0312","a1-0314","a1-0317","a1-0318","a1-0342","a1-0343","a1-0403","a1-0406","a1-0515"],"note":"r57-0407 named fit and short jobs first without an order between them; Das and Sun (o2-0310) show that starting long light work before short heavy work can be Omega(n) worse. The reservation holds only if a unit is stopped at its length cap, which wastes its tokens.","handles":["next unit","order","fit","shortest first","age cap","cheaper model","reservation","one more width"],"supersedes":["r57-0409"],"date":"2026-11-19","by":"r57"}
```

### Row 21. a1-0516 → o2-0321 (right)

- **Target says** (o2-0321, result, quoted): "learned routers cut cost 3.66 times at 95 % of GPT-4 quality on MT Bench
  but only 1.41 times on MMLU and 1.49 on GSM8K".
- **Lane says:** the 3.66 times is fewer GPT-4 calls than random routing, not than all-GPT-4, to recover half the
  quality gap on MT Bench, where that is 95 % of GPT-4's quality. The MMLU 1.41 and GSM8K 1.49 are at 92 % and 87 %.
- **Checked:** `Q:o2-quota.md` line 87: "the saving is the inverse of the ratio of GPT-4 calls against a random
  router". Line 88: "cost saving over random routing: MT Bench 3.66x (CPT(50%), at 95% of GPT-4 quality) and 2.49x
  (CPT(80%)); MMLU 1.41x (92%) and 1.14x; GSM8K 1.49x (87%) and 1.27x". Stands. This is the o2 collector's quotation;
  the paper text is not in `PB:` (`R:a1-refute-2.md` A45 says the same).
- **Recommendation: right.**
- **Replacement:**

```json
{"id":"r57-0326","kind":"result","status":"quoted","claim":"RouteLLM (ICLR 2025, GPT-4 against Mixtral 8x7B): to recover half the quality gap, learned routers needed 3.66 times fewer GPT-4 calls than random routing on MT Bench (95 % of GPT-4's quality there), 1.41 times on MMLU (92 %) and 1.49 on GSM8K (87 %), and 2.49, 1.14 and 1.27 times to recover 80 %; routers trained only on chat data were no better than random on MMLU.","evidence":["docs/program/evidence/bottleneck-2026-11-18/o2-quota.md#lines 87-88"],"see":["a1-0332","a1-0516"],"note":"Read through the o2 collector's quotation of the paper (its txt 577-591), not the paper text. The saving is in GPT-4 calls priced in dollars, not tokens, and is counted against random routing, not against sending every query to GPT-4.","handles":["C8","router","RouteLLM","cheaper model","domain shift","random routing baseline"],"supersedes":["o2-0321"],"date":"2026-11-19","by":"r57"}
```

### Row 22. a1-0517 → o2-0320 (right)

- **Target says** (o2-0320, result, quoted): "... but lost 10.3 % at 40 % with a large gap (FLAN-t5 800m against
  Llama-2 13b)."
- **Lane says:** with the large gap the three routers lost 13.8, 13.1 and 10.3 % at 40 % routed to the small model,
  and only the transformed router beat random. The record gives only the best router's 10.3 %.
- **Checked:** `Q:o2-quota.md` line 96: "FLAN-t5/13b at 20% 5.8/5.8/4.7% and at 40% 13.8/13.1/10.3%". Line 98: "for
  the large gap only the transformed router worked beyond random, at 10.3% quality drop". Line 96 also: "All routers
  achieve 20% (40%) cost advantage with <= 1% (<= 4%) quality drop" for the medium gap. Stands. This is the o2
  collector's quotation, not the paper text.
- **Recommendation: right.**
- **Replacement:**

```json
{"id":"r57-0327","kind":"result","status":"quoted","claim":"Hybrid LLM (ICLR 2024, MixInstruct, BART score): routing by a learned quality-gap scorer sent 20 % / 40 % of queries to the small model for at most 1 % / 4 % quality loss with a medium gap (Llama-2 13b against GPT-3.5), but with a large gap (FLAN-t5 800m against Llama-2 13b) the three routers lost 13.8, 13.1 and 10.3 % at 40 %, and only the transformed router did better than random.","evidence":["docs/program/evidence/bottleneck-2026-11-18/o2-quota.md#line 96","docs/program/evidence/bottleneck-2026-11-18/o2-quota.md#line 98"],"see":["a1-0333","a1-0517"],"note":"Read through the o2 collector's quotation of the paper, not the paper text. Saving counted as share of queries, not tokens; no code tasks.","handles":["C8","routing","cheaper model","quality gap","Hybrid LLM","large gap"],"supersedes":["o2-0320"],"date":"2026-11-19","by":"r57"}
```

### Row 23. a1-0518 → x19-0701 (right in part)

- **Target says** (x19-0701, pointer, summary): "The record's own do_not list for D1 (near lines 337 to 347 of
  result.json) says no consensus, distributed locks or two-phase commit across sessions, and no speculative backup
  tasks for stragglers because they double token cost."
- **Lane says:** that reason does not hold as the literature does it: MapReduce, LATE and Dolly copy only the tail,
  within a few percent to 10 % of capacity. For model sessions a copy does pay a whole unit's tokens. So a copy is
  justified only when the time saved is worth the summed window price times its tokens, and the unit is slow from
  the run, not from more work.
- **Checked:**
  - `research-tree/SELECTIONS-MAP.md` line 152: "no speculative backup tasks for stragglers (they double token
    cost)". `docs/program/evidence/research-tree/foundations-2026-11-16/map/result.json` line 345: "Do not borrow
    speculative backup tasks for stragglers: they double the token cost." Line 341: the consensus item. The pointer's
    words stand.
  - `PB:mapreduce/paper.txt` line 158: "typically increases the computational resources used by the operation by no
    more than a few percent ... 44% longer". `PB:late/paper.txt` line 191: "SpeculativeCap to 10% of available task
    slots". Stand. `PB:dolly/paper.txt` lines 258-260: a budget, a fraction of the cluster's capacity, that bounds the
    clones; a1-0348 records cloning "every task of small jobs from the start, within a 5 % resource budget". Dolly
    is not tail-only.
- **Recommendation: right in part.** The pointer is accurate. Its reason holds for each copied unit, which pays up to
  a whole unit's tokens, as the lane itself grants. What the papers show is a cap on copies at a small share of
  capacity, not that copies are cheap. At 3 to 16 workers such caps allow no copy or one (a1-0407), so the do_not
  holds in effect. The replacement upgrades the pointer to quoted and carries the narrowing in its note. The source
  file is evidence and is not changed.
- **Replacement:**

```json
{"id":"r57-0708","kind":"pointer","status":"quoted","claim":"The foundations map's do_not list for D1 (result.json lines 336-347) says not to build consensus, distributed locks or two-phase commit across sessions, and 'Do not borrow speculative backup tasks for stragglers: they double the token cost'.","evidence":["docs/program/evidence/research-tree/foundations-2026-11-16/map/result.json#lines 341, 345","research-tree/SELECTIONS-MAP.md#line 152"],"see":["a1-0345","a1-0346","a1-0348","a1-0407","a1-0518"],"note":"The reason holds per copied unit, which pays up to a whole unit's tokens; the systems read cap copies at a small share of capacity (backups of the last tasks within a few percent in MapReduce, at most 10 % of slots in LATE, clones of small jobs within a 5 % budget in Dolly), so at 3 to 16 workers, where such caps allow no copy or one, the rule stands in effect; it is not a finding of the literature.","handles":["D1 do_not list","no two-phase commit sessions","speculative backup stragglers","double token cost"],"supersedes":["x19-0701"],"date":"2026-11-19","by":"r57"}
```
