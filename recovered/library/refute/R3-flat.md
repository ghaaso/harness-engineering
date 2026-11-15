# R3 refuter: "the hit rate follows the workload's repeat rate, not the library's size, so it does not compound"

Verdict: **narrowed**. Confidence about 0.75.

What survives: for the solved-problem half of the library, verified hits are capped by how often a hard defect is a repeat, times the share a check can confirm. That cap is low (central 0.5 to 4 % of hard encounters) and a larger stock cannot lift it. What does not survive: (a) "flat" is not shown, because 64 days of history cannot see long gaps; (b) the footprint-churn figures overstate staleness; (c) other things do recur at session rate, far above the defect rate, but they are machine facts, owner corrections and re-reads, served by push files or an index, and they saturate at a handful of entries; (d) the comparison with harness v2's 0.22 curve compares two different quantities.

Scripts and outputs in this folder: `R3-git.cjs` → `R3-git.json`; `R3-scan.cjs` → `R3-errors.jsonl`, `R3-windows.json`; `R3-templates.cjs` → `R3-templates.json`; `R3-envfacts.cjs` → `R3-envfacts.json`. All read-only over the repository and the transcripts. Other files in this folder (`cl-r5.jsonl`, `ff-r5.jsonl`, `r4/`, `r5-extract.cjs`) belong to other refuters.

## 1. The numbers

### Re-derived by my own method

| Claim | First round | Mine | Result |
|---|---|---|---|
| Repeat gaps | 8 h, 1.3 d, 6.5 d, 23 d | 7.9 h, 31.6 h, 6.44 d, 22.74 d (author dates on main). Also 5.2 h (expo-audio, a wrong first fix) and 16.0 d (Sentry gradle plugin, ex8, first fix stranded off main) | confirmed |
| Fix footprints change within a median of 0.71 days | D2 | 0.71 d is the median **of the 41 footprints that changed at all**. Over all 50 (9 never changed) the median is **3.7 days** | corrected |
| 41 of 50 within 30 days | D2 | 21 within 1 d, 31 within 7 d, 41 within 30 d, 9 never: same, with "any file of the footprint" | confirmed, but see next two rows |
| Per file, not per footprint | not measured | Of 247 footprint files: 16 changed within 1 h (6.5 %), 48 within 1 d (19 %), 79 within 7 d (32 %), 112 within 30 d (45 %). Most footprints have several files, so "any file changed" runs fast | new |
| Does the fix itself survive the churn? | not measured | The fix's own added lines (12+ non-space characters) are still present verbatim: median **100 %** at +7 d (n 43), +30 d (n 23) and at main's head (n 50). 47 of 50 fixes keep at least half. Of the 41 footprints that changed within 30 d, 33 keep 90 % or more of the fix's lines at head | new |
| Repeat share r, 2 to 10 % | D2 | 3 to 5 of 48 to 50 = 6 to 10 %; the 95 % interval on 5/50 is 3.3 to 22 %, on 3/48 1.3 to 17 %. The 2.1 to 3.2 % long-history literature figure I only read (F5) | confirmed as a central range; poorly pinned |
| Share a check can confirm, v = 0.25 | D2: 1 of 4 | ex8 (Sentry plugin, 06-10 on a branch, re-solved 06-26 on main) is a true repeat with a lead-capable probe, so 2 of 5 = 0.4. ex7 (empty DSN) was a one-off (introduced 07-18, fixed 07-20). 95 % intervals: 1/4 → 0.006 to 0.81; 2/5 → 0.05 to 0.85 | corrected to 0.25 to 0.4; essentially unmeasured |
| Verified h = r × v, 0.5 to 2.5 % | D2 | 0.5 to 4 % central. In the best form, with Docker test-id checks (KS-6b), code-behaviour repeats can also return `applies`, so v could reach about 0.75 and h about 7.5 % | corrected upward |
| KS-9 stop rule expected to fire (P ≥ 3 hits in 20) | D2: 0.0 to 1.3 % | 0.1 % at h 1 %, 1.3 % at 2.5 %, 4.4 % at 4 %, about 19 % at 7.5 %, 32 % at 10 % | confirmed in direction; pass chance up to about 19 % in the best-form corner |
| V2 curve 0.22 at 133 entries | D2 | 0.25 × 133 / 153 = 0.217; 0.05 at 5 entries (V2 L56 formula) | arithmetic confirmed; comparison is wrong (section 4) |

