# D1. Token and time arithmetic for the library (E1, E2)

Date: 2026-11-12. Area: how many tokens and how much wall-clock time a library of cached conclusions can save, at best.
Tags: [M] measured today or in the fact base, [E] estimate, [I] guess, [D] arithmetic on the others.
Scripts and outputs are in this folder (listed at the end). Everything here is read-only on the repositories.

## 0. Bottom line

1. The lead's first premise does not hold, but its conclusion mostly does. "Output is 0.75 % of tokens, so derivation is not where the tokens are" is the wrong framing. In an agent, working something out *is* a run of calls, and every call re-reads the window. Calls that only read or search carry 43.6 to 57 % of all tokens [M]. A hit that skips such a run removes those calls in full. So a library is aimed at the right pool. The ceiling is set by something else: **how much of that pool repeats something already solved**, in a form an entry can answer.
2. Measured today: **files repeat, questions do not.** 54 to 89 % of the characters a window reads come from files that an earlier window also read [M]. But no window's reading set overlaps any earlier window's by half or more, except in 0.6 to 16 % of tokens [M]. Each session needs a new combination of familiar material.
3. Filled in, the upper-bound model gives these net token savings:
   - about 0 % at the design's own guessed hit rate, if a lookup turn is taken before every exploration run;
   - 13 % with the same hit rate if lookups are pushed by a hook;
   - 28 to 31 % at the best published hit rate (plan caching, 46 %);
   - 10 % for a perfect library that holds conclusions to questions asked before;
   - 42 % for a perfect library of per-file digests (short summaries) that can stand in for reading the file;
   - 64 to 70 % only if every exploration step disappeared.

   "Massive" (half or more) needs 71 to 83 % of all exploration runs to be repeats that are skipped whole.
4. Time is a different quantity from tokens. A call's latency is about 2 to 3 s plus 7.5 to 9 s per 1,000 output tokens. Window size adds about nothing [M, fit over 21,620 calls]. The re-reads that are 97 % of tokens cost almost no time. Lookup-only calls are 39 to 43 % of model time [M]. Model time is 51 % of a lane's active machine time in the Clinic and 86 % in FixFlow [M]. The rest is mostly tests and checks. So even a perfect "skip all exploration" library saves at most 22 to 34 % of one lane's machine time. The build-level pace is set by the check, review and merge gates unless tokens are the binding limit.
5. Changing the model tier changes the price per token (Opus to Sonnet 2:1 today) and not the token count. The record and the vendor's figure both point to the same or more tokens per finished task on the cheaper tier.

## 1. What was measured today (new numbers)

All from the local Claude Code transcripts and the Clinic repository's git history. Read-only.

