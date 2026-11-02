# architect:A

```json
{
 "shape": "A - single embedded engine: SQLite 3.53.4 with FTS5 through node:sqlite (built into Node 24.22.1 on the dev box), one file per host, a zero-dependency project CLI; the journal export (one immutable event file each) acts as write-ahead log, backup and transport, never as a store agents read (KS-R1)",
 "name": "kb: one SQLite file behind a gated CLI",
 "summary": "Shape A puts everything in one SQLite file, read through node:sqlite. That driver is built into the Node 24 already on the dev box (SQLite 3.53.4, FTS5 compiled in), so the core installs nothing. The file holds entries, handles, footprints, lookups, gate results and outcomes. Plain SQL answers every lookup, fold, analytic and lineage query. Agents reach it with one zero-dependency CLI, `node tools/kb/kb.mjs`, which works from Bash in every subagent. The file lives in C:/Users/User/.fixflow-kb, outside every worktree and sync folder, so all worktrees share it. Each write also lands as one immutable event file in a small git repo there. That repo is pushed over SSH to a bare repo on the VPS, never to GitHub. Today it is the backup; once a second host writes, it becomes the sync path. A lookup shows at most one lead and one candidate, or says miss. Nothing is acted on until `kb verify` finds the root cause on the current tree. Config traps are checked straight from git blobs; the EAS and Sentry checks already pass and fail on the right commits. Code defects are checked by the repo's own tests in an offline Docker container. Step one is a free recurrence audit; if repeats are rare, the track stops.",
 "data_model": {
  "entry_fields": [
   {
    "name": "entry_id",
    "type": "TEXT, stable, human-readable: kb-<slug>-<6 hex of the creating event id>",
    "why": "Agents cite it in PR bodies, CLAUDE.md pointers and closing messages; it must survive revisions and host moves",
    "prior_art": "KEDB record id [T-05.F15]; content-addressed artifact ids (Fossil, git-bug) [E-09.F02,F05]"
   },
   {
    "name": "kind",
    "type": "enum defect | trap | do_not_apply | open_defect | invariant_case",
    "why": "A do-not-apply entry (a prescribed fix that is wrong) and an open defect need different gate targets and card wording",
    "prior_art": "ITIL known error vs problem status [T-05.F15]; first-class do-not-apply entries (KS-R9, R-02 ex6)"
   },
   {
    "name": "title (symptom-first)",
    "type": "TEXT",
    "why": "The reader arrives with a symptom, not a cause",
    "prior_art": "KEDB symptom-first title [T-05.F15]"
   },
   {
    "name": "symptom_meaning + misleading flag",
    "type": "TEXT + 0/1",
    "why": "Some error text means the opposite of what it says (railway up --ci timeout is benign; one alembic CommandError for different states), so the card leads with what the symptom means",
    "prior_art": "T-04.F25,F26; Sentry ranks message-only grouping least reliable [T-04.F08]"
   },
   {
    "name": "cause + manifestation_conditions",
    "type": "TEXT + TEXT",
    "why": "A single root cause is a hindsight artefact; the conditions under which it shows are what makes reuse safe",
    "prior_art": "Cook via T-05.F21; CBR problem description [T-05.F3]"
   },
   {
    "name": "root_cause_id",
    "type": "FK to root_cause row",
    "why": "Lineage query 'entries sharing a root cause' is a join, not pairwise edges; siblings such as the Python and Node non-ASCII compare bugs share one row",
    "prior_art": "E-08.f26"
   },
   {
    "name": "fix + fix_kind",
    "type": "TEXT + enum permanent | workaround | do_not_apply | none",
    "why": "The fix stays hidden until the gate says applies, which stops agents copying a near-match's fix",
    "prior_art": "KEDB workaround vs permanent fix [T-05.F15]; experience-following [M-02.28; T-05.F22,F23]"
   },
   {
    "name": "diagnosis_path",
    "type": "JSON array of ordered steps: observation, discriminating test, escalation point, dead end taken",
    "why": "Saves the expensive part: how the diagnosis was reached",
    "prior_art": "CBR derivation annotations [T-05.F3]; ReasoningBank distilled lessons [M-02.26]"
   },
   {
    "name": "negative_results",
    "type": "child table negative_result",
    "why": "What failed and why, scoped to the conditions where it failed",
    "prior_art": "RFC 2308/8767 negative caching [T-01.F11,F12,F14]; ReasoningBank failures [M-01.F24]"
   },
   {
    "name": "not_when discriminators",
    "type": "handles of kind not_when",
    "why": "Document-side negative feedback: a near-match that does NOT apply is held back as a candidate at most",
    "prior_art": "Rocchio moved to the document side [T-03.F16]; KS-R3"
   },
   {
    "name": "applies_while",
    "type": "JSON predicate: fix_ancestor sha (git merge-base --is-ancestor), dep ranges, platform list",
    "why": "Validity is a predicate over code state, not a date",
    "prior_art": "OSV GIT ranges, git predicates [T-02.F13-F16]; Linux Fixes:, Sentry resolved-in-release [M-03.F24]"
   },
   {
    "name": "facets",
    "type": "JSON: runtime, tool, phase, platform, slice",
    "why": "Deterministic prefilter before any scoring",
    "prior_art": "Sentry fingerprint matchers [T-04.F11]; REP structured filters [T-04.F19]"
   },
   {
    "name": "handles",
    "type": "child table handle (eight kinds, below)",
    "why": "Same cause, different wording, file or error text needs several keys of different granularity",
    "prior_art": "Chromium three signatures, Crashlytics issue/variant [T-04.F15,F16]"
   },
   {
    "name": "check + controls",
    "type": "check_spec + control rows (fails_at / passes_at, mainline sha + overlay)",
    "why": "The gate. Without a control pair a pass can be vacuous",
    "prior_art": "Getafix re-runs the signal [M-03.F01]; elastic-recheck discriminator [X-04.F02]; X-02.F29"
   },
   {
    "name": "footprint + trace",
    "type": "footprint_item rows with tier; trace digest",
    "why": "Event-driven invalidation and early cutoff",
    "prior_art": "Verifying traces, Build Systems a la Carte, Shake, rustc red-green [T-01.F01,F02]; X-03"
   },
   {
    "name": "refs",
    "type": "JSON links: mainline commit shas, PR numbers, doc anchors with blob OID, register ids",
    "why": "The store links to the plan, PR body, git and register and never restates them",
    "prior_art": "KS-R7; KCS typed links [X-04.F19]; T-02.F20"
   },
   {
    "name": "status (fold)",
    "type": "provisional | unverified_seed | verified | suspect | conflict | refuted | superseded | withdrawn",
    "why": "Retire by status, never delete; unverified seeds are never leads",
    "prior_art": "KCS WIP, Not Validated, Validated, Archived [X-04.F17]; KEDB [T-05.F15]; KS-R9"
   },
   {
    "name": "counters",
    "type": "INTEGER: shown, applies, absent, inconclusive, resolved, not_resolved",
    "why": "Helpful and harmful counts, updated by code, never by LLM rewriting",
    "prior_art": "ACE counters [M-02.29]"
   },
   {
    "name": "cost",
    "type": "JSON: escalations, tiers, raw token counts, wall time; NULL = unknown",
    "why": "Shows the escalation cost an entry saves; unknown is never 0",
    "prior_art": "X-05 prospective log; RT-06 [C-01]"
   },
   {
    "name": "version, content_sha, based_on_version",
    "type": "INTEGER, TEXT, INTEGER",
    "why": "Immutable versions, optimistic concurrency, conflict detection without last-writer-wins",
    "prior_art": "Event sourcing [T-02.F01]; T-06.F26"
   },
   {
    "name": "actor (session, agent, model, tier) + host",
    "type": "TEXT columns on every event",
    "why": "Writer identity must be explicit: subagent hooks fire with the main session id",
    "prior_art": "PROV [T-02.F03]; C-01 writer-identity warning"
   },
   {
    "name": "scrub_ruleset_sha, recipe_version",
    "type": "TEXT, INTEGER on derived rows",
    "why": "A scrubber or canonicaliser rule change re-derives keys instead of orphaning them",
    "prior_art": "WER and Socorro re-bucketing [T-04.F12,F13,F16; M-03.F13]; X-06"
   }
  ],
  "handle_types": [
   {
    "kind": "tmpl - exact canonical template",
    "how_built": "Canonicaliser recipe v1 over the first error line(s) of the scrubbed raw text: masks applied; codes, exception classes and basenames kept. Stored as text plus a sha256 value_key plus recipe_version, with raw_scrubbed kept beside it",
    "how_matched": "Exact value_key equality in the prefilter, and trigram MATCH for fragments of 3 or more characters [E-01.F04]",
    "failure_mode": "Brittle: one changed word in a message (library upgrade) splits it. Over-aggressive masks merge distinct errors. A recipe change orphans keys unless `kb rederive` runs [M-03.F13]"
   },
   {
    "kind": "sig - tool|phase|error code or exception class",
    "how_built": "Per-tool adapters reading structured output where it exists: pytest junit XML, Jest/Vitest json, alembic, eas/gradle earliest failing phase [T-04.F27,F28]. Examples: pytest|call|TypeError; eas|gradlew|EAS_BUILD_UNKNOWN_GRADLE_ERROR",
    "how_matched": "Exact",
    "failure_mode": "Over-merges: ex2's identical alembic CommandError for head, 0045 and 0044, plus the duplicate-revision case. Never enough for a lead on its own"
   },
   {
    "kind": "frames - top-3 in-app module::function",
    "how_built": "Repo-relative frames, no line numbers, framework frames dropped by a changelogged skip-list, consecutive duplicates collapsed [T-04.F09,F13,F14]",
    "how_matched": "Exact on the ordered triple and on the top frame",
    "failure_mode": "Renames and moves split it. Minified Hermes frames are unusable, so the matcher falls back to tmpl/sig. Recursion noise"
   },
   {
    "kind": "ctx - command and context",
    "how_built": "Normalised argv (flags sorted), cwd relative to the repo root, phase. Examples: 'railway up --ci @ repo-root', 'eas build -p android --profile preview @ technician-app', 'alembic upgrade head @ backend/start.sh'",
    "how_matched": "Exact",
    "failure_mode": "The same command fails for different causes, so ctx needs tmpl or coverage alongside it. Agents paraphrase commands. The cwd is what tells the deploy-from-root trap apart"
   },
   {
    "kind": "prose - symptom paraphrases",
    "how_built": "Written by the solver at record time in several wordings, including silent symptoms with no error text (ex3 double charge, ex5 blank form). This is write-time doc2query expansion [E-07.F07]",
    "how_matched": "fts_prose (porter unicode61) BM25 plus IDF-weighted coverage",
    "failure_mode": "Zero vocabulary overlap gives a miss, and common words dilute the score. Near-matches invite copying [M-02.28], so prose alone yields a candidate at most. Verified locally 2026-11-02: porter stems the tool name 'eas' to 'ea', so identifiers never go through this table"
   },
   {
    "kind": "ident - files, symbols, config keys, error codes, env names",
    "how_built": "From the fix diff and the check inputs. Examples: compare_digest, logPayment, EXPO_PUBLIC_SENTRY_DSN, technician-app/eas.json, uq_job_payment_client",
    "how_matched": "Exact table plus fts_ident (unicode61, tokenchars '_.-/:#', no stemming). Counts as a strong handle only when the query passes --touching or names the identifier",
    "failure_mode": "Renames and moves (mitigated by the footprint). Busy files such as AppContext.jsx carry low IDF and are weak alone"
   },
   {
    "kind": "doc_ref - pointer to a prose prescription",
    "how_built": "Doc path plus anchor plus the doc's blob OID, e.g. docs/HANDOFF-2026-07-28-open-work.md#A2, HANDOFF A4, G2 register ids",
    "how_matched": "Exact. This is how an agent about to apply a prescribed fix hits the do-not-apply entry (ex6)",
    "failure_mode": "Prose renumbering: a changed doc blob relabels the handle 'pointer moved'. An agent paraphrasing the prescription without citing it falls back to prose"
   },
   {
    "kind": "not_when - negative handle",
    "how_built": "Written by the author, or proposed from gate_absent feedback (KS-R3). Example: ex7 'not when the failure is in the Run gradlew phase'",
    "how_matched": "Matched like tmpl/prose. A match caps the entry at candidate and shows the discriminator",
    "failure_mode": "An over-broad not_when suppresses true hits: a miss, which is the safe direction. Proposed ones stay inactive until confirmed"
   }
  ],
  "history_model": "An append-only event stream (table event) protected by triggers that abort UPDATE and DELETE (verified on node:sqlite 2026-11-02). Entry identity is immutable. Content lives in immutable entry_version rows. The current view (entry_state) is a fold over events ordered by (lamport, event_id); `kb rebuild-fold` recomputes it, and the tests check the result for equality [T-02.F01,F07]. Event types: recorded, revised, confirmed, refuted, invalidated, reaffirmed, controls_broken, anchored, check_approved, proposed_handle, proposed_not_when, proposal_approved, proposal_rejected, superseded, withdrawn, rescrubbed, lookup, gate_run, outcome, claim, concurrent_miss. Corrections are new events, never edits. Entries retire by status and are never deleted [T-05.F15]. Refuted and withdrawn entries stay as tombstones and take part in the write-time near-duplicate check, so a stale writer cannot quietly bring them back [T-01.F17]. Two clocks, re-anchored per M-01.F01: record time is the event log (recorded_at is informational only); validity is a predicate over git code state (fix ancestry, trace equality) [T-02.F09,F13-F16], never the wall clock. Authored events carry based_on_version. Two revisions on the same base fold to status conflict for Opus; there is no last-writer-wins [T-06.F26].",
  "provenance_model": "Every event records actor_session, actor_agent, actor_model and actor_tier explicitly, because subagent hooks fire with the main session id [C-01]. It also records the host, based_on_version, the footprint_digest it was observed against, and its evidence. Evidence uses mainline commit shas and blob OIDs only, never PR-branch shas, which dangle after squash merges: a6f9048, 9b98c88, 8dafcec, f3dfa6f and c731e66 are branch-only in this repo (checked 2026-11-02) [T-02.F20; X-01.F22]. Gate artifacts are referenced by sha256; PRs and docs by link, never restated (KS-R7). PROV mapping, for documentation only: recorded = wasGeneratedBy, revised = wasRevisionOf, invalidated = wasInvalidatedBy [T-02.F03]. The scrubber rule-set sha and the canonicaliser recipe_version are stamped on every derived row, so a rule change is itself an invalidation trigger [X-06; T-04.F12]. Cost fields are NULL when unknown [X-05; RT-06]. Event ids are the sha256 of canonical JSON (sorted keys, UTF-8, LF; JCS-style, RFC 8785, which is not in the register), so the same fact minted twice becomes one row. There is no prev_hash chain in v1 (KS-R8).",
  "negative_results_model": "Negative results are first-class rows (negative_result). Each holds the approach tried; why it failed, distilled to one or two sentences rather than a transcript [M-02.26; X-05.F10]; a failure_class (wrong_premise, incomplete, worse_side_effect, vacuous_check, not_reproducible, tool_limit, wrong_severity); a scope (the conditions and footprint items it was observed under, e.g. 'Starlette 0.49.3 Route.matches' for ex1's scope['route'].path note); and an evidence ref. Following RFC 2308/8767, a negative is scoped to the narrowest key, carries its authority and world-state, and is a lead, not a prohibition [T-01.F11,F12,F14]. Following KS-R2, it is shown as 'held at footprint X' and relabelled 'may no longer hold' when a scope item changes. When the negative is itself the main lesson (a prescribed fix that is wrong: ex6, ex3's naive useState), it is promoted to a do_not_apply entry with its own protective check (KS-R9). Negative lookup results are a second kind. A gate not_applies on a shown hit becomes a proposed not_when (KS-R3). An applied fix that did not resolve the problem becomes a refute scoped to the footprint_digest it was observed on (KS-R2). Dead ends are shown on the card even for a candidate, because the path is the expensive thing to save; the fix is withheld until the gate passes.",
  "footprint_model": "A footprint is a set of typed items, each with a provenance tier, never a flat file list [X-03]. Item kinds: file_blob (repo-relative POSIX path to git blob OID, LF-normalised by the repo's '* text=auto eol=lf'); symbol_span (path::symbol to the sha256 of the span found by a declared anchor, with the whole-file blob as fallback); config_key (path#json-pointer to the sha256 of the canonical JSON value, e.g. technician-app/eas.json#/build/*/env, technician-app/app.json#/expo/plugins); dep_version (a lockfile entry); env (node, python, Docker image digest, OS); tool_resolution (what a remote resolver reported, e.g. the eas-cli version; flagged remote_resolver); doc_anchor. Tiers: fix_diff (`git diff --name-only fails_at passes_at` on mainline); check_input (every path the check reads or overlays); executed (coverage, deferred to K8 because the backend has no coverage tool [X-03]); read (hooks or transcript, off by default); env_probed; tool_reported. `kb capture` takes it once at record time and again at `kb anchor`; nobody lists dependencies by hand. The verifying trace is the sha256 over the sorted (kind, locator, value) items at the moment the control pair was last demonstrated [T-01.F01]. Over-capture costs one re-demonstration of the controls. Under-capture alone cannot cause an acted false positive, because the check always runs on the target before any action (claim C6). Dropping an item needs evidence.",
  "ddl_or_schema_sketch": "-- kb schema v1, SQLite >= 3.51.3 via node:sqlite; PRAGMA user_version = 1\n-- per connection: journal_mode=WAL; busy_timeout=10000; synchronous=FULL; foreign_keys=ON; every write in BEGIN IMMEDIATE\n-- node:sqlite defensive mode rejects double-quoted string literals (seen 2026-11-02): single quotes only\nCREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL); -- schema_version, recipe_version, runner_version, scrub_ruleset_sha, stage, min_cli\n\nCREATE TABLE event(                       -- the journal: exported as one file per row\n  event_id TEXT PRIMARY KEY,              -- sha256 of canonical JSON of all other columns\n  entry_id TEXT,                          -- NULL for lookup/claim rows with no entry\n  type TEXT NOT NULL CHECK (type IN ('recorded','revised','confirmed','refuted','invalidated','reaffirmed','controls_broken','anchored','check_approved','proposed_handle','proposed_not_when','proposal_approved','proposal_rejected','superseded','withdrawn','rescrubbed','lookup','gate_run','outcome','claim','concurrent_miss')),\n  based_on_version INTEGER,\n  lamport INTEGER NOT NULL,\n  actor_session TEXT, actor_agent TEXT, actor_model TEXT,\n  actor_tier TEXT CHECK (actor_tier IN ('haiku','sonnet','opus','fable','owner')),\n  host TEXT NOT NULL,\n  recorded_at TEXT NOT NULL,              -- informational, never used for validity\n  footprint_digest TEXT,                  -- trace the event was observed against (KS-R2)\n  payload TEXT NOT NULL CHECK (json_valid(payload)),\n  schema_version INTEGER NOT NULL);\nCREATE INDEX event_by_entry ON event(entry_id, lamport, event_id);\nCREATE TRIGGER event_no_update BEFORE UPDATE ON event BEGIN SELECT RAISE(ABORT,'append-only'); END;\nCREATE TRIGGER event_no_delete BEFORE DELETE ON event BEGIN SELECT RAISE(ABORT,'append-only'); END;\n\nCREATE TABLE root_cause(root_cause_id TEXT PRIMARY KEY, statement TEXT NOT NULL, cause_class TEXT NOT NULL, created_event TEXT NOT NULL REFERENCES event);\nCREATE TABLE entry(entry_id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('defect','trap','do_not_apply','open_defect','invariant_case')), root_cause_id TEXT REFERENCES root_cause, created_event TEXT NOT NULL REFERENCES event);\nCREATE TABLE entry_version(\n  entry_id TEXT NOT NULL REFERENCES entry, version INTEGER NOT NULL, content_sha TEXT NOT NULL,\n  title TEXT NOT NULL, symptom_meaning TEXT NOT NULL, misleading INTEGER NOT NULL DEFAULT 0 CHECK (misleading IN (0,1)),\n  cause TEXT NOT NULL, manifestation_conditions TEXT NOT NULL,\n  fix_kind TEXT NOT NULL CHECK (fix_kind IN ('permanent','workaround','do_not_apply','none')), fix TEXT,\n  diagnosis_path TEXT NOT NULL CHECK (json_valid(diagnosis_path)),\n  applies_while TEXT NOT NULL CHECK (json_valid(applies_while)),  -- {fix_ancestor, deps, platform}\n  facets TEXT NOT NULL CHECK (json_valid(facets)),\n  refs TEXT NOT NULL CHECK (json_valid(refs)),                    -- links only\n  cost TEXT CHECK (json_valid(cost)),                             -- NULL = unknown\n  scrub_ruleset_sha TEXT NOT NULL, created_event TEXT NOT NULL REFERENCES event,\n  PRIMARY KEY (entry_id, version));\nCREATE TABLE negative_result(neg_id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, version INTEGER NOT NULL,\n  approach TEXT NOT NULL, why_failed TEXT NOT NULL,\n  failure_class TEXT NOT NULL CHECK (failure_class IN ('wrong_premise','incomplete','worse_side_effect','vacuous_check','not_reproducible','tool_limit','wrong_severity')),\n  scope TEXT NOT NULL CHECK (json_valid(scope)), evidence_ref TEXT,\n  FOREIGN KEY (entry_id, version) REFERENCES entry_version);\nCREATE TABLE handle(handle_id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES entry,\n  kind TEXT NOT NULL CHECK (kind IN ('tmpl','sig','frames','ctx','prose','ident','doc_ref','not_when')),\n  value TEXT NOT NULL, value_key TEXT NOT NULL, raw_scrubbed TEXT, recipe_version INTEGER NOT NULL,\n  status TEXT NOT NULL CHECK (status IN ('active','proposed','rejected','retired')),\n  source TEXT NOT NULL CHECK (source IN ('author','seed','feedback')), created_event TEXT NOT NULL REFERENCES event);\nCREATE INDEX handle_exact ON handle(kind, value_key) WHERE status = 'active';\nCREATE VIRTUAL TABLE fts_prose USING fts5(entry_id UNINDEXED, title, symptom, cause, diagnosis, tokenize = 'porter unicode61');\nCREATE VIRTUAL TABLE fts_prose_vocab USING fts5vocab(fts_prose, row);\nCREATE VIRTUAL TABLE fts_ident USING fts5(entry_id UNINDEXED, ident, tokenize = \"unicode61 tokenchars '_.-/:#'\");\nCREATE VIRTUAL TABLE fts_ident_vocab USING fts5vocab(fts_ident, row);\nCREATE VIRTUAL TABLE fts_tri USING fts5(entry_id UNINDEXED, handle_id UNINDEXED, text, tokenize = 'trigram');\nCREATE TABLE check_spec(check_id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, version INTEGER NOT NULL,\n  kind TEXT NOT NULL CHECK (kind IN ('json_predicate','regex_in_span','ordered_in_span','duplicate_values','path_state','dep_version','pytest','jest','vitest','scripted')),\n  strength TEXT NOT NULL CHECK (strength IN ('discriminating','guard_presence')),\n  target_mode TEXT NOT NULL CHECK (target_mode IN ('tree','proposed_change')),\n  spec TEXT NOT NULL CHECK (json_valid(spec)), spec_sha TEXT NOT NULL,\n  requires TEXT NOT NULL CHECK (json_valid(requires)),          -- e.g. [\"docker\",\"postgres\",\"node_modules:technician-app\"]\n  author_actor TEXT NOT NULL, author_event TEXT NOT NULL REFERENCES event,\n  approved_actor TEXT, approved_spec_sha TEXT, approved_event TEXT REFERENCES event,\n  CHECK (approved_actor IS NULL OR approved_actor <> author_actor),\n  FOREIGN KEY (entry_id, version) REFERENCES entry_version);\nCREATE TABLE control(check_id TEXT NOT NULL REFERENCES check_spec, role TEXT NOT NULL CHECK (role IN ('fails_at','passes_at')),\n  rev TEXT NOT NULL,                      -- mainline commit sha only\n  overlay TEXT CHECK (json_valid(overlay)),  -- [{path, from_rev} | {path, blob_sha} | {path, delete}]\n  expect TEXT NOT NULL CHECK (expect IN ('PRESENT','ABSENT')), PRIMARY KEY (check_id, role));\nCREATE TABLE blob(blob_sha TEXT PRIMARY KEY, bytes BLOB NOT NULL);  -- mutants and synthetic fixtures, scrubbed, exported to the journal\nCREATE TABLE footprint_item(entry_id TEXT NOT NULL, version INTEGER NOT NULL,\n  kind TEXT NOT NULL CHECK (kind IN ('file_blob','symbol_span','config_key','dep_version','env','tool_resolution','doc_anchor')),\n  path TEXT, locator TEXT NOT NULL, value TEXT NOT NULL,\n  tier TEXT NOT NULL CHECK (tier IN ('fix_diff','check_input','executed','read','env_probed','tool_reported')),\n  remote_resolver INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (entry_id, version, kind, locator));\nCREATE INDEX footprint_by_path ON footprint_item(path);\nCREATE TABLE trace(entry_id TEXT NOT NULL, version INTEGER NOT NULL, trace_digest TEXT NOT NULL,\n  demonstrated_event TEXT NOT NULL REFERENCES event, runner_version INTEGER NOT NULL, recipe_version INTEGER NOT NULL, scrub_ruleset_sha TEXT NOT NULL,\n  PRIMARY KEY (entry_id, version));\nCREATE TABLE entry_link(from_id TEXT NOT NULL REFERENCES entry, to_id TEXT NOT NULL REFERENCES entry,\n  kind TEXT NOT NULL CHECK (kind IN ('supersedes','same_incident','shares_root_cause','do_not_confuse_with','refines','duplicate_of')),\n  created_event TEXT NOT NULL REFERENCES event, PRIMARY KEY (from_id, to_id, kind));\nCREATE TABLE lookup(lookup_id TEXT PRIMARY KEY REFERENCES event,\n  query_canonical TEXT NOT NULL, query_handles TEXT NOT NULL CHECK (json_valid(query_handles)),\n  target_head TEXT, target_dirty INTEGER, worktree_hash TEXT,\n  decision TEXT NOT NULL CHECK (decision IN ('miss','candidate','lead')),\n  shown TEXT NOT NULL CHECK (json_valid(shown)), internal TEXT NOT NULL CHECK (json_valid(internal)),  -- top-20 with features\n  thresholds TEXT NOT NULL CHECK (json_valid(thresholds)),\n  tokens_in INTEGER, tokens_out INTEGER, tokens_cache_read INTEGER, tokens_cache_write INTEGER,\n  model TEXT, tier TEXT, wall_ms INTEGER);  -- NULL = unknown, never 0\nCREATE TABLE gate_run(run_id TEXT PRIMARY KEY REFERENCES event, lookup_id TEXT REFERENCES lookup,\n  entry_id TEXT NOT NULL, version INTEGER NOT NULL, check_id TEXT NOT NULL REFERENCES check_spec, spec_sha TEXT NOT NULL,\n  target_rev TEXT NOT NULL, target_snapshot INTEGER NOT NULL,   -- 1 = git stash create snapshot of a worktree\n  controls TEXT CHECK (json_valid(controls)),\n  verdict TEXT NOT NULL CHECK (verdict IN ('applies','not_applies','inconclusive')), reason TEXT,\n  artifact_sha TEXT NOT NULL, attempts INTEGER NOT NULL, runner_version INTEGER NOT NULL, duration_ms INTEGER);\nCREATE TABLE outcome(event_id TEXT PRIMARY KEY REFERENCES event, lookup_id TEXT REFERENCES lookup, entry_id TEXT NOT NULL, version INTEGER,\n  kind TEXT NOT NULL CHECK (kind IN ('resolved','not_resolved','referenced','abandoned','gate_absent')));\nCREATE TABLE claim(signature TEXT PRIMARY KEY, holder_session TEXT, holder_agent TEXT, holder_tier TEXT,\n  claim_seq INTEGER NOT NULL, claimed_event TEXT NOT NULL REFERENCES event, released_event TEXT REFERENCES event);\nCREATE TABLE entry_state(entry_id TEXT PRIMARY KEY REFERENCES entry, current_version INTEGER NOT NULL,\n  status TEXT NOT NULL CHECK (status IN ('provisional','unverified_seed','verified','suspect','conflict','refuted','superseded','withdrawn')),\n  n_shown INTEGER NOT NULL DEFAULT 0, n_applies INTEGER NOT NULL DEFAULT 0, n_absent INTEGER NOT NULL DEFAULT 0, n_inconclusive INTEGER NOT NULL DEFAULT 0,\n  n_resolved INTEGER NOT NULL DEFAULT 0, n_not_resolved INTEGER NOT NULL DEFAULT 0,\n  refuted_footprints TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(refuted_footprints)),\n  last_lamport INTEGER NOT NULL, occ INTEGER NOT NULL DEFAULT 0);  -- materialised fold; kb rebuild-fold recomputes it\nCREATE TABLE price(model TEXT NOT NULL, valid_from TEXT NOT NULL, in_micro_usd_per_mtok INTEGER, out_micro_usd_per_mtok INTEGER, PRIMARY KEY (model, valid_from));  -- applied only at analysis\n\n-- analytics and lineage are SQL in the same engine (KS-R6)\nCREATE VIEW v_entry_outcomes AS SELECT entry_id, status, n_shown, n_applies, n_absent, n_inconclusive, n_resolved, n_not_resolved FROM entry_state;\nCREATE VIEW v_false_leads AS\n  SELECT g.lookup_id, g.entry_id, 'gate_passed_but_wrong' AS class FROM gate_run g JOIN outcome o ON o.lookup_id = g.lookup_id AND o.entry_id = g.entry_id WHERE g.verdict = 'applies' AND o.kind = 'not_resolved'\n  UNION ALL\n  SELECT l.lookup_id, g.entry_id, 'gate_refuted_lead' FROM lookup l JOIN gate_run g ON g.lookup_id = l.lookup_id WHERE l.decision = 'lead' AND g.verdict = 'not_applies';\nCREATE VIEW v_stale AS SELECT entry_id, status FROM entry_state WHERE status IN ('suspect','conflict');\n-- entries citing changed files (:changed = JSON array from git diff --name-only):\n--   SELECT DISTINCT f.entry_id FROM footprint_item f JOIN entry_state s ON s.entry_id = f.entry_id AND s.current_version = f.version WHERE f.path IN (SELECT value FROM json_each(:changed));\n-- entries sharing a root cause:\n--   SELECT e2.entry_id FROM entry e1 JOIN entry e2 ON e2.root_cause_id = e1.root_cause_id AND e2.entry_id <> e1.entry_id WHERE e1.entry_id = :id;\n-- what an entry superseded (UNION over id only; a depth column in the key was 20x slower [E-08.f16]):\n--   WITH RECURSIVE chain(id) AS (SELECT :id UNION SELECT l.to_id FROM entry_link l JOIN chain c ON l.from_id = c.id WHERE l.kind = 'supersedes') SELECT id FROM chain;\n-- failed approaches for similar symptoms: kb lineage --dead-ends runs retrieval (internal depth 10) and joins negative_result on those entry ids."
 },
 "retrieval": {
  "canonicalisation": "Recipe v1 lives in tools/kb/canon.mjs. It is deterministic, ordered and versioned, and golden fixtures test it (each raw sample maps to an expected canonical text and handle set) [T-04.F10,F13,F16]. Steps: (1) decode, CRLF to LF, strip ANSI escapes and progress spinners. (2) Scrub secrets and PII to typed placeholders before anything else touches the text, so nothing unscrubbed reaches FTS, the journal or backups [X-06]. (3) Normalise paths: absolute Windows and Linux paths, worktree prefixes (.claude/worktrees/<name>/) and home directories become repo-relative POSIX or <HOME> (the RT-07/09 Windows path defects [C-01]). (4) Run a per-tool adapter when the tool is known or detectable: pytest junit XML (test id, call vs setup phase, failure type, the full message rather than the truncated short-summary line [T-04.F29]); Jest/Vitest json; alembic; eas/gradle (earliest failing phase, '> Task :app:X FAILED' [T-04.F27]); docker plain (key on the instruction text, not '#N'); railway. (5) Apply ordered masks in the style of Sentry's parameterizer: email, url, uuid, hex of 7+ characters outside identifiers, dates and timestamps before IPs, durations, sizes, line and column numbers, ports, numeric ids, quoted values to <STR>. Error codes, exception classes, HTTP status codes, basenames, task paths and env var names are kept. Alembic revision ids stay in the raw text and become <REV> in the template. (6) Reduce stack frames to a module::function list with the skip-list. (7) Emit the template, the handle set and recipe_version. raw_scrubbed is kept beside the template, so a recipe change re-derives every handle (`kb rederive`) instead of orphaning it [M-03.F13,F16]. Defaults bias toward splitting [T-04]. Query text goes through the same recipe, so query keys and handle keys meet in one space.",
  "prefilter": "The prefilter is deterministic and explainable, and runs before any scoring [T-03; E-06.F21]. (a) Exact-handle lookup on handle(kind, value_key) for tmpl, sig, frames, ctx, doc_ref, and ident (only for --touching paths or identifiers present in the query). (b) Facet filter from flags or adapter output (runtime, tool, phase, platform): an entry is dropped when the query's facets contradict its scope. (c) Status filter. Withdrawn and superseded entries are excluded, and a superseded entry redirects to its successor. An entry refuted at this footprint is suppressed: KS-R2, where the target's footprint digest equals a refute's digest. Unverified_seed, provisional and conflict entries are capped at candidate. (d) Existence filter at the caller's target tree: if none of an entry's file or config footprint paths exist there, it is demoted one level. The survivors plus the FTS top 20 form the internal candidate set, depth 10 to 20 (KS-R4).",
  "ranking": "Ranking uses three FTS5 tables, all built in, each scored by bm25 with column weights [E-01.F05; T-03.F04,F24]. fts_prose (porter unicode61) weights title 4.0, symptom paraphrases 3.0, cause 1.5, diagnosis 0.5. fts_ident (unicode61, tokenchars '_.-/:#', no stemming) covers codes, symbols, paths, commands and env names. fts_tri (trigram) covers raw_scrubbed text and templates, for fragments of 3 or more characters. A bm25 value only orders results within one query; it is never used as a confidence or a threshold [T-03.F02,F05,F07]. The final order is lexicographic and explainable: (1) the count of strong exact-handle hits (tmpl, ctx, doc_ref, frames, and ident when touching); (2) IDF-weighted coverage; (3) the best bm25 rank across the three tables. There is no RRF, which is rank-only and cannot abstain [T-03.F25]; no pseudo-relevance feedback [T-03.F16]; and no LLM re-ranking in the store. The caller may judge the single card it is shown, but only as advice; that judgement never replaces the gate.",
  "abstention": "The output has three values (miss, candidate, lead), decided from features that do not depend on score scale [T-03.F18,F26]. (a) Strong exact-handle hit: a boolean, plus which kinds hit. (b) Coverage: the summed IDF of the query terms the entry matches, divided by the summed IDF of all query terms. Document frequencies come from fts5vocab (verified present in node:sqlite 3.53.4 on this box, 2026-11-02), using the always-positive IDF variant [T-03.F01]. One deliberate change from T-03.F26 (my modification, not in the register): query terms absent from the corpus stay in the denominator at maximum IDF, so an out-of-corpus query with one lucky shared term cannot reach full coverage. (c) Margin: coverage of the top result minus coverage of the second, within the same query only. (d) not_when matches and status caps. LEAD requires all of: a strong exact hit, coverage at or above theta_lead, margin at or above m, status verified or suspect, and no not_when match. CANDIDATE requires any of: coverage at or above theta_cand, any exact hit (sig included), or a trigram fragment of 12+ characters on a tmpl. Anything else is a MISS. The agent sees at most one lead and one candidate (KS-R4), each as a short card; a miss prints one line, is logged, and suggests `kb claim` if the caller is about to escalate.",
  "gate": "Nothing acts on a lead or candidate until `kb verify <id> --lookup <lid>` returns applies on the caller's target. The target is HEAD, a given rev, or --worktree. --worktree uses a `git stash create` snapshot of tracked changes, which makes a commit object without touching the shared stash list (that git behaviour is not in the register). If the trace is suspect, or the runner or recipe version changed, the runner first re-demonstrates the control pair, then runs the check on the target. The verdict is applies, not_applies or inconclusive, with a reason. Only applies lets `kb show` print the fix. Inconclusive counts as a miss and escalates; not_applies records gate_absent feedback [X-02]. The gate always asks whether the root cause (or forbidden state) is present in this tree, so it reproduces the cause rather than just showing the symptom gone [M-03.F01,F07].",
  "thresholds": "These are owner parameters, not design facts (KS-R10). Proposed starting values, calibrated in K2 by leave-one-handle-out on the seed and frozen before K5: theta_lead 0.5, theta_cand 0.3, margin 0.2 (coverage units), trigram fragment 12 characters, internal depth 20, display one lead plus one candidate. Calibration rule: pick the largest theta_lead that gives zero wrong leads on the hard-negative pairs (ex7 vs ex8, the alembic CommandError family, ex1 Python vs ex1 Node), then report recall, preferring misses. The X-05 pilot thresholds are also owner parameters: Step 0 stops at 2 or fewer repeats in 48 fix commits. Step 1 needs recall of 60% or more at shown, 0 acted false positives in 40+ probes, and a win over grep. Step 2 checks in at 20 encounters or 8 weeks and kills the track on 1 or fewer verified hits, on any acted false positive that reached a merged change, or when grep matches the store.",
  "feedback": "Feedback works on the document side, as the revise/retain half of the CBR cycle [T-05.F1; T-03.F16]. Each outcome is appended as an event. (1) applies, then resolved: confirmed (counter +1, ACE-style [M-02.29]), plus a proposed_handle carrying the canonical query when it adds a new key. (2) not_applies on a shown hit: outcome gate_absent, plus a proposed_not_when built from the query handles the entry lacks. (3) applies, then not_resolved: refuted, scoped to the target's footprint_digest (KS-R2); the entry is suppressed at that footprint and queued for an Opus revision that adds the negative result. (4) Controls fail to flip: controls_broken, and the entry stays suspect until revised. (5) Inconclusive: counter only. A proposal becomes active only on approval by an Opus actor other than the proposer, or on a second independent confirmation from another session against another lookup (KS-R3). There is no pseudo-relevance feedback, no automatic rewriting of entries, and no LLM-judged contradiction as an invalidation trigger [M-01.F02,F12].",
  "measurements": "Measurement stays inside the store (KS-R6, R7); there is no separate pipeline. Each lookup row keeps the canonical query, the internal top 20 with their features, what was shown, which thresholds fired, the gate verdict and the outcome. It also keeps raw tokens (in, out, cache read, cache write), model id, tier and wall time, with NULL for unknown; prices come from a dated table at analysis time only [X-05]. Views: v_entry_outcomes; v_retrieval (decision mix, applies-on-lead rate); v_false_leads (gate-passed-but-wrong counted separately from gate-refuted [X-05]); v_rule_of_three (the 3/n bound, valid only when the event count is zero [T-03.F20]); v_stale; v_cost. Offline, `kb eval` runs leave-one-handle-out, hard negatives, stale probes (a fixed tree overlaid onto a pre-fix tree), out-of-corpus queries, and a grep arm over CLAUDE.md and docs/ on the same queries [X-05.F21], with paired comparisons only [T-03.F19].",
  "embeddings_position": "Embeddings wait behind a measured trigger, which is an owner parameter (KS-R10). E-07's figures (about 5% 'missed, entry existed' over 50 lookups, or more than about 1,000 entries) are inferred. At this scale the evidence favours BM25: BEIR, entity queries, and LIMIT even at 46 documents [T-03.F09-F11; E-07.F01,F03]. Write-time paraphrase handles capture most of the vocabulary-mismatch benefit [E-07.F07]. If the trigger fires, embeddings stay inside the one engine: sqlite-vec in the same file (pre-v1, an owner install decision) and a pinned local int8 bge-small via transformers.js with allowRemoteModels=false, each vector stamped with model and revision [E-07.F19,F24,F28]. They would only add candidates through RRF, never decide abstention [T-03.F25]. No vector server, hosted embedder or Ollama."
 },
 "invalidation": {
  "triggers": "Triggers are events, not time: (1) the hash of a footprint item at the target changes (file blob, symbol span, config key path); (2) a dependency version in a lockfile changes (expo, alembic, eas-cli, Starlette); (3) a platform or env probe value changes (node, python, image digest, OS); (4) the canonicaliser recipe_version changes, and handles are re-derived; (5) the runner_version changes, and controls are re-demonstrated; (6) the scrubber rule-set changes, and entries are re-scrubbed; (7) a refute or controls_broken event; (8) a superseding entry; (9) a doc_ref's prose source blob changes ('pointer moved'). No TTL, no review dates, no scheduled sweep [T-01; X-04; C-01].",
  "mechanism": "Each entry version carries a verifying trace, captured when its control pair was last demonstrated [T-01.F01]. On every lookup and verify, the CLI recomputes the trace items at the caller's target with argv-only git (`git rev-parse <rev>:<path>`, the span hash, the JSON-pointer hash, the lockfile entry). If every item matches, the trace is clean. If any item changed, the entry is suspect, and verify re-demonstrates the controls first. Early cutoff: if both control outcomes are unchanged, a reaffirmed event re-stamps the trace and the entry stays useful [T-01.F02]. If the controls no longer flip, controls_broken marks the entry for revision. The reader appends only these mechanical events (read repair restricted to mechanical outcomes [T-01.F18]). Fix ancestry comes from `git merge-base --is-ancestor <fix_sha> <target>` and quick path equality from `git diff --quiet <trace_rev> <target> -- <paths>` [T-02.F13-F16]. Invalidation is pull-based, the Shake/Bazel way, rather than a dirty bit that mass-invalidates [T-01 rejected]. `kb stale --at origin/main` is an optional report that writes nothing.",
  "who_repairs": "A cheap agent may run `kb verify --controls`, which records a mechanical reaffirm or controls_broken. Revisions (a new check, a corrected cause, a new negative result, a re-anchor after a refactor) come from an Opus actor and need a different actor's confirmation (KS-R3). Fable judges conflicts and disputes. The owner never repairs entries; they only make the decisions listed.",
  "what_cannot_be_detected": "Changes on remote resolvers: the EAS cloud schema and build images, Railway/Railpack defaults, the Meta API. Footprints record the tool_resolution seen and flag remote_resolver, but a silent server-side change has no local trace [X-03]. Behaviour changes hidden behind unchanged version strings or floating tags (python:3.12-slim, an EAS 'auto' image). Untracked dependencies: Docker Desktop settings, phone OEM behaviour, the owner's shell environment. Semantic changes outside the footprint, such as a new caller passing different input to an unchanged function. Production data state, such as job_event kinds, which is not in git. Prose-only facts like the PIN-length attack math, unless they are encoded as a config key the footprint can hash."
 },
 "gate_runner": {
  "check_kinds": "(1) Declarative probes. The runner's own code interprets them over git blobs it reads with argv-only `git cat-file`/`git show <rev>:<path>`, with paths validated (repo-relative, no '..', no leading '-') and an optional overlay. Nothing from the store executes, so they need no sandbox and no Docker. Kinds: json_predicate (JSON pointer with wildcards, plus a predicate such as equals, empty_string, matches or contains); regex_in_span (a span anchored by a start regex and bounded by an end regex or N lines; PRESENT when the pattern occurs inside); ordered_in_span (pattern A before pattern B, e.g. the lock check before verify_pin); duplicate_values (a capture group across a glob; PRESENT on any repeat); path_state; dep_version. A missing anchor, a missing file or unparsable JSON gives inconclusive(anchor_missing), never ABSENT. Each probe has a strength. A discriminating probe matches a state that is itself the root cause (ex7, ex8, ex2a). A guard_presence probe only shows that a guard's text exists, not how the code behaves (ex4's seed and age-guard probe); for a code-behaviour entry it can never yield applies, only inconclusive(weak_check_only) [M-03.F07]. (2) test_id: pytest, jest or vitest by exact test id at the target tree, optionally overlaying test files from passes_at or a stored mutant blob. Docker only. (3) scripted: an argv array, never a shell string. This is the exception; Docker only, and approval is bound to the spec sha256 [X-02.F20]. (4) Capability-gated: a check that needs android_build, eas_cloud, device, prod_db or network declares it and returns inconclusive(capability_missing) locally, never not_applies [X-02.F30].",
  "isolation": "Declarative probes run in-process: read-only git object access, no checkout, no execution. test_id and scripted checks run in Docker: the WSL2 backend on the dev box, the same images on the VPS [X-02.F06,F07,F25]. The target tree enters as a `git archive <rev>` tar stream with overlays applied, unpacked into a tmpfs inside the container. No host directory is bind-mounted, so the code under test never sees .git, .env, ~/.railway, ~/.ssh or the store [X-02.F09,F15]. Containers run with --network none; DB checks use an --internal network shared only with a throwaway postgres:16-alpine container created per run and removed after. Other flags: --read-only, --tmpfs /scratch, HOME=/scratch, TZ=UTC, an explicit allow-list env (a container never inherits host env [X-02.F06]), --cap-drop ALL, --security-opt no-new-privileges, pids/memory/cpu caps, and a hard timeout per kind [X-02.F11]. The runner refuses any FIXFLOW_TEST_DATABASE_URL or FIXFLOW_DATABASE_URL whose host is not the per-run container: conftest TRUNCATEs every table at whatever URL it is given, and Settings defaults to localhost:5432 [X-02.F13,F14]. Dependencies come from a separate trusted step with network access and no stored input, producing a read-only volume keyed by the lockfile or requirements hash [X-02.F26]. Container names carry a kb- prefix so they never collide with the ship plan's fixed Appendix-A names, and Docker runs never take the one backend gate slot while a ship phase holds it. The runner fails closed: when Docker is not running (AutoStart is off), the verdict is inconclusive(sandbox_unavailable), with no unsandboxed fallback. Claude Code's sandbox does nothing on native Windows and is not relied on [X-02.F03].",
  "verdict_derivation": "The verdict comes from an artifact the runner owns, never from the child's exit code [X-02.F01,F12,F28]. The runner picks the junit/json path inside the tmpfs and a per-run nonce, reads the artifact back, and requires that the named test id appears and actually executed. PRESENT: the named test failed in the call phase, with a message matching the check's present_when template. Examples are ex1's 'TypeError: comparing strings with non-ASCII characters is not supported' and ex6's assertion on status 429. The failure must therefore reproduce the root cause, not just fail somehow. ABSENT: the named test passed. Anything else is inconclusive with a reason: collection or setup error, test id not seen (renamed or deleted), pytest exit 5, exits 126/127/137/255, timeout, flaky split, sandbox_unavailable, capability_missing, controls_broken, anchor_missing, unapproved_spec. Declarative probes write the same artifact (the evaluated values and the blob OIDs read). Flaky policy: rerun only on disagreement with the expectation, or to confirm a PRESENT on the target; applies needs unanimity; every attempt is recorded [X-02.F27]. On the target, PRESENT maps to applies, ABSENT to not_applies, and anything else to inconclusive; only applies permits action.",
  "approval": "Declarative probes execute nothing, so their spec needs no approval. The entry itself stays provisional until an Opus actor other than the author confirms it and the runner has demonstrated the control pair. test_id specs (kind, test id, overlay blob shas, present_when template, requires) are canonicalised and hashed. A spec can run only after a check_approved event, written by an Opus actor other than the author, binds that exact sha256; a schema CHECK refuses author approval. Any edit changes the sha and voids the approval [X-02.F20]. Scripted specs follow the same rule, and the approver must also show fail-on-fails_at during the approval run. Approvals are journal events, so they travel with the store between hosts.",
  "control_pair": "Every runnable check carries fails_at (expects PRESENT) and passes_at (expects ABSENT). Each is a mainline commit plus an optional overlay of one of three kinds. (a) Fail-to-pass: test files from passes_at overlaid onto fails_at; ex1 uses fails_at = 2fe77f5^ plus the ops test file from 2fe77f5, and passes_at = 2fe77f5. (b) A stored mutant that reverts only the guard: ex5 uses da988e2 plus resolvePrefill returning 'new' on fetch failure; ex6 uses 1c546a3 plus a mutant implementing HANDOFF A2. This borrows mutation testing, which is not in the register. (c) A synthetic fixture where history never held the bad state: ex2a uses origin/main plus a copy of a migration carrying an existing revision id. The pair is demonstrated at approval, at `kb anchor` after merge, and whenever the trace goes suspect or the runner, recipe or scrubber version changes. When both outcomes are unchanged, a reaffirmed event re-stamps the trace [T-01.F02; X-02.F29]. Checked on this box 2026-11-02 with the R-02 probes: ex7 reads 140428c PRESENT, 79a8dd4 ABSENT, origin/main ABSENT; ex8 reads 60c026d PRESENT, 6928828 ABSENT, origin/main ABSENT; the duplicate-revision probe finds 0 duplicates over 46 migration files at origin/main. A check whose pair does not flip can never produce a verdict."
 },
 "concurrency": {
  "write_path": "Every write goes through one code path. The CLI scrubs, canonicalises, and builds events with client-minted content-hash ids, then opens BEGIN IMMEDIATE (busy_timeout 10 s, WAL, synchronous=FULL, foreign keys on). Inside the transaction it inserts the events with INSERT OR IGNORE, which is idempotent: a retried write is a no-op (verified locally 2026-11-02). It then inserts the derived rows and recomputes that entry's fold. entry_state is written with UPDATE ... WHERE occ = :seen, the repo's own try_claim idiom. Then COMMIT. After the commit the CLI writes one journal file per committed event (temp-then-rename); `kb export` repairs any gap idempotently. An authored event with a stale based_on_version is stored anyway and folds to conflict for Opus; there is no last-writer-wins [T-06.F26]. Lamport is set to max+1 inside the IMMEDIATE transaction, so one host is totally ordered and two hosts merge by (lamport, event_id). Readers open read-only connections and never hold long transactions, which would starve checkpoints [E-01.F09]. A long gate run never holds a write transaction; it writes its result in a separate short one. Evidence: 4 writer processes inserting 300 to 3,000 rows each saw no SQLITE_BUSY [E-01.F10; X-01.F10]. The WAL-reset bug requires every runtime to run SQLite 3.51.3 or later; Node 24.22.1 bundles 3.53.4, and kb refuses to open the file on anything older [T-06.F5,F6; X-01.F02].",
  "stampede_control": "Stampede control follows KS-R5: one table, in the repo's own idiom. On a miss before escalating, the session runs `kb claim --from-lookup <lid>`. The signature is the strongest key in the query: the tmpl hash, else sig plus ctx. try_claim is INSERT ... ON CONFLICT(signature) DO UPDATE SET claim_seq = claim_seq + 1, holder = ... inside one IMMEDIATE transaction, and never blocks. A second agent missing on the same signature sees 'being solved by <session/agent/tier> since <time>, claim_seq n', and a concurrent_miss event is logged. That agent may wait, proceed, or pick other work; nothing is refused. The solver's `kb record` carries the claim_seq it held, as a fencing token [T-06.F13,F30], so analytics can see overlapping solves. A write from an older claim_seq is still accepted, because both diagnoses are valuable, but it triggers the write-time near-duplicate check (exact Jaccard [T-03.F15]) and an 'extend, do not sibling' prompt [T-05.F15]. No lease expiry or renewal policy exists until the lookup log actually shows concurrent misses.",
  "worktree_story": "Each host has one store, outside every worktree. KB_HOME defaults to C:/Users/User/.fixflow-kb, the profile root. This box has C:/Users/User/OneDrive and C:/Users/User/WPS Cloud sync folders, so `kb doctor` refuses a KB_HOME under OneDrive, WPS Cloud or Dropbox, on a UNC or network path, on a Docker bind mount, on /mnt/c from WSL, or inside any git work tree [T-06.F2,F23; E-01.F09,F11]. Every worktree's `node tools/kb/kb.mjs` resolves the same file, so all parallel sessions and subagents share one data set under WAL. The DB is never committed and no worktree has its own [E-01 rejected paths]. Worktrees differ only in code state, and that is an input, not a store partition: lookup and verify compute the trace and the gate against the caller's worktree, so two worktrees can rightly get different validity for the same entry. An entry recorded from a feature branch is provisional and anchored to branch commits. After the squash merge, `kb anchor --pr <n>` re-anchors its controls to the squash commit on main and re-demonstrates them, because branch shas dangle [T-02.F20; X-01.F22]. The CLI code lives in the code repo under tools/kb (reviewed by PR, synthetic fixtures only). The schema version sits in PRAGMA user_version plus meta.min_cli. A worktree whose tools/kb is older than the DB may read, but refuses writes and names the main sha to rebase onto.",
  "two_host_story": "Stage 0 (now, dev box only, KS-R1). The SQLite file is the truth. Each committed event is also exported as an immutable canonical-JSON file, journal/ev/<aa>/<event_id>.json, inside KB_HOME. KB_HOME is itself a small git repo: kb.sqlite, backups and gate scratch are gitignored, and attributes are '* text eol=lf'. `kb backup` commits the new journal files and pushes over SSH to a bare repo the owner controls (on the VPS from P3b), never to GitHub, which would put defect text with a third party [X-01.F28]. Stage 1 starts the first time a second host's agents need to write. The journal becomes authoritative, and each host's SQLite becomes a rebuildable index. `kb sync` exports local events, commits, runs `git pull`, ingests (INSERT OR IGNORE by event id, then refolds touched entries) and pushes. Distinct event files merge as pure adds under squash or normal merges; a shared append file would conflict [X-01.F20,F21]. Mechanical events commute; concurrent authored revisions fold to conflict for Opus. Host move at P13e: clone the store repo, run `kb rebuild --from-journal` and `kb doctor`. Linux needs Node 24 or later on the host itself (SQLite 3.51.3 or later), with KB_HOME on local disk; git and sshd are already there. Rejected: SSH forced-command access to one remote DB (both hosts must be up for every lookup, and offline writes are lost); sqlite3_rsync (one-way, no tested Windows-to-Linux path, a binary install [X-01.F03,F04]); Litestream (beta, one-way, Windows unofficial [X-01.F11]); cr-sqlite (per-column last-writer-wins loses edits); Dolt (heavy, telemetry on by default) [X-01.F15-F17]."
 },
 "engines": [
  {
   "role": "System of record, retrieval, analytics and lineage (stage 0); per-host rebuildable index (stage 1)",
   "engine": "SQLite via node:sqlite",
   "version_or_status": "SQLite 3.53.4 bundled in Node v24.22.1 (node:sqlite Stability 1.2 release candidate). FTS5, trigram, fts5vocab, JSON, append-only triggers and INSERT OR IGNORE verified in-memory on this box 2026-11-02",
   "why": "Zero install, one file, BM25 with column weights, trigram, JSON, recursive CTEs, WAL multi-process writes verified [E-01.F01,F02,F05,F10; X-01.F10]. DuckDB rejected as primary because it allows one read-write process per file and its FTS index is not auto-updated [E-02.F03]. LanceDB rejected because its FTS goes stale until optimize() and its concurrency is undocumented [E-02]",
   "egress": "None: in-process library on a local file; SQLite has no telemetry [E-10]",
   "ops_cost": "Low: one file plus -wal/-shm; doctor, backup and restore verbs; nothing runs in the background",
   "install_needed": "None on the dev box. Node 24 on the VPS or home box when stage 1 begins (owner decision OD10)"
  },
  {
   "role": "Full-text retrieval (prose, identifier and trigram tables)",
   "engine": "FTS5 inside the same SQLite file",
   "version_or_status": "Compiled into 3.53.4; trigram tokenizer since 3.34.0",
   "why": "Multi-field BM25 with no second engine; ranking quality at this scale comes from tokenisation, weights and canonicalisation, not from the engine [T-03.F24; E-01.F04-F06]",
   "egress": "None",
   "ops_cost": "None beyond the store; rebuild with `kb rebuild-index`",
   "install_needed": "None"
  },
  {
   "role": "Journal transport, offsite backup, code-state predicates (not a database)",
   "engine": "git: the KB_HOME store repo plus a bare repo on the VPS over SSH",
   "version_or_status": "git 2.56 on the dev box; the VPS gets a bare repo directory at P3b or later",
   "why": "Immutable per-event files merge as pure adds; refs are shared across worktrees; validity predicates are git commands [X-01.F19,F20; T-02.F13-F16]",
   "egress": "Pushes only to an SSH remote the owner controls; never GitHub [X-01.F28]",
   "ops_cost": "Low: wrapped by `kb backup` and `kb sync`",
   "install_needed": "None on the dev box; a bare repo directory on the VPS"
  },
  {
   "role": "Isolation for executable checks (test_id, scripted)",
   "engine": "Docker Desktop (WSL2 backend) on the dev box; Docker Engine on Linux. Images python:3.12-slim and node:24-bookworm-slim, pinned by digest, plus postgres:16-alpine, which the project already uses",
   "version_or_status": "Installed; AutoStart is off, so the owner starts it",
   "why": "The only sandbox common to Windows and Linux; Claude Code's sandbox is off on native Windows and Windows Sandbox has no headless I/O [X-02.F03-F07]",
   "egress": "Image and dependency pulls only, in the trusted deps step (package names, no defect data). Check containers run --network none or on an --internal network",
   "ops_cost": "Medium: start Docker before Docker-backed checks; one deps volume per lockfile hash (first build est. 5 to 15 min, inferred)",
   "install_needed": "Image pulls and dependency volumes are an owner decision (OD4)"
  },
  {
   "role": "Optional fail-closed second-pass secret scan",
   "engine": "gitleaks (MIT binary)",
   "version_or_status": "Not installed; default off",
   "why": "The layered scrubber's second pass; best measured recall 86 to 88% [X-06]",
   "egress": "None when run offline (verify with a firewall test)",
   "ops_cost": "Low",
   "install_needed": "Binary install (owner decision OD7)"
  },
  {
   "role": "Reserve driver",
   "engine": "better-sqlite3 13.0.3 (bundles SQLite 3.53.4)",
   "version_or_status": "Reserve only, used if the node:sqlite release-candidate API breaks",
   "why": "Drop-in behind the abstraction layer [E-01.F17]",
   "egress": "None",
   "ops_cost": "Low",
   "install_needed": "npm install, owner decision only if it is ever needed"
  },
  {
   "role": "Reserve dense ranking signal",
   "engine": "sqlite-vec 0.1.9 in the same file, plus transformers.js with a pinned local int8 bge-small",
   "version_or_status": "Deferred behind a measured trigger (KS-R10)",
   "why": "Only if the measured miss rate shows zero-overlap vocabulary misses [E-07]",
   "egress": "None with allowRemoteModels=false and a local model file",
   "ops_cost": "Medium",
   "install_needed": "npm packages and a model file (owner decision)"
  }
 ],
 "abstraction_layer": {
  "interface_ops": [
   "open(kbHome, {mode: 'read' | 'write'}) -> Store (version gate at SQLite 3.51.3+, path guards, PRAGMA setup)",
   "lookup({text | textFile, tool, phase, cmd, touching[], docRef}, target) -> {decision, lead?, candidate?, lookupId, features}",
   "card(entryId, {version, reveal: 'card' | 'lead' | 'full', gateRunId}) -> bounded, scrubbed text (the fix only when reveal = 'full' backed by an applies gate run)",
   "appendEvents(events[], {expectOcc}) -> {inserted, duplicates, state}: the only write primitive, idempotent by event id",
   "fold(entryId) -> EntryState; rebuildFold() -> count",
   "footprintAt(entryId, target) -> {digest, clean, changedItems[]}",
   "verify(entryId, target, {controls}) -> GateResult: the runner module, which reads through card/footprintAt and writes through appendEvents",
   "claim(signature, actor) -> {claimSeq, holders[]}",
   "view(name, params) -> rows: named analytic views only, no SQL passthrough",
   "lineage(entryId, kind: 'supersedes' | 'root_cause' | 'dead_ends' | 'changed_since') -> rows",
   "exportJournal(dir) / ingestJournal(dir) -> counts",
   "snapshot(path) / restore(path) / integrityCheck() -> ok | errors"
  ],
  "swap_story": "The interface is async from day one: node:sqlite is synchronous, and wrapping it now stops a later async driver from leaking through. Swap 1, the driver: better-sqlite3 slots in behind the same module if the node:sqlite release-candidate API drifts [E-01.F17]. Swap 2, the engine: Postgres 16 per E-03, if multi-host writers or server-side SQL are ever needed. Tables map one to one (TEXT/JSON to text/jsonb, INSERT OR IGNORE to ON CONFLICT DO NOTHING, triggers stay triggers), and FTS5 maps to tsvector plus pg_trgm. ts_rank has no IDF [T-03.F06], but coverage and IDF are already computed in the application from per-term document frequencies, so the abstention features survive. The journal is the migration path: `kb ingest` replays every event into the new engine, and the fold-equality test proves the swap. Retrieval sits behind canonicalise / prefilter / rank / abstain, so the ranker can change without touching data [T-03].",
  "what_leaks": "FTS5 hard-codes bm25 at k1=1.2 and b=0.75, and its tokenizers behave in their own ways: porter stems 'eas' to 'ea' (seen locally) and trigram needs 3 or more characters. Any ranker swap therefore means recalibrating thresholds. WAL's same-host rule and the 'outside every worktree' rule are SQLite operational facts that the CLI enforces outside the interface. PRAGMA user_version becomes a migrations table on Postgres. node:sqlite's defensive mode rejects double-quoted string literals, so the module's SQL uses single quotes only. Synchronous transactions mean a long gate run must never hold a write transaction."
 },
 "access": {
  "how": "Agents call `node tools/kb/kb.mjs <verb>` through Bash, the one path every subagent and workflow agent has without configuration or an approval prompt [E-10.F16]. A project skill at .claude/skills/kb/SKILL.md carries the procedure lookup, verify, show, outcome; its description is under 1,536 characters and the body loads on demand [E-10.F17]. The skill also states that journal files and kb.sqlite are never read directly. The first output line is machine-parsable: 'KB miss|candidate|lead <lookup-id>' or 'KB verdict applies|not_applies|inconclusive <reason> <run-id>'. The exit code is 0 whenever the store answered (a miss is not an error) and 3 when the store is unavailable; callers treat 3 as a miss.",
  "cli_commands": [
   "node tools/kb/kb.mjs lookup --text-file err.txt --tool eas --phase build --cmd 'eas build -p android --profile preview' --target .",
   "node tools/kb/kb.mjs lookup --text 'correct PIN rejected with 429 while the account is locked' --doc-ref 'docs/HANDOFF-2026-07-28-open-work.md#A2'",
   "node tools/kb/kb.mjs lookup --touching backend/app/features/identity/throttle.py --touching backend/app/features/identity/service.py",
   "node tools/kb/kb.mjs verify kb-eas-empty-env-value --lookup <lookup-id> --worktree",
   "node tools/kb/kb.mjs verify <entry-id> --target origin/main --controls",
   "node tools/kb/kb.mjs show <entry-id>   (prints the fix only after an applies verdict in this lookup; --as-lead prints the diagnosis and dead ends under an UNVERIFIED banner)",
   "node tools/kb/kb.mjs outcome <lookup-id> resolved|not_resolved|abandoned --note '<one line>'",
   "node tools/kb/kb.mjs claim --from-lookup <lookup-id>   |   node tools/kb/kb.mjs claims",
   "node tools/kb/kb.mjs propose-handle <entry-id> --from-lookup <lookup-id>",
   "node tools/kb/kb.mjs propose-not-when <entry-id> --from-lookup <lookup-id> --text '<discriminator>'",
   "node tools/kb/kb.mjs record --draft entry.json --actor opus:<session-id>/<agent-id>   (authored; lands provisional)",
   "node tools/kb/kb.mjs capture <entry-id>",
   "node tools/kb/kb.mjs approve <event-id> --actor opus:<id>   |   approve-check <check-id> --spec-sha <sha256> --actor opus:<id>   |   reject <event-id> --reason '<why>'",
   "node tools/kb/kb.mjs anchor <entry-id> --pr <number>   |   anchor <entry-id> --merged <squash-sha>",
   "node tools/kb/kb.mjs revise <entry-id> --draft v2.json --based-on 1   |   supersede <old-id> --by <new-id>   |   withdraw <entry-id> --reason '<why>'",
   "node tools/kb/kb.mjs stale --at origin/main   |   stats   |   view v_false_leads   |   lineage <entry-id> --supersedes|--root-cause|--dead-ends   |   lineage --changed-since <sha>",
   "node tools/kb/kb.mjs backup   |   sync   |   restore --from <snapshot>   |   rebuild --from-journal   |   rederive   |   rescrub   |   doctor   |   eval --loho"
  ],
  "mcp": "Optional, built in K8 on an owner decision, and only if CLI use proves error-prone [E-10]. It would be a zero-dependency stdio JSON-RPC server in tools/kb/mcp.mjs exposing only the read and mechanical verbs: kb_lookup, kb_show, kb_verify, kb_outcome. It would never offer a generic SQL tool; the reference sqlite and postgres MCP servers are archived and the community ones are SQL passthroughs [E-01.F20,F21]. Results stay under 10k tokens by construction [E-10.F18]. Transport is stdio only, with no HTTP listener [X-01.F25]. Authored verbs stay CLI-only.",
  "output_bounding": "Caps: lookup 2,000 characters (two cards at most); show 6,000 characters (diagnosis path, dead ends, conditions, refs as links); lists 20 rows; raw handle text 4 KB, via --raw-handle. Every output passes the return-time scrubber, and all of it sits well under Bash's 30k-character read-back and MCP's 10k-token warning [E-10.F18]. A miss prints one line. injected_tokens stays 0, because nothing is ever pushed into context [X-05.F12].",
  "read_write_separation": "Verbs are classed in code. Read verbs (show, stats, view, lineage, stale, doctor, and lookup's ranking step) open the DB read-only. Mechanical verbs (verify, outcome, claim, propose-handle, propose-not-when, and the lookup event itself) append evidence-bearing events that any tier may write (KS-R3). Authored verbs (record, revise, anchor, approve, approve-check, reject, supersede, withdraw, rederive) need --actor with an Opus model id, and they stay inert until confirmed: a recorded entry is provisional and never a lead until a different actor confirms it. A schema CHECK refuses an author approving their own check. Actor identity is self-declared through KB_ACTOR or --actor; the harness provides no authenticated identity. The real control is therefore that every authored change needs a second actor's confirmation and is reviewed beside the PR diff. A permissions.deny on 'Bash(node tools/kb/kb.mjs record:*)' and similar, in cheap-agent definitions, is an owner decision because it is persistent configuration."
 },
 "workflow": {
  "write_when": "Entries are written through, at solving time. The solving agent records while the diagnosis is still in its context and before the PR leaves draft: `kb record` (provisional), then `kb verify --controls`. A case is recorded when it needed a tier escalation, two or more failed approaches, or a burned build or deploy, or when a prescribed fix was refuted (a do-not-apply entry). Its dead ends come from the phase's draft-PR 'Decisions / ruled out' journal: the store links to it and does not restate it. At phase close, after the squash merge, `kb anchor --pr <n>` re-anchors the controls to main. Routine fixes are not recorded. Open defects with no diagnosis stay owned by G2 and the plan (KS-R7). Recording is never a phase's Done-when, so skipping it under time pressure delays nothing.",
  "who_confirms": "The PR's Opus reviewer refutes the entry beside the diff (refute by default: does the check fail at fails_at because of the stated root cause, not just because of the symptom?) and approves any test_id spec; the approver is never the author. Cheap agents (Haiku, Sonnet) append only mechanical events: lookup, verify, outcome, claim and proposals. A proposal activates on Opus approval or on a second independent confirmation (KS-R3). Fable judges disputes and conflict states and never implements. The owner confirms nothing; they only answer the decisions listed.",
  "read_when": "Step zero. Before escalating a failure to a higher tier or re-dispatching a failed agent, the briefing session (Fable, or a Haiku it dispatches) runs `kb lookup` on the raw error or symptom. On a lead, it dispatches a cheap agent to `kb verify` and, on applies, to apply the fix, instead of starting an Opus derivation. On a miss, it runs `kb claim` and escalates, putting the lookup id in the brief so the Opus session sees any dead ends as leads. Lookups also happen before retrying any failed build or deploy, before applying a fix that a prose register prescribes (HANDOFF, G2 §2), which is how ex6 is caught, and when reopening a parked defect. Pull-only: nothing is injected and nothing is always loaded [X-05.F12; M-02].",
  "plan_hook_text": "- **Knowledge store (tooling track; never a gate).** Before escalating a failure to a higher model tier, re-dispatching a failed agent, retrying a failed build or deploy, or applying a fix that a prose register prescribes, the session runs `node tools/kb/kb.mjs lookup` on the raw error text or symptom and acts on a hit only after `kb verify <id>` returns `applies` on the current tree; a miss, an `inconclusive` verdict or an unreachable store changes nothing and costs the phase nothing. When a phase solves a defect or trap that needed an escalation, a second attempt or a burned build, the solving agent records it with `kb record` before the PR leaves draft, taking its ruled-out approaches from this phase's \"Decisions / ruled out\" journal; the Opus reviewer refutes the entry beside the diff, and cheap agents append only lookup, verify and outcome events. At phase close the session runs `kb anchor --pr <n>` and `kb backup`, and the closing message's evidence line names the entry ids written or reused.",
  "phase_cost": "These estimates are inferred and are owner parameters (KS-R10). When used: a lookup is one Bash call printing at most 2,000 characters (about 500 tokens), and a miss prints one line (about 30 tokens). A declarative verify takes under 1 s. A Docker test_id verify takes about 1 to 3 min once the deps volume exists; the first build per lockfile hash takes 5 to 15 min. Recording a hard case costs the solver about 10 to 20 min and 3k to 6k tokens (the draft is written from context already loaded), plus about 2k tokens of reviewer time. `kb backup` takes about 5 s. A phase that hits nothing hard pays about 0. The K-phases are separate sessions and never gate a ship phase.",
  "scrubbing": "Scrubbing runs twice, in the same Node process as the canonicaliser, with no install: at write time, before any field reaches SQLite, FTS, the journal or backups; and again on every return to an agent [X-06]. Exact-value redaction removes live secrets taken from the session env and from any .env or .env.local in the caller's worktree; the values are used to redact and never stored. Regexes cover postgresql(+asyncpg)://user:pass@ URLs, Authorization/Bearer headers, JWTs (eyJ...), GitHub tokens, Railway, Supabase and R2 key shapes, and key=value pairs with secret-like names. PII rules cover PK mobile numbers (+92 / 03xx), CNIC (5-7-1 digits) and emails. Placeholders are typed and deterministic (<SECRET:db_url>, <PII:phone>). SHAs, UUIDs, alembic revision ids and epoch-ms timestamps are exempt from redaction so that handles survive; a must-survive fixture group tests this [X-06]. Names and addresses cannot be detected locally, so a structural rule applies: no field may carry raw production-data output (query results, customer payloads, message bodies), and adapters keep templates with placeholders. A known-miss fixture documents a customer name inside an error string. The scrubber's rule-set sha is stamped on every row, and a rule change triggers `kb rescrub` as an invalidation event. gitleaks runs as a fail-closed second pass only if the owner approves the binary (OD7). Provider egress cannot be avoided: whatever the CLI prints enters model context and reaches Anthropic. The owner rules on scope and account type (OD6) [E-10.F31; X-06]."
 },
 "migration": {
  "seed_sources": "R-01a and R-01b counted 270 prose rows. CLAUDE.md: 4 traps, 16 invariants, 9 solved, 1 open. HANDOFF-2026-07-28 §2/§4/§5.5/§6: 13 traps, 4 invariants, 10 solved, 36 open. Lifecycle follow-ups: 11 open, 1 trap. G2 §2: 74 open, 1 solved, 7 negatives. HR §3/§4: 6 open, 4 invariants, 3 traps. W2 notes: 52 ruled-out alternatives [R-01a; R-01b]. To these add git history for the eight reconstructed cases [R-02], and from now on each phase's draft-PR 'Decisions / ruled out' journal. Seed candidates are only solved cases, and traps with a reconstructible case. Open defects stay owned by G2 and the plan (KS-R7) unless they carry a do-not-apply lesson (ex3). Invariants stay in CLAUDE.md as rules.",
  "how": "Seeding is per entry, through the write gate, and never a bulk import (KS-R9). A Sonnet seeding session drafts one JSON per entry from the prose item plus `git show` of its mainline commits. `kb record` validates, scrubs and canonicalises the draft, captures the footprint, and runs the near-duplicate check (exact pairwise Jaccard on token shingles [T-03.F15]). The runner then demonstrates the control pair, and an Opus reviewer confirms by refuting and approves test_id specs. An entry without a demonstrable pair is stored as unverified_seed: candidate at most, never a lead. Order: the eight R-02 examples (K4), then the CLAUDE.md traps, then the HANDOFF solved items, then the W2 ruled-out notes attached as negative results to their entries. Seeding stops when K5 shows whether the store earns its keep. The contradictions R-01a found become a docs PR that corrects the prose sources, putting entry ids beside them: HANDOFF A2 vs CLAUDE.md; 0045 called a free slot vs merged; C1/C2 'do not ship' vs merged; HANDOFF §4.4 listing as open what is fixed.",
  "claude_md_effect": "CLAUDE.md runs to 390 lines, and adherence falls past about 200 [M-02.01]. It keeps every rule as a rule: it is the always-loaded authority, and the store is pull-only. Once an entry is verified and K5 passes, the case narrative under its rule moves out. For example, the four Build & deploy traps shrink to one line each plus an entry id: 'Never an empty EXPO_PUBLIC_SENTRY_DSN in eas.json: kb-eas-empty-env-value'. The bill-freeze, login-lock, dispatcher and outbox-race paragraphs lose their history and keep their rules; the estimated saving is 60 to 100 lines (inferred). Nothing moves before K5: if the store does not beat grep over the prose, the prose stays [X-05.F21].",
  "first_eight_entries_fit": "ex1 (non-ASCII compare_digest 500) becomes two defect entries sharing one root_cause row, 'secret comparison not total over attacker-controlled str'. kb-compare-digest-nonascii (Python) has handles tmpl 'TypeError: comparing strings with non-ASCII characters is not supported'; sig pytest|call|TypeError and http|GET /api/ops/*|500; ident compare_digest, X-Ops-Proxy-Token and verify_webhook_signature; prose for the WhatsApp webhook variants. It has five negative_result rows: the typeof-null guard (wrong_premise); the String.length guard (wrong_premise, UTF-16 vs UTF-8); scope['route'].path (wrong_premise, scoped to Starlette 0.49.3); the OOM severity claim (wrong_severity); the exported-function unit test (vacuous_check). kb-timingsafeequal-rangeerror covers the Node RangeError and process kill in ops-server.mjs. Check: pytest test_id app/features/ops/tests/test_router.py::test_non_ascii_token_is_unauthorized_not_a_500, PRESENT on a call-phase failure matching the tmpl. Controls: 2fe77f5^ plus the ops test file from 2fe77f5 (PRESENT) and 2fe77f5 (ABSENT). The overlaid file imports only modules that exist before the fix (read 2026-11-02). It runs in Docker without Postgres, in K3b.\n\nex2 (reverted 0045) becomes three trap entries linked same_incident. kb-alembic-duplicate-revision uses a declarative duplicate_values check over the ^revision lines of backend/alembic/versions/*.py. Controls: origin/main ABSENT (0 duplicates over 46 files, read today) and origin/main plus an overlaid copy carrying an existing revision id PRESENT. It runs now, without Docker. kb-rollback-alembic-commanderror is flagged misleading: the identical CommandError for head, 0045 and 0044 means 'DB ahead of code', and retargeting the revision does not help. Its handles are sig alembic|upgrade|CommandError and ctx 'alembic upgrade head @ backend/start.sh'. Its check is a scripted alembic run against a throwaway Postgres at 0046 with older code; that needs approval, so the entry is unverified_seed until then. kb-validate-same-deploy-boot-abort covers NOT VALID and VALIDATE landing in the same deploy. Its footprint includes backend/start.sh, and it has a guard_presence check only, because the real check needs the deployed head (capability prod_db). Five negatives.\n\nex3 (payment idempotency key per attempt, still OPEN) becomes open_defect kb-web-payment-key-per-attempt. It carries a do-not-apply negative: useState in the always-mounted PaymentModal would swallow a legitimate second payment (worse_side_effect). Handles: prose 'double charge after the retry toast'; ident logPayment, PaymentModal and uq_job_payment_client; doc_ref HANDOFF A4 and ship-plan P12a. Check: regex_in_span on src/app/providers/AppContext.jsx, anchored at 'const logPayment = useCallback(' (line 312 today) and PRESENT when crypto.randomUUID() appears inside (line 319). Controls: a31924a PRESENT and a31924a plus a synthetic overlay ABSENT. It runs now. ABSENT does not prove a correct fix, because the wrong naive fix also removes the line. After P12a, `kb anchor --pr` swaps in P12a's Vitest test_id and the entry becomes a defect.\n\nex4 (dispatcher unseeded cursor) becomes kb-dispatch-cursor-replays-history and kb-dispatch-detached-cursor-replay, linked same_incident. Handles: ident run_dispatch_once, DispatchCursor, _MAX_DISPATCH_EVENT_AGE and uq_customer_message_job_kind; ctx FIXFLOW_ENABLE_DISPATCHER=true; doc_ref HANDOFF B1. Five negatives. Check: pytest test_id in backend/tests/test_dispatch_integration.py against a throwaway Postgres. Controls: da988e2 ABSENT and da988e2 plus an Opus mutant that removes the seed and the age guard PRESENT. A guard_presence probe (0046 seeds the cursor; main.py defines the age constant) can only return inconclusive(weak_check_only). K3b.\n\nex5 (blank completion form) becomes kb-completion-prefill-unknown-is-not-new and kb-arrival-wizard-monotonic, linked same_incident. Handles: prose for the three doors and both variants; ident resolvePrefill, sendOrQueue, flushOutbox and removeItem. Five negatives. Check: jest test_id technician-app/src/features/jobs/completionPrefill.test.ts -t 'BLOCKS as unknown when the fetch failed and there is no cache at all'. completionPrefill.ts first appears on main in da988e2 (read today), so fail-to-pass cannot work, and the control uses a mutant: da988e2 plus resolvePrefill returning new (PRESENT) and da988e2 (ABSENT). K3b.\n\nex6 (login lock blocks a correct PIN) becomes do_not_apply kb-login-lock-keeps-blocking-correct-pin. Handles: doc_ref docs/HANDOFF-2026-07-28-open-work.md#A2; prose 'correct PIN gets 429 while locked'; sig http|POST /api/auth/login|429; ident MAX_LOCK_SECONDS, DECAY_AFTER_SECONDS and get_for_update. Three negatives: the A2 prescription (worse_side_effect, with the attack math); decay as a security control (wrong_premise); inverting the tests (wrong_premise). Check (target_mode proposed_change): pytest test_id backend/tests/test_identity_integration.py::test_five_failures_lock_the_account_even_for_the_right_pin against a throwaway Postgres; PRESENT means the protective test fails. Controls: 1c546a3 ABSENT and 1c546a3 plus an A2 mutant PRESENT. An optional ordered_in_span probe checks the lock comes before verify_pin. K3b.\n\nex7 (eas.json empty env) becomes trap kb-eas-empty-env-value. Handles: tmpl 'not allowed to be empty'; ctx 'eas build'; ident EXPO_PUBLIC_SENTRY_DSN and technician-app/eas.json. It is flagged misleading ('CI green proves nothing') and linked do_not_confuse_with ex8. Check: json_predicate on /build/*/env/* == ''. Controls: 140428c PRESENT and 79a8dd4 ABSENT (verified today). Its footprint includes tool_resolution eas-cli, as a remote_resolver. It runs now.\n\nex8 (Sentry plugin breaks Gradle) becomes trap kb-sentry-expo-plugin-gradle and kb-dependabot-expo-native-bump, linked same_incident. Handles: sig eas|gradlew|EAS_BUILD_UNKNOWN_GRADLE_ERROR; ident app.json expo.plugins. The recurrence is recorded as two confirmed events. Check: json_predicate on /expo/plugins matching /sentry/i. Controls: 60c026d PRESENT and 6928828 ABSENT (verified today; the branch-only a6f9048 is not used). The Dependabot entry uses dep_version against the SDK-52 pins plus a guard_presence probe on .github/dependabot.yml. It runs now.\n\nRailway-from-root is a rule with no case record, so it stays a CLAUDE.md rule; at most it becomes an unverified_seed with a ctx handle. Gates runnable now without Docker: ex7, ex8, ex2 (duplicate revision), ex3 (presence). With Docker in K3b: ex1, ex4, ex5, ex6."
 },
 "backup_story": "There are two layers, and neither copies a live file raw. A raw copy can corrupt the backup, and the -wal file must travel with the database [E-01.F11; X-01.F06]. (1) Snapshot: `kb backup` runs VACUUM INTO a temp file, runs PRAGMA integrity_check on it, and renames it to KB_HOME/backups/kb-<date>-<lamport>.sqlite [X-01.F07]. node:sqlite's backup() is the fallback. Retention is the last 7 snapshots plus the first of each month. (2) Journal: the same command exports any missing event files, commits them in the KB_HOME repo, and pushes over SSH to a bare repo the owner controls. That is the VPS from P3b on, never GitHub; before P3b, a bare repo on a USB drive if the owner chooses one (OD10). Backups run at every phase close through the plan hook, and every authored write also exports and commits locally on its own. The owner has no recurring backup task. Restore (`kb restore --from <snapshot>`): copy the snapshot to a new path, run integrity_check, enable WAL, then ingest every journal event newer than the snapshot (INSERT OR IGNORE). Alternatively, `kb rebuild --from-journal` rebuilds from nothing. Both must produce folds identical to the source; the K1 tests check this, and a 4-writer backup-under-load test is already recorded [X-01.F10]. Restore drills are tied to events, not dates: K1, K7, every Node major upgrade, and every host move. Scrubbing happens at write time, so backups inherit scrubbed content; `kb scrub --audit` (or gitleaks, if approved) rescans the journal after any scrubber rule change. Until the VPS exists, all copies sit on one disk, a risk the owner accepts or covers with OD10.",
 "implementation_phases": [
  {
   "id": "K0",
   "title": "Recurrence audit (X-05 Step 0): does the track earn an engine?",
   "entry": "The owner has read the one-page summary and answered OD1 and OD3. No code and no install; can run alongside any ship phase.",
   "scope": "One Sonnet session, read-only on git. For each fix-prefixed commit on main (48 of 369 at the last count [X-05.F20]), record the root-cause class, the tool/runtime, whether it repeats an earlier commit's cause or trap, and the model tier from Co-Authored-By trailers, writing 'unknown' where history is silent (RT-06). Opus refutes 10 sampled classifications and every claimed repeat. Fable judges go or no-go.",
   "done_when": "A 48-row table is committed under docs/program/evidence/knowledge-store/ with the repeat count and the refuter's verdicts. Go if repeats exceed the owner's threshold (default: more than 2). Otherwise the track ends at 'keep prose' and only the R-01a prose corrections ship.",
   "workflow": "Sonnet extracts; Opus refutes by default; Fable judges; the owner reads the verdict.",
   "size": "S",
   "resume": "First empty table row. The draft PR body's first line is 'Plan @ <sha of KNOWLEDGE-STORE-DESIGN-2026-11.md>'."
  },
  {
   "id": "K1",
   "title": "Store core: schema, events, fold, journal, backup and restore",
   "entry": "K0 says go. OD1, OD2 and OD15 are answered.",
   "scope": "Zero-dependency ES modules under tools/kb/ on Node 24 or later. store.mjs: open, the SQLite 3.51.3+ gate, path guards (worktree, OneDrive, WPS Cloud, UNC, WSL), WAL, busy_timeout, synchronous=FULL, a BEGIN IMMEDIATE helper. schema.sql v1. events.mjs: canonical JSON, sha256 ids, INSERT OR IGNORE, lamport, append-only triggers. fold.mjs: fold and rebuild-fold. journal.mjs: export and ingest, temp-then-rename. backup.mjs: VACUUM INTO to temp, integrity_check, rename; restore; rebuild --from-journal. Verbs: doctor, backup, restore, rebuild, export, ingest, raw show. KB_HOME is initialised as a git repo. node:test tests live under tools/kb/test, outside vitest's include globs: 4 processes started from 2 worktree cwds doing 1,000 mixed writes (no lost or duplicated event, integrity ok), idempotent re-insert, the append-only triggers, fold equality after rebuild and after restore, and the version-gate and path-guard refusals. A new .github/workflows/kb.yml runs on Node 24 with a path filter on tools/kb/**, leaving ci.yml untouched.",
   "done_when": "`node --test tools/kb/test` is green on Node 24.22.1 locally and in the kb workflow. A restore drill and a rebuild-from-journal on the dev box give identical folds. `kb doctor` refuses a KB_HOME inside a worktree and one under OneDrive.",
   "workflow": "Sonnet implements from this test list. An Opus reviewer refutes by default (append-only, idempotency, fold determinism, version gate, path guards), and the verdict names the PR head SHA.",
   "size": "M",
   "resume": "Draft PR on branch tools/kb-core; first unticked Scope box."
  },
  {
   "id": "K2",
   "title": "Canonicaliser, scrubber and retrieval",
   "entry": "K1 is merged. OD6 and OD13 are answered or defaulted.",
   "scope": "canon.mjs recipe v1: ordered masks, the path normaliser, and adapters for pytest junit, Jest/Vitest json, alembic, eas/gradle, docker plain and railway. scrub.mjs: exact-value env and .env redaction, the regex set, PK phone, CNIC and email, typed placeholders, and the must-survive group. Derivation of all eight handle kinds; fts_prose, fts_ident and fts_tri with their vocab tables; the exact-handle prefilter; the facet, status and existence filters; coverage, margin and the two thresholds; one-plus-one cards with output caps. Verbs: `kb lookup`, `kb show` (withholding the fix) and `kb eval --loho`. Synthetic fixtures go in the code repo; real-sample fixtures go in KB_HOME/fixtures.",
   "done_when": "Canonicaliser and scrubber fixtures are green, with the customer-name fixture recorded as a known miss. Tests confirm the output caps hold. A leave-one-handle-out run over the eight examples' handles proposes theta values and shows the hard-negative pairs never produce a wrong lead.",
   "workflow": "Sonnet implements; Opus reviews the scrubber and the abstention logic, refuting by default.",
   "size": "M",
   "resume": "Draft PR on branch tools/kb-retrieval; first unticked box."
  },
  {
   "id": "K3a",
   "title": "Gate runner: declarative probes, controls and footprint (no Docker)",
   "entry": "K1 is merged. K3a does not depend on K2.",
   "scope": "runner.mjs: an argv-only git blob reader with path validation; a virtual tree with overlays; json_predicate, regex_in_span, ordered_in_span, duplicate_values, path_state and dep_version; a runner-owned JSON artifact with a nonce; the strength rule; control pairs; tri-state verdicts with reasons. `kb capture`: fix-diff, check inputs, symbol spans, config key paths, dep versions, env probe, and the trace. `kb verify`, including --worktree via git stash create. Fault-injection tests: missing anchor, missing file, bad JSON, a path-traversal attempt.",
   "done_when": "`kb verify --controls` demonstrates these pairs on mainline: ex7 at 140428c PRESENT and 79a8dd4 ABSENT; ex8 at 60c026d PRESENT and 6928828 ABSENT; ex2a at origin/main ABSENT and with the duplicate overlay PRESENT; ex3 at a31924a PRESENT and with the synthetic overlay ABSENT. Every fault injection returns inconclusive.",
   "workflow": "Opus implements, since this is the false-positive defence. A separate Opus reviewer refutes using the fault list.",
   "size": "M",
   "resume": "Draft PR on branch tools/kb-gate-declarative; first unticked box."
  },
  {
   "id": "K3b",
   "title": "Gate runner: test_id checks in Docker",
   "entry": "K3a is merged and OD4 is a yes. The owner starts Docker Desktop and confirms with `docker info`. No backend ship phase holds the Docker gate slot during the session.",
   "scope": "A trusted deps-prep step: network on, no stored input, a volume keyed by the lockfile or requirements hash. A run step: the git archive stream into a tmpfs, --network none or --internal with a per-run postgres:16-alpine named kb-pg-<nonce>, --read-only, cap-drop ALL, no-new-privileges, pids/memory/cpu caps, an allow-list env, HOME=/scratch, TZ=UTC, timeouts. A guard on the DB URL's host. Parsing of junit and Jest/Vitest json, with the present_when match. The flaky policy, the spec-sha approval check, capability checks, and inconclusive(sandbox_unavailable) when Docker is down.",
   "done_when": "Control pairs are demonstrated for ex1 (2fe77f5^ plus the test overlay, and 2fe77f5) and ex5 (da988e2 plus the mutant, and da988e2). The ex6 and ex4 integration checks flip against a per-run Postgres. Fault injections (exit 127, pytest exit 5, a renamed test, a conftest import error, Docker stopped, a DB URL pointing at localhost:5432) all return inconclusive. `docker network inspect` evidence shows no check container had external network access.",
   "workflow": "Opus implements; a separate Opus reviewer refutes; Fable judges the fault-injection evidence.",
   "size": "L",
   "resume": "Draft PR on branch tools/kb-gate-docker; first unticked box. Image digests are recorded in the PR body."
  },
  {
   "id": "K4",
   "title": "Seed the eight worked examples, the skill and the prose corrections",
   "entry": "K2 and K3a are merged. Entries with a test_id check need K3b; without it they are recorded provisional with unapproved specs.",
   "scope": "Sonnet drafts about 15 entry JSONs from R-02 and git, following the fit table. Each one goes through `kb record`, `kb capture` and `kb verify --controls`. Opus confirms or rejects each entry and approves the test_id specs (author and approver differ). The phase also adds .claude/skills/kb/SKILL.md, and opens a docs PR that fixes the four R-01a contradictions with entry ids as links.",
   "done_when": "Every entry is either verified or unverified_seed with a stated reason, and `kb stats` lists them. The skill is listed and the docs PR is merged.",
   "workflow": "Sonnet drafts; Opus confirms by refuting; Fable judges disputes.",
   "size": "M",
   "resume": "Draft PR on branch tools/kb-seed, with one checklist box per entry id."
  },
  {
   "id": "K5",
   "title": "Pilot: blind replay against grep (X-05 Step 1)",
   "entry": "K4 is done. OD8 is answered or defaulted.",
   "scope": "An Opus session that did not seed the entries writes at least 20 blind positive queries from raw symptoms. It also writes at least 40 labelled hard-negative and stale probes: ex7/ex8 swaps, the CommandError family, a fixed tree overlaid onto a pre-fix one, out-of-corpus failures. Haiku and Sonnet agents run lookup and verify as the cheap consumer, and a grep arm runs the same queries over CLAUDE.md and docs/. The report gives P@1, recall at shown, acted false positives (gate-passed-but-wrong separately from gate-refuted), rule-of-three bounds, and cost per lookup with NULL for unknown.",
   "done_when": "The report is committed and the owner's go or kill is recorded. Default go: recall of 60% or more at shown, 0 acted false positives in 40+ probes, and a win over grep at equal precision.",
   "workflow": "Opus authors and labels; Haiku and Sonnet consume; Fable judges; the owner decides.",
   "size": "M",
   "resume": "The probe table; first unrun row."
  },
  {
   "id": "K6",
   "title": "Workflow on: plan hook, prospective log, CLAUDE.md trim",
   "entry": "K5 says go. OD9 and OD12 are answered.",
   "scope": "A plan PR adds the §0 hook sentences exactly as proposed, and puts kb anchor and kb backup into the phase-close routine. The prospective lookup log (X-05 Step 2) starts, with its checkpoint at 20 encounters or 8 weeks recorded in OWNER-VIEW. A CLAUDE.md PR moves the case narratives of verified entries out, keeping the rules.",
   "done_when": "Both PRs are merged, the first real encounter is logged, and CLAUDE.md's line counts before and after are recorded.",
   "workflow": "Sonnet edits the docs; Opus reviews; Fable judges.",
   "size": "S",
   "resume": "Draft PR on branch docs/kb-hook; first unticked box."
  },
  {
   "id": "K7",
   "title": "Second host: journal-authoritative sync",
   "entry": "A second host's agents need to write, which is not before P3b. OD10 is answered.",
   "scope": "A bare repo on the host over SSH; Node 24 on the host; `kb sync`; conflict folding; a two-host concurrent-write test; restore on Linux from the journal and from a snapshot.",
   "done_when": "Both hosts write concurrently, sync both ways and fold identically. The Linux restore drill passes, and `kb doctor` is green on both hosts.",
   "workflow": "Sonnet implements; an Opus reviewer refutes.",
   "size": "M",
   "resume": "Draft PR on branch tools/kb-sync. The host steps are a table; first unticked row."
  },
  {
   "id": "K8",
   "title": "Optional: causal footprint via coverage, and a thin MCP wrapper",
   "entry": "The Step-2 log shows footprint under-capture or CLI misuse. OD11 is answered.",
   "scope": "NODE_V8_COVERAGE or Jest coverage for executed-tier items, and coverage.py inside the backend check image. A zero-dependency stdio MCP wrapper exposing only the read and mechanical verbs.",
   "done_when": "Executed-tier items appear on the ex1 and ex5 entries. MCP kb_lookup answers within the output caps.",
   "workflow": "Sonnet implements; an Opus reviewer refutes.",
   "size": "M",
   "resume": "Draft PR checklist; first unticked box."
  }
 ],
 "owner_decisions": [
  {
   "decision": "OD1: acknowledge the store as a new state owner (KS-R7; HR ruled one owner per kind of state)",
   "default": "Acknowledged, limited to diagnoses, traps and negative results with their validity. It links to the plan, PR bodies, git and the register and never restates them.",
   "blocks": "K1"
  },
  {
   "decision": "OD2: store home location",
   "default": "C:/Users/User/.fixflow-kb: outside every worktree and outside OneDrive, WPS Cloud and any network path",
   "blocks": "K1"
  },
  {
   "decision": "OD3: run the recurrence audit first, and set its stop rule",
   "default": "Yes; stop at 2 or fewer repeats in 48 fix commits (X-05, inferred)",
   "blocks": "K1"
  },
  {
   "decision": "OD4: pull Docker images for the gate (python:3.12-slim and node:24-bookworm-slim, pinned by digest; postgres:16-alpine is already used) and build dependency volumes",
   "default": "Yes, but only when K3b starts",
   "blocks": "K3b"
  },
  {
   "decision": "OD5: isolation for web and mobile Jest/Vitest test_id checks",
   "default": "A container, like every other executable check; no native runs",
   "blocks": "Nothing (K3b scope only)"
  },
  {
   "decision": "OD6: scope of the egress rule toward the model provider, and the account type",
   "default": "Assume a consumer account, 30-day retention, training off. Cards carry only scrubbed templates and repo-relative paths, never production data",
   "blocks": "K2"
  },
  {
   "decision": "OD7: install gitleaks as a fail-closed second scrubbing pass",
   "default": "Off; the built-in rescan only",
   "blocks": "Nothing"
  },
  {
   "decision": "OD8: retrieval thresholds and pilot criteria",
   "default": "theta_lead 0.5, theta_cand 0.3, margin 0.2; the X-05 Step 1 and Step 2 criteria",
   "blocks": "K5"
  },
  {
   "decision": "OD9: apply the plan hook sentences to SHIP-PLAN §0",
   "default": "Only after K5 says go",
   "blocks": "K6"
  },
  {
   "decision": "OD10: Node 24 and a bare journal repo on the VPS over SSH; an optional offsite bare repo on a USB drive before P3b",
   "default": "Wait for P3b; accept single-disk copies until then",
   "blocks": "K7"
  },
  {
   "decision": "OD11: coverage dev-dependencies and hook-based capture of what agents read",
   "default": "No (the HR skip rulings stand); footprint = fix diff, check inputs, symbol spans, config keys, deps and env",
   "blocks": "K8"
  },
  {
   "decision": "OD12: shorten CLAUDE.md by moving case narratives into the store",
   "default": "After K5 says go, one verified entry at a time; rules stay",
   "blocks": "Part of K6"
  },
  {
   "decision": "OD13: where real-sample fixtures from FixFlow's own failures live",
   "default": "In KB_HOME, owner-controlled; the code repo on GitHub gets synthetic fixtures only",
   "blocks": "K2"
  },
  {
   "decision": "OD14: the embedding trigger values",
   "default": "Deferred (E-07's numbers are inferred)",
   "blocks": "Nothing"
  },
  {
   "decision": "OD15: a separate CI workflow on Node 24 for tools/kb",
   "default": "Yes, path-filtered, leaving ci.yml untouched",
   "blocks": "K1 done-when"
  },
  {
   "decision": "OD16: a permissions.deny on authored kb verbs for cheap-agent definitions (persistent configuration)",
   "default": "No; rely on two-actor confirmation and PR review",
   "blocks": "Nothing"
  }
 ],
 "limits": [
  "Retrieval is lexical only. A symptom phrased with no word in common with any handle is a miss. Silent failures (ex3, ex5) are found only if the solver wrote paraphrase handles.",
  "Remote resolvers and native builds (the EAS cloud schema, Gradle on EAS, Railway/Railpack, the Meta API) cannot be reproduced locally. Their checks verify the local config state and label the remote behaviour 'as of the recorded tool version'.",
  "Executable gates need Docker, which does not start on its own. While Docker is off, every code-defect lookup is inconclusive (a miss) and only config traps can be verified.",
  "WAL works on a single host only. The file cannot be shared over a network or between Windows and WSL. Stage 1 sync is eventually consistent, and conflict states wait for Opus.",
  "Actor identity is self-declared. KS-R3 rests on two-actor confirmation and PR review, not on authentication.",
  "The scrubber cannot detect customer names or addresses; a structural rule forbids storing production-data output instead. Provider egress of whatever the CLI prints cannot be avoided.",
  "Without coverage (deferred to K8) footprints are approximate. Symbol spans are found by regex anchors, not an AST, so they over-invalidate: safe, but it costs re-verification.",
  "Measurements are small-sample. Zero false positives in 40 probes only bounds the rate at 7.5%; 60 probes bound it at 5%.",
  "A check is only as discriminating as its present_when template and its control pair. Entries without a reconstructible pair stay unverified_seed and give hints, not verdicts.",
  "Production database state (e.g. job_event kinds) is not in git. Entries whose root cause is data state cannot be verified against current production.",
  "node:sqlite is a release candidate, and a Node upgrade can change its API.",
  "The store holds only what solvers choose to record. If hard problems rarely recur, it saves nothing; K0 tests this first."
 ],
 "load_bearing_claims": [
  {
   "id": "C1",
   "claim": "One SQLite file in WAL mode (busy_timeout, every write in BEGIN IMMEDIATE, content-hash ids with INSERT OR IGNORE), held outside every worktree, serves all parallel sessions, subagents and worktrees on the dev box. It loses no event, duplicates no event and suffers no corruption at this workload.",
   "falsifiable_by": "The K1 test: 4 or more processes, started from 2 or more worktree cwds, doing 1,000+ mixed writes. Any SQLITE_BUSY after the timeout, any integrity_check failure, or any count mismatch between DB events and journal files falsifies it.",
   "rests_on": "E-01.F09,F10; X-01.F10; T-06.F1,F4-F6. Cross-worktree-directory access to one path is inferred (E-01.F12), not yet tested."
  },
  {
   "id": "C2",
   "claim": "Declarative probes, interpreted by the runner over git blobs, discriminate config-state traps on mainline commits with no sandbox, no Docker and no install. This is already shown for ex7 (140428c PRESENT, 79a8dd4 ABSENT) and ex8 (60c026d PRESENT, 6928828 ABSENT).",
   "falsifiable_by": "Any K3a control pair for ex7, ex8, ex2a or ex3 that fails to flip; or a config trap in seeding that needs code execution to discriminate.",
   "rests_on": "R-02 ex7 and ex8 static checks, re-run by me on 2026-11-02 against mainline shas; X-02.F23; X-03 config key paths."
  },
  {
   "id": "C3",
   "claim": "A check can never yield applies vacuously or from a crash, because the verdict comes from a runner-owned artifact naming the executed test id with a matching failure template, and from a control pair that must flip.",
   "falsifiable_by": "A fault-injection test in K3a or K3b that yields applies. The injected faults are: exit 127, pytest exit 5, a renamed or deleted test, a conftest import error, Docker stopped, a missing anchor, malformed JSON.",
   "rests_on": "X-02.F01,F12,F28,F29; M-03.F01,F07. The mutant-overlay control is borrowed from mutation testing, which is not in the register."
  },
  {
   "id": "C4",
   "claim": "Score-free abstention (exact handles, IDF coverage with unknown terms at maximum IDF, a margin) showing at most one lead and one candidate keeps acted false positives at 0 across 40+ hard-negative and stale probes, while recall at shown stays at 60% or more.",
   "falsifiable_by": "The K5 pilot numbers, or any acted false positive in the Step-2 prospective log.",
   "rests_on": "T-03.F02,F05,F18,F20,F26; KS-R4. The 'unknown terms at max IDF' rule is my modification; the threshold values are owner parameters (KS-R10)."
  },
  {
   "id": "C5",
   "claim": "The journal (one immutable canonical-JSON file per event, named by content hash) merges between hosts and branches as pure adds, and rebuilding from it gives a fold identical to the source database.",
   "falsifiable_by": "A git merge conflict between two hosts' journals in K7, or a fold-equality failure after rebuild or restore in K1 or K7.",
   "rests_on": "X-01.F20,F21,F24; T-02.F01; KS-R1, KS-R8. JCS-style canonical JSON (RFC 8785) is not in the register."
  },
  {
   "id": "C6",
   "claim": "Under-capturing the footprint cannot by itself cause an acted false positive. The gate always runs the check on the caller's target before action; the footprint only decides whether controls are re-demonstrated and how staleness is labelled.",
   "falsifiable_by": "A K5 stale probe in which an entry with a clean trace passes the gate on a tree where its root cause is absent.",
   "rests_on": "X-03 (over-capture costs a re-verify, under-capture risks a false positive), countered by always gating; T-01.F02; X-02.F29."
  },
  {
   "id": "C7",
   "claim": "Being pull-only, the store costs a phase about 0 when nothing hard happens, and at most about 5k tokens plus about 25 minutes when a lookup or record occurs. injected_tokens stays 0.",
   "falsifiable_by": "The Step-2 prospective log: median per-phase overhead above those figures, or any token injected without a lookup.",
   "rests_on": "X-05.F12; E-10.F18; M-02 (repository context files raise cost by more than 20%). The figures are inferred owner parameters (KS-R10)."
  },
  {
   "id": "C8",
   "claim": "The schema holds all eight worked examples (about 15 entries after splitting) with no free-form overflow field. Each gets typed handles, negative results, a footprint and an allow-listed check kind.",
   "falsifiable_by": "In K4 an example needs a field, handle kind or check kind the schema lacks, or a free-text dump to carry its diagnosis.",
   "rests_on": "R-02 (the eight examples); T-05.F3,F15; T-04.F15; KS-R9."
  },
  {
   "id": "C9",
   "claim": "Hard defects and traps recur often enough in this repository that a lookup store saves escalations. This is unproven, and the design rests on it.",
   "falsifiable_by": "The K0 audit finds 2 or fewer repeats in 48 fix commits, or the K5 store does not beat grep over the existing prose.",
   "rests_on": "X-05.F20,F21 (369 commits, 48 fix-prefixed, almost no explicit repeats); R-02 ex8 (hit twice in 16 days)."
  },
  {
   "id": "C10",
   "claim": "VACUUM INTO or backup() snapshots, plus the journal pushed over SSH, restore the whole store on Windows and on Linux with identical folds; no raw file copy is needed.",
   "falsifiable_by": "A restore or rebuild drill in K1 or K7 whose fold differs from the source, or a snapshot that fails integrity_check.",
   "rests_on": "X-01.F06,F07,F10; E-01.F11. Restore on Linux is untested so far."
  }
 ],
 "risks": [
  "Hard problems recur too rarely, so the track costs more than it saves. Mitigated by the K0 audit before any engine work and the K5 and Step-2 kill rules.",
  "Experience-following: a cheap agent copies a near-match's fix [M-02.28]. Mitigated by withholding the fix until the gate says applies, labelling dead ends as unverified leads, and showing at most one lead and one candidate.",
  "Poisoned or wrong entries [M-01.F26; X-02.F21]. Mitigated by treating entries as untrusted until gated, declarative kinds that execute nothing, executable specs approved by sha with approver and author differing, and scrubbing on return.",
  "A gate run wipes a real database (conftest TRUNCATEs any URL it is given). Mitigated by the DB-URL host guard, --network none, a per-run Postgres container, and failing closed.",
  "A false 'applies' from a guard_presence check, or from a remote-resolver trap whose remote behaviour has changed (e.g. EAS starts accepting empty strings). Mitigated by the strength rule, tool_resolution footprint items, and 'as of version X' labels.",
  "node:sqlite API drift, or a Node change that drops below SQLite 3.51.3. Mitigated by the version gate, the reserve driver, and re-running the K1 tests on every Node upgrade.",
  "KB_HOME ends up in a sync folder, or someone copies the live file. Mitigated by doctor path guards and VACUUM INTO/backup() as the only copy paths.",
  "Until the VPS exists, every copy sits on one disk. The owner accepts this, or covers it with the OD10 USB option.",
  "The store and the prose drift into two projections (KS-R7; C-01). Mitigated by links instead of restatements, prose corrections shipped with seeding, and trimming CLAUDE.md only after verification.",
  "Opus review load grows, and recording gets skipped under time pressure. Recording is never a Done-when; skipped cases can be seeded later from the PR's 'ruled out' journal.",
  "Overhead creep for a one-person team. Mitigated by having no daily or scheduled tasks, tying backup to phase close, and giving the owner decisions only.",
  "Thresholds calibrated on about 15 entries overfit. They are recalibrated at the Step-2 checkpoint, and misses are preferred.",
  "Docker contention with ship-phase Docker gates. kb-prefixed container names, and K3b runs only when no backend ship phase holds the slot."
 ]
}
```
