# D4. Reuse across projects, and the person without the top model (E4)

Date: 2026-11-12. Read-only on the repository. Scripts and raw outputs sit next to this file:
`d4-fix-files.txt` (files each fix commit touched), `d4-fix-classify.js.txt` (my classification and tally),
`d4-deps.txt`, `d4-deps-latest.txt`, `expo-time.json`, `d4-deps-count.js.txt` (dependency versions against today's npm registry).

Terms used below.
- **Gate**: the KS rule that nothing is acted on until the entry's check returns `applies` on the current code.
- **Control pair**: two commits of this repository, one where the check must say PRESENT (`fails_at`) and one where it must say ABSENT (`passes_at`). It proves the check can tell the bad state from the fixed one.
- **Value entry**: an entry whose cause is a data or config value (an env string, a version pin, a revision id). KS lets only these return `applies` from a text check (KS L272).
- **Code-behaviour entry**: an entry whose cause is how code behaves. KS needs an executable check (a test id from this repository's own suite) before it can return `applies` (KS L272).
- **Advice**: an entry the consumer cannot verify before acting. It is a hint, not a gated hit.
- **Portable layer**: the best form the owner could build. Checks keyed by stack (tool, library, version) instead of by this repository's commits, with synthetic fixture files as controls; plus a per-project layer built in each new project.

## 1. Measurements made for this dive

### 1.1 What kind of cause each fix had (50 fix commits on main)

I read the subject, the files touched and, where the cause was unclear, the body of every `fix` and `@ fix` commit on main (48 + 2). Each got one class. This is one reader's classification [estimate]; a second reader would settle it.

- **P, project-specific** (cause in FixFlow's own domain logic or design): **27 of 50 (54 %)**. Examples: bill freeze, carry-in loop, login lockout, dispatcher cursor, job-type gating.
- **W, generic pattern, project instance** (the fact is general, the work was finding where it bit here): **9 (18 %)**. Examples: SQLAlchemy metadata registration (the prod login 500), Postgres `now()` is transaction-start time, sequence instead of max+1, serialise read-modify-write on AsyncStorage, `compare_digest` on a non-ASCII `str`.
- **G, stack-generic** (cause in a third-party tool, library or platform; any project on that stack could hit it): **14 (28 %)**. Of these:
  - **7 self-diagnosing**: the error message names the cause (mypy re-export x2, mypy `Literal`, name shadowing under mypy, tsc strict, Windows cp1252 `UnicodeEncodeError`, and `eas.json` "not allowed to be empty", quoted in 79a8dd4's body).
  - **5 version-bound** to versions a new project would not use today (Expo SDK 52 native pins and the Sentry gradle plugin, 6928828; `expo-asset` peer dependency on SDK 52, b7a5b98; `expo-audio` 0.3.5 `stop()` bug, d440855 and dbb3661; pytest-asyncio loop scope, 7a8baa0). Two of these were **already flagged by a vendor tool**: b7a5b98's body says `expo-doctor` flagged it and passing `expo-doctor` was the gate; 6928828 was fixed by restoring "the versions SDK 52 pins in expo/bundledNativeModules.json via `expo install`".
  - **2 portable, non-obvious and version-independent**: the HS256 base64url spare-bits flaky test (c2a345e) and deriving the Debian codename for the PGDG repository (9c561b0).
- **Value-level fixes** (touched only config, manifests or a Dockerfile, so a declarative check could be lead-capable): **5 of 50 (10 %)**: 79a8dd4, 6928828, 9c561b0, b7a5b98, d440855 (the last also swapped code). Three of the five are version-bound to SDK 52.
- **Opus-reserved areas** (outbox, migrations, auth, PIN, money, job lifecycle; KS L444): **15 of 50 strictly, 21 with borderline cases**. Class of the strict 15: **10 P, 5 W, 0 G**. With borderline: 15 P, 5 W, 1 G (the JWT test). None of the stack-generic fixes falls in a reserved area.

The repeats that justify the store (F2: mypy re-export, `NoReferencedTableError`, press-race guard, SDK-52 pin drift, `expo-audio` stop) split as: 2 G version-bound to SDK 52, 1 G self-diagnosing, 2 W.

### 1.2 How far a new project's versions sit from FixFlow's

`npm view <package> dist-tags.latest` on 2026-11-12 for every direct dependency (generic package names only):

- Mobile (`technician-app`): **23 of 27 direct dependencies are on a different major** than FixFlow pins (85 %). Expo is at SDK 58; FixFlow pins SDK 52. All 17 `expo-*` modules were renumbered to 58.x. React Native 0.76.9 against 0.88.1. `@sentry/react-native` 6.10 against 8.34. `expo-audio` 0.3.5 against 58.0.12.
- Web: 6 of 23 differ (26 %). All npm: 29 of 50 (58 %).
- Expo release cadence (npm `time`): SDK 52.0.0 on 2024-11-10, 58.0.0 on 2026-09-29: six majors in 22.6 months, **one major every 3.8 months**; SDK 55 to 58 took 7.1 months for three majors.
- Backend ranges (FastAPI, SQLAlchemy 2, Alembic 1, Pydantic 2) are still current majors.

### 1.3 The owner's actual second project

The clinic testbed is a Django 5.2 / PostgreSQL web app (`evidence/token-spend/clinic.sessions.json:1000`, `cost-by-worktype.json:338`). It shares Python, Postgres, mypy, ruff and pytest with FixFlow. It shares none of FastAPI, SQLAlchemy, Alembic, Expo, React Native, EAS or the FixFlow domain. Of the 50 FixFlow fix causes, about 10 could even occur there (4 mypy, cp1252, Postgres `now()`, sequence not max+1, `compare_digest`, JWT spare bits, Debian codename) [estimate]; 5 of those 10 are self-diagnosing; none of the three lead-capable worked examples (ex7 `eas.json`, ex2a Alembic duplicate revision, ex8 Sentry/Expo gradle) applies.

### 1.4 Incumbent checks on the lead-capable entries

- ex2a (duplicate Alembic revision id): Alembic itself warns. Its revision map runs `util.warn("Revision %s is present more than once" ...)` and then overwrites the entry (Alembic source, `alembic/script/revision.py`, fetched today).
- ex7 (empty env value in `eas.json`): EAS rejects it with "not allowed to be empty" (79a8dd4 body). The non-obvious part was a FixFlow CI gap (`expo export` does not validate `eas.json`), which is project configuration.
- ex8 and the SDK pin drift: `expo install` / `expo-doctor` hold the correct pins (6928828, b7a5b98 bodies).
- KS D17 already proposes promoting ex7's and ex8's checks into the repository's own CI "with no store involved". V2 (L81) says an entry seen three times becomes a lint, test or gate clause and retires. F2: every historical repeat ended with a structural guard.

## 2. Testing the lead against the best form

### 2.1 "The thing that makes an entry safe makes it non-portable"

**Value entries: dissolves technically.** A `json_predicate` over `eas.json`, a `dep_version` predicate over a lockfile, or a duplicate-id check over migration files can be keyed by stack and run in any project. Synthetic fixture files can serve as controls, and they are honest here because the matched value is itself the cause (KS L272; ex2a already uses a synthetic overlay). So the gate does travel for this class.

But look at what survives. It is 5 of 50 fixes and 3 of 8 worked examples. Each one is a one-line config rule. Each is already reported by the vendor tool or is proposed for CI by the KS design itself (D17). Once it is a CI rule, nobody needs to look it up. That is a rule pack, not cached reasoning.

**Code-behaviour entries: stands.** Their lead-capable check is a test id in FixFlow's suite (KS L272, L281). The portable form would be a test template. Two things break:
1. Turning the template into a test for a new codebase means finding where the pattern lives in that code. That is the diagnosis step the library was meant to skip, and the cheaper model does it.
2. The control pair needs a fixed commit to show ABSENT. In the new project the fix does not exist yet, so the pair cannot be shown before acting. KS's own rule says a check with a synthetic `passes_at` gives a hint, not a verdict (L276, KS-C6).

The best a competent team can do is "verify after acting": write the failing test, apply the suggested fix, see it pass. That is safe, but it is the agent's normal test loop. The library then contributes a hypothesis, which is advice.

**What the evidence says about advice across projects.** The best cross-repository result is SWE-Exp (same-repository experience excluded): DeepSeek-V3 37.2-37.8 to 42.0 resolved, with tokens up 7.5 % and wall time up 25 % (F4, F5 A3). ExpeL's stronger-writes-weaker-reads design raised success but used 4,310 tokens per trajectory against 1,320 (F4). Context files: no significant gain, over 20 % more cost (F5 B1). MemCollab: raw 32B-model memory pushed 7B and 8B models below their no-memory baseline (F5 C3). AgentBrew: notes had to be validated per student, most drafted notes failed validation, and notes brewed on one student did slightly worse on another (F6). Curated skills: +16.6 points on average, but software engineering only about +4.5 (secondary report, unconfirmed at the paper; F6). APC, the one source with a large token cut, worked inside one workload with repeating task types and did not test transfer (F4).

So the cross-project form buys a few points of success and pays for them in tokens and time. That runs against E1 and E2 in exactly the use E4 describes.

### 2.2 The squeeze (what transfers is either project-specific or already known)

**Stands, measured (section 1.1).** 54 % of fix causes are project-specific and do not transfer at all. 18 % are generic patterns whose cost was finding the instance, which a portable entry cannot do for the new project. Of the 28 % that are stack-generic, half name their own cause in the error message, two were already caught by a vendor tool, five are tied to versions six Expo majors old, and two are portable, non-obvious and current. The transferable, non-obvious, verified middle is about 2 of 50 fixes [estimate].

The best-form escape is a sibling project in the same domain (a second repair-shop app), where FixFlow's domain invariants would carry. **Partly dissolves, but not in the library's favour.** For a sibling, the best vehicle is the code and its tests themselves (a template repository): tests verify the invariants directly, and a lookup library adds little to that. The owner's actual second project (section 1.3) is the opposite case: different domain, mostly different stack.

### 2.3 Privacy (store stays local; names and addresses cannot be scrubbed)

**Dissolves.** Generalised stack-level entries ("an empty env value in `eas.json` fails every EAS build") contain no project data. The owner's own projects stay on his own machines. Raw per-project entries, the ones that would leak names, are the non-portable ones anyway. Its residual cost is that someone has to rewrite each entry into stack terms, and that writer is the top model. That cost sits in issue 2.

### 2.4 The person without the top model cannot write, approve or repair

**Partly dissolves, partly stands (issue 3).** Mechanical upkeep needs no top model: re-running a control pair, `reaffirmed`, re-anchoring. A cheaper model could also write entries through the mechanical gate (control pair flips, mutants, self-match refusal). What does not dissolve: the write trigger is a hard solve, and a cheap-only user's hard solves are by definition the ones their model already managed. The store can only hold what was computed. Re-diagnosis after a real code change is reasoning, at the user's tier.

### 2.5 A shared store as an attack surface

**Mostly dissolves into a curation trade.** MINJA's 98.2 % injection success needs an agent that writes memory from ordinary queries (F5 A2). The KS write gate has no such route: no LLM extraction, approval required, control pairs, and nothing stored is executed (L268, L454). A malicious contributor to a shared pool is the remaining route. Cheap consumers do comply with wrong retrieved content (ClashEval: over 60 %), and fix withholding is a CLI behaviour, not a lock (L525). A signed pool from a trusted curator closes that route, as package registries do, at the price of open contribution. What is left is the curator's capacity, which issue 2 counts.

## 3. What "zero to a hundred on a cheaper model" needs that the best form cannot give

1. **Project-specific reasoning.** This is 54 % of fix causes here, plus most of the spend: design, implementation and research, not debugging (F3 section 2). It is produced only inside the new project.
2. **Verified applicability in new code.** A control pair needs a fixed state of that codebase. Before the fix exists, every cross-project code entry is a hint.
3. **Current-version knowledge.** A new project starts on today's versions. The source project's portable entries are for the versions it pinned.
4. **Capability on novel risky work.** None of the 15 reserved-area fixes was stack-generic, and KS keeps Opus applying fixes there even after a verified hit (L444).

## 4. At project zero, what does the library hold for that project?

- Per-project layer: nothing.
- Portable layer from FixFlow, for a new project on the same stack started today: two lead-capable rules (ex7 and ex2a). Both are reported by the vendor tool itself, with "not allowed to be empty" and "present more than once". Add about seven backend advice items (SQLAlchemy registration, Postgres `now()`, mypy re-export, `compare_digest`, sequence not max+1, pytest-asyncio loop scope, cp1252), mostly in public docs. Mobile: nothing that matches, since every Expo entry is keyed to SDK 52 and the project gets SDK 58.
- For the owner's Django clinic app: zero lead-capable entries and about ten advice items, half of them self-diagnosing.
- Against V2's own model (guessed parameters: hit rate = 0.25 x e / (e + 20), saving = 0.436 x hit rate - 0.02), break-even is about 4.5 entries. With 2 entries the net is -1.0 % of burn; with 9 it is +1.4 % [illustrative, guessed inputs]. Any speed-up beyond that comes from the new project's own entries. For a cheap-only user those are written by the cheap model (issue 3).

## 5. Issues that stand

### Issue 1. Across projects the gate does not travel for reasoning; what travels verified is a rule pack, and the rest is advice

- Mechanism: section 2.1 and 2.2.
- Hits: E4 (caps), E1 and E2 in cross-project use (raises cost).
- Magnitude: the verified-portable share is about 10 % of fix-class work (5 of 50 value-level fixes; 3 of 8 worked examples), already covered by vendor tools or by the CI promotion the KS design proposes. The other 90 % crosses as advice. The best published cross-repository result is +4 to 5 points of success at +7.5 % tokens and +25 % time.
- Already in design: partly. KS L272 and L276 state that code-behaviour entries need executable checks and that a synthetic control gives a hint. D17 and V2 L81 promote lessons into CI. The design is silent on cross-project use (F1 section 9). The V2 refuter (item 12) says KS is FixFlow-specific and transfer is not shown. No consequence is drawn for E4.
- Falsifier: a second reader finds more than 30 % of the 50 fixes portable, non-self-diagnosing, current and not covered by a tool. Or a blind trial shows a Sonnet-class agent in another repository with the same stack, fed generalised FixFlow code-behaviour entries, fixing seeded causes with no acted false positive and fewer tokens than its own no-library run.

### Issue 2. Portable entries are version-bound and perishable, so they serve laggard projects, not new ones (missed by the lead)

- Mechanism: to stay safe, a stack-keyed entry must carry a version predicate. A new project starts on current versions. A predicate that matches FixFlow's versions does not match the new project. A predicate widened to match it asserts behaviour on versions nobody checked, which is advice; some causes were fixed upstream (`expo-audio`'s stop bug, fixed by SDK 53 per d440855). The public part is also absorbed by vendor tools and by the next model's training. The window of value is between learning the lesson and the upstream or the model catching up. Keeping entries current means a top-model re-verification per entry per upstream major. That is a treadmill that changelogs, `expo-doctor` and Alembic's own warning already run.
- Hits: E4 (caps it, and delays it for new projects), E1 (cross-project saving decays).
- Magnitude: 23 of 27 mobile direct dependencies (85 %) and 29 of 50 npm direct dependencies (58 %) are on a different major today. Expo ships a major every 3.8 months, three in the last 7.1. All 5 version-bound portable fixes and both version-bound repeats are tied to SDK 52. At zero, the mobile portable layer matches nothing.
- Already in design: partly. KS invalidates on dependency and platform change (L340) and carries `dep_version` and `env` footprint items (L285). It admits that remote-resolver and floating-tag changes are undetectable (L358). It does not draw the consequence for a new project.
- Falsifier: re-run FixFlow's five version-bound causes on current versions (SDK 58, current RN, Sentry 8, current pytest-asyncio). If most still reproduce, the predicates can be widened safely and the issue shrinks. Or a project started today on this stack matches several FixFlow entries.

### Issue 3. A cache can only return what was computed; for a cheap-only user the library holds nothing above their model where the top model matters most

- Mechanism: the write trigger is a hard solve (escalation, two failed approaches, a burned build; L452). A user without the top model never escalates. Their store receives only what their model solved, so it can save tokens on repeats but cannot lift capability. Above-cheap solutions for project-specific problems can only be produced in that project, by a top-tier model. Where the top model matters most, in money, auth, migrations, outbox and lifecycle, every fix here was project-specific or a project instance, and the KS design keeps Opus applying fixes there even after a verified hit. All 48 historical fixes were made by top-tier models; none by a cheap tier (F2).
- Hits: E4 (breaks "works as if they had one" for project-specific risky work), E3 (partly).
- Magnitude: 15 of 50 fixes (30 %), or 21 (42 %) with borderline cases, sit in Opus-reserved areas. All are P or W; 0 are stack-generic. Together with issue 1, the cheap-only user's portable gain is confined to about 10 % of fix work, outside the risky areas.
- Already in design: partly. KS L444 keeps Opus applying fixes in reserved areas; L437 makes writes Opus-only; L545 says a cheap agent's benefit from a gated hit is not established. Use without the top model is never considered.
- Falsifier: a with-and-without trial where a Sonnet-class agent with only the library completes reserved-area work on a new project at Opus's defect rate. Or cheap-written, gate-approved entries turn out to match Opus-written ones in acted precision and in their effect on later solves.

## 6. Fixes a competent team would try, and what each does

| Issue | Fix | Result |
| --- | --- | --- |
| 1 | Stack-keyed declarative checks with fixture controls | Dissolves for value entries, but those are 5 of 50 fixes and are lint rules that D17 already moves into CI |
| 1 | Test templates for code-behaviour entries | Fails: instantiating the template is the diagnosis, done by the cheaper model, and the control pair cannot be shown before the fix exists (L276) |
| 1 | Verify after acting (failing test, fix, pass) | Partly: safe, but it is the agent's normal loop; the library adds a hypothesis, and cross-repository hypotheses measure +4 to 5 points at +7.5 % tokens |
| 1 | Per-student validation (AgentBrew) | Partly: lifts the student, but needs the teacher on the target; most notes fail validation |
| 1 | Curated portable skill pack | Partly: +16.6 average, about +4.5 for software engineering (secondary); this is the incumbent |
| 1 | Sibling project in the same domain | Partly: domain invariants carry, but the code and its tests carry them better than a lookup; the owner's second project is a different domain and stack |
| 2 | Keep tight version predicates | Fails for E4: safe, but nothing matches a project started today |
| 2 | Widen predicates | Fails: unverified claims about untested versions, which is advice; some causes are already fixed upstream |
| 2 | Central curator re-verifies per upstream major | Partly: works, at a top-model cost per entry per release; duplicates vendor tools and changelogs; the next model's training absorbs the public part |
| 2 | Keep only version-independent lessons | Partly: 2 of 50 fixes qualify |
| 3 | Relax the Opus reservation | Trade: more E4 coverage, less safety; the gate proves a condition, not a cause; ClashEval shows over 60 % adoption of wrong retrieved content |
| 3 | Cheap model writes through the mechanical gate | Partly: gated self-memory helps (Xiong: 70.95 against 55.48 for add-all) and saves tokens on repeats, but holds nothing above that model |
| 3 | Cheap-model retries, then cache | Partly: may reach the solution, but the retries cost the tokens and time that E1 and E2 want, and the lift comes from the retries |
| 3 | Rent the top model for hard cases only (routing) | Dissolves the gap (RouteLLM: 13 to 35 % of calls to the strong model kept 87 to 95 % of its quality), but drops E4's premise; it is routing, not the library |

## 7. Angles for other dives

- The gap the library must close for E4 is a few points today (vendor-reported Sonnet 5.5 against Opus 5.5: -8.2 FrontierCode, -2.3 CursorBench, +4.2 Terminal-Bench). That is the size of the best memory-transfer gains (SWE-Exp +4 to 5; AgentBrew +6.3). So the library's share of any "as if" result is unknowable without a with-and-without trial on each model pair, and every mid-tier release resets the comparison.
- The portable layer may have a real user, just not the one E4 names: a maintainer of an old app stuck on the same old versions.
- Settle the "already known" half with a cold test: give a current Sonnet-class model the 14 stack-generic symptoms with no library and count correct diagnoses.
- The 50-commit classification is one reader's. A second blind reader would settle it.