### Read only

- D1's 81 % (cross-window re-reads of a tracked file that found it unchanged on main). I read `churn.cjs`: it runs on the **Clinic** repository and the November Clinic transcripts, median gap 1.1 h. Not re-run.
- Literature rates (F5): 2.1 to 3.2 % of fixes rebuildable from past fixes in the same project; 15 to 20 % of bugs with repeated fixes (unconfirmed); KS X-05 quotes 17 to 45 % recurring fix *patterns* in population studies.
- The proponent's research overlap: 15 of 43 sources (35 %) already in the owner's record within about ten days. I read the script, did not re-run it.

### Could not check

- Repeats with gaps beyond about a month (see section 2).
- v beyond five pairs.
- Whether hits from the session-rate classes (section 3) save tokens rather than add a lookup.

## 2. Attack: 64 days cannot see long gaps

Detection depends on how long after a fix the history keeps running. With the actual fix dates (19 in June, 29 in July, 2 in August, none since):

| Gap | Fixes whose repeat could still land on main |
|---|---|
| 7 d | 43 of 50 (86 %) |
| 14 d | 41 (82 %) |
| 23 d | 29 (58 %) |
| 30 d | 23 (46 %) |
| 45 d | 17 (34 %) |
| 60 d | 1 (2 %) |
| 90 d | 0 |

So "repeats come within days" is partly what the window can see. Short gaps are real: three or four of five repeats fell where detection is above 80 %. The right tail is invisible. An SDK upgrade (the app pins SDK 52, five versions behind) could bring back old build traps months later. **"Flat" is therefore unproven.** What holds whatever the gap distribution: a bigger stock can only move hits toward r × v. It cannot raise r. Long histories in the literature put r at 2 to 3 % at the instance level. So the robust claim is "capped low", not "flat".

## 3. Attack: commit history undercounts repeats

This attack succeeds on count and fails on value.

### Transcripts (37 days, 2026-10-06 to 11-12; 2,584 windows, 78 sessions, 46,303 API calls, every project store on this PC)

1,904 error or signature records, 666 templates, 108 templates seen in two or more sessions. The recurring ones that are facts, not slips:

| Fact | Occurrences (failed calls) | Windows | Sessions | Projects | Span |
|---|---|---|---|---|---|
| `python` not on PATH | 378 (252) | 343 | 54 of 78 | 9 | whole 37 days |
| Apostrophe breaks a `-c`/`-e` quoted command | 134 (134) | 94 | 41 | 6 | 12 days |
| `pdftoppm` not installed | 67 (67) | 52 | 15 | 6 | 27 days |
| File name too long | 21 (11) | 18 | 9 | 4 | 10 days |
| Missing CLIs (railway, eas, pkill, bc, jq) | 8 (2) | 7 | 5 | 2 | 12 days |

- Four facts give 600 of the 609 occurrences. 467 were failed calls: **about 1 % of calls**. At one extra call each, at the windows' mean context (about 230 to 260k where I could join it), that is roughly 1 % of tokens.
- Each recurrence costs about one call: 378 python hits in 343 windows, at most 4 in a window. The error text names its own cause.
- **No burst-then-guard here**: python failures run at window rate for the whole record, across 9 projects. 317 of 378 are in subagent windows. One came from a reviewer in this same workflow today.
- **Where a push reached, it acted as a guard.** In FixFlow's main windows: 3 python failures before the memory note (2026-11-04), 0 after. The 5 after it are all in workflow subagents or a worktree store, which that project's memory does not reach. No user-level instruction file exists (`~/.claude/CLAUDE.md` is absent), so no machine fact is pushed across projects.

### The owner's memory notes

They are a list of things learned more than once. None is a defect diagnosis:
- machine and tool facts: python, long paths, the 8 KB command cut, heredoc backslashes, `.js.txt` via stdin, blank browser screenshots;
- owner corrections: "the owner had asked the same question three times"; "I'm sick of repeating" the goal; fold prior sweeps in, do not cite ids;
- track state.

### What this does to R3

