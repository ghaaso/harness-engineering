# R2 refuter: "What can be verified becomes a check and leaves; what stays is advice"

Read-only. Sources: KS design v1.3.1 (L41, L268-281, L452, L482-505, L515-526, L716), HARNESS-V2 §0 (L81), HANDOFF §2, CLAUDE.md, git history (all refs), GitHub PR status for two Dependabot PRs (`gh pr list`, read-only), the transcripts under `~/.claude/projects/`. Scripts: `r2-pairs.cjs` (pair table from git), `r2-transcripts.cjs` (error tokens in tool results). Both in this folder.

## 0. Verdict: narrowed

The core holds, and holds structurally. Every check kind the store can run (declarative probes over git blobs, test ids in Docker, a throwaway-Postgres probe; KS L268) is a check CI can run on every change. KS §9 says the Docker gate "largely duplicates CI" (L524), and D17 sends the declarative trap probes to CI "after the entry is verified" (L716). So a trusted entry is a short stop on the way to a standing check. What stays in the lookup path is ungated.

Three parts fall:
1. **E1 drops out.** Promotion is a token gain, not a loss. A check stops the repeat before it costs a session, and its message carries the fix to any model. The library loses the credit, not the owner's tokens. What caps that saving is recurrence, which is another issue.
2. **The timing sub-claim is refuted.** The first lesson was wrong in 1 of 5 counted repeats, not 4 of 5. The KS write rule fires on a burned build, and every build-trap pair burned an EAS build at its first occurrence. So KS would have recorded the right lesson at the first fix.
3. **Several numbers are wrong or mis-scoped** (section 1).

## 1. Numbers

### Re-derived by my own method

