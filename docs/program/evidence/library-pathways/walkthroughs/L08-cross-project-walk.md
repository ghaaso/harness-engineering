# L08 — Knowledge moving between projects: case walks

Pathway family: knowledge moving between FixFlow (FastAPI, React, Expo) and the clinic build (Django) on one PC.
Design walked: the owner's library (ten steps), with the knowledge-store design v1.3.1 (`KNOWLEDGE-STORE-DESIGN-2026-11.md`, "KS" below) counted wherever it has a mechanism.
No fixes are proposed here. Every record below was opened and checked; corrections to the case cards are listed first.

Status words: works, strains, breaks, not_specified (the design says nothing), not_reached.

---

## 0. What the records actually say (corrections to the case cards)

| Card | Correction found in the records |
| --- | --- |
| L08-1 | The FixFlow session c1797e48 ran on `claude-fable-5-1` (top tier), at about 196k cached tokens per call. The clinic git fix was by an Opus 5.5 session (dfe1ea6e). The DLL half was found by a **Sonnet** subagent ("Second-maintainer fresh-clone rehearsal", S01 session efb9a0b8, 2026-11-03T10:18Z) and committed in clinic **9982012** (10:36Z), not 32dea29 (which holds only the git half). The sibling FixFlow sessions got the fix twice: the MEMORY.md index (line 16) and an owner paste of c1797e48's notes (line 54). |
| L08-2 | The clinic refusal was **not** an unchecked report. It was a real harness error: `<tool_use_error>Subagents should return findings as text, not write report files. Include this content in your final response instead.</tool_use_error>` (cb58bdc7 subagents a8f87cc L257, a6a48ae L179), on files named `analysis-design.md` and `analysis-ai-ux.md`. Sonnet agents of the **same type and mode** (general-purpose, background) wrote `plan-mapping.md` and `ledger-notebook.md` in the same folder. FixFlow's 2026-11-11 probe wrote a `.txt`. On 2026-11-12 the same FixFlow session had **8 of 8** `report.md` writes refused (Sonnet and Opus). |
| L08-3 | The paste is line 3 of 7f348b2c, not line 1. The clinic root started **three** sessions with no model before the owner caught one (11-01 plan-readiness and notebook-reconcile; 11-02 S00). In FixFlow, **7 of 7** `start_session` calls (11-02 to 11-11, all by Fable in e24f17dc) passed no model; no owner objection is recorded. The clinic itself later started a deliberately Fable-orchestrated session with no model (ui-design, 2026-11-04). |
| L08-4 | The event is in e24f17dc (Fable 5.2, about 380k cached tokens), L7533 to L7670, 08:30Z to 08:50Z. 0bf1c4f3 line 70 is a later session quoting memory. The session's own subagent brief (L7245) said "Nothing new may be installed without the owner's decision, so do not install anything". |
| added L08-5 | Bash command length: clinic subagents hit it on 2026-11-01; FixFlow re-found it on 2026-11-11 and broke its own rule on 2026-11-12. |

---

## 1. Case L08-1 — Windows "Filename too long" on git clone

**Records.**
- Clinic dfe1ea6e L697 (2026-11-03T04:04Z, Opus 5.5): `fatal: cannot create directory at 'output/coding-workflow/WF-02/...': Filename too long`. Retried with `-c core.longpaths=true` at L710, passed at L711. Guide amended (32dea29).
- Clinic S01 subagent a5839282 (Sonnet, 10:18Z): `DLL load failed while importing pq: The filename or extension is too long`. Guide line 28 (commit 9982012): "core.longpaths fixes only Git ... In the S01 rehearsal ... a clone under a 208-character root ... failed ... the same clone at a 42-character root passed."
- The guide carried the DLL rule into five later clinic sessions at their start (vigilant-chatelet L156, ecstatic-snyder L196, epic-blackwell L53, unruffled-sammet L72, adoring-goldberg L63).
- FixFlow c1797e48 L227 (2026-11-04T07:01Z, Fable 5.1): `error: unable to open loose object 41a0e66d...: Filename too long`; 15 of 15 clones failed. L237 greps the output; L244 (07:02:10Z) rewrites the script with `git -c core.longpaths=true`; success at L250. Memory note at L285 (07:09Z), git half only. No FixFlow record cites the clinic.
- Siblings 9c3f9742 and 6fc590cb (07:17Z) had the index line at L16. 9c3f9742's first clone (L240, 07:22Z) already used the flag. No failure.