| # | Measurement | FixFlow (main store) | Clinic (Nov stores) | Script |
| --- | --- | --- | --- | --- |
| T1 | Calls with timing | 7,112 | 15,921 | timing.cjs |
| T2 | Model latency fit, per call (calls answering a tool result, under 900 s) | −0.4 s + 9.2 s per 1k output + 1.3 s per 100k context | 3.2 s + 7.5 s per 1k output + 0.0 s per 100k context | tan.cjs |
| T3 | Share of model time explained by output / context | 89 % / 14 % | 75 % / 0 % | tan.cjs |
| T4 | Model time vs tool time (hours) | 25.5 vs 4.3 | 52.2 vs 49.7 (Bash, mostly the check) | tan.cjs |
| T5 | Seconds per 1k output by model | Opus 9.2, Sonnet 6.5, Fable 10.6 | Opus 8.7, Sonnet 6.0, Fable 11.4 | tan.cjs |
| R1 | Lookup-only calls, loose classifier (any shell command without a write or run verb) | 69 % of calls, 57 % of tokens | 56 % of calls, 45 % of tokens | runs-loose.cjs |
| R2 | Mean length of a run of consecutive lookup-only calls (count / token-weighted) | 5.25 / 21.1 | 3.76 / 11.1 | runs-loose.cjs |
| R3 | Same with a strict classifier (only read verbs) | 1.91 / 4.48 | 1.73 / 3.38 | runs.cjs |
| R4 | Lookup-only calls' share of model time / of output | 39 % / 33 % | 43 % / 37 % | runs-loose.cjs |
| O1 | Share of read characters on a path some earlier window also read (token-weighted over windows) | subagents 64 %, main 13 % | subagents 89 %, main 54 % | overlap.cjs |
| O2 | Share of window tokens whose read set overlaps an earlier window's at Jaccard ≥ 0.5 / ≥ 0.8 (Jaccard: shared files ÷ all files of the two sets) | subagents 16.1 % / 7.0 %; main 0 / 0 | subagents 6.5 % / 0 %; main 0.6 % / 0 | overlap.cjs |
| C1 | Read characters: first read ever / repeat only inside the same window / repeat of a tracked file read in another window | – | 19.1 % / 7.1 % / 42.6 % | churn.cjs |
| C2 | Of those cross-window repeats of tracked files: file unchanged on main since the earlier read / unchanged on any branch | – | 81 % / 69 %; median gap 1.1 h | churn.cjs |
| S1 | Read size: mean / median / token-weighted median (characters) | 3,707 / 1,554 / 9,800 | 3,343 / 1,198 / 10,717 | inline |
| S2 | Share of read characters in reads larger than the 860-token answer cap | 86 % | 87 % | inline |
| W1 | Token share above a context cap of 150k / 200k / 367k (gross, before re-fetch after compaction) | 26 / 18 / 7 % | 49 / 38 / 16 % | inline |
| W2 | Opening exploration (calls before the first non-lookup call) as share of subagent tokens | 53 % | 60 % | orient.cjs |

Caveats. The R1 loose classifier reproduces the recorded exposure (43.6 % for the Clinic, 55 % for FixFlow), so its run lengths are the ones used below. The strict classifier is a lower bound on run length.

Latency is the time from the tool result to the last block of the reply. Rate limits or parallel work may add noise.

The read events cover the Read tool and single-file `cat`, `sed -n`, `head`, `tail` and `nl` commands. Greps are not included.

Git changes are counted at commit time. Uncommitted edits are invisible, so file churn is undercounted.

The FixFlow transcripts are the main store only. This session is in that store.

## 2. The upper-bound model

Token use is calls × window. A library can only remove calls and the content those calls would have put in the window. Write:

`S = rh × [ e × (1 − (cv + kp)/mt) + (F + OL) × (1 − e) × (1 − af) ] − c × q × e / mb`

- `rh` is the repeat share times the hit rate: the share of exploration runs that repeat something the library holds *and* that the library finds, verifies and lets the session skip.
- `e` is the token share of lookup-only calls: 0.451 (Clinic), 0.567 (FixFlow) [M, R1]. The design uses 0.436.
- `mt` is the token-weighted run length, the calls one hit removes: 11.1 or 21.1 [M, R2]. `mb` is the count-weighted run length, which sets how many runs there are to ask about: 3.76 or 5.25 [M, R2].
- `cv` is the verify turns per hit at the caller's window: 0 to 2. KS says a native verify adds 2 to 3 turns.
- `kp` is 1 if the answer is pushed by a hook. The call that issues the first command of the run still happens.
- `F` is the fetched-content share of tokens: 0.27, or 0.23 for FixFlow [E, fact base]. `OL` is the lookup calls' own output that is carried forward: about 0.09 (own-output share 0.26 × lookup share of output 0.33 to 0.37) [D].
- `af` is the answer size over the content the run would have added. The 860-token cap against an average run of about 11 calls × (1,390 read + 600 own) tokens gives about 0.04 [D].
- `c` is the model turns per lookup: 1 for pull, 0 for push. `q` is the share of runs that trigger a lookup: 1 for "ask before exploring".

