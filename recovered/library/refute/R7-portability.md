# R7 refutation: across projects the safety check travels only for a small rule pack

Date: 2026-11-12. Refuter. Read-only on the repository and transcripts.
Scripts and outputs in this folder, all prefixed `r7-`:
- `r7-dump.cjs` → `r7-fix-bodies.txt` (subject, body and files of every fix commit on main, from git)
- `r7-classify.cjs` (my labels, agreement with the first reader, kappa)
- `r7-cfgonly.cjs` (config-only fixes, from git)
- `r7-deps.cjs` → `r7-deps.json` (my own `npm view` of every dependency in `main:technician-app/package.json` and `main:package.json`)
- `r7-cadence.cjs` with `r7-expo-time.json`, `r7-rn-time.json` (release dates from `npm view <pkg> time`)

Verdict: **narrowed**. The core stands: the gate does not travel for code behaviour, and what travels verified is a small rule pack. Three parts were overstated: the version claim, the "only 2 portable" count, and the use of SWE-Exp as the ceiling for advice.

## 1. Numbers: what I re-derived, read, or could not check

| Claim | How | Result |
|---|---|---|
| 50 fix commits on main | own `git log main` filter | confirmed (48 `fix` + 2 `@ fix`) |
| 54 % P / 18 % W / 28 % G | own blind-ish classification (section 2) | corrected: 50 / 22 / 28; 38 / 34 / 28 if borderline cases count as W |
| 5 of 50 value-level fixes | own git scan for config-only file sets | confirmed with a nuance: 4 strictly config-only (79a8dd4, 6928828, 9c561b0, b7a5b98) plus d440855, a dependency swap that also changed code |
| value fixes "mostly" already reported by vendor tools | read each body | corrected: 2 to 3 of 5. b7a5b98 and 6928828's pins: `expo-doctor` / `expo install`. 79a8dd4: EAS itself rejects it at build start. 9c561b0 (Debian codename) and d440855 (`expo-audio` bug): no tool. 6928828's Sentry-plugin cause: a generic Gradle error |
| 2 of 14 stack-wide causes portable, non-obvious, current | own reading | corrected: 2 to 3 at commit level; about 10 when the project's documented deploy traps are counted (section 3.3) |
| 23 of 27 mobile deps on a newer major (85 %) | own `npm view` over `main:technician-app/package.json` | confirmed 23 of 27. But 16 of the 27 are `expo*` packages, which since SDK 55 carry the SDK number, so one fact (SDK 52 → 58) is counted 16 times. Independently versioned packages: 7 of 11 moved a major (64 %) |
| Expo major every 3.8 months | own `npm view expo time` | confirmed 3.77 months over 52 → 58 (2024-11-10 to 2026-09-29). Over 49 → 58: 4.3 months. Single gaps 1.3 to 5.6 months. 55 → 58 = 7.1 months confirmed |
| React Native | own | 0.76.0 (2024-10-23) to 0.88.0 (2026-10-15): twelve minors in 24 months |
| SWE-Exp +4 to 5 points, +7.5 % tokens, +25 % time | arithmetic on F4/F5 figures | confirmed: 37.2–37.8 → 42.0 = +4.2 to +4.8; 189.1K → 203.3K = +7.5 %; 757 s → 949 s = +25.4 % |
| "best measured cross-repository effect" | web, Agent KB full text | corrected (section 4.3) |
| proponent's 35 % research overlap | read `p-research-overlap.cjs` | read only. It compares today's memory-literature sheets with the owner's earlier KS research: same topic, ten days apart, not cross-project |
| proponent's 15–30 % for a second project | arithmetic on F3 §2 shares | re-derived the arithmetic (17.4–26.2 %); the input assumption is unmeasured (section 5) |
| clinic project is Django 5.2 | D4 §1.3 | read only, not checked |

## 2. Second classification of the 50 fixes

Method. I dumped every fix commit's subject, body and file list from git and labelled each before opening `d4-fix-classify.js.txt`. **Blindness was partial.** I had already read D4's prose, which names about 20 commits with their class. I am also the same model family as the first reader. Both raise agreement. Treat the agreement as an upper bound.

Classes, as the task defines them: P = cause in this project's own logic or design; W = a general pattern, the work was finding where it bit here; G = cause in a third-party tool, library or platform.

Result:
- Mine: **P 25 (50 %), W 11 (22 %), G 14 (28 %)**. First reader: P 27, W 9, G 14.
- Agreement 48 of 50 (96 %), Cohen's kappa 0.935. The two differences: 67218b1 (guarded claim, payment race, token retry) and ca362c0 (trust client size, idempotency race). I read both as textbook concurrency and trust patterns (W); the first reader as project logic (P).
- The P/W line is soft. Six commits I labelled P carry a general pattern: 24184b2 (channel opt-in must be explicit), 1c546a3 (lost update on a counter, `SELECT ... FOR UPDATE`), 013a86b (swallowed exception conflates "missing" with "unknown"), 8ff3179 (ephemeral state lost on process death), a60a0a6 (missing authorisation check), 76061e0 (stale queued write). Counted as W: **P 19 (38 %), W 17 (34 %), G 14 (28 %)**.
- G is stable at 14 under both readers and both boundaries.