**Entry as the clinic could have written it (2026-11-03).**
> Windows: `git clone` fails with "Filename too long" (`cannot create directory at ...`) when the destination root is long: MAX_PATH 260 plus deep repo paths. Fix per command: `git clone -c core.longpaths=true` (or `git -c core.longpaths=true <cmd>`); no global config change. Limit: longpaths fixes git only. Native Python modules then fail to import under a long root: `DLL load failed while importing pq: The filename or extension is too long` (208-char root failed, 42-char passed). Keep the root under about 100 characters. Refs: clinic 32dea29, 9982012.

**The later moment.** Fable main session, about 196k tokens, building skill packages. A background script clones 15 GitHub repos (sparse, blob:none) into a scratchpad of about 170 characters. The 43.6 KB output is persisted; the preview shows the loose-object errors. Fable greps the file, then fixes the script in its next call.

**What a lookup would return.** Keyed on the error text: the template differs (`unable to open loose object <hex>` against `cannot create directory at <path>`). Shared words: "Filename too long", plus git and clone in the command. A shared store gives a candidate on prose, not a lead. The KS store as designed gives a miss: the clinic entry is not in it.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | The error text is in the main window. The actor is Fable, the top tier, not a cheap model. |
| 2 Trigger | breaks | KS lookups fire before escalating, before retrying a build or deploy, before a prescribed fix, on a gate error, and on `--diff`. A clone inside a research script is none of these. Fable fixed it inline; there was no rung to climb. No lookup. |
| 3 Query | strains | If asked, the text differs from the stored template. Only "Filename too long" overlaps. |
| 4 Match | breaks | KS keeps one store for FixFlow (`.fixflow-ks`), seeded from FixFlow, with repo-relative handles and an existence filter that demotes entries whose paths are absent. A clinic entry is not there. Cross-project matching is not specified. |
| 5 Delivery | works | Main session; nothing compacted before the note was written. |
| 6 Use | works | One flag. The DLL half does not bite here (markdown repos, no native imports) and does no harm. |
| 7 Check | strains | Re-running the clone is the real check, and `ks outcome` from a re-run fits. But no KS check kind reads a machine path length, so `applies` is unreachable and the CLI withholds the fix text. |
| 8 Ladder | not_reached | Solved at the first try. |
| 9 Capture | breaks | The git half was fixed on the first retry: below the KS write bar (no escalation, no two failures, no burned build). The DLL half qualifies, but its cause is the clone root, not a commit, so no `fails_at`/`passes_at` pair exists for the gate. FixFlow's writer stored only the half it saw. |
| 10 Afterlife | strains | Inside FixFlow the push index reached both siblings; 9c3f9742 never failed. A pull-only lookup would not have fired there. Across projects nothing moved; the DLL rule never reached FixFlow. |

**What it would have saved.** At most one Fable call at about 198k cached tokens in c1797e48 (L237 to L244), and the lookup itself is one call at the same window. The existing push index saved a failed batch in 9c3f9742 at zero lookup cost.

---

## 2. Case L08-2 — "Subagents cannot write files"