Time, for one lane: `model-time saving = rh × Lt × (1 − (cv + kp)/mt) − c × q × Lt / mb`, with `Lt` = 0.43 (Clinic) or 0.39 (FixFlow) [M, R4]. Lane machine-time saving = `M ×` that, where `M` = 0.51 (Clinic) or 0.86 (FixFlow) is the model share of active machine time [M, T4].

Two direct results:
- **Price of a lookup turn when asking before every run** is `e / mb` = 12.0 % (Clinic), 10.8 % (FixFlow), 9.5 % (strict) of *all* tokens per turn [D]. The design's model uses 2 % (`lookupCost` 0.02). The refuter flagged the omitted re-read (item 13). The design noted it and left it out of the calculator.
- **The answer's own carry** is 860 tokens × about 260 remaining calls ≈ 0.73 of one call at 306k [D]. A hit removes about 11 calls (token-weighted). Point (b)'s "the answer stays in the window" is small. Its "every lookup is a call" half is not, unless lookups are pushed (section 6).

## 3. The three cases (net share of tokens; model time; lane time)

Output of `model.cjs`:

| Case | rh | Tokens: gross, overhead, **net** | Model time | Lane machine time |
| --- | --- | --- | --- | --- |
| A0 design formula as written (`e×h − 0.02`) | 0.217 | **7.5 %** | not modelled | not modelled |
| A1 design hit rate, pull before every run, KS verify (2 turns) | 0.217 | 12.2, 12.0, **0.2 %** | −3.8 % | −1.9 % |
| A2 same, no verify | 0.217 | 13.9, 12.0, **1.9 %** | −2.1 % | −1.1 % |
| A3 same hit rate, pushed by a hook, no verify | 0.217 | **13.0 %** | 8.5 % | 4.3 % |
| B1 coding-memory evidence: ReasoningBank on SWE-bench Verified, steps 30.3→27.5 and 21.1→19.8 (F4); SWE-Exp tokens +7.5 % (F5) | – | **about 6 to 9 %**, or a rise | – | SWE-Exp wall time +25 % |
| B2 plan-caching hit rate 0.46 (APC at cache size 100), push, no verify, Clinic shape | 0.46 | **27.6 %** | 18.0 % | 9.2 % |
| B3 same, FixFlow shape | 0.46 | **31.0 %** | 17.1 % | 14.7 % |
| C1 oracle that holds every conclusion to a question asked before. rh ≤ 0.16, the highest share of tokens whose read set overlaps an earlier window's | 0.16 | **10.3 %** | 6.9 % | 3.5 % |
| C2 oracle of per-file digests that can stand in for lines. rh 0.49 to 0.66: unchanged cross-window repeats, less the 26 % read for editing | 0.66 | **42.3 %** | 28.4 % | 14.5 % |
| C3 oracle that removes all exploration | 1 | **64.1 %** (Clinic), **70.0 %** (FixFlow) | 43 % / 39 % | 21.9 % / 33.5 % |

Break-even `rh` for pull before every run: 0.19 (no verify) and 0.21 (KS verify) for the Clinic, 0.15 for FixFlow and 0.24 with strict runs. The design's guessed steady state is 0.217. **As designed, "ask before exploring" nets about zero at its own hit rate.**

The defect-only scope (KS triggers: error, escalation, diff) is small. Fix commits are 48 of 368 on main, 13 %. Assume fix work is 13 to 30 % of tokens [I]. Exact same-cause repeats are 3 to 5 of 48 (6 to 10 %) [M]. Then a perfect library on repeats saves **0.8 to 3.0 % of all tokens** [D]. At the pattern level (17 to 45 % of fixes in many-contributor studies, F2) it rises to 2 to 13 %. But pattern-level knowledge is what CLAUDE.md and checklists already carry.

Why plan caching (APC) is an optimistic stand-in. Its 46 % hit rate comes from QA workloads with recurring query templates. A build backlog is distinct slices by construction.