G sub-classes (mine):
- Self-diagnosing, 7: same seven as the first reader (mypy ×4, tsc, cp1252, EAS "not allowed to be empty").
- Version-bound: d440855 and dbb3661 (`expo-audio` 0.3.5 stop() bug, fixed upstream), b7a5b98 (SDK 52 peer dependency and pins), and the pin half of 6928828.
- Disagreement on 6928828: it had three causes. Only the pins are tied to SDK 52. "Dependabot bumps Expo native modules out of SDK lockstep" applies to every SDK. "The Sentry config plugin's Gradle upload step needs an auth token on EAS" is still in Sentry's current Expo docs (`SENTRY_DISABLE_AUTO_UPLOAD`, `SENTRY_AUTH_TOKEN` as an EAS secret). Both are current.
- Disagreement on 7a8baa0: pytest-asyncio still runs each test on its own loop by default; only the configuration knobs changed. I read it as current but widely documented, not version-bound. This is my judgment; I did not run it.
- Portable, non-obvious, current, not tool-caught: 9c561b0 and c2a345e (agree), plus 6928828's Sentry cause. **2 to 3 of 14.**

The classification claim holds within a few points. An independent reader of a different kind (a human, or another model family) should still be run.

## 3. Trying to dissolve the issue

### 3.1 "Code-behaviour entries lose their control pair"

Attempt A, static rules with fixture controls. Semgrep or ast-grep rules ship with positive and negative fixture tests, which is a control pair on synthetic code. A rule can show that the pattern is present in the new repository today. It fails to dissolve for two reasons. KS's own probe rule (KS L272) caps any text probe on a code-behaviour entry at candidate, because a pattern is not a cause (`compare_digest` on a `str` that only ever holds ASCII is harmless). And once written, such a rule belongs in CI and leaves the lookup path (V2 L81, KS D17). That is the rule pack the issue names.

Attempt B, test first in the new project. The cheap model reads the advice, writes a test that fails on today's code with the expected message, then fixes. That rebuilds a control pair locally, before acting. This is the strongest counter and it partly works: it makes advice safe. But the cheap model must first find where the pattern lives, which is the diagnosis the library was meant to skip. And the check is written and approved by the cheap model, below KS's standard (non-author Opus approval, mutant controls). The library's contribution is the hypothesis. **Survives as a trade:** safety is bought with the normal test loop, at the user's own tier.

### 3.2 "Only value entries keep a check; they are lint rules vendors already report"

Holds in shape. 4 to 5 of 50 fixes. The "vendors already report" part is overstated: 2 to 3 of 5. The two that no tool flags (Debian codename, `expo-audio` bug) are among the costliest (a failed deploy, a broken recorder). Even so, each is a one-line CI or Dockerfile rule once known. Rule pack confirmed.

### 3.3 "Only 2 portable, non-obvious traps"

This is where the sample is biased. Portable stack traps often show up as deploy incidents, not as fix commits. The project's own notes (`CLAUDE.md` build and deploy traps; `docs/HANDOFF-2026-07-28-open-work.md` §2) hold about six more that are stack-wide, non-obvious and mostly current:
1. `expo export` bundles JavaScript only and validates neither native code nor `eas.json`.
2. From a monorepo root, Railway's builder detects Vite and builds the API as the web app.
3. `railway up --ci` ends with a timeout although the build succeeded (may be version-bound).
4. Rolling a deployment back after a migration ran makes a boot-time `alembic upgrade head` crash-loop.
5. With no `transaction_per_migration`, all pending Alembic migrations run in one transaction (lock hold time).
6. `alembic check` does not compare CHECK constraints.

With the 2 to 3 from fixes, that is **about 10 portable, non-obvious traps over the project's life** (about five months), not 2. Adding widely documented language facts the project hit (`compare_digest` on non-ASCII `str`, Postgres `now()` is transaction start, SQLAlchemy model registration) gives about 13.

This corrects a number, not the conclusion. Ten one-line traps fit a short stack checklist or skill of one to two thousand tokens. They arrive as advice. About half could become CI or config checks in a template repository. None needs a gated lookup library to travel.

### 3.4 "The portable part is tied to versions"

Narrowed. The cadence numbers are right. But of the roughly ten portable traps, at most one or two are version-bound; the version-bound items are the SDK-52 pin fixes, two of which `expo-doctor` already catches. Re-verifying a value check on a fixture project per SDK major is mechanical, not top-model work. Device-bound native behaviour (the `expo-audio` bug) is the exception. "For a project started today almost nothing matches" is true only of FixFlow's SDK-pinned mobile entries (4 fixes).

### 3.5 "At project zero the library holds nothing for that project"