**Records.**
- Clinic cb58bdc7 (Fable 5.1 root), 2026-11-01T16:32Z and 16:34Z: two Opus general-purpose background agents call Write on `scratchpad/agents/analysis-ai-ux.md` and `analysis-design.md`. Both get the harness error quoted in §0. One also hits `ENAMETOOLONG: name too long, uv_spawn` on a long heredoc (a8f87cc L250).
- The root sees only the agent's paraphrase (cb58bdc7 L360): "I couldn't write the file. The harness blocks subagents from writing report files, and the Bash heredoc was too long for the shell."
- Same session, same agent type: Sonnet agents wrote `plan-mapping.md` (a1db83e L265, ok) and `ledger-notebook.md` (a983941 L112, ok).
- Memory note (16:52Z): "the refusal may depend on the agent type or output size".
- 2026-11-11T00:20Z: clinic root 7f348b2c (Fable 5.2) writes "Subagents cannot write files | Their long reports come back through my context". The owner pastes it into FixFlow e24f17dc at 00:25Z.
- FixFlow 2026-11-11: probe writes `scratchpad/hb/subagent-write-probe.txt` (machine-facts.md:33). HARNESS-BOTTLENECKS-2026-11.md:23 "They can"; :49 "The rule came from two agents' unchecked report"; :159 remedy: "write the full report to a pre-allowed folder and return a path".
- FixFlow 2026-11-12, workflows wf_5a9f904a and wf_548351eb in e24f17dc: the brief says "Put a full report.md there". 8 of 8 `report.md` writes refused with the same harness error; 187,160 characters of report text written and refused; the same agents wrote `.py` and `.js` files. L7799: "subagents could not write `report.md` (harness refused)". HARNESS-BOTTLENECKS was edited at 08:07Z and still says "They can". Later `.md` writes with other names succeeded (`R8-push-precision.md`, `L01-...-walk.md`).

**Entry as the clinic root could have written it (2026-11-01), from what reached its window.**
> Two Opus subagents could not write their report files; they said "The harness blocks subagents from writing report files" and returned the text instead. Sonnet extractors in the same session wrote their .md outputs. Cause not isolated (agent type? output size?). Workaround: brief subagents to return the full result; the parent saves it. Also seen: a long Bash heredoc failed in a subagent.

**The later moments.** (b) FixFlow Fable 5.2, verifying a pasted bottleneck list. It probes with a `.txt` file in bypass mode and declares the rule false. (c) Next day the same Fable writes workflow briefs from that verdict; eight Sonnet and Opus subagents, each at the end of a research lane, call Write on `report.md`.

**What a lookup would return.** At (b), "subagents cannot write files" hits the clinic entry on prose: a candidate whose scope (Opus, analysis files, Sonnet wrote fine) would point the probe at the right conditions. At (c), keyed on the harness string, the entry is a weak hit at best (it never stored the string), and by then (b) has marked it refuted.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | (b) The pasted list is in the Fable window. (c) The subagent has a brief that says write report.md. |
| 2 Trigger | breaks | Checking a claim raises no error. At (c) the harness message tells the agent what to do, so no lookup is needed there. The step that needed the entry was the Fable writing the brief, and nothing triggers at brief time. |
| 3 Query | strains | The paraphrase matches the paraphrase. The exact harness string matches nothing, because no entry holds it. |
| 4 Match | breaks | At (c) the top result would be FixFlow's correction "They can", the opposite of what just happened. |
| 5 Delivery | not_specified | KS reads by the escalating session; how a workflow subagent's one-shot window receives an entry is not said. |
| 6 Use | breaks | The correction was used: remedy :159 and the brief "Put a full report.md there". Eight writes were refused. |
| 7 Check | breaks | The probe did not reproduce the original condition (a `.txt` against `analysis-*.md`). A check run at a different scope "refuted" an entry that was right for its own scope. KS stores negatives with `scope` and `proof`, but nothing makes a refuter match the scope. |
| 8 Ladder | not_reached | No climb; the failures were absorbed as returned text. |
| 9 Capture | strains | The writer saw only the subagent's paraphrase. The raw error, which names "report files", and the file names stayed in subagent transcripts. KS forbids extraction from transcripts, so the entry keeps the paraphrase. |
| 10 Afterlife | breaks | Hedge, then a flat rule (clinic root, ten days later), then a paste across projects, then "They can", then 8 refusals the next day. The record still says "They can". Nothing links the refusals back to the refutation. |

