# L07 walk: research and design work (the "solution" is a conclusion, and no test checks it)

Walker: one Opus agent, 2026-11-12. Read-only. Six cases: the reader's four (checked against the sources, with corrections) and two added (L07-5, L07-6). Every case is replayed as if the library had existed from the start. No fixes are proposed.

Status words: works, strains, breaks, not_specified (the design says nothing), not_reached.
"KS" = the knowledge-store design v1.3.1 (`.claude/worktrees/knowledge-store-research-9c609c/docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md`). "HB" = `docs/program/HARNESS-BOTTLENECKS-2026-11.md`. "HV2" = `docs/program/HARNESS-V2-DESIGN-2026-11.md`.

A fact that shapes every walk: KS is scoped to defects and traps. It records only a solve that "needed a tier escalation, two or more failed approaches, or a burned build or deploy, or that establishes a do-not-apply fact" (KS §7.3, line 452). It says it is "Not session memory" (KS §1.4). It has no check kind for a conclusion: "Prose alone yields at most a candidate" (F1 §3, KS line 260). So for this family, most steps fall back to the owner's broader design ("when a strong model solves a problem, the solution and its reasoning are stored"), which does not say how they work.

---

## L07-1 "A usage limit halted everything" was a power-off

### What the record shows (checked; corrections in bold)

