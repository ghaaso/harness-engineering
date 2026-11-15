# R1 refute: a low ceiling on tokens, because files repeat and questions do not

Date: 2026-11-12. Issue sources: D1-I1 (D1-token-arithmetic.md) and D2-3 (D2-recurrence-compounding.md).
Verdict: **narrowed**. The core survives every fix I tried, and two corrections make the ceiling lower, not higher. Several numbers change.

Tags: [R] re-derived by my own script from the raw transcripts or git; [Rd] read from the fact sheets or first-round reports and not re-derived; [X] could not check.

## 1. What I did

My scripts are in this folder. They do not reuse the first-round scripts.

- `r1-extract.cjs` parses every transcript in the FixFlow main store and the 19 November Clinic stores. One line per API call: window, role, compaction segment, time, context tokens, output, and per tool use the read paths (Read tool and shell `cat`, `sed -n`, `head`, `tail`, `nl`, `Get-Content`), Grep pattern, shell command and result size. Clinic 15,921 calls (matches the record). FixFlow 7,640 calls; this session has added about 425 since D1 ran. I re-ran FixFlow without this session: results move by under 1 point.
- `r1-classify.cjs`: lookup-only share under three classifiers, with quoted strings removed before splitting a command.
- `r1-analyse.cjs`: file-level repeats, window-level and run-level question proxies, opening and orientation phases.
- `r1-carry.cjs`: carried cost of each file read (its tokens times the later calls in its window), and the direct cost of one extra lookup call per exploration run.
- `r1-runsample.cjs`: who the "repeat" runs are, with a random sample.
- `r1-model.cjs`: the upper-bound arithmetic with repeat shares measured at the run level.
- Git: counts on `main` of this repository.
- Web: the plan-caching paper (arXiv 2506.14852 v2), both halves.

## 2. The numbers, checked