**What it would have saved.** If the 11-01 entry had held the harness string and both file names, the 11-11 probe could have been aimed at them, and the 11-12 briefs would not have asked for `report.md`: 187,160 characters (about 75k output tokens at 0.4 per character) written and then re-sent as structured output. The design has no trigger at brief time, so it would not have saved them.

---

## 3. Case L08-3 — "An omitted model inherits the top tier", re-learned for sessions

**Records.**
- FixFlow 53f3a5c (2026-10-31): `.claude/agents/fixflow-explorer.md:3` "Use this instead of the built-in Explore agent, which inherits the session model's tier; this one is pinned to Haiku."
- Clinic 7f348b2c L3 (2026-11-01T07:21Z): the owner pastes "fixflow-explorer pinned to Haiku because the built-in Explore inherits the session tier".
- The root (Fable 5.1) calls `start_session` with no model at L667 and L732 (11-01, plan-readiness and notebook-reconcile; cb58bdc7 then runs on Fable 5.1) and at L955 (11-02T17:02Z, S00). The window is at about 460k cached tokens.
- L995 (17:04Z), owner: "you started it with fable 5.1?? have you forgotten the orchestration guidelines i sent you????". L1016 restarts on Opus/high. L1018 edits the memory. Commit 5816c70 (17:12Z) adds orchestration.md:14: "Every `start_session` and every workflow `agent()` passes `model` and `effort` explicitly; nothing inherits the root's model."
- The clinic note `tiered-model-orchestration.md` later holds five facts of different scope: the tier rule; `start_session` refused on automated turns; the same test database name `test_clinic_sNN` colliding; an owner exception for one stuck session; and how to read "for this specific task".
- FixFlow: 7 of 7 `start_session` calls in e24f17dc (knowledge-store, skill-packages, horthy-ideas, baml-sweep, harness-v2-design x3) pass no model. FixFlow's routing note says "The main Fable session is orchestrator". No objection is recorded. Card CR-02 rates the clinic's parked-start technique "Directly reusable"; no FixFlow use is recorded.

**Entry as FixFlow could have written it (2026-10-31).**
> The built-in Explore subagent runs on the session's model and effort, so from a Fable session a "where is X?" search runs on Fable. Use the project agent `fixflow-explorer` (`.claude/agents/fixflow-explorer.md`, `model: haiku`, read-only, returns paths with line numbers) for file location. Tier guide: route every agent explicitly; cheap work must not inherit the top tier.

**The later moment.** Clinic root, Fable 5.1, about 460k tokens. The owner has just authorised S00. The root writes the S00 brief and calls `start_session` with no model or effort. The FixFlow rule sits at line 3 of the same window.

**What a lookup would return.** No error, so no lookup. A forced query ("start build session") shares no verb or object with the stored action ("use Explore for file search"): a miss. The text was already in the window anyway.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | The rule is present, at line 3 of about 460k tokens. The actor is the top-tier orchestrator, not a cheap model. |
| 2 Trigger | breaks | Starting a session raises no error. No design trigger fires on a `start_session` call. The only signal was the owner, about 73 s later. |
| 3 Query | breaks | The stored action is a subagent type for search; the act at hand is a session start. No shared terms. |
| 4 Match | breaks | Even a meaning-level match returns a fix (pin an agent file to Haiku) that does not apply to `start_session`. What carries over is a principle the entry states for one tool only. |
| 5 Delivery | works | Main session; already delivered. |
| 6 Use | breaks | The rule was in the window and was not carried over to the neighbouring tool, three times. |
| 7 Check | breaks | No check decides "right tier". The output would have been correct, only dearer. |
| 8 Ladder | not_specified | The actor is the top rung, and the failure is overspend. The ladder climbs on failure and does not see spending too much. |
| 9 Capture | strains | Write-through works: memory edited within 30 s, the rule committed 7 min later. But the note bundles five facts of different scope, and no KS gate kind fits a session parameter. |
| 10 Afterlife | breaks | The session rule never reached FixFlow, where 7 of 7 starts omit a model. A crossed "never inherit" would flag all 7, yet FixFlow's routing and the clinic's own 11-04 Fable session show inheritance is sometimes intended. The entry cannot tell intended from mistaken. |