- The claim "repeats arrive in bursts and a guard ends them" is false for these classes. They recur at session rate until something pushed or installed stops them.
- A pulled lookup does not help them. The agent meets the error before it would think to look anything up, and recovery already costs about one call. That is the price of a lookup turn. Only a push saves the call: one line in an instruction file, a hook, or installing python and poppler.
- They saturate. A handful of facts covers nearly all of it. A larger stock adds nothing after that.
- They are not the top model's reasoning. Any model can write "python is not on PATH".
- So they refute "a bigger stock adds no hits" as a general claim. They do not rescue E1's "massive over time".

The other session-rate class is re-reading the same files across windows. D1: in the Clinic data, 42.6 % of read characters repeat a tracked file another window read; subagents 64 to 89 %. HB: paths read in five or more windows hold 73 % of fetched tokens. A file map's hit rate would grow with coverage. But whether an answer can stand in for the lines is unproven (HB: 0 of 200 sampled steps likely saved), and an index is rebuilt, not reasoned. Other issues own that. R3 must not claim it.

## 4. Attack: the V2 comparison

V2's "hit rate" multiplies the lookup-step share (43.6 % of tokens re-read by lookup-only calls). It is the share of exploration steps the library spares, through code edges, work state and findings, written at about 4 per merged slice (V2 L56, L79-L91). It is not a defect-repeat rate. So "V2 assumes the opposite" is a category error. What remains is narrower: V2 carries over KS's stop rule, which counts verified solved-problem hits (V2 L92). It would judge a library whose claimed value is exploration by the one table whose hits are capped. That is a measurement mismatch, and cheap to fix.

## 5. Reconciling D1's 81 % with D2's 0.71 days

They do not conflict. They measure different things:
- Repository: D1 is Clinic (432 commits in eight days); D2 is FixFlow (368 in 64 days).
- Time scale: median gap 1.1 hours against days.
- Unit: one file against any of several files.
- Population: any file read against files a fix just touched, which are hot files.

On FixFlow's fix files, 6.5 % change within an hour, so 93.5 % are unchanged at that scale. That fits D1's 81 % on a faster-moving repository. Neither says the knowledge rots. The fix's own lines survive (median 100 % at head). Under KS a changed file marks the entry suspect, and the next lookup re-stamps it if the controls still flip (KS L344). So churn is lookup-time re-checks, not lost hits. "A bigger stock adds upkeep" is overstated: dormant entries cost nothing until looked up, except a 0.2 s declarative re-run at phase close.

## 6. Trying to dissolve what is left

| Fix | Result |
|---|---|
| Better retrieval or embeddings | Fails. Retrieval cannot find repeats that do not exist; h ≤ r × v |
| Generalised class entries (pattern recurrence 17 to 45 %) | Partly. Candidate hits rise. Verified hits do not: a class check that code can decide is a lint, and CI already catches the import-surface class with a message that names the fix. Advice-only hits are where weaker models copy wrong memories (E3, E5 issues) |
| Docker test-id checks (best form) | Partly. v rises to about 0.75 and h to about 7.5 %. Still capped by r. Such a check is a CI test, and promoting it ends the repeats |
| Push hook in bursts | Speeds propagation within a burst; does not raise r |
| Share across projects | Raises r only for machine and stack facts. Those are push-served, saturate, and are not reasoning |
| Wait for longer history | The only test of "flat". Costs time, and the product encounter stream has been zero since August |
| Judge the library on the session-rate classes instead | Real, but that moves the value to facts, corrections and a file map. It gives up E1's premise that the top model's reasoning is what accumulates |

## 7. Restated issue (under 90 words)

Reusing solved defects pays only when a hard problem repeats: here 2 to 10 % of fixes (5 of 50 in 64 days), and a check can confirm a quarter to 40 % of those. So verified hits stay near 0.5 to 4 % (7.5 % at best) however big the library grows; older entries may add late repeats, never above that cap. The design's stop rule then likely fires. What repeats every session, like machine facts (1 % of calls), needs a pushed line, not cached reasoning.

## 8. What the owner can do

- Accept that the solved-problem table pays at most hit rate × solve cost, with the hit rate capped as above. Nothing in the design lifts the cap.
- Give each part of the library its own hit metric. V2 would otherwise be judged by the KS stop rule, which counts only the capped table.
- Push the machine facts. One user-level instruction file of about five lines (python, quoting, poppler, long paths), or installing python and poppler, removes about 1 % of calls. Cost: about 100 to 200 tokens per call, or an install decision. It needs no library.
- Test "flat" only with a longer product history: tally verified hits by entry age. Cost: months of time, and there is no product work today.