Its 50 % cost cut is mostly a **price** effect. A hit replaces the large planner (GPT-4o) with an 8B model that adapts a template, and the actor's work still runs. In token terms that is the tier swap of section 5, not fewer tokens.

The GAIA result (−76 % cost although tasks "rarely recur") shows the same thing. Generic plan templates let a cheap planner stand in. That is a price lever.

## 4. What "massive" would require

Solving `S = 0.5`:
- With no lookup overhead and no verify, `rh` ≥ 0.78 (Clinic shape) or 0.71 (FixFlow shape).
- With a hook push (the first call of each run kept), `rh` ≥ 0.83.

So **at least 71 to 83 % of all exploration runs, by tokens, must repeat something already stored, be found, and be skipped whole.** For that, the workload would need these properties:
- Sessions keep asking questions that earlier sessions already answered. Today read-set overlap ≥ 0.5 covers only 0.6 to 16 % of tokens [M, O2].
- Or a short digest can replace reading a file for most purposes. That is unmeasured (V2:87). Outside evidence: a Claude Code graph study cut 17 to 39 % on two benchmarks and raised tokens on a third; Codebase-Memory used about 10× fewer tokens at answer quality 0.83 vs 0.92 (F3 §5.7). The Clinic's own compact-packet trial showed identical acceptance and near-identical time (F3 §5.2).
- The hit costs no verify turns. KS requires a verify before acting.

None of these holds in the record. The "over time" part does not lift the ceiling. The hit-rate curve saturates at its top hit rate, which is the repeat share, a property of the workload. And the design's success path ("an entry seen three times becomes a check, then retires") drains the pool of repeats the lookups could hit. In this repository every exact repeat already ended in a structural guard without a library (F2).

## 5. Wall-clock time (E2)

- Per call [M, T2/T3]: about 2 to 3 s fixed plus 7.5 to 9 s per 1,000 output tokens. Window size explains 0 to 14 % of model time. The cached re-reads (97 % of tokens) are nearly free in time. **Tokens and time come apart.** Time follows calls and output, and thinking is 45 % of output.
- Per lane [M, T4/R4]: lookup-only calls are 39 to 43 % of model time. Model time is 51 % (Clinic) or 86 % (FixFlow) of active machine time; tool time is mostly the check (367 s per run). A library cannot shorten a test run.
  - Oracle that removes all exploration: 22 to 34 % of a lane's machine time.
  - Best published hit rate: 9 to 15 %.
  - Design guess with push: 4 %. With pull before every run it is negative.