**What it would have saved.** Nothing in the records. The avoidable cost was about 73 s of a Fable-max session and one owner intervention.

---

## 4. Case L08-4 — "Use a Linux container when Windows gets in the way"

**Records.**
- Clinic, 2026-11-06 (USER-23, `use-the-machine-parallelism.md`): the check is latency-bound ("0.63 ms against about 0.13 ms inside the container"). Tests move to a Linux container beside the database. HARNESS-BOTTLENECKS-2026-11.md:65 (written by FixFlow e24f17dc on 11-11): "230.1 s mean against 367.2 s native".
- FixFlow e24f17dc (Fable 5.2, about 380k cached), 2026-11-12: L7530 `function page_rank is not defined. This function exists in the ALGO extension`; L7491 the extension imports `arrow.dll | networkit_state.dll | libssl-3-x64.dll | libcrypto-3-x64.dll`. L7539 tells the owner ranking will be computed outside the engine and recorded "not built in on this PC". Brief L7245: "Nothing new may be installed without the owner's decision, so do not install anything".
- L7543 (08:41Z), owner: "if they dont work on windows run a linux machiune we have the resources why are you compromising instead of fixing problems thatll ruin the experiment".
- L7570 starts Docker; L7608 the extension is found; L7670 (08:49Z) "extension: all libraries resolved" with libssl3, libgomp1, Arrow 26 and icebug 13.5; L7681 Dockerfile. Memory addendum at 08:43Z.

**Entry as the clinic could have written it (2026-11-06).**
> Clinic full check on Windows is latency-bound, not CPU-bound: a query round trip from Windows through the published container port takes 0.63 ms against 0.13 ms inside the container, and 24 threads sit mostly idle. Running pytest in a Linux container beside the Postgres container: 230.1 s against 367.2 s native on the same tree. Owner decision USER-23: tests go to a Linux container next to the database. The owner wants the PC's compute used; measure before serialising.

**The later moment.** Fable at about 380k tokens, building a graph-engine test arm. The engine core works on Windows; its algorithm extension will not load. The fact "a Linux container works on this PC" is in the session's own compile from the day before. Its own brief forbids installs. It decides to record a handicap.

**What a lookup would return.** Keyed on the error or the DLL list: no shared word with the clinic entry (pytest, latency, Postgres). A miss. At the level of meaning ("Windows problem, try Linux"), a candidate about speed, not about a missing native library.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | The obstacle and the Linux fact are both in the window. |
| 2 Trigger | breaks | The model did not fail; it chose a workaround and a written limit. No trigger fires on "about to record a handicap". |
| 3 Query | breaks | The error text shares no word with the clinic entry. |
| 4 Match | breaks | Similar, not the same: the clinic entry is about speed; this is a missing native library. What carries over is a permission ("Linux is approved here"), not a solution. |
| 5 Delivery | works | Main session. |
| 6 Use | strains | Even with the hint, the work was new: libssl3, libgomp1, Arrow 26, icebug 13.5. Nothing in the clinic entry carries that. |
| 7 Check | works | `ldd ... all libraries resolved` and a PageRank result are mechanical. No KS check kind runs outside the repo gate, so this stays outside the design. |
| 8 Ladder | not_specified | The owner was the escalation. A judgement to accept a handicap is not a failure any check sees. |
| 9 Capture | strains | The correction went to memory as a preference and the recipe to a Dockerfile in evidence. Neither is a defect with a commit-bound control pair, so neither passes the KS write gate. |
| 10 Afterlife | strains | The recipe pins versions outside any repo lockfile; KS invalidation cannot see untracked dependencies (§5.5). Two stored rules now collide: "nothing may be installed without an owner decision" and "Docker and Linux are already-approved resources". |

**What it would have saved.** Nothing. The owner was the mechanism. The fix took about 8 minutes after his message.

---

## 5. Case L08-5 (added) — Bash command length

