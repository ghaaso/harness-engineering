# L10 Existing small libraries over time: real cases

Facts only. Repo = C:/Users/User/Documents/projects/EMS_workshop1 (git). Memory = C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/memory/. Transcripts = C:/Users/User/.claude/projects/<folder>/.

Searched: git log on CLAUDE.md (35 commits, 2026-06-30 to 2026-08-02), HANDOFF-2026-07-28-open-work.md, docs/program/, the 17 memory notes with dates, EMS transcripts for "Python was not found" and "Filename too long" after the memory note date (node scan scan2.js / scan3.js in the sim folder).

## Case 1. The Sentry gradle plugin trap: lost its condition, was written as "empty = off", cost a build, then was obeyed

**When / who.** 2026-06-10 to 2026-08-03. Commits by Claude Fable 5, Opus 4.8, Opus 5 (per Co-Authored-By lines).

**What happened.** On 06-10 the Sentry Expo config plugin broke the EAS gradle build and was removed (a6f9048). On 06-26 it was back and broke build 15 again (6928828): it had re-entered main through PR #59 while build 14 came from a side branch. The 06-26 commit says to re-add the plugin "only once a Sentry project + auth token exist". On 07-18 CLAUDE.md got the rule in unconditional form ("never add the Sentry Expo config plugin to app.json"), in the same commit (140428c) that added `"EXPO_PUBLIC_SENTRY_DSN": ""` to eas.json and wrote "empty = no-op". EAS rejects empty env values, so every `eas build` failed; fixed 07-20 (79a8dd4), and CLAUDE.md was edited to warn about the empty string. On 08-03 PR #176 put in a real DSN and cites both rules.