- The claim's author is shown: **the clinic root, model `claude-fable-5-1`** (root transcript `C--Bilal-Migration-...-24-Clinic-Workshop/7f348b2c-....jsonl`).
- 9 Nov 12:03:46Z the root wrote: "Everything halted around 14:57 on 6 November with `main` clean at the S11 gate commit and Docker down, cutting off five sessions." 33 s later, 12:04:19Z, in the first of six resume messages: "Root: a usage limit stopped every session on 6 November during your final check". **No limit message was checked in between** (records #12606 to #12638: git log, session list, Docker start).
- The sentence entered the board through **commit 51c8cf6** (2026-11-09 20:16 +0500) as clinic `docs/tasks/clinic-build/task.md:763`. It is still there today.
- **The same board already held the right cause class.** task.md:832, committed 6 Nov 01:13 (+0500): "after two unclean shutdowns of the PC under concurrent full test runs (5 and 6 November 2026) at most three or four children worked at once". task.md:588: "the load rule after the unclean shutdown of 6 November 2026".
- The claim spread: sweep card A8-06 (`evidence/harness-bottlenecks/sweep-cards.txt:1074`): "A usage limit stopped every session on 6 Nov at about 14:57", tagged `evidence=anecdotal`, while the next card, A8-07, records the unclean shutdowns. The owner's list (B03): "A usage limit halted all sessions on 6 November". Lane B5 of the compile was briefed on "auto-continue at a usage limit, workflows that pause and resume".
- **The corrector was an Opus 5.5 agent briefed to attack** (wf_00659e96-f2a, agent `abd913ed9a816c649`), which grepped every clinic transcript for limit records and read the Windows System log. map-full.txt:85: "Event 6008: 'The previous system shutdown at 2:58:23 PM on 11/6/2026 was unexpected'"; "The 'usage limit' story first appears in the root's own message on 9 Nov."

### The entry, as the root could have written it on 9 Nov (93 words)

> Title: All clinic sessions stopped 6 Nov about 14:57; three-day halt. Cause: a usage limit stopped every session. Seen: last commit 14:57:52; no session running; Docker Desktop down; `main` clean at f2390bd. Nothing lost: every branch holds its commits or uncommitted work. Recovery: start Docker Desktop, start the nine clinic-* containers, message each session its last commit and its uncommitted files. Lesson: durable state in git plus task.md makes a halt lossless; the app starts a session only on an owner turn. Solved by the root, Fable 5.1, 9 Nov.

### The later moment

11 Nov, the bottleneck compile (wf_00659e96-f2a). A lane agent's window holds the owner's B03 line ("A usage limit halted all sessions"), the sweep cards and a brief to research remedies for B03. It is not asked whether B03's cause is right. With a library, a lookup keyed on its brief's words, "usage limit halt 6 November", returns the Fable entry as an exact match. The shutdown note shares only "6 November".

### Ten steps

| # | Status | Note |
|---|---|---|
| 1 | strains | The lane gets "find remedies for B03", with the cause already stated in the brief. It has a task, not the problem. Nothing in the window says the cause is unverified. |
| 2 | not_specified | No error, no failed build, no escalation. KS triggers (before escalating a defect, before retrying a build, `--diff`) do not fire for a research lane. The owner's design does not say when research looks up. |
| 3 | breaks | The query is built from the brief, so it carries the wrong hypothesis: "usage limit". It selects the entry that holds the error. The right lead ("unclean shutdown") shares almost no words. |
| 4 | breaks | Best match: the wrong one, labelled as solved by the top model. KS would cap it at candidate (prose only), but nothing would outrank it. |
| 5 | works | Delivered to the lane's subagent window; it stays for the lane's short life. |
| 6 | breaks | The lane builds on it. This happened for real through the brief: lane B5 researched `autoContinueAtUsageLimit` and workflows that pause at a limit. HB:397: "the stops were power-offs. A token cut may not cut a single stop." |
| 7 | breaks | No test exists. "Equal to what the strong model produced" would mean equal to a wrong guess. What found the truth was data outside git (Event 6008) and a brief to attack. |
| 8 | breaks | The lane's output looks complete; no failure is visible. The correction came from Opus, a rung below the Fable author, because of its brief and its data, not its tier. |
| 9 | breaks | The owner's design stores the top model's conclusion; here that conclusion was a guess written as fact, 33 s after "Docker down". KS's write rule would not store it (no escalation; cause outside the repo is capped at inconclusive), but it would not store the correction either. |
| 10 | breaks | Copies outlive the fix: task.md:763 still says "usage limit"; card A8-06 too. The evidence is a Windows event log, so KS's event-driven invalidation (footprints in git, §5.1) has nothing to watch. |

### Would the library have helped?

Only conditionally. If the 6 Nov board note on unclean shutdowns had been an entry, a lookup on the 9 Nov signal "Docker Desktop down after a halt" would have returned a look-alike that pointed at the right cause class. That would have saved the misdiagnosis, lane B5's limit research, and a remedy aimed at limits that "would not have saved 6-9 Nov" (map-full.txt:111). But the root already had that note in its own board and did not use it, and nothing would have triggered the lookup.

---

## L07-2 The graph test verdict was withdrawn after four checks passed it

### What the record shows (checked; additions in bold)

- HB:238-247: a file-level import graph, checked "by an edge-accuracy check, a refuter and two independent classifiers". Verdict, HB:247: "No graph database and no traversal cache."
- HB:251: "The first test was rejected and replaced (2026-11-12, later the same day). The verdict above is withdrawn." The owner's words (memory `feedback-test-the-best-form.md`): "a merely self made graph vs a established relational engine is not a fair enough comparison".
- **A refuted sub-claim survived in another document.** HV2:371: "A graph server needs memory this PC does not have." It was written by session 701c2346 (Fable 5.2) on 11 Nov 10:52Z. On 12 Nov 07:03Z a refuter in session e24f17dc wrote: "'A graph database server would need memory this PC does not have free' is wrong as stated: 7-12 GB is free" (e24f17dc record #7097). HV2 was last modified 11 Nov 15:55 (+0500), so it was never updated. **At 10:03Z on 12 Nov the library review session (0bf1c4f3) read HV2 with that sentence intact** (0bf1c4f3 record #63).
- What worked: the withdrawal sits beside the verdict. At 10:15Z a Sonnet fact gatherer in 0bf1c4f3 reported: "The verdict 'no graph, few tokens saved' was withdrawn on 2026-11-12 (HB:251...)" (record #185).

### The entry, as the Fable main session could have written it about 07:05Z on 12 Nov (104 words)

> Question: would a graph database with a traversal cache cut tokens in coding sessions? Built: file-level import graph of FixFlow (618 files, 1,119 links, 197 KB); SQLite returns the same answers in 0.05 ms. Tested: 200 testbed search calls; 13 to 14 were connection questions; the index would fully answer one and save no step. Verdict: no graph database, no traversal cache; a server adds 1 to 2 GB and buys nothing at this size. Worth testing: a scripted contract map for review. Checked: import edges 441/441 and 678/678 against an independent method; one refuter; two classifiers.

### The later moment

12 Nov, 10:03Z to 12:46Z, session 0bf1c4f3 (Fable 5.2), the library plausibility review. The window holds the owner's five expectations, then the owner's third message asking for "graphs where branches can be merged" for retrieval. A lookup on "graph" returns five things at once: the withdrawn verdict (HB:247), the narrowed do-not-build line (HB:263), the refuted memory sentence (HV2:371), KS §1.4 "Graph tooling (graphify) was evaluated and skipped (HR §5)", and the frozen, unrun protocol (`graph2/protocol.md`).

### Ten steps

| # | Status | Note |
|---|---|---|
| 1 | works | The session holds the owner's request and its own memory index. The task is a judgment about a design. |
| 2 | not_specified | No failure triggers a lookup in research. In practice the main session dispatched fact gatherers, a lookup by another name; neither design says when to do that. |
| 3 | breaks | "Graph" in the new question means merging partial solutions during retrieval. In the stored entries it means a code-connection graph for saving tokens. Same word, different question. |
| 4 | breaks | Five partial matches that disagree: withdrawn, narrowed, refuted but unchanged, skipped, and pending. KS drops withdrawn entries, but HV2:371 is a separate conclusion with no link, so the refuted sentence stays live. |
| 5 | works | Fact gatherers (Sonnet subagents) carried the results to the main window as a summary. The withdrawal reached it because it was co-located with the verdict. |
| 6 | breaks | None of the five answers the new question. Conclusions about code graphs for token saving say nothing about joining reasoning branches. |
| 7 | breaks | Four checks passed the verdict. The standard it failed (build the strongest form, compare like with like) lived with the owner and in no check. |
| 8 | breaks | Only the owner saw the failure, above every rung. The repair then cost a research round of six lanes, three verifiers and a critic. |
| 9 | strains | The durable lesson was about method (a naive test proves nothing), not graphs. It was stored as a memory note. KS stores negatives only with a validity footprint (KS line 502), and a method lesson has no files. |
| 10 | breaks | The withdrawal reached HB:251 and memory, not HV2:371. Three hours after the refutation, a new session read the refuted sentence as settled. |

### Would the library have helped?

Partly, and it did in the record: because the verdict and its withdrawal were in one file, the next session's gatherer reported the withdrawal. The measured facts (edge accuracy, query time, file size) stayed true while the verdict fell. A lookup that returned them would still be useful.

---

## L07-3 A ship-plan ruling passed a panel and refuters but was a blocker

### What the record shows (checked)

- HR-A1a (HARNESS-REVIEW-2026-11-01.md:88-107), adjudicated by the main session (trailer "Claude Fable 5.1", commit 3fb8f9c, 2026-11-01 21:27:58 +0500). Panel: "judge 1 'wrong → change_now', judge 2 'sound_but_suboptimal → change_now'". Refuters attacked five claims; none was the enqueue wording.
- critique-5.md:16 (three Opus critics, wf_6442fbc1-cc4): "[BLOCKER] I-1 ... 'the presence row is enqueued before the fix resolves' together with 'the server recomputes every row' strips every crossing of its coordinates. The server judges a presence row only from the lat/lng/accuracy in the payload, at ingest. A later corrected row with the same client_id is deduped... P5c's indoor test accepts 'server verdict inside or unknown'... so no gate catches the loss."
- Fixed in v7 (commit 4e01c82, 21:50:48, **23 minutes after v6**). The fix also updated the O-01, O-07 and O-08 amendments and OWNER-VIEW. Plan line 794 now reads "enqueued **after the bounded fix returns**"; line 825 adds a Jest test for "a crossing whose fix" resolves within the bound. critique-5.md:456 confirmed it.
- Separately, commit 093b793's message says "ship plan v4", but the file it committed was v3. 46c5d98: "the rewrite was refused by the editor because the file had changed on disk".

### The entry, as the main session could have written it at 21:27 on 1 Nov (98 words)

> HR-A1a. Problem: the geofence arrival handler overruns its window (20 s dwell re-check, second fix). Ruling: the phone stops judging; delete the dwell. One bounded fix per crossing: last-known (at most 2 min old, at most 100 m) else current under 8 s, else null. The presence row is enqueued before the fix resolves; the server recomputes every row under R1 (three-state). The phone applies R1 only to suppress. Checked: two judges "change now"; refuters killed "the 15 s timer kills the job" and found "last-known usually available" unmeasured. Cost: at most 0 sessions.

### The later moment

Recorded: none in code. P5a is not built. Within the program, the critique-5 critic is the reuse (it read the v6 delta). Replayed: the future P5a session (Opus or Sonnet) implementing step 1, with the plan's P5a section and `w2/O-01-design.md` in its window, runs a lookup before applying a prescribed design ("presence row enqueue geofence fix").

### Ten steps

| # | Status | Note |
|---|---|---|
| 1 | works | The P5a window holds the plan step, which is concrete and names files. |
| 2 | works | KS has a trigger for this: a lookup before applying a fix that a prose register prescribes (`--prescription`, KS §7.2). |
| 3 | works | The query words ("presence row", "enqueue", "bounded fix") are the entry's own words. |
| 4 | strains | It returns HR-A1a. If the 21:27 version was stored and the 21:50 fix was not recorded as a supersession, it returns the v6 text marked "checked". KS redirects superseded entries, but only if someone records the event. |
| 5 | works | The main session receives it next to the plan text. |
| 6 | works | With the v8 entry, applying it is direct. With the v6 entry, the implementer enqueues before the fix and every crossing loses its coordinates. |
| 7 | breaks | For the v6 entry, the gates were written from the same ruling: P5c accepted "inside or unknown", and P5d counted `crossing_recorded`. They pass the defect. Only v7 added a Jest test that would fail. |
| 8 | breaks | The panel (two judges) and the refuters missed it; a critic at the same tier with an invariants lens that read `service.py:402-415` caught it. Failure was invisible to the ladder; the lens decided. |
| 9 | breaks | The "solved" moment was wrong: the ruling looked final at 21:27 and was a blocker at 21:50. A capture keyed on the commit could also store the wrong version: 093b793's message says v4 and holds v3. |
| 10 | strains | The ruling rests on Expo's TaskService timing ("2 s after the JS task reports finished", read in node_modules, critique-5.md:456). KS can watch a dependency version, but only through what the writer names; the P5-spike may swap the SDK. |

### Would the library have helped?

Yes, with the corrected entry. A P5a implementer, or a later redesign, would get the reason that plan line 794 leaves out: the server judges from the payload at ingest and drops a same-`client_id` correction. That stops a silent loss of every crossing's coordinates, which no gate catches. In the record, the program's own documents carried the fix: four documents were aligned in one commit, and a Jest test requirement was added.

---

## L07-4 The knowledge-store design: checked, overturned by the owner, the fix overturned by refuters

### What the record shows (checked)

- v1.2 (2 Nov) passed refuters over 15 claims and a completeness critic (KS §12.5, §12.6).
- KS §12.7 point 0: "The default really was an untested hand-written lexer, adopted straight from the completeness critic's suggested fix". Point 2: "'A miss is cheap and safe' is false for `do_not_apply` and `open_defect` entries". Point 0 also notes: "its only health metric, the fallback rate, counted the visible failure and not a silently wrong span".
- KS §12.8 (v1.3.1, commit 6fba000): "73 attack rows: 53 fell, 16 held, 4 unverifiable" (53 attacked points of v1.3 fell); "under the v1.3 rule 48.7 % of past commits would have warned (103 of 154 with a realistic seed)".
- Later reuse. HV2:90: "It builds on the knowledge-store design (PR #183), which already has the journal, the SQLite index, the lookup command and the proof step". On 12 Nov the library review (0bf1c4f3) fetched the design through Sonnet fact gatherers, as the 132-line fact sheet F1. It then priced the owner's library on the design's narrow form. Owner, 12:46Z: "You're thinking very narrowly and instead of seeing if these problems are workable or not you just deny the possibility" (0bf1c4f3 record #378).
- The Sentry chain, checked in git. 6928828 (2026-06-26, Opus 4.8): "re-add the plugin only once a Sentry project + auth token exist". 140428c (2026-07-18, Fable 5): CLAUDE.md "must never be added". a31924a (#176, 2026-08-03, Opus 5): "the @sentry/react-native Expo config plugin stays OUT of app.json", while a real Sentry project existed ("accepted by project 4511846063013968").

### The entry, as the main session could have written v1.2 on 2 Nov (96 words)

> Design: a knowledge store for FixFlow agents. Engine: `node:sqlite` index over an append-only git journal. Checks: declarative probes over text read by a hand-written lexer (comments and string literals stripped). Retrieval: lexical BM25, pull-only, no hook; a miss is cheap and safe, since the agent proceeds as today. Do-not-apply trigger: a first-commit lookup on the plan's Scope paths plus `--action`. Embeddings: install when the one-line index outgrows a prompt or misses pass 5 % of 50. Checked: 15 claims by two Opus refuters each; one completeness critic.

### The later moment

12 Nov 10:03Z, session 0bf1c4f3 (Fable 5.2). The owner writes: "we've designed a cache library for model reasoning conclusions, you can find it in the repo hopefully look hard". The session dispatches gatherers. The library would return the design entry, at v1.3.1 if every supersession was recorded.

### Ten steps

| # | Status | Note |
|---|---|---|
| 1 | works | The window holds the owner's five expectations and a pointer to the design. |
| 2 | works | The owner's message is the trigger. |
| 3 | strains | The owner says "cache library for model reasoning conclusions"; the design calls itself a store of "solved defects and traps". KS retrieval is lexical only, and the owner had to say "look hard". |
| 4 | works | KS has versioned entries and supersession ("superseded redirects to its successor"), so v1.3.1 comes back, not v1.2. The §12.7 lines are "kept and annotated", so old rulings travel with it. |
| 5 | strains | It arrives as a Sonnet summary of a 972-line design (F1), a write-up of a write-up. The summary was accurate on scope: "The design says nothing about reuse across projects". |
| 6 | breaks | The fetched design anchored the review. It was built for exact-repeat defects on one repo; the owner's goal had moved to cross-project reuse of reasoning. The review priced the goal of the day it was fetched by the design of an earlier day, and the owner rejected it. |
| 7 | breaks | No test. v1.2 passed 30 refutations and a critic, then fell to the owner. The owner's v1.3 mechanism then lost 53 of 73 attacked points. Every pass was followed by an overturn. |
| 8 | breaks | The authority order flips. The owner overturned Fable-adjudicated v1.2; Opus refuters overturned the owner's v1.3 mechanism. No rung is the final judge. |
| 9 | strains | What is "the entry" for a 972-line design with 27 numbered amendments? KS cannot store it (it is not a defect solve). The owner's design does not say what part of a design is stored. |
| 10 | breaks | A conditional "no" becomes "never" in a copy: 6928828's "only once a Sentry project + auth token exist" became CLAUDE.md's unconditional rule, which #176 obeyed while the project existed. KS keeps negatives as "scoped leads, never prohibitions" (§3.2), but the copy in CLAUDE.md dropped the scope. |

### Would the library have helped?

Yes, twice in the record. HV2 reused the design as its base for "solved problems" instead of re-deriving a design that cost "about 15M subagent tokens" (F1 §1). And #176 reused two stored traps, "both documented in CLAUDE.md and both previously paid for": the empty DSN string (fixed in 79a8dd4) and the plugin (failed gradle builds behind a6f9048 and 6928828). That avoided at least two failed EAS builds.

---

## L07-5 (added) "Auth will be Supabase GoTrue": a stored design plan the build departed from

### What the record shows

- Commit 0256497 (2026-06-03, Opus 4.8): "Distilled operational knowledge from the media slice: locked architecture...". docs/PLAYBOOK.md:18-21: "We considered a Supabase-native (PostgREST + Edge Functions) backend and **rejected it**: $0 is temporary and the product has growing business logic". PLAYBOOK.md:84 (Deferred): "Auth (Supabase GoTrue + JWT verified in FastAPI)".
- Commit 30dc6d4 (2026-06-06, Opus 4.8): "Name + PIN → JWT auth"; "PBKDF2 PIN hashing (stdlib) + HS256 JWT (PyJWT, new dep)". It gives no reason for leaving GoTrue.
- CLAUDE.md first appears in 223d6b3 (2026-06-30): "This file exists because agents (and humans) kept assuming a generic template — WatermelonDB, Supabase-native, GoTrue". PLAYBOOK.md:84 still says GoTrue today.

### The entry, as Opus 4.8 could have written it on 3 June (88 words)

> Architecture locked: React + Vite web manager; Expo Android technician app; FastAPI on Supabase Postgres (session pooler) with Cloudflare R2 for media. Supabase-native (PostgREST + Edge Functions) considered and rejected: $0 is temporary and business logic will grow, so a real FastAPI tier wins. Auth not built; endpoints open; pass ids explicitly. Planned auth: Supabase GoTrue, with the JWT verified in FastAPI. Traps: Supabase IPv6 (use the pooler, +asyncpg), R2 signed PUT, Railway CLI flakiness, Expo token auth.

### The later moment

6 June, the J0 session (Opus 4.8) starts the identity slice: technicians log in by name and PIN from a shop roster. Lookup "auth technicians login" returns the entry's planned-auth line. After 6 June, other sessions do the same lookup and get "GoTrue" while the code says custom JWT.

### Ten steps

| # | Status | Note |
|---|---|---|
| 1 | works | The window holds the jobs-vertical plan and the new requirement (name + PIN, shop roster). |
| 2 | not_specified | A new slice is not a failure. KS records and looks up defects, not design choices. The owner's design does not say whether a design task looks up. |
| 3 | works | "Auth" matches directly. |
| 4 | strains | It returns a plan for code that did not exist yet: the right topic and the wrong answer for a PIN roster. |
| 5 | works | Main session window. |
| 6 | breaks | The Opus solver departed from the plan, correctly. Later sessions "kept assuming ... GoTrue" (CLAUDE.md), which is the anchoring the entry would cause on every lookup until it was corrected. |
| 7 | not_specified | Nothing compares a design entry with the code. The identity tests test PIN JWT; none can say the stored plan is wrong. |
| 8 | not_reached | No failure; the solver did not escalate. |
| 9 | breaks | The departure was not recorded. 30dc6d4 gives no reason for leaving GoTrue; it was not hard for the solver, so nothing marked it as a lesson. |
| 10 | breaks | A plan for unwritten code has an empty footprint. Writing `identity/` in another direction changed nothing the entry watched (KS §5.1 invalidates by footprint and `doc_ref` only). The fix came 24 days later as a separate always-loaded rule; the original still says GoTrue. |

### Would the library have helped?

Yes, for the half that held. "Supabase-native rejected, because $0 is temporary and the logic will grow" has held for five months. CLAUDE.md cites it ("The team evaluated Supabase-native and chose FastAPI (`docs/PLAYBOOK.md`)"), and nobody re-opened the platform choice. A design "no" stored with its reason saved that debate. In the record it worked as an always-loaded rule, not as a fetched one.

---

## L07-6 (added) A stored lesson was in the window, and the same mistake came back the same day

### What the record shows

- 12 Nov 07:26Z, session e24f17dc (Fable 5.2) wrote memory `feedback-test-the-best-form.md` minutes after the owner rejected the graph test: "Before judging an idea the owner proposes, research and build its best form and test it fairly; a quick naive prototype against a strong baseline is not a test". The note adds: "My interpretation: this applies to any 'would X help' question, not only graphs."
- 10:03Z, session 0bf1c4f3 (Fable 5.2) starts the library review. Its first API request holds the MEMORY.md index line: "[Test the best form of an idea](feedback-test-the-best-form.md) — research and build the strongest version, compare like with like ... a naive prototype against a s..." (0bf1c4f3 record #30).
- The session ran three workflows: 6 Sonnet gatherers, 8 Opus dives, 9 Opus refuters and a critic. All nine refuter verdicts were "narrowed" (memory `project-library-plausibility-review.md`).
- 12:46Z, the owner: "You're thinking very narrowly and instead of seeing if these problems are workable or not you just deny the possibility". The session opened the full note only at 12:49Z (record #385), then appended "Second instance". Third, fourth and fifth pushes followed the same day.

### The entry (the note's first form, 07:26Z; 70 words)

> Before judging an idea the owner proposes, research and build its best form and test it fairly. A quick naive prototype against a strong baseline is not a test. Research the strongest known way first, compare like with like, define the scoring before building, sweep the parameters that matter, and run it on the project the owner names. Applies to any "would X help" question, not only graphs.

### The later moment

0bf1c4f3 at 10:03Z: the owner asks for "the real issues that make [the five expectations] less plausible". The window holds the expectations, the memory index with the lesson's one-line form, and soon the KS fact sheet. The session is a critic, not a tester.

### Ten steps

| # | Status | Note |
|---|---|---|
| 1 | works | The window holds the owner's expectations and the lesson's index line from the first call. |
| 2 | works | No trigger is needed: the memory index is pushed into every session. |
| 3 | works | No query; it is pushed. |
| 4 | strains | The lesson speaks of a "prototype", a "baseline" and a "test". The task was a plausibility critique. The match needed the reader to see a critique as a test of an idea. |
| 5 | strains | Only the one-line form was in the window. The full note, with "applies to any 'would X help' question", was opened at 12:49Z, after the failure. |
| 6 | breaks | Delivered but not applied: the review priced the idea in its narrowest form (exact repeats in a thin record). That is the mistake the lesson names, made by the same model family that wrote it, 2.5 hours later. |
| 7 | breaks | Nine Opus refuters and a critic checked the numbers, not the framing. The memory says why: "the nine refuters shared my framing". |
| 8 | breaks | Only the owner saw it. No rung was climbed; the session was already at the top tier. |
| 9 | works | Capture worked: written within minutes by the session that erred, in the owner's words, with steps for applying it. |
| 10 | strains | The entry grew by instances (five pushes in one day) while its rule stayed the same. More text came in; use did not follow. |

### Would the library have helped?

It existed, and capture was timely and faithful. Delivery put it in the window. The break is between delivery and use.

---

## Breaks, ranked by how clearly the cases show them

1. **The ladder's order is not who catches the error (new).** Fable wrote the wrong conclusion in L07-1, L07-2 and L07-6, and adjudicated L07-3 v6 and L07-4 v1.2. Corrections came from Opus with a different brief or data (L07-1, L07-3, L07-4 v1.3) or from the owner (L07-2, L07-4 v1.2, L07-6). Steps 7-8. Cases: 5.
2. **Checks passed conclusions that were wrong (known 4, 26).** L07-2: four checks. L07-3: two judges and refuters. L07-4: 30 refutations and a critic, then a further pass that knocked down 53 of 73 points. L07-6: nine refuters "narrowed". Each check examined what its brief named, not the framing. Cases: 4.
3. **Delivered but not applied (new).** L07-6: the lesson's index line was in the window from 10:03Z, and the same mistake came by 12:46Z. L07-1: the root's own board said "two unclean shutdowns of the PC (5 and 6 November 2026)", and the root wrote "usage limit". Cases: 2.
4. **Corrections do not reach copies (known 8, 35).** task.md:763 still says "usage limit". HV2:371 kept a sentence refuted at 07:03Z, and a new session read it at 10:03Z. PLAYBOOK.md:84 still says GoTrue. Cases: 3.
5. **Invalidation has nothing to watch (new).** The premises live outside git: a Windows event log (L07-1), free memory on the PC (L07-2), the owner's standard (L07-2, L07-6), code not yet written (L07-5). KS invalidates by footprint and `doc_ref` only and admits untracked dependencies in §5.5. Cases: 3.
6. **The conclusion answers its own day's question (known 18, 20).** A code-graph verdict met a retrieval-merging question (L07-2). A defect-store design priced a cross-project reasoning library (L07-4). A GoTrue plan met a PIN roster (L07-5). Cases: 3.
7. **A top-model guess is stored as a finding (new).** L07-1: "usage limit" was stated 33 s after "Docker down", with nothing checked. L07-2: "A graph server needs memory this PC does not have", while 7-12 GB was free. KS's write rule would exclude the first, but would also exclude its correction. Cases: 2.
8. **The query carries the hypothesis (known 2).** L07-1: "usage limit" selects the wrong entry. L07-2: "graph" selects verdicts on another question. Cases: 2.
9. **Checks built from the conclusion share its blind spot (new).** L07-3: P5c accepted "inside or unknown", so no gate catches the defect. L07-4: the lexer's only metric "counted the visible failure and not a silently wrong span". Cases: 2.
10. **A stored "no" is read as "never" (known 19).** The Sentry chain (L07-4), and the graph do-not-build lines that outlived the withdrawn test (L07-2). Cases: 2.
11. **The "solved" moment is unclear, and the capture can hold the wrong version (known 26).** L07-3 was overturned 23 minutes after the commit; 093b793 says v4 and holds v3. L07-4 went through three versions in two days. Cases: 2.
12. **Partial matches contradict each other (known 13).** L07-2 returns five graph conclusions in five states (withdrawn, narrowed, refuted but unchanged, skipped, pending). Cases: 1.

## Known items these cases did not show, or showed weaker

- **15 (reasoning steps have no identity):** design work here gave steps stable ids (HR-A1a, I-1, V7-23, KS-O12, KS-P11). Corrections name what they replace ("KS-O12's ... becomes `stop(protection_changed)`").
- **16 (short subagent windows start empty):** in L07-2 and L07-4, fresh Sonnet gatherers with a pointed brief found the withdrawal and summarised the 972-line design accurately.
- **30 (the session may die before writing):** in L07-6 capture came within minutes, in L07-3 within 23 minutes. In L07-1 the sessions did die (power-off), and nothing was lost, because state was in git and task.md.
- **24 (hard problems pay every rung):** no case climbed the ladder in order. The cost was review rounds at one tier and owner turns, not rungs.
- **27 (only a write-up after the fact):** in L07-3 and L07-4 the raw panel, refuter and critic outputs are kept in evidence folders. The problem in L07-1 was different: there was no reasoning at all.

## What works

- Capture by the erring session, minutes after the correction, in the owner's words (L07-6).
- A withdrawal written next to the verdict, which a new session's gatherer reported three hours later (L07-2).
- A design "no" with its reason held for five months without re-litigation (L07-5).
- Stored traps prevented repeat failed EAS builds in #176 (L07-4).
- A corrected ruling with its reason would stop a silent loss of every crossing's coordinates that no gate catches (L07-3).
- HV2 reused a design that cost about 15M subagent tokens (L07-4).
