# L10 walk: the small libraries the owner already runs (CLAUDE.md, memory notes, HANDOFF)

Pathway family: lessons that already live in an always-loaded file (CLAUDE.md), a per-project memory index (MEMORY.md plus notes) or a handoff register (HANDOFF), followed over time and replayed as if the owner's library had existed from the start. The knowledge-store design (KS, `KNOWLEDGE-STORE-DESIGN-2026-11.md` v1.3.1) is counted wherever it has a mechanism for a step.

Six walks: L10-1a, L10-1b (the reader's case 1, split at its two later moments), L10-2, L10-3, L10-4, and L10-5, which I added (one machine fact across three projects and 86 parallel windows).

No fixes are proposed here.

## What I checked, and what I corrected in the reader's cases

1. **L10-1: the plugin never "re-entered" main. Its removal never reached main.** PR #59 merged at b4f0766 (2026-06-10 11:50:59), carrying the plugin from 60c026d. The removal a6f9048 (16:04:27) was pushed to the already-merged branch. `git merge-base --is-ancestor a6f9048 main` fails; only `origin/feat/mobile-outbox-v2` contains it. `6928828^:technician-app/app.json` line 47 still holds `"@sentry/react-native"`. So main was broken from 06-10 to 06-26. The 06-26 commit's own story ("it re-entered main via #59") was wrong. KS already records the corrected history (L139, L242: "ex8's first fix was pushed after its PR merged and never reached main (KS-C12)").
2. **L10-1: there was no CLAUDE.md on 06-26.** It was created by 223d6b3 (06-30) and bfb5714 (07-01). On 06-26 the lesson existed only in a branch-only commit. Even `git log main --grep` could not find it.
3. **L10-2: the false line was not merely left alone. It was rewritten after the audit.** da988e2 (2026-08-02, PR #170, Co-Authored-By Claude Opus 5) changed `Each is idempotent so a duplicate run is harmless.` into `Each job is idempotent, so a duplicate run is harmless.` and added `| media-orphan-sweep | daily 03:30 | — |` a few lines below. That came five days after HANDOFF §4.5 item 1 named the line false. The same PR body says "Closes C1 and C2 from the 2026-07-28 handoff" and edits the HANDOFF (145 lines).
4. **L10-2: the claim was false when it was written.** At 85c88c0 (07-08 14:41), `backend/app/features/telemetry/service.py` already has `async def record_media_orphan(` (line 74) with `client_id=uuid4(),` (line 81), from 8ce9530 (07-08 13:15). The code is unchanged today (service.py:81).
5. **L10-2: head drift on main lasted 13 merges.** CLAUDE.md on main read `head = **0019**` from 5f44fac (07-07 16:03, migration 0020) to 22eb4d8 (07-08 14:23, migration 0032), and 83d80e8 (14:44) set 0033. Branch copies diverged later: 34b5dd6 (07-12) says 0035 while main had 0036, and 71de899 (07-18) says 0036 while main had 0037. Main itself never went backwards.
6. **L10-3: every "Python was not found" after the note came from a hedged probe.** Each command already carried the note's remedy: `python3 -I -c ... 2>&1 || node -e ...` (11-09), `python3 -c "print(1)" ...; P="<codex path>"; "$P" -c ...` (11-12 07:57), and `python3 --version 2>&1 | head -1; node -e ...` (11-12 10:10). None cost an extra call.
7. **L10-4: critique-3 does not re-derive the edge-404 behaviour. It cites it.** Line 196 reads "...reaches Railway's 404 after removal: punches park, and pings and travel are dropped (O-10 C H=no)". The 404 body is at O-03.json:676 ("Live probe 2026-11-01: POST /api/jobs and GET /api/health ... return HTTP 404 {\"status\":\"error\",\"code\":404,\"message\":\"Application not found\"}"), and the trace is at :664. All five live `curl` probes of the Railway hosts in the EMS transcripts are dated 2026-10-31, in session e24f17dc. None are later.
8. **L10-4: the 093b793 slip was fixed eight minutes later.** 46c5d98 (12:09) reads "docs(program): ship plan v4 text (commit 093b793 still carried v3 by mistake)". 093b793 did not touch SHIP-PLAN-2026-11.md at all; it changed only ORCHESTRATION-DESIGN and critique-3.

---

## L10-1a: Sentry plugin, the stranded fix, and build 15 (2026-06-10 to 06-26)

**Entry as the solver could have written it on 06-10** (Fable 5, right after a6f9048; 96 words):

> Symptom: the EAS Android build errors in "Run gradlew" (EAS_BUILD_UNKNOWN_GRADLE_ERROR). Cause: `expo install` added the @sentry/react-native config plugin to app.json. On EAS that plugin wires a Sentry gradle step that needs an auth token, an org and a project, and none are configured. Fix: drop the plugin from the app.json plugins (a6f9048). The SDK still autolinks, and runtime init stays DSN-gated. Check: the app.json plugins do not list @sentry/react-native. This holds while no Sentry project or auth token exists. Plugin plus sourcemap upload is a follow-up once one does. CI's expo export cannot see this.

**The later moment (06-26).** An Opus 4.8 session is told that EAS build 15 failed with EAS_BUILD_UNKNOWN_GRADLE_ERROR. There is no CLAUDE.md. The lesson sits in a6f9048, on a branch, never merged. Main has carried the plugin since b4f0766. Separately, Dependabot has bumped expo-asset, expo-crypto and expo-location to SDK-56 versions (6928828 body). The session's job is to make the build pass.

**What a lookup would return.** The trigger is "before retrying a failed build" (KS §7.2). Keyed on the error code alone, the template is flagged ambiguous; KS §3.3 names "`EAS_BUILD_UNKNOWN_GRADLE_ERROR`, which build 15 had two causes for". A lead for ex8 needs the sentry-cli or upload-task line from the Gradle log, and that log lives on EAS's site. With that line, ex8 would come back as a lead and the probe on app.json would say PRESENT. For the Dependabot cause the lookup misses. Earlier still, KS's state-based `ks close` scan would have printed "fix not on main" for ex8 at every phase close from b4f0766 on (its KS-3 done-when names "every main tip from b4f0766 to ded44c8").

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | A task ("build 15 failed") and a generic error code. The cause-specific Gradle line is on EAS's web log. KS §9 limit 1 says such causes "need the owner to paste logs". |
| 2 Trigger | works | "Before retrying a failed build" is a named trigger (§7.2). |
| 3 Query | strains | The generic code is ambiguous by the design's own flag. Without the pasted sentry-cli line, the query reaches candidate at most. |
| 4 Match | strains | Two causes, one symptom. ex8 matches one. The SDK-56 pins have no entry, and nothing in the result says a second cause exists. |
| 5 Delivery | works | Pulled into the main session that owns the build. On a miss, only the lookup id goes into the brief. |
| 6 Use | strains | The fix is withheld until verify says `applies`. ex8's precondition "no auth token configured for the EAS project" is an EAS-side secret (§5.5), and an unprobeable precondition caps the verdict at inconclusive (F8, L793). The text does not say the log line substitutes. |
| 7 Check | strains | After removal the plugin probe reads ABSENT while the build still fails on the Dependabot pins. The only full check is another EAS build. |
| 8 Ladder | works | A second failing build is visible, and a miss on the second cause escalates as it does today. The real Opus 4.8 session found both causes in one pass. |
| 9 Capture | strains | The 06-26 write-up says the plugin "re-entered main via #59". Git says the removal never got there. KS's fix-reached-main check catches the anchor but not the prose. R-02 copied "hit twice in 16 days" until a refuter corrected it (KS-C12). |
| 10 Afterlife | strains | `ks close` would print "fix not on main" as one of four counts at each phase close from b4f0766 on. The design does not say who must act on that line. |

**What it would have saved.** If someone had acted on the close report, the plugin half of build 15's diagnosis, and the 16 days main stayed broken. Build 15 would still have failed on the Dependabot cause.

## L10-1b: the rule copied into CLAUDE.md as "never", the empty DSN, and #176 (07-18, 08-03, now)

**Entry.** As in L10-1a, plus what 6928828 (06-26) added: "re-add the plugin only once a Sentry project + auth token exist", and Dependabot told to ignore the Expo/RN native family.

**Later moments.**
- **07-18, Fable 5, 140428c.** Task: "wire Sentry DSN plumbing through eas.json". CLAUDE.md has no Sentry trap yet. The session writes `"EXPO_PUBLIC_SENTRY_DSN": ""` into the preview and production profiles ("empty = off"). It also records in CLAUDE.md that "the Sentry Expo config plugin must never be added to app.json". After this, every `eas build` fails schema validation until 79a8dd4 (07-20): "EAS rejects an empty env value ("not allowed to be empty"), so every `eas build` failed schema validation before it started."
- **08-03, Opus 5, a31924a (#176).** Task: wire a real DSN. CLAUDE.md now holds both traps. The commit says "Two traps this deliberately respects, both documented in CLAUDE.md and both previously paid for". It keeps the plugin "OUT of app.json" and proves the DSN with "a synthetic capture_message was accepted by project 4511846063013968".
- **Since 08-03.** A Sentry project exists. The condition a6f9048 named ("Full plugin wiring + sourcemap upload is a follow-up once a Sentry project exists") is at least partly met. CLAUDE.md:84 still reads "Never add the Sentry Expo config plugin to `app.json`". No record shows anyone re-checking.

**What a lookup would return.** On 07-18 there is no failure and no escalation, so the only route is `--diff` at first commit and PR-ready. No entry for empty env values exists yet, and ex8's handles are about app.json, so it misses. On 08-03, `--diff` sees the env key in eas.json. ex7 (recorded after 07-20) raises a warning, and its probe returns ABSENT because the value is real. No step asks "may the plugin come back now?".

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | Task windows with CLAUDE.md always loaded. On 08-03 it holds both traps, and the agent cites them. |
| 2 Trigger | breaks | 07-18 is a wiring task, not a failure. The only route is `--diff`, and no entry covered empty env values. Nothing fires before the commit that breaks every build. |
| 3 Query | works | On 08-03 the changed line (the env key in eas.json) is a usable query. |
| 4 Match | strains | 07-18: a miss, because it is the first time. 08-03: a correct but idle ex7 warning. Nothing surfaces ex8's now-relevant condition, because nobody asks about the plugin. |
| 5 Delivery | works | Warning lines go to the PR's decisions journal and to the Opus reviewer (§7.2). |
| 6 Use | strains | On 08-03 the agent had already obeyed CLAUDE.md. The store adds a warning, a verify run and a reviewer ruling, and saves nothing. |
| 7 Check | works | ex7 is a declarative probe on parsed eas.json, and ABSENT is right. The agent's own synthetic capture proved the DSN. |
| 8 Ladder | not_reached | Nothing failed on 08-03. |
| 9 Capture | breaks | The 07-18 writer copied 6928828's "only once a Sentry project + auth token exist" into the always-loaded file as "must never be added". The store's ex8 keeps a precondition; the push copy does not. Two versions of one lesson now exist. |
| 10 Afterlife | breaks | The Sentry project was created outside git, so no §5.1 event fires. If asked, ex8 says inconclusive (unprobeable precondition) both before and after. CLAUDE.md says never. The 06-10 sourcemap follow-up has no route back. |

**What it saved, and what it cost.** ex7, recorded on 07-20 and promoted into CI (D17), gates the empty-env class for every agent and every human. The 07-18 to 07-20 failures were the full price of a first time. On 08-03 the existing CLAUDE.md traps had already done the work.

## L10-2: an "authoritative" line, false when written, refuted by an audit, then rewritten

**Entry as the solver could have written it on 07-08** (Fable 5, CLAUDE.md truth pass 85c88c0; 45 words):

> Scheduler (main.py `_lifespan`, single replica): weekly payroll export, nightly DB backup, daily outcome auto-link scan, daily media-orphan sweep, a 300 s ops-metric rollup, and the outbox dispatcher (default OFF). Each is idempotent, so a duplicate run is harmless.

It was false when written. `record_media_orphan` minted `client_id=uuid4()` in the same tree (see correction 4).

**The correction (07-28).** HANDOFF A7, found by a verifier "whose default verdict was REFUTED" (HANDOFF header), says the line "**falsifies CLAUDE.md's "Each is idempotent so a duplicate run is harmless."**" (HANDOFF:289-295). §4.5 adds: "CLAUDE.md is declared authoritative, so each of these is a defect in its own right — fix the code, or fix the file." Under KS §8, A7 stays in the register, because "an entry is written only when one is solved".

**The later moment (08-02, da988e2, PR #170, Opus 5).** Task: WhatsApp dispatcher hardening, migration 0046, C1/C2 "from the 2026-07-28 handoff", M25/M23/M10, and a CLAUDE.md restructure (338 changed lines). Two libraries are in the window. CLAUDE.md is always loaded and says "trust it over prose docs". The HANDOFF is cited and edited by this PR, and its own header says "Read `CLAUDE.md` first — it is authoritative over every prose doc including this one." The session turns the scheduler paragraph into a table and rewrites the false sentence. It adds the media-orphan-sweep row under it. On 2026-11-12 the line is CLAUDE.md:312, and the code still mints uuid4 at service.py:81.

**What a lookup would return.** Nothing fires, because this is a documentation edit. A lookup keyed on "scheduler idempotent" would miss in the store, since A7 is unsolved. A grep of the HANDOFF would find A7 and §4.5.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | Both libraries were present: CLAUDE.md always, and the HANDOFF because the PR worked from it and edited it. |
| 2 Trigger | breaks | A documentation rewrite inside a code PR raises no failure and no escalation. `--diff` joins "code and config files only" (§7.1/7.2). No lookup happens. |
| 3 Query | not_reached | No lookup. |
| 4 Match | not_reached | If one had run, the store would miss: A7 is an unsolved register item, not an entry. |
| 5 Delivery | not_reached | No lookup. |
| 6 Use | not_reached | The correction was already in the window, as prose, and did not reach the edit. |
| 7 Check | breaks | Nothing checks a prose claim. The line was false when written and stood 20 days, until an adversarial audit with a REFUTED default found it. That audit is the expensive-model judge. |
| 8 Ladder | not_reached | No failure is ever raised. The sweep re-alarms silently (A7: "nothing reads them"). |
| 9 Capture | breaks | The strong model's summary was written from reading, not from a check, 86 minutes after the contradicting code landed. A7's diagnosis has no store home until it is fixed. |
| 10 Afterlife | breaks | By both files' own rule, CLAUDE.md outranks the HANDOFF. The refuted line was rewritten after the refutation and still stands on 11-12. KS §8 rule 5 turns contradictions into corrections once, at KS-4 seeding. A contradiction found later has no defined path. |

**Head-number drift, a side moment.** Main's CLAUDE.md said 0019 across 13 merges while 0020 to 0032 landed, and a manual "truth pass" fixed it. Branch copies of the "authoritative" file then disagreed with main (0035 vs 0036, 0036 vs 0037). An agent on a docs branch was reading a different head number from an agent on main. KS plays no part here: the head number is not an entry.

**What it saved.** Nothing. What it cost: three and a half months in which every agent read a refuted claim as authoritative.

## L10-3: the Python note in the window (EMS)

**Entries as written.** project-fixflow-ship-plan.md (11-01): "A Python 3 interpreter exists at `C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe` (the earlier "no Python" note was wrong)." project-windows-git-longpaths.md (11-04 07:09): "`python` is not on PATH in Git Bash (Windows Store alias) — use `node` for JSON." The MEMORY.md index line ends "no `python` on PATH".

**Later moments.** In all three, MEMORY.md (with that line) sits at line 6 or 7 of the subagent window:
- 11-09 13:10Z, Opus refuter, horthy worktree, `9c3f9742.../wf_e94ba181-fbc/agent-a24b85dfbf353e137.jsonl:39`: `python3 -I -c "..." 2>&1 || node -e "..."`.
- 11-12 07:57Z, Opus critic, `e24f17dc.../wf_548351eb-ab1/agent-a7d5404af4b1e0cff.jsonl:37`: `python3 -c "print(1)" 2>&1 | head -1; P="C:/Users/User/.cache/codex-runtimes/.../python.exe"; "$P" -c ...`. Its brief (line 19) said "a Python 3 interpreter at C:/Users/User/.cache/codex-runtimes/... (the `python` on PATH is only a store stub)".
- 11-12 10:10Z, Sonnet "F2-ks-research-and-refutes", `0bf1c4f3.../wf_55e2d62d-022/agent-a134a5fb8402fd8bf.jsonl:56`: `python3 --version 2>&1 | head -1; node -e '...'`. The result at line 57 starts "Python was not found; ..." and is followed by the node output.

**What a lookup would return.** None was needed. Keyed on the error string, a lookup would hit the note, but the same call had already used the note's remedy.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | MEMORY.md, with the python line, sits at line 6 or 7 of all three subagent windows. |
| 2 Trigger | strains | Nothing should trigger, because the push note did the work. A trigger keyed on the error would fire after the call had already succeeded through its fallback. |
| 3 Query | works | "Python was not found" is an exact, stable string. |
| 4 Match | works | Two notes partly match ("not on PATH"; "exists at <path>"). Both are true. The 07:57 brief merged them correctly. |
| 5 Delivery | works | The index line reaches every window. The body, with the path, reached the critic through the orchestrator's brief. |
| 6 Use | works | The agents treated the stored "no" as a hypothesis: a probe plus a fallback in one command, with no extra call. |
| 7 Check | works | The fallback's output came back in the same result. |
| 8 Failure | breaks | The error line looks like a failure but comes from a hedged probe. A failure detector, ladder trigger or missed-lookup count keyed on error text would score these library successes as misses. The refuter's post-note list (wf_b516f6cc agent-a1e89191a0c75a205.jsonl:158) counts them as re-hits. |
| 9 Capture | strains | The 11-04 note re-asserted "not on PATH" three days after the 11-01 note called an earlier "no Python" note wrong. Neither states the other's condition, and neither knew uv had been installed on 11-02 at 22:06. |
| 10 Afterlife | strains | `python` is still a Store stub. uv is on PATH, and `~/.local/bin` holds python3.13.exe (11-02) and python3.12.exe (11-11). No note changed, and no event exists for machine changes. |

**What it saved.** The existing push note cost zero extra calls in all three windows.

## L10-4: production state, a memory note against the "authoritative" file

**Entry as the solvers could have written it on 10-31 to 11-01** (Fable orchestrator, e24f17dc, plus the Opus verifier in O-03; 98 words):

> Production is down. Both Railway hostnames return the edge's own 404, `{"status":"error","code":404,"message":"Application not found"}` (probed 2026-10-31 and 11-01; down since about 2026-08). The phone cannot tell it from FastAPI's 404: `request()` throws ApiError(status) for any non-OK response, `syncClassification.ts:18` puts 404 in DEFINITIVE_4XX, and sendOrQueue rethrows. So punches, presence and jobs park, and pings and travel drop. Techs must not open the app, clock in, start travel, tap Discard, update or uninstall. The old host may only hang, never answer 5xx or 2xx.

**Later moments.**
- 11-01: critique-3 (CON3-03, line 196) uses the behaviour and cites "O-10 C H=no".
- 11-04: the skills-package subagents (a Sonnet survey, `wf_4865cc40-888/agent-a3e7db6491f3d65d7`, and an Opus refuter, `wf_126b2d60-9d8/agent-a13eb78c5edc29edb`) carry "prod dead" in their first 12 lines. Their "Application not found" hits are greps of `w2/O-10-design.md`, not live probes.
- Every session opens CLAUDE.md, which calls itself "the authoritative, current statement of what the stack actually is". Its line 36 still lists three Railway services. Last edit: 08-02. No mention of an outage.
- 11-01 12:01: 093b793's subject says "ship plan v4", but the commit never touched the plan file, which was still at v3. 46c5d98 fixed this at 12:09.

**What a lookup would return.** A deploy, a `railway up`, or telling a tech to clock in are operator actions. KS reaches those only through the `action` handle, "the only route for operator-action hazards that no diff or hook can see" (§3.3). Keyed on a 404 in a phone log, the body string would match exactly.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | The MEMORY.md index ("prod dead") and the orchestrators' briefs put the state into later windows. CLAUDE.md's stale row sits beside it. |
| 2 Trigger | strains | The hazard is an operator action, reachable only through `--action` wording. No failure comes before the damage, because writes park or drop silently on phones. |
| 3 Query | strains | It works only if the plan's wording overlaps the entry's action handles. The design says zero overlap is a miss. |
| 4 Match | works | The 404 body string and `DEFINITIVE_4XX` are exact handles. |
| 5 Delivery | works | In the record, push delivery already worked (the 11-04 briefs). |
| 6 Use | works | Later agents used it without re-probing, and critique-3 cited O-10 instead of re-deriving. |
| 7 Check | breaks | No check kind reads production. The code half (404 in DEFINITIVE_4XX) is code behaviour, which the design caps at candidate. The world half has no probe at all (§5.5: "Production data state ... which is not in git"). |
| 8 Ladder | not_reached | No escalation in the record. |
| 9 Capture | strains | The material includes commit messages that misdescribe their own content (093b793). Here the slip was caught in eight minutes; an entry built from the message would anchor the wrong version. |
| 10 Afterlife | breaks | Production went dark around 2026-08 and nothing in git changed. CLAUDE.md, "authoritative, current", still describes three live services. When production is restored or the host is rebound (P3c/P4c), the note will go stale in the same silent way. |

**What it saved.** The existing libraries did their job. After 10-31 no session probed the dead hosts or acted on CLAUDE.md's deploy row. The HANDOFF's "point-in-time — re-verify" table was read just before the 10-31 probe that found the outage (e24f17dc.jsonl lines 162 and 168).

## L10-5 (added): one machine fact, three projects, 86 parallel windows

**Sources.** House-expenses transcripts: session `4f9060c4-2059-45d7-9109-b79397b8d3dc`, workflow `wf_1cc608d4-f56` (133 subagent transcripts; their meta files say 83 opus, 49 sonnet). The memory folders of house-expenses, clinic and EMS. The WinGet package folder `astral-sh.uv_...` dated 2026-11-02 22:06, and `~/.local/bin/python3.13.exe` (11-02 22:07) and `python3.12.exe` (11-11 19:29). A read-only check today: the codex Python is 3.12.14 and `PIL` is importable.

**Entry as could have been written (11-02, clinic S00 readiness probe, quoted from clinic-s00-readiness-2026-11.md:13):**

> Machine facts for S00 (probed 2026-11-02): ... no Python 3.13, no uv, no pipx, no py launcher; the only Python is the Codex runtime 3.12.14 at `C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`

uv and Python 3.13 were installed hours later that same day. EMS had the same path in its 11-01 note.

**The later moment (11-03, 19:16:34Z to 19:38:53Z).** One house-expenses workflow fans out subagents to crop receipt images. 86 of them run `python -c "from PIL import Image ..."` and get "Python was not found". Their next calls: PowerShell System.Drawing 34, node 20, `python` again 17, other 15. A second workflow (`wf_03d3bba3-6f0`, 20:13 to 20:22) hits it 16 more times. House-expenses memory has no Python note. On 11-04 it gains two: "(PowerShell, no Python on the machine)" (house-expenses-receipts-program.md:16) and "Tools that work here (no Python, no pdftoppm ...)" (feedback-render-before-judging-visuals.md). Both were false when written.

**What a lookup would return (the owner's cross-project design).** Keyed on "Python was not found" after the first error, it would return the EMS or clinic entry with the codex path. After 11-04 it would also return "no Python on the machine".

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | A crop-task brief and a house-expenses MEMORY.md with no Python line. The task does not say "you need Python"; the agent assumes it. |
| 2 Trigger | strains | There is no signal before the error. The first error is the trigger, so under pull each window pays one failed call first. |
| 3 Query | works | The error string is exact. |
| 4 Match | strains | On 11-03 the EMS and clinic entries agree on the codex path. From 11-04 a third says "no Python on the machine", and the clinic's `uv run python` works only inside the clinic's venv. |
| 5 Delivery | not_specified | The KS design is FixFlow-only and says nothing about other projects (F1 §9). The existing memory is per project, so nothing crossed. |
| 6 Use | strains | The entry answers "is there a Python?", but the task needs Pillow. The codex Python has Pillow today; whether it had it on 11-03 is not recorded. |
| 7 Check | works | The cropped image is its own check. |
| 8 Ladder | works | No ladder was needed: agents switched tools in one call. 17 retried python and failed again. |
| 9 Capture | breaks | Three projects, three writers, three scopes: "no uv" (hours before uv arrived), "not on PATH ... use node", and "no Python on the machine" (false when written). Each one dropped or misstated the condition. |
| 10 Afterlife | breaks | 86 windows started together, so an entry written after the first failure reaches none of them. Machine changes (uv on 11-02, python3.12 on 11-11) raise no event in any library. |

**What it would have saved.** Under pull, the 86 first failures still happen; the lookup can save the 17 repeats and point at a working interpreter. Push delivery could have avoided the first failures too, as the EMS note did in L10-3.

---

## Breaks, clearest first

| # | Break | Step | Known? | Cases |
| --- | --- | --- | --- | --- |
| 1 | World-state facts change with no event. Facts outside the repo (a Sentry project exists, production is down, which Python is installed) changed with nothing in git. KS invalidates only on footprint events, with no TTL. Its guard for ex8, an unprobeable precondition that caps the verdict at inconclusive, also leaves the entry inconclusive on the day it was right. | 10 | new | L10-1b, L10-3, L10-4, L10-5 |
| 2 | A copied lesson loses its condition. "Only once a Sentry project + auth token exist" became "must never be added". "Not on PATH" became "no Python on the machine". Readers then obey the unconditional form. | 9 | 19, 18 | L10-1b, L10-3 (the 11-01 remark about an earlier wrong "no Python" note), L10-5 |
| 3 | The solver's write-up misstates what happened, and the error travels: "re-entered main via #59", which R-02 then counted as "hit twice"; a truth-pass claim false at write time; a commit subject naming a version its file did not hold. | 9 | 27, 8 | L10-1a, L10-2, L10-4 |
| 4 | The higher-ranked library keeps a line its own audit refuted. CLAUDE.md outranks the HANDOFF by both files' rule. The refuted line was rewritten after the audit, by a session working from that audit. KS corrects contradictions only at seeding. | 10 | new | L10-2, L10-4 |
| 5 | No trigger on build or documentation work. The hazards arrived inside wiring and doc tasks, and `--diff` sees only code and config lines. | 2 | 1 | L10-1b, L10-2 |
| 6 | Only an expensive adversarial pass checks the library's own entries. | 7 | 4 | L10-2, L10-1a |
| 7 | A lookup costs a turn when the push library already delivered the lesson. | 6 | 10 | L10-1b, L10-3 |
| 8 | An error line is not a failure. Hedged probes look like misses to any detector keyed on error text. | 8 | new | L10-3 |
| 9 | One symptom, two causes. The entry fits one; its probe passes while the build still fails. | 4 | 6 | L10-1a |
| 10 | The first time is full price (the empty DSN broke every build for two days). | 4 | 11 | L10-1b |
| 11 | Parallel windows each pay before any entry exists. | 10 | 31 | L10-5 |
| 12 | Same fact, different truth per project. A cross-project match returns entries that are each right only in their own scope. | 4 | 34, 13 | L10-5 |

## Listed items my cases show did not break, or matter less

- **16 (short subagent windows start empty).** For the push libraries they do not. MEMORY.md and CLAUDE.md sit at line 6 or 7 of every subagent window I checked (three sessions), and the 11-04 subagents carried "prod dead". Only the index lines arrive; a note's body needs a read or a brief.
- **13 (either/or looks like both).** The two Python notes were complementary, and the orchestrator's brief merged them correctly ("the `python` on PATH is only a store stub"; the interpreter is at <path>). The critic then used both halves.
- **19 as a reading error.** Readers in L10-3 probed despite the stored "no". In my cases the "never" came from a writer copying a conditional (L10-1b), which is break 2.
- **30 (the session may die before writing).** The existing notes were written minutes after the event (the longpaths note at 07:09 on 11-04, after errors at 06:58 to 07:10), and the 093b793 slip was fixed eight minutes later. No case lost a lesson to session death.

## Where the design or the existing libraries helped

- KS's state-based `ks close` scan ("fix not on main") fits the June shape exactly. It would have reported ex8 at every phase close from b4f0766. Acting on it removes the plugin half of build 15 and the 16 days of a broken main.
- ex7, as a declarative probe promoted into CI (D17), gates the empty-env class for every agent and human, with no lookup needed.
- CLAUDE.md's two traps worked on 08-03: #176 cites both and validates the DSN, and neither trap recurred.
- The python note worked at zero cost on 11-09 and 11-12: three agents (two Opus, one Sonnet) carried the remedy in the same command.
- "Prod dead" travelled by the MEMORY.md index and the orchestrators' briefs. No session after 10-31 probed the dead hosts, and critique-3 cited O-10.
- The HANDOFF's point-in-time label came just before the probe that found the outage. Its adversarial audit found A7 and five CLAUDE.md contradictions.

## Summary

The existing small libraries did more than the cases suggested. Push delivery reached subagents, readers probed a stored "no" instead of obeying it, and "prod dead" spread without re-probing. They broke over time in three ways. Facts about the world outside git (a Sentry project, production, the machine's Python) changed with no event. Lessons lost their conditions when copied ("only once" became "never"). The top-ranked file kept a line its own audit refuted, and an Opus session working from that audit rewrote the line. The design's event-only invalidation and its single-store scope do not reach any of these. Its stranded-fix scan and its CI promotion of ex7 would have helped in June and July.
