# R4 refuted: where the tiers differ there is nothing to look up

Verdict: **narrowed**. Confidence 0.7.

Scripts and outputs: `refute/r4/` (`tiers.cjs`, `reserved.cjs`, `clinic-gates.cjs`, and their `.txt` outputs; `clinic-task.md` is a read-only copy of the clinic testbed's slice record from its `main`).

## 1. Numbers

### Re-derived by my own method

| Claim | My method | Result |
|---|---|---|
| 48 fix commits, all by Opus or Fable, none by Sonnet | Parsed raw commit messages for `Co-Authored-By` lines and any model name in the body. I did not use git's trailer parser or D3's script. | **Confirmed, with a nuance.** 48 `^fix` commits: 21 Opus 4.7/4.8, 6 Opus 5, 20 Fable 5, 1 untagged. With the two `@ fix` subjects that makes 50, of which 47 are tagged top-tier and 3 are untagged. 0 of 459 commits on any FixFlow ref carry a Sonnet trailer. Six commits mention Sonnet in their body, and all six are research docs. **Nuance:** a trailer names the session that committed, not who wrote the code. Every transcript on this PC dates from Oct–Nov 2026, and main's fixes date from 31 May to 3 Aug, so any work by Sonnet subagents cannot be checked. |
| Risky areas are 30–46 % of fix commits | I matched paths against non-test code files under two definitions, KS L444 and the ship plan's Routing, then read every row by hand. | **Confirmed as about 30–45 %.** KS areas: 20 of 50 (40 %). Ship plan areas: 21 of 50 (42 %). Removing two mypy-only annotation fixes in `jobs/service.py` gives 36–38 %. D4's hand reading gave 15 of 50 strict (30 %). D3's pattern count gave 22 of 48 (46 %). |
| The recurring causes are tool and setup facts | I read the five repeat pairs (F2 §2) against their commits. | **Corrected: 4 of 5.** Four are tool, library or setup facts: mypy re-export, ORM registry, SDK-52 pin drift and expo-audio `stop()`. The fifth is a UI press-race guard ported to a sibling component, which is a code pattern. None of the five sits in a reserved area. |
| Risky areas "hold no portable content" | I read the commit bodies of the reserved-area fixes. | **Corrected.** None is stack-generic, and none could carry a check that travels. But about a third are textbook patterns: a sequence instead of max+1 (ff81f70), Postgres `now()` being transaction-start time (12c16f1), `compare_digest` on a non-ASCII `str` (2fe77f5), and serialising a read-modify-write (1c546a3, 4a171b4). These travel as advice or as a lint. The hard part in each was noticing where the pattern bit, not knowing the pattern. |

### Read and confirmed at the source today
- The vendor gaps: Sonnet 5.5 against Opus 5.5 is 70.6 vs 66.4 on Terminal-Bench 4.0 (Opus at xhigh), 46.2 (max effort) vs 54.4 on FrontierCode, and 55.5 vs 57.8 on CursorBench. That gives **+4.2, −8.2 and −2.3**. The page also says that Opus "remains clearly stronger at complex, open-ended work requiring sustained judgment", and that Sonnet scores lower at max than at xhigh.
- Overconfidence (arXiv 2602.06948, abstract): "some agents that succeed only 22% of the time predict 77% success". The paper says overconfidence appears in all results. The issue's wording is fair.
- AgentBrew (arXiv 2607.16851): on Terminal-Bench 2.0 (64 test tasks), the student scored 45.3 alone and 51.6 with notes, against the teacher's 50.0. The model pair is DeepSeek, not Claude. The teacher drafts notes only from the student's failures, and it is **inactive at test time**. Notes brewed on another student did worse: 74.92 vs 75.96 on MATH.

### New measurement (owner's clinic testbed, read-only)
The clinic slice table records each slice's lead tier and the findings of its first review round. Opus reviewed every one of these slices.

| Lead tier | Slices with counts | ≥1 P1 in round 1 | Total P1 |
|---|---|---|---|
| Opus, high (all money, posting, kernel and identity slices) | 14 | **9 (64 %)** | 16 |
| Sonnet, high, with Opus review (catalogue, UI, ops rig, check tooling) | 6 | 2 (33 %) | 2 |

Routing confounds this comparison: Opus was given the hard slices. **So it says nothing about the gap between the tiers.** What it does show is that the top model itself ships silent, first-seen defects on judgment-heavy work, and a second top-model review catches them in most slices. In the whole clinic history, 119 of 442 commits carry a Sonnet 5.5 trailer. Every Sonnet slice ran at **high** effort, so the record holds nothing at low effort.

### Could not check
- Whether Sonnet subagents wrote any part of FixFlow's fix commits. No transcripts exist for that period.
- Whether a stored entry saves Sonnet more work than Opus on the recurring setup causes. This is argument only.
- Any outcome split by tier on like-for-like work, in either repository.

## 2. Attempts to dissolve

1. **"The write rule never samples Sonnet's failures."** This **partly dissolves.** KS §7.3 records any solve that "needed a tier escalation". §7.2 names Haiku or Sonnet → Opus as such an escalation. So under Sonnet-first routing, a Sonnet failure that is detected and escalated does get recorded. The clinic testbed also already logs numbered Opus findings on Sonnet-led slices (G01-xx, GS-xx, GT-xx, FC-xx, LX-xx). That is exactly the raw material AgentBrew-style notes are written from, and it comes at no extra review cost, because the ship plan already gives every PR an Opus reviewer. What still goes unrecorded:
   - Silent failures that no gate or review catches.
   - The reserved areas, which Sonnet is never given.
   - FixFlow's own history, which is the KS seed and holds no Sonnet work.
2. **Notes written from the student's failures (AgentBrew form).** This is the strongest fix. It reaches first-seen tasks: notes brewed on 25 training tasks helped on 64 unseen ones. It needs no teacher at use time. Its limits:
   - Evidence: one 64-task benchmark, a gain of about one standard error, and a DeepSeek pair.
   - Notes must be validated for each student model.
   - Nobody has measured it on repository work.

   It dissolves "a cache returns only what was computed" for generalised notes within one family of tasks. It does not dissolve the next point.
3. **"Sonnet plus some Opus" is most of what the owner wants.** This is **largely true, and it is already in place.** The ship plan's Routing has Sonnet build well-specified slices, and Opus reviews every PR. In the clinic, Sonnet led 8 of 25 slices. Opus-built slices need the same Opus review: 9 of 14 had a P1 in round 1. So the fair comparison for E3 is "Sonnet builds, Opus reviews" against "Opus builds, Opus reviews". In both, quality on judgment-heavy work comes from the review loop, not from the builder and not from a library. A library could only trim rounds, and nobody has measured even that.
4. **The proponent's "gate-pass parity on 30–60 % of build slices".** **Not supported.**
   - The 30–60 % is a guess, bounded by a count of layer shapes, which are not plans.
   - The invariants it would carry already reach both tiers through CLAUDE.md and the conventions docs. Opus-led slices still drew P1s.
   - Parity at the first review round is a low bar here, because Opus itself fails that round in 64 % of hard slices.
5. **Is the gap already near zero?** On tool, terminal and well-specified build work, yes or nearly: Sonnet leads Terminal-Bench, trails CursorBench by 2.3, and already builds that work here. E3 is close to true there **without a library**. On open-ended, merge-quality work the gap is about 8 points, and the vendor names that kind of work. Locally it cannot be measured, because routing confounds the comparison.

## 3. What survives

- **Stands.** The KS store, filled from fix history and escalations, holds recurring setup facts (4 of 5 repeat pairs). Those facts help both tiers equally, so they do not close the gap between them.
- **Stands, reframed.** On first-seen, judgment-heavy work, both tiers fail silently. A top-model review is what catches the failures. So E3 at best means "Sonnet builds, Opus reviews". The owner already runs that, and the library is not what makes it work.
- **Stands, numbers corrected.** For E4, a user without the top model loses the review loop, not only the cache. Notes brewed elsewhere can travel without the teacher, but only for the same student model and the same family of tasks. The project-specific risky work (about 30–45 % of fixes) has nothing that can be brewed in advance or verified.
- **Dropped.** "No error, so no lookup fires." The best form looks up at session start and pushes on the diff, so lookups do fire. The real problem is that on first-seen work there is no entry to return.

## 4. Restated (under 90 words)

The library mostly holds recurring setup facts, which help Sonnet and Opus equally. On new, judgment-heavy work Opus too ships hidden defects: in the clinic testbed, an Opus reviewer found a serious one in 9 of 14 Opus-built slices. Quality there comes from top-model review, not a cache. "Sonnet performs like Opus" becomes "Sonnet builds, Opus reviews", which the owner already does without a library. A user with no top model loses that review; risky project-specific work (about 30–45 % of fixes) has nothing to pre-supply.

## 5. What the owner can do
- Treat E3 as "Sonnet builds, Opus reviews". Measure it directly: give Sonnet some Opus-class slices under the same review, and compare rounds and P1s.
- Harvest the Opus findings on Sonnet's slices into notes for Sonnet, AgentBrew style. Cost: Opus time to write and validate them, and they must be validated again for each new model.
- For E4, nothing within this design replaces the review loop for a user without the top model.