| Claim | What I did | Result |
|---|---|---|
| "Every same-cause pair ended with a guard at the second occurrence" | `git show` of each second fix; CI-config commits in the next 24 h (`r2-pairs.cjs`) | **Corrected.** 7 pairs (the 5 counted, plus ex8 and one pair nobody counted, below). A new automated check landed in 2: `f29f62f` added `test_app_bootstrap.py`, and `3e3db77` added the CI `expo export` step 2 h after `aab2d91`. A Dependabot ignore landed in 1 (`6928828`), and it leaks (next row). In 1, mypy was already in CI and caught both occurrences. In 3 there was no check at all: a library swap (`d440855`), a component consolidation with no test (`0a3b38e`), and a CLAUDE.md line 22 days later (`140428c`, for ex8). |
| "No cause was seen three times" | `git log main`; `git log --all --grep`; `gh pr list` for the Dependabot PRs | **Corrected.** No cause was seen a third time on main. But main ran only 15 to 57 days past each second occurrence: it has had no commit since 2026-08-03, so the record is censored. And the SDK-pin drift cause came back twice more. Dependabot opened jest-expo `~52` → `57.x` (PR #100, 2026-06-26, 2 minutes after the ignore merged; PR #154, 2026-07-20). jest-expo was missing from the new ignore list. CI's mobile job failed both, and neither merged. Standing checks absorb repeats without leaving a fix commit on main. That supports the core, and it means "no third occurrence" is partly survivorship. |
| "In 4 of 5 recorded repeats the first lesson was wrong or too narrow" | Read the bodies of all ten commits | **Refuted.** Wrong in 1 of 5. `dbb3661` blamed missing audio focus; `d440855` found that every config failed. The stated rule was narrower than the cause in 1 of 5. `2f09cec` said "scripts that write must import app.registry", but its mechanism ("imports only the slices it touches, so X was absent from Base.metadata") is exactly the prod-500 cause in `f29f62f`, under the same error token. Right in 3 of 5. The press-race fix `0a3b38e` says "Port ArrivalJobStep2's proven press-race guards": the first lesson was reused word for word. The mypy idiom was right, and the repeat was a new module. The SDK-pin lesson was right, and the repeat came by a new route (Dependabot). With ex8 (right, but its fix was stranded) and the peer-dep pair (right, new package): wrong in 1 of 7. D7 classed "the first fix did not cover the next instance" as a narrow lesson. That holds by definition for every repeat, and it is not a property of the lesson. |
| "An entry written after the hard second solve…" (implied: KS records at the second) | KS L452 against the commit bodies | **Refuted for the build-trap class.** The write rule includes "a burned build or deploy". `b7a5b98` (EAS failed at Bundle JavaScript), `aab2d91` (same phase, a missing module) and `a6f9048` (EAS failed at Run gradlew) all burned a build at the **first** occurrence. KS would have recorded them then, with right lessons. |
| Lanes: was the second occurrence in a tree that lacked the first fix? | `git merge-base --is-ancestor first second^` | 5 of 5 counted pairs: the first fix was already in the second fix's lane. Only ex8 (`a6f9048`, never on main) was stranded. CI runs on `pull_request` to main (ci.yml), which checks out the merge ref, so a guard on main reaches every lane's PR without a rebase. |
| A pair nobody counted | `git log --all` for fix commits off main | `b7a5b98` (06-03, expo-asset peer dependency missing, EAS bundle fails) → `aab2d91` (06-07, expo-font missing, the same EAS phase, on a side branch; main got expo-font in `16a537f` the same evening) → `3e3db77` (CI `expo export` bundle check, 06-07 23:15). This is the issue's mechanism in its purest form: a checkable cause, promoted to CI at the second occurrence, with no third. |
| Symptom families | Fix commits by symptom | "EAS build fails": 5 fix commits in 47 days (`b7a5b98`, `aab2d91`, `a6f9048`, `6928828` with two causes, `79a8dd4`), 4 cause classes, 3 of them seen twice. "Voice recorder fails": 4 fix commits in 41 days, with 2 stated causes. Causes recur less than symptoms. A symptom-keyed lookup returns a candidate list of past causes, and each of those causes is a CI-able condition. |
| Fix commits on main | `git log main` subject regex | 50 (48 `fix` + 2 `@ fix`). Matches D2. |

### Read and checked in the source, not re-derived

- "Only 3 of about 55 seed entries can return `applies` without Docker." **Corrected scope.** KS L495 says that "after the refuters only ex7, ex2a and (with its conjunctive probe) ex8 are lead-capable without Docker, and **the rest are candidates**". In context, the 3 are 3 of the **8 worked examples** (about 15 entries). The other ~41 solved and trap rows were never given a check kind, because seeding after KS-4 is lazy (L501). With Docker, ex1 (two siblings), ex5 and ex6 also become lead-capable through test ids, and KS §9 says those duplicate CI (L524). ex4 needs a unit test that does not exist yet, which would itself be CI. So every worked example that can ever return `applies` is already in CI, or proposed for it, or (ex2a) caught by alembic itself. The direction holds; the denominator was wrong.
- D17 moves ex7 and ex8 into CI: **confirmed.** L716 promotes "a validated trap probe into the repository's own CI check (ex7's eas.json empty-env check; ex8's app.json plugin check)", "one small PR per probe, after the entry is verified". L41 and L524 name these traps as the design's early value ("traps CI cannot see").
- V2 L81: "An entry seen three times is proposed as a lint, a test or a gate clause. Once that lands, the entry retires." **Confirmed.**
- ex2a: HANDOFF §2.2 says a duplicate revision id makes alembic raise "on every command, including the boot upgrade". D4 read alembic's source as warn-and-overwrite. Either way the condition is reported by a tool that already runs (CI runs `alembic upgrade head`, and the boot runs it too).

### Could not check

- Session-level re-encounters with no commit. The transcripts on this PC start on 2026-10-28, months after the fix period (June to August). All 150-odd hits for the cause tokens are November research sessions. So repeats that never produced a commit cannot be recovered, as F2 already said.
- Why CI failed on the jest-expo PRs. The GitHub logs have expired (HTTP 410). Only the FAILURE status is known.

## 2. Trying to dissolve it: classes that are checkable but not promotable

Seed (KS §8): 270 rows. Entry-bearing: about 20 solved, 21 traps and ~60 negatives, plus the 8 worked examples (~15 entries): ~116 in all.

| Line of attack | What I found | Size in the seed | Result |
|---|---|---|---|
| (i) Diagnostics true only given the symptom, where a standing lint fires falsely | KS's own probe rule allows `applies` only where "the matched value is itself the root cause" (L272), so a gate-able condition is a defect in itself and lint-safe. Two cases are conditional. ex8's plugin is harmful only while no EAS auth token exists; the CLAUDE.md rule lost that condition, and #176 obeyed the unconditional form. "FKs on populated tables ship NOT VALID" fires falsely on new tables. Both can be promoted with an allow-flag or annotation. | ~2 rows | Fails. Promotion with an escape hatch is cheap. |
| (ii) Needs a live environment, production data or an expensive build | ex2b and ex2c (deployed `alembic_version`), the prod side of ex4 and the "audit prod before VALIDATE" trap are all capped at candidate by KS itself (`prod_db`, L279). The store cannot verify them either. A native Android compile is gated nowhere, in CI or in the store. Those that can be checked go to startup or monitoring checks: the 0046 seed and the age guard are already runtime guards. | ~3 to 4 rows | Fails. They are advice in the store too. |
| (iii) Operator actions with no code artefact | CLAUDE.md: 2 of 4 traps (`railway up` from the root; "`expo export` bundles JS only") are `rule_without_case` with no gate (L499). HANDOFF §2, by my reading: ~8 of ~14 bullets are operator procedure (wrong folder, the timeout is not a failure, verify by content, no chaining, never downgrade, never the rollback button, one pytest per DB, use worktrees). These are not checkable by the store. Most can be promoted anyway, to a deploy wrapper or a Bash hook. The residue is dashboard-only (the rollback button, an env flip) and lives in CLAUDE.md. | ~10 to 12 rows | Fails. Not checkable, so advice; mostly scriptable. One real twist: deploys and EAS builds here run manually from local trees (`railway up`, `eas build`), bypassing CI. So promotion must also target the deploy path, which is a cheap wrapper step. |
| (iv) Negative results | Not promotable (mostly argued design exclusions; "few of which record a tried-and-abandoned fix", L495). They save tokens without needing `applies`. KS shows them as "leads scoped to that footprint" (L502): their scope is checked by machine, their content is not. | ~60 rows, about half the entry-bearing seed | This is the durable, paying, non-draining class. It confirms the claim's second half: the long-run stock is content no check confirms. |
| (v) Parallel lanes, guard not yet merged | 1 of 6 pairs (ex8, fix stranded off main). In the 5 others the first fix was in the lane. PR CI runs on the merge ref. KS's `ks close` already scans for "fix not on main". | 1 historical case | Fails as a size; real only for stranded fixes. |
| (vi) Best-form extras (P): research claims | A research claim with its quote and URL can be checked by machine (re-fetch, find the quote) and cannot become a lint. P measured 15 of 43 sources re-gathered within ~10 days and puts the saving at about 1 to 2 % of spend. | outside the KS seed | A real exception, but outside the solved-problem cache. It narrows the issue's scope to diagnosis entries. |

Other fixes tried:
- **Count promotion as the product (a check factory).** It works, and it removes E1 from the issue. It does not create a trusted lookup stock, and it is the repository's existing habit (2 of 7 pairs got a CI check at the second occurrence). Its value is capped by recurrence.
- **Delay promotion (V2's three sightings) so verified hits keep coming.** It works only by giving up prevention, the larger saving. This is the trade that survives.
- **Record at the first fix.** It works better than the issue said: lessons were right in about 4 of 5 by mechanism. But the repeats were new instances in other files, so an instance check cannot confirm them. They arrive as candidates, which is advice again, or are promoted.
- **Generalised class entries.** A decidable class check is a lint (expo export, expo-doctor, a bootstrap test). An undecidable one is advice.

## 3. Strongest counter, and what it removes

"The drain is the success path. A promoted check prevents the repeat with no lookup, and its failure message carries the top model's reasoning to any tier. So E1 gains, and E3 holds for the checkable class through CI. And the timing numbers are wrong: first lessons were mostly right, and the write rule fires on the first burned build."

This removes E1 and the timing half. It does not give the lookup path a trusted stock. Under D17's "promote after verified", a verified entry earns about zero lookups by design. In history, KS would have scored at most 1 to 2 verified hits in 64 days, both at EAS build 15 (`6928828`), before promotion. The lasting lookup stock is negatives (about half the seed), operator rules and hints for code in new places, and none of it is gated.

## 4. What survives (restated)

Anything the library can confirm against the code, CI can check on every change, and the design sends it there (D17). So trusted entries are a short stop on the way to CI. That is good for tokens, but it is ordinary fix-plus-guard practice, not lookup reuse. What stays to be looked up long-term is content no check confirms: negative results (about half the seed), operator rules, and hints for code in new places. So a cheaper model reusing cached reasoning (E3), and gate-backed accuracy (E5), rest on unchecked advice.

## 5. What the owner can do

Treat the two halves as two products.
1. Make promotion explicit. Promote each validated probe at its first verification into CI and into the manual deploy and EAS-build path: one small PR or one wrapper step each. Prefer class-wide guards: the jest-expo leak shows that an instance-level ignore list misses siblings, where `expo-doctor` in CI would not. Count its value as prevented repeats.
2. For the advice half, nothing in this design makes advice trusted cheaply. If E3 matters, pay for KS-9's with-and-without trial of a cheap reader on that advice.

## Files

- `r2-pairs.cjs`: pair gaps, lane ancestry, check files at the second fix.
- `r2-transcripts.cjs` and `r2-transcripts.out.txt`: transcripts start 2026-10-28; no fix-period sessions.
- `allfix.txt`, `mainsubj.txt`: fix commits on all refs and main subjects, used for the off-main search.