| # | Claim in R1 | My figure | Result |
|---|---|---|---|
| a | Lookup-only calls carry 43.6 to 57 % of tokens | Clinic 39.0 / 40.3 / 46.5 % (strict / medium / loose); FixFlow 52.7 / 54.6 / 58.2 % [R] | confirmed, about 40 to 56 % |
| b1 | 54 to 89 % of read characters are on files an earlier window read | Clinic 75.5 % (main 81, subagents 72); FixFlow 65.4 % (main 16, subagents 70) [R] | corrected: 65 to 76 % per store |
| b2 | Windows with Jaccard ≥ 0.5 to an earlier window hold 0.6 to 16 % of tokens | Clinic 0.2 % of all tokens (subagents 1.3 %); FixFlow 11.0 % (subagents 15.0 %); main windows 0 in both [R] | confirmed in substance, 0.2 to 11 % |
| c1 | About 0 % at the design hit rate with a pull before every run | Pull costs 15.8 % (Clinic) and 10.9 % (FixFlow) of tokens, measured directly as one extra call per run; net −2.0 % and +4.1 % [R] | confirmed |
| c2 | 13 % with a push hook | 12.9 / 14.5 % at the design's 0.217 [R]. But 0.217 is above the measured question-level repeat share (0.12 to 0.20). At that share: 8 to 12 % | corrected, lower |
| c3 | 28 to 31 % at the best published hit rate (46 %) | 27.4 / 30.7 % [R arithmetic]. Not reachable here: a hit rate cannot exceed the repeat share | confirmed as arithmetic only |
| c4 | About 10 % for a perfect question-level oracle | 12.7 % (Clinic), 8.3 % (FixFlow) with run-level repeat shares [R] | confirmed, 8 to 13 % |
| c5 | 42 % for perfect per-file digests | 13 to 24 % if a digest lets a whole run be skipped; 4 to 9 % if it only replaces the lines (18 % on the fact base's wider fetched share) [R] | corrected, about 5 to 24 % |
| c6 | Half or more needs 71 to 83 % of runs skipped | 0.72 to 0.84 [R] | confirmed |
| d | Plan caching's 50 % cut came from a cheaper planner, not fewer tokens | The paper reports dollars only. Tokens were never counted [R, paper] | corrected: price is the stated mechanism; tokens unknown |
| e | Re-deriving solved defects is 0.3 to 1 %, at most about 4 % | Git: 48 to 51 fix commits of 233 non-merge on `main` (D1's "48 of 368" counts 135 merges), 11.5 % of added code lines [R]. The token share is a guess on a guess [X] | could not check |

Inputs I read and did not re-derive: the fetched share F (0.27 / 0.23), the carried own-output share OL (0.09), the token-weighted run lengths (11.1 / 21.1), the answer-size ratio (0.04).

### Notes on the corrections

**(a) Classifiers.** D1's strict classifier gave 16.5 / 24.8 %. It splits commands on `|` even inside quoted grep patterns, so `grep -E "a|b"` fails. With quotes removed, strict gives 39 / 53 %. The loose classifier counts polling loops (`until grep`, `timeout 295`, `break`) and runs (`uv run`, sourced deploy scripts) as lookups. Those are about 6 % of Clinic tokens. The medium classifier drops them: 40.3 / 54.6 %. The recorded 43.6 % sits inside the range.

**(b1) File repeats.** The issue quoted the two highest of D1's four role figures and left out FixFlow's main windows (13 % in D1, 16 % here). Per store the share is 65 to 76 %. One more fact matters. In FixFlow almost all of it is inside one session: only 4.4 % of read characters were read before in another session. These are parallel siblings of one fan-out reading the same plan. The Clinic's cross-session share is 66 %.

**(c5) The digest ceiling was too high.** D1 set the share of runs skipped (rh) to 0.49 to 0.66. Those are shares of read *characters* on files read before. A run can be skipped whole only if every file it reads is covered, and some runs read no file at all. Measured at the run level:
- Runs whose every file was read before (by anyone, any time): 37.9 % of exploration-run tokens (Clinic), 19.3 % (FixFlow).
- Runs that read no file (searches, listings only): 21 % and 17 % of run tokens.

So rh is at most 0.38 and 0.19. That gives 24.1 % and 13.4 %, before any staleness or edit filter. If a digest only replaces the lines and the calls still happen, the pool is the carried cost of file reads: 13.4 % of Clinic tokens and 8.9 % of FixFlow's, of which 78 % and 53 % is on files read before. A 10:1 digest saves 9.4 % and 4.3 %. On the fact base's wider fetched share (27 %, including search output) it is about 18 %.

**(d) The plan-caching paper.** Its metrics section says cost is computed from input and output tokens and API prices. No table or figure gives a token count. On a hit, a small model adapts the cached template in place of the large planner, and the actor still runs. The large planner is 94 to 98 % of APC's cost. An appendix says, without numbers, that the template shortens the execution log and avoids extra plan-act rounds. So "mostly price" is fair. "Not fewer tokens" goes beyond the evidence: tokens were not measured.

**(e) Why it cannot be checked.** Git `main` runs 2026-05-31 to 2026-08-03. The transcripts are October and November. No record splits tokens by fixing versus other work. Both first-round figures (D1: 0.8 to 3 %; D2: 0.3 to 1 %) multiply a guessed fix share by a measured repeat share. Even the top end (about 4 %) does not change the conclusion.

## 3. Trying to dissolve it

### 3.1 Is Jaccard ≥ 0.5 a fair proxy for "the same question"?

No. Jaccard punishes size differences. A 3-file subagent inside a 300-file session scores 0.01. So I tested an asymmetric measure, containment: the share of this unit's files that one earlier window also read.

| Proxy | Clinic | FixFlow |
|---|---|---|
| Window, Jaccard ≥ 0.5, share of all tokens | 0.2 % | 11.0 % |
| Window, ≥ 80 % contained in one earlier window | 2.5 % | 10.1 % |
| Same, earlier window finished first | 0.2 % | 6.6 % |
| **Exploration run**, ≥ 80 % contained in one earlier finished window, share of run tokens | 19.9 % | 12.0 % |
| Same, share of all tokens | 8.8 % | 6.7 % |
| Run, ≥ 80 % contained in one earlier run | 17.0 % | 14.7 % |
| Multi-file runs only, contained ≥ 80 % | 8.9 % | 5.7 % |
| Grep tool calls: same pattern and path seen in another window (share of grep output) | 0 % | 4.9 % |

The run is the unit a library would skip, so the run-level line is the fair one. It is still small. And it overstates "same question":
- 52 to 55 % of the contained-run tokens are single-file runs. Those are file repeats, not question repeats.
- In FixFlow, 99 % of contained-run tokens were contained in a sibling of the same session, with a median gap of 0 hours. These are parallel agents reading the same plan for different questions. A cache that fills only after a solve cannot serve them.
- A random sample in the Clinic shows a slice session re-reading a file that its own reviewer or implementer read an hour earlier. Different purpose, same file.
- Exact repeated searches are near zero.

The proxy was unfair, but the fairer proxy gives the same answer.

### 3.2 Could a library serve sub-questions when overlap is partial?

That is what the run-level measure counts: a run can be contained even when its window overlaps little. It lifts the oracle from about 10 % to 8 to 13 %. Shape-level reuse (a recipe for a new slice of a known shape) is invisible to file proxies. The coding evidence on it is weak: ReasoningBank cut SWE-bench steps by 6 to 9 %; SWE-Exp used 7.5 % more tokens; model-written context files raised cost by 20 to 23 %; the import-graph sample judged 0 of 200 search steps likely saved [Rd, F3 to F6]. On a mix where build work is about 36 % of spend, that is about 2 to 5 % more.

### 3.3 Are per-file digests a fair part of the library?

Yes for E1. The v2 design names "something shorter than the lines" as the form that could pay. But:
- The ceiling is 5 to 24 %, not 42 % (section 2).
- Whether a digest can stand in for lines is unmeasured. Outside evidence is mixed [Rd, F3 §5]: one memory system used about 10x fewer tokens at answer quality 0.83 against 0.92; one Claude Code graph study cut 17 to 39 % on two benchmarks and raised tokens on a third; the Clinic's compact packet gave the same acceptance with no token gain shown; a compaction adapter used 6 to 17 % more.
- Files that will be edited need their exact lines. 74 % of fetched tokens go to files the window did not edit.
- A digest is a summary any model can write. It is not the top model's reasoning, and it is bound to one repository. It does nothing for E3 or E4.

### 3.4 Would a lookup at session start remove whole phases?

I measured the orientation phase: everything before a window's first edit, write or run, plus its carry to the end of the window.
- Main windows: 8.1 % of main tokens (Clinic), 5.9 % (FixFlow). A state-and-recipe answer could replace part of it, not the code the slice must read.
- Subagents: 61 % and 55 % of their tokens. But for research and review agents the reading is the task. The share contained in an earlier finished window is 1.2 % (Clinic) and 9.1 % (FixFlow) of subagent tokens.

Together this is a few points, and it overlaps the per-call arithmetic, because opening runs are already runs. It does not lift the ceiling.

### 3.5 Push hook, sharing across projects, more entries over time

- Push removes the lookup-turn cost. At the measured repeat share it gives 8 to 12 %, assuming every repeat is found and none needs a verify.
- Sharing across projects adds stock, not repeats in this project. Digests do not transfer.
- More entries do not lift a ceiling set by the repeat share. D2 found repeats come in bursts days apart.

## 4. What survives

The ceiling is real and lower than R1 said for digests. A cache of conclusions saves tokens only where a session asks something already answered. Files are re-read heavily; questions are not. A perfect question cache gives 8 to 13 %. Perfect file digests give at most 13 to 24 %, in one repository, and are not reasoning reuse. "Massive" needs 72 to 84 % of exploration runs to be skipped.

**Strongest counter.** The record is short and mostly harness, design and research work. A long build-heavy run (the ship plan's 40-odd phases) might repeat questions more, and file proxies cannot see shape-level repeats. Against it: the Clinic store is build work and shows the lowest question overlap; repeats come in short bursts; coding-recipe evidence gives single-digit step cuts.

## 5. What the owner can do

Measure before building. The v2 design already plans a zero-token replay. Add one count to it: label about 200 exploration runs by whether an earlier session had already answered the same question. That costs a few agent-hours and no build. If it comes out under about 20 %, drop "massive" as a goal for the library. Take the cuts that need no repeats instead: a window ceiling, a smaller subagent prefix, fewer review rounds (D1 §8). Digests for the hot read set (72 paths hold half the fetched tokens) are the largest library-shaped saving. They cost a staleness check per file, help one project, and do not carry reasoning.

## 6. Files

- `r1-extract.cjs` → `calls-cl.jsonl`, `calls-ff.jsonl`
- `r1-analyse.cjs` → `an-cl.json`, `an-ff.json`, `an-ff-excl.json` (FixFlow without this session); `show.cjs` prints them
- `r1-classify.cjs`, `r1-carry.cjs`, `r1-runsample.cjs`, `r1-model.cjs` (output printed to the terminal; figures copied above)