**Evidence (exact).**
- a6f9048 (2026-06-10): "fix(mobile): drop the Sentry expo config plugin - it failed the EAS gradle build".
- 6928828 (2026-06-26): "EAS build 15 failed with EAS_BUILD_UNKNOWN_GRADLE_ERROR ... The @sentry/react-native config plugin was back in app.json plugins (it re-entered main via #59; build 14 was cut from a branch that had removed it) ... re-add the plugin only once a Sentry project + auth token exist."
- 140428c (2026-07-18): "chore(mobile): wire Sentry DSN plumbing through eas.json (empty = off)".
- 79a8dd4 (2026-07-20): "EAS rejects an empty env value ("not allowed to be empty"), so every `eas build` failed schema validation before it started. CI never caught it because CI runs `expo export`".
- a31924a (2026-08-03, #176): "Two traps this deliberately respects, both documented in CLAUDE.md and both previously paid for: never an empty string ... the @sentry/react-native Expo config plugin stays OUT of app.json".
- The first lesson sat only in commit messages for 16 days (06-10 to 06-26) and was not in any always-loaded file; the recurrence happened in that gap.

**Sources.** git: a6f9048, 6928828, 140428c, 79a8dd4, a31924a; CLAUDE.md "Build & deploy traps" section; memory/project-library-plausibility-review.md ("Untested advice" paragraph, which notes the dropped condition).

**Later moment.** Yes: a31924a (2026-08-03) needed both traps and the commit says so. Also, a Sentry project now exists (the DSN in a31924a), so the original condition for re-adding the plugin may now be met, yet CLAUDE.md still says "never". No record shows anyone re-checking.

## Case 2. CLAUDE.md claims that went stale or were contradicted by later audits

**When / who.** 2026-07-03 to 2026-08-02 (drift); 2026-07-28 (contradictions found by an adversarial verifier whose default verdict was REFUTED, per the HANDOFF header). Author of the HANDOFF: Claude (Fable/Opus; commits 65c2c3b, 906b990).

**What happened.**
(a) Head-number drift. CLAUDE.md said "head = **0019**" from 157158e (07-03). Between 07-07 and 07-08 migrations 0020 to 0033 landed (cfd6021 ... 2f48529). The next CLAUDE.md edit, 85c88c0 (07-08), says "CLAUDE.md truth pass: Alembic head 0019->0033 (36 tables)". Fourteen migrations behind, fixed by a manual pass. Later passes (bb23851 head 0039; da988e2 head 0046) repeat the same chore. The file's own footer lists "the Alembic head number" as the fact "most prone to rot".
(b) Claims the code later contradicted. CLAUDE.md line 312 (written in 85c88c0): "Each job is idempotent, so a duplicate run is harmless." HANDOFF A7 (2026-07-28): the nightly media-orphan sweep mints `client_id=uuid4()` per emission (`telemetry/service.py:74-89`), so it "falsifies CLAUDE.md's 'Each is idempotent so a duplicate run is harmless.'" HANDOFF §4.5 lists five such contradictions, including a docstring (`jobs/models.py:229`) that "is what makes the cursor design look safe on review" and is false on both properties. HANDOFF says: "CLAUDE.md is declared authoritative, so each of these is a defect in its own right — fix the code, or fix the file."
(c) As of 2026-11-12 the line in CLAUDE.md still reads "Each job is idempotent, so a duplicate run is harmless." (CLAUDE.md:312); the last CLAUDE.md commit is da988e2 (08-02), after the HANDOFF.

**Sources.** git: 157158e, 85c88c0, bb23851, da988e2, 65c2c3b; docs/HANDOFF-2026-07-28-open-work.md lines 289-295 (A7) and 400-420 (§4.5); CLAUDE.md:312 and the "Keeping this file honest" section.

**How it was noticed.** (a) by whoever did the next feature pass and re-read the table; (b) by a deliberate adversarial audit, not by use.

**Later moment.** Yes, within the record: the HANDOFF audit itself (07-28) and every later agent that reads CLAUDE.md first as "authoritative" (the file's own opening instruction). The A7 contradiction is still open in the file.

## Case 3. A memory note was in the agent's context and the warned-about thing happened anyway (and the notes disagree with each other)

**When / who.** 2026-11-01 (ship-plan note), 2026-11-04 07:09Z (long-paths note), 2026-11-12 10:10Z (the event). The event was a Sonnet subagent ("F2-ks-research-and-refutes", meta.json: model "sonnet") in session 0bf1c4f3.

**What happened.** The MEMORY.md index line reads "...no `python` on PATH". The subagent's transcript line 7 is an `instructions` attachment that carries the full MEMORY.md (AutoMem), including that line. At line 56 (10:10:16Z) it ran `python3 --version 2>&1 | head -1; node -e ...` and got "Python was not found". It then continued with node. It may have been a deliberate probe, which the transcript does not say. Separately, the two notes disagree: the ship-plan note (modified 2026-11-01) says "A Python 3 interpreter exists at C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe (the earlier "no Python" note was wrong)", while the 11-04 note says "python is not on PATH ... use node". Both are partly true (exists, not on PATH) but neither states the other's condition. A refuter in the same session counted, in the EMS transcript store after 2026-11-04T07:09Z, python-not-found errors at 2026-11-09 13:10, 13:11 (two Horthy subagents), 2026-11-12 07:57 and 10:10, with 3 main-session and 16 subagent errors before the note.

**Evidence (exact).**
- Tool result at line 57 of the transcript below: "Python was not found; run without arguments to install from the Microsoft Store, or disable this shortcut from Settings > Apps > Advanced app settings > App execution aliases."
- MEMORY.md line: "[Windows git long paths](project-windows-git-longpaths.md) — clones into the scratchpad need `git -c core.longpaths=true` per command; cone-mode sparse checkout; no `python` on PATH".
- Note body: "`python` is not on PATH in Git Bash (Windows Store alias) — use `node` for JSON."

**Sources.** Transcript: C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/0bf1c4f3-76dc-4144-995c-2af5a213db41/subagents/workflows/wf_55e2d62d-022/agent-a134a5fb8402fd8bf.jsonl (lines 7, 56, 57; meta.json for model). Same-session refuter script: .../wf_b516f6cc-db1/agent-a1e89191a0c75a205.jsonl lines 157-158 (the post-note error list). Memory: project-fixflow-ship-plan.md, project-windows-git-longpaths.md, MEMORY.md.

**Later moment.** Yes: the next call in the same transcript (line 59) uses node, the fix the note names. Also earlier in the same agent family, other agents re-hit the same error on 11-09, so the note was needed again many times.

## Case 4. A point-in-time memory note and a "current" CLAUDE.md say different things about production, and a commit message disagreed with its content

**When / who.** Production went dark about 2026-08 (per the memory note); the note was written 2026-11-01 in session e24f17dc (Fable orchestrator). CLAUDE.md was last edited 2026-08-02.

**What happened.** CLAUDE.md is declared "the authoritative, current statement". Its Deploy row (line 36) still describes three live Railway services and says nothing about an outage. The memory note says "both Railway URLs return Railway's own 404 since ~2026-08 ... techs must not open the app". The evidence is a live probe recorded in docs/program/evidence/w2/O-03.json (line 664): the body returned was `{"status":"error","code":404,"message":"Application not found"}`, and the Opus verifier traced that the phone treats this edge 404 as a definitive 4xx (`syncClassification.ts:18`) and so parks or drops writes. The HANDOFF warns its own state table is "point-in-time — re-verify against prod before trusting it" (CLAUDE.md doc map). The same memory note carries a second warning of this kind: "Commit 093b793 claims v4 but holds v3 (a refused rewrite)". Checked: `git show 093b793` has subject "docs(program): ship plan v4 — third verification pass folded in", yet line 1 of the file at that commit reads "(v3, 2026-11-01)". The note's rule: "verify a plan rewrite by content, not by commit message."

**Sources.** CLAUDE.md:36 and the doc map row for HANDOFF; memory/project-fixflow-ship-plan.md; docs/program/evidence/w2/O-03.json:664; git 093b793 (message vs file head); docs/program/SHIP-PLAN-2026-11-critique-3.md:196 (a critic's text about what a phone does on Railway's edge 404).

**Later moment.** Yes: the ship plan's P0a/P4c phases (docs/program/SHIP-PLAN-2026-11.md) depend on the edge-404 behaviour; the critique-3 line above shows a critic re-deriving it from scratch. No record of CLAUDE.md being updated to mention the outage.

## Not found
- No case of a memory entry being formally retired or overruled by a later entry inside the same note (notes are edited in place; only the Python "earlier note was wrong" remark in the ship-plan note shows a correction).