- Per build: speed = lanes × per-lane throughput, up to the lowest of four limits (V2 §0). The four are the check, the review, the merge and the token window.
  - If tokens bind (the October fit, about 2.5 lane-hours), a token saving S buys at most 1/(1 − S) more lanes until the review or check binds: S = 13 % gives ×1.15, 28 % gives ×1.39, 42 % gives ×1.72.
  - If the review or check binds (V2's v2 case), the library adds nothing to build pace.
  - The design says "fewer lookup steps would also save time; that is not modelled" (V2:64).
- Verify and recording cost time. A Docker verify takes 1 to 5 minutes; native verify adds 2 to 3 turns of 10 to 15 s each. Recording a solve takes 10 to 20 minutes per phase that records (KS L476).

## 6. Check of the lead, point by point

- **(a) Only the repeat share**: stands. It is the binding term (sections 3 and 4).
- **(b) The lookup is a call that re-reads the window**: as designed (pull before every run) it costs 9.5 to 12 % of all tokens per turn, so net ≈ 0 at the guessed hit rate. **A hook push dissolves most of it.** A local lexical match on each tool call's path, pattern or error text costs no model turn on a miss and injects only on a hit (case A3: 13 % instead of 0 %).

  The trade: push gives up the pull-only stance KS chose (always-loaded or pushed context raised cost by 20 % or more in the AGENTS.md study, and agents comply with wrong memories). It also cannot see a question that exists only in the model's thinking. The answer's carry is small (0.73 of a call per hit).
- **(c) Prefix, carried output and summaries are out of reach**: partly dissolves. A hit that removes an episode also removes its carried output. A hit that removes a whole subagent removes that agent's fixed prefix (about 60k per call in FixFlow).

  That route is bounded by question-level repeats. Subagent tokens are 72 % of the FixFlow store and 19 % of the Clinic's [M]. The overlapping share is 16.1 % and 6.5 % [M, O2]. The product is ≤ **11.6 %** (FixFlow) and ≤ **1.2 %** (Clinic) of all tokens.
- **(d) A tier swap changes price, not count**: stands, and is checked in issue I3 below.

## 7. The opposite of the lead: whole sessions or phases

Three routes that per-call arithmetic could miss:
1. **Whole subagents.** Discovery agents spend 53 to 60 % of their tokens on their opening exploration [M, W2]. If a library answered the dispatch question, the whole agent and its prefix would go. Bound: 1.2 to 11.6 % of tokens [D] (section 6). The largest pool is FixFlow's research fan-outs, where fact-gathering agents re-read compiled documents.
2. **Whole rework rounds.** The Clinic averaged 2.8 rounds per slice, and 64 % of reviews sent a slice back [M]. Every round re-reads the slice's context. If a share `s` of send-backs repeats an earlier finding and a stored lesson prevents it, slice tokens fall by about 0.64 × s (for example 16 % at s = 0.25) [D].

   This is the one large pool outside exploration. But its working form is a check or gate clause, which runs without any lookup. The V2 fix-round contract (two rounds at most) takes part of it with no library. Nothing measures `s`. The measurement: label each send-back finding by whether an earlier slice had the same finding.
3. **Whole phases** (research or design already done). Harness-meta, research and design are 24.8 %, 10.0 % and 14.7 % of cost [M]. Reusing them works through documents that exist anyway (design docs, CLAUDE.md, skills). A library adds lookup over them. Unmeasured. The measurement: the share of research-session tokens whose conclusion was already on disk at session start.

So routes exist that remove more than steps. The one that is measured (subagents) is small. The large one (rework) belongs to checks.

## 8. Levers that need no library

| Lever | Ceiling on the record | Needs a repeat share? |
| --- | --- | --- |
| Cap the window at 200k | gross 38 % (Clinic), 18 % (FixFlow) of tokens sit above the cap [M, W1], less what compaction re-reads | no |
| Strip the subagent prefix (about 50k of 60k is schemas) | prefix is 46.5 % of FixFlow tokens and 18.7 % of the Clinic's; removing two-thirds ≈ 31 % / 12 % [D] | no |
| Fewer steps (batch lookups, fewer rounds) | 2.8 → 2 rounds ≈ 29 % of slice tokens [D]; batching is disputed in the record | no |
| Tier by price | 2:1 per token Opus:Sonnet, 4:1 Fable:Sonnet; token count unchanged | no |
| Library, best published hit rate | 28 to 31 % | yes |

The shares multiply rather than add. The library's saving is a share of the window, so after a cap and a prefix strip (say −40 %), a 13 % library saving is 7.8 % of the original. A cap also makes more windows and so more cross-window re-reading, which enlarges the library's exposure. The no-library levers reach the same range as the library's best case without depending on the workload repeating.

## 9. Issues that stand

### I1. Repeats live at the file layer, not at the question layer

Claim: the share of work a conclusion cache can serve is small, because each session asks a new combination of questions over familiar files. Only file-level digests reach a large share, and those are an unproven compression layer that cannot cross projects.

Numbers: read-set overlap ≥ 0.5 covers 0.6 to 16 % of tokens [M]. Files read before cover 54 to 89 % of read characters [M]. A perfect question-level oracle gives 10 % net. Exact defect repeats give 0.8 to 3 %. The best published hit rate gives 28 to 31 %. Massive needs rh ≥ 0.71 to 0.83.

Best fixes:
- Generalised or pattern entries → partly. Patterns already sit in CLAUDE.md and checklists; at most 2 to 13 % on the defect scope.
- Per-file digests → partly: 42 % only if digests stand in for lines (unmeasured, with outside quality costs), and bound to one repository.
- Plan templates → partly: price, not tokens.
- More entries over time → fails: saturates at the repeat share, and promotion to checks drains it.

Residual: E1 realistic 6 to 31 %; massive not reachable unless digests replace reading. E4 gets only the small transferable part.

### I2. The library targets the part of the work that costs little time

Claim: time follows output and calls, not window size, and a lane's time is half tests and checks. So even a perfect library saves at most about a third of a lane's machine time, and nothing at the build level when a gate binds.

Numbers: latency about 3 s plus 8 s per 1k output, with context adding about 0 [M]. Lookup-only calls are 39 to 43 % of model time [M]. Model time is 51 to 86 % of machine time [M].

Best fixes:
- Push to avoid lookup turns → partly (4 to 15 % per lane).
- Raise lanes when tokens bind → partly (×1.15 to ×1.39 at realistic S, until the review or check binds).
- Library-free time levers → container check (367 → 230 s), parked waits, the fix-round contract.

### I3. A tier swap is a price lever, not a token lever

Claim: for E1 (tokens), moving work to Sonnet gains nothing at equal steps, and the evidence points to more tokens per finished task.

Record: Sonnet slice calls read about 440k per call against 222k on Opus. This is a window effect (1M vs 367k), not a trial. Output per call is about equal by tier (Opus 1,106 to 1,258, Sonnet 978 to 1,395) [M].

Vendor figure: Opus 4.5 matched Sonnet 4.5's best result with 76 % fewer output tokens. A cheaper tier that needs more output at the same output per call needs more calls, and calls × window is the token count.

Time: Sonnet generates about 1.4× faster per output token [M, T5]. It wins on time only if it needs less than about 1.4× the output.

Best fixes:
- A context ceiling on every model → dissolves the window part.
- Route by measured tokens per accepted slice → partly. It stops swaps that cost more, but then E3 feeds E1 only where the cheaper tier is not less efficient.

Today Sonnet 5.5 beats Opus 5.5 on Terminal-Bench 4.0 (70.6 vs 66.4), so the size of the effect is unknown. The measurement: tokens per accepted slice, Sonnet with the library vs Opus without, on matched slices.

## 10. Dissolved

- "Derivation is not where the tokens are": wrong framing. Derivation is runs of calls, and those calls carry 43.6 to 57 % of tokens.
- The lookup-turn cost (b): real as designed (12 % per turn, net ≈ 0 at the guessed hit rate), but a hook push removes the miss cost. The answer's carry is 0.73 of a call per hit.
- The prefix being out of reach (c): whole-agent removal takes the prefix with it, bounded at 1.2 to 11.6 % of tokens.
- The answer being no shorter than a read: false. The token-weighted median read is about 4,000 to 4,300 tokens, 5× the 860-token cap, and 87 % of read characters sit in reads above the cap.
- Code churn making file-level entries stale: false for this workload. 81 % of cross-window repeats of tracked files found the file unchanged on main (median gap 1.1 h).

## 11. Files

- `timing.cjs` → `ff.jsonl` and `cl.jsonl` (per-call latency, output, context, tool time); analysed by `tan.cjs`.
- `runs.cjs` (strict) and `runs-loose.cjs` (loose) → `runs-*.json` and `runsL-*.json` (lookup-run lengths and time shares).
- `reads.cjs` → `reads-cl.jsonl` and `reads-ff.jsonl` (read events); `churn.cjs` (cross-window repeats against git changes; inputs `git-main.txt` and `git-all.txt`); `overlap.cjs` (read-set overlap with earlier windows).
- `orient.cjs` (opening-exploration share).
- `model.cjs` (the upper-bound model and the three cases).