**Records.**
- Clinic cb58bdc7, 2026-11-01: subagent a8f87cc L249 and L250, a `cat > .../analysis-design.md <<'ENDOFDOC'` command fails with `ENAMETOOLONG: name too long, uv_spawn`; a6a48ae L186 `/usr/bin/bash: -c: line 27: unexpected EOF while looking for matching `''`. The clinic note folds this into the subagent-write note: "one also failed a long Bash heredoc"; "Keep briefs that need very long outputs split into parts".
- FixFlow e24f17dc, 2026-11-11T07:05Z, writes `reference-bash-tool-limits.md`: "A single Bash command longer than roughly 8 KB is truncated silently". The rule goes into the index and into subagent briefs (L6669, L7058, L7393).
- 2026-11-12T08:04Z: the same Fable session sends an 8,720-character Bash call (L7359). L7367: `/usr/bin/bash: -c: line 32: unexpected EOF while looking for matching `''`, the clinic's template exactly.

**Entry as the clinic could have written it (2026-11-01).**
> A long Bash heredoc from a subagent failed: `ENAMETOOLONG: name too long, uv_spawn`, and in another agent `unexpected EOF while looking for matching`. Split long writes into parts.

**What a lookup would return.** The clinic stored no error string; the symptom lives inside the subagent-write note. A lexical lookup on the EOF line misses, or lands on the subagent-write entry, which is the wrong fact.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | On 11-12 the 8 KB rule is in the index, the session's summary and its own briefs. |
| 2 Trigger | breaks | Writing a long command is not an error until it fails; then the cost is one failed call. |
| 3 Query | strains | The EOF line is a clean template; nothing stored carries it. |
| 4 Match | breaks | Clinic: bundled inside the subagent-write note, so a hit returns the wrong fact. FixFlow store: absent. |
| 5 Delivery | works | Already delivered within FixFlow. |
| 6 Use | breaks | The rule was in the window, and the author of the rule broke it 25 h later. |
| 7 Check | strains | Re-running is the check; no KS check kind covers the shell. |
| 8 Ladder | not_reached | |
| 9 Capture | breaks | The clinic bundled two facts in one note. FixFlow re-derived the second without the clinic's error strings. |
| 10 Afterlife | strains | Only in-project push reached later windows. |

---

## 6. Breaks, clearest first

1. **Nothing fires (seen before: 23, 1). 5 cases.** Step 2. Every act that needed a lesson was off the trigger list: a research clone, a brief, a session start, a decision to accept a handicap, a long command. Three raised no error at all. The owner was the trigger twice (L08-3 L995, L08-4 L7543).
2. **The design has no cross-project path (new). 5 cases.** Steps 4 and 10. KS is one FixFlow store (`.fixflow-ks`), seeded only from FixFlow, with repo-relative handles, controls on FixFlow mainline shas, an existence filter that demotes entries whose paths are absent, and its CLI in FixFlow's `tools/ks`; the clinic has none. Every case is a miss by construction.
3. **The ladder has nowhere to go: the top tier lacked the knowledge (new). 5 cases.** Steps 1 and 8. The library aims at cheap models and climbs to Fable on failure. In every case the actor missing the cross-project fact was Fable itself (c1797e48, 7f348b2c, e24f17dc). The L08-3 failure was overspend, which the ladder does not see.
4. **A correction at the wrong scope overturned a right entry, then spread (seen before: 8). 1 case.** Steps 7, 6 and 10. FixFlow's `.txt` probe "refuted" a refusal seen on `analysis-*.md`. The remedy and the briefs were built on it, and 8 of 8 `report.md` writes were refused the next day. The record still says "They can".
5. **Machine and harness facts have no gate (new). 5 cases.** Steps 7 and 9. Path length, harness write policy, session tier, Windows DLLs, shell length: no KS check kind reads them, and none has a commit pair. They are capped at candidate, the fix text is withheld (only `applies` prints it), and the write gate's control pair cannot be made.
6. **In the window is not in use (new). 3 cases.** Step 6. Delivery had already happened and the rule was still not applied: the Explore rule at line 3 of a 460k window (L08-3); the 8 KB rule broken by its own author (L08-5); the Linux-container fact in the session's own compile (L08-4).
7. **Similar is not the same across projects (seen before: 3). 3 cases.** Step 4. Explore subagent against `start_session` (L08-3); speed against a missing native library (L08-4); two different "Filename too long" templates (L08-1). What carried over was a principle or a permission, not a fix.
8. **The writer saw a paraphrase, not the raw error (seen before: 27). 2 cases.** Step 9. The harness string naming "report files" stayed in subagent transcripts; the root saw "The harness blocks subagents from writing report files" (L08-2). The heredoc errors were stored as "failed a long Bash heredoc" (L08-5).
9. **A stored "no" read as "never", and two projects' rules collide (seen before: 19). 2 cases.** Step 10. "Nothing new may be installed without the owner's decision" produced a recorded handicap until the owner overrode it (L08-4). The clinic's "nothing inherits" meets FixFlow's Fable-orchestrated starts (L08-3).
10. **Pull-only gives up the prevention push gave (new). 1 case.** Steps 2 and 10. The MEMORY.md index put the longpaths fix in 9c3f9742's window before its first clone: zero failures. The clinic guide did the same for five sessions. A failure-triggered lookup always pays the first failure.
11. **One entry holds several facts of different scope (seen before: 5). 2 cases.** Steps 4 and 9. The clinic tier note mixes a tier rule, a harness rule, a clinic test-database collision and owner exceptions (L08-3); the subagent-write note hides the shell-length fact (L08-5).
12. **Each project stores only the half it saw (seen before: 29). 2 cases.** Step 9. FixFlow's note has the git half and not the DLL half (L08-1); FixFlow's correction dropped the clinic's scope (L08-2).