True of the per-project layer by definition. The portable layer holds the checklist above for a same-stack project; for the Django clinic app, only the Postgres, Railway and Python items (perhaps 4 to 6).

## 4. Is evidence on advice as weak for specific traps as for overviews?

### 4.1 What the cited number measures

SWE-Exp retrieves one distilled experience for every issue, whether or not a matching trap exists. Its +4 to 5 points and +7.5 % tokens are an average over mostly non-matching retrievals. It does not measure a keyed trap pulled only when an error string matches.

### 4.2 The one study that separates the two

The AGENTS.md study (F5 B1) found repository overviews unhelpful, while instructions in the files were followed and files paid off where they stated non-standard practices. Developer-written files averaged +2.4 points on its own benchmark (not significant). So the evidence leans slightly toward specific, non-standard advice. It does not show it is as weak as overviews.

### 4.3 A larger cross-repository number exists

Agent KB (arXiv 2507.06229v5, opened today), SWE-bench Lite, pass@1, at 100 iterations:
- GPT-4.1 with SWE-agent: 27.0 → 35.3 (+8.3).
- GPT-4.1 with OpenHands: 28.7 → 31.7 (+3.0).
- Claude-3.7 with OpenHands: 41.3 → 48.3 (+7.0).

At 50 iterations the gains run +4.0 to +16.7. The experiences come from RepoClassBench, SWE-Gym-Raw and RepoEval, and the paper says one of these was chosen from "repositories that align with those in SWE-bench". No same-repository exclusion is stated, and no token or time comparison is given for these runs. So it is not clean cross-repository evidence, and it says nothing on cost.

### 4.4 Conclusion

"The best measured effect is +4 to 5 points at +7.5 % tokens and +25 % time, the wrong direction" is too strong as a ceiling. It holds for broad experience banks. For keyed, specific traps there is **no measurement either way**. A trap lookup pulled only on a matching error costs one call. A hit can save a burned build. The real limit is frequency: about ten such traps in five months.

## 5. The proponent's method layer (15–30 % for a second project)

The proponent's arithmetic, re-derived from F3 §2 cost shares:
- harness-meta 24.8 % × 0.5–0.8 = 12.4–19.8 points;
- research 10 % × 0.35 = 3.5 points;
- design 14.7 % × 0.1–0.2 = 1.5–2.9 points;
- total 17.4–26.2 %.

What needs a lookup library?
- **Harness-meta (12–20 points): none.** Not rebuilding the harness is reuse of a tool: a template repository, scripts, a plugin or skills package.
- **Research (up to 3.5 points): a searchable claims file.** The 0.35 is same-topic repetition within ten days (memory literature against the owner's own KS research), not cross-project. A second project on another domain would overlap only on harness topics. Research claims have no control pair, so KS's gate adds nothing. The owner's research is already kept as documents.
- **Design rationale (1.5–2.9 points): ADRs or docs with search.**

So at most about 5 of the 17–26 points need any lookup, and none needs the gated solved-problem store. The proponent concedes the same: "the library's own marginal share is the research-claim cache and the design rationale, about 3-5 %".

The one second project on this harness does not support the 0.5–0.8 assumption. Clinic alone spent **23.4 %** of cost on harness-meta, against 27.1 % for FixFlow (F3 §2). This is confounded, because the clinic repository is the harness testbed. But no measurement shows a second project skipping harness work.

## 6. What survives

The gate's verified reuse does not cross projects except as a small set of config rules. Code-behaviour knowledge crosses as advice. It can be made safe only by the receiving model writing its own failing test first, which is its normal loop and its own diagnosis. Project-only causes are half of the fixes (38 to 54 % by boundary). The portable residue is about ten non-obvious stack traps over five months: a checklist, not a library. The rest of a second project's head start (harness, recipes) is carried by a template repository and a skills package without any lookup.

Not surviving as stated:
- "Almost nothing matches a project started today" holds only for SDK-pinned entries.
- "Only 2 portable" should be about 10, counting deploy traps.
- SWE-Exp is not a ceiling for keyed trap advice.

## 7. Restated issue (under 90 words)

In a new project the library's safety check mostly stays behind. Only config-value entries keep a working check: 5 of this project's 50 fixes, half already flagged by vendor tools. Code-behaviour entries arrive as unchecked advice. About half the fixes had causes that exist only here. Portable, non-obvious stack traps total roughly ten, mostly from deploy notes, and fit a short checklist. A second project's head start is the reused harness and templates, which need no lookup library.

## 8. What the owner can do

- Ship the portable layer as a stack checklist or skill plus CI rules in a template repository: about ten traps, half as checks. The cost is small: writing it once per stack, and re-running the value checks on a fixture project per SDK major.
- Keep the gated store per project, and do not count it toward E4.
- Settle E4 with the proponent's own test: start a small second repository from the template, with and without the portable checklist, and count tokens to the first milestone.
- Verified cross-project reuse of code-behaviour reasoning is not available within this design.