## 7. Listed items these cases did not show, or show as smaller

- **17, compaction drops a fetched entry.** The rule survived (the 8 KB rule is in the 11-12 compaction summary L7799; the Explore rule stayed at line 3) and was still not applied. The loss was in use, not in compaction.
- **24, hard problems pay every rung.** No case climbed. Every fix was cheap once known (one flag, one parameter, one container). The cost was not knowing.
- **11, the first time is full price.** The first solves were cheap: one retry in the clinic, two Fable calls in FixFlow, about 8 minutes for the container.
- **31, parallel sessions copy unreviewed answers.** 9c3f9742 and 6fc590cb copied c1797e48's unreviewed note within 8 minutes. It was right and saved a failure.
- **21, a wrong entry anchors the model.** At 11-12 the subagents followed the live harness message over the wrong brief and returned text. The harm stayed at wasted output.
- **16, short subagent windows start empty.** The subagents had the shell rule in their briefs. The windows that lacked knowledge were the long-lived Fable ones.

## 8. What works

- **Exact tool and harness strings are the same in both projects.** "Filename too long", "Subagents should return findings as text, not write report files", and "unexpected EOF while looking for matching" appear word for word in clinic and FixFlow records. A `tmpl` handle would match across projects with no ambiguity, if the entry stored the string.
- **Write-through at solving time.** The clinic root fixed its memory within 30 s and committed the rule 7 min after the restart. FixFlow wrote its longpaths note 7 min after the fix. The material was fresh.
- **Scoped negatives and provenance.** KS stores negatives with `scope`, `proof` and `actor_model`. Those would have kept B16 as "refused for Opus agents writing analysis files, executed" and would have shown that the 11-11 probe ran at a different scope.
- **Near-duplicate merge at write time.** In a shared store, the Jaccard check would have extended the clinic entry with FixFlow's handles instead of creating a git-only sibling, so the DLL half would have travelled.
- **Mechanical outcome from a re-run.** Re-running the clone, or `ldd` reporting all libraries resolved, gives the honest pass or fail that machine facts need.
- **A cheap model found the hard half.** The DLL cause (208-character root against 42) was isolated by a Sonnet subagent, so cheap tiers do produce cross-project knowledge worth storing.
- **In-project push already works.** The FixFlow index and the clinic guide each carried a machine fact to later sessions before any failure.
