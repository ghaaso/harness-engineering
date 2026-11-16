# Layer 2, Storage: specification (version 2 draft)

**Whole design borrowed.** An append-only, content-addressed, multi-version store with a commit protocol, constraints checked at commit and materialized views with lineage (D2 whole design). It is driven as a hashed build with traces (D7-04, D7-05), with truth maintenance over its claims (D7-02), between pipes and filters over immutable artefacts (D8 whole design). Git is not the engine. It only carries field folders between worktrees.

**Four mechanisms.** Every object is immutable and named by its hash. Truth is a separate relation that only the check script writes. Every page a person reads is a view built by a script. Every step declares its inputs, and its reads are audited.

## Rules

Each rule is marked [pilot] or [later].

**S1 One writer per file** [pilot] (D2-05, D8-08)
- **Writers.** The child's session writes only `staging/`. `commit.mjs` writes `objects/`, `journal.jsonl` and `refs/`. The check script (Integrity layer) writes `status/`. View scripts write `views/`.
- **Runners.** A pre-write hook refuses a session write outside `staging/`. That this hook works is believed, not yet verified: the pilot verifies it. `merge.mjs` refuses a branch whose diff touches paths outside its field. `fsck.mjs` refuses any object or status line that has no journal line from its writer.
- **On failure.** The merge is refused, the paths are listed and the coordinator is woken.

**S2 Commit protocol** [pilot] (D2-03, D7-05a, D1-03)
- **What it does.** An output exists only once it is committed. The steps are: validate against its schema (reject, never repair; D8-05), write a temp file, rename it to `objects/<id>.json` by exclusive create, then append a journal line.
- **Runner.** `commit.mjs`, which the watcher runs over `staging/` on every tick.
- **Recovery.** A torn last journal line is copied to `journal.jsonl.corrupt` and dropped. A file with no journal line is not done.
- **On failure.** The item moves to `staging/rejected/` with a reason code. The child reads only the codes.

**S3 Harvest, never retype** [pilot] (D2-08, D8-01)
- **What it does.** `harvest.mjs` copies each reader's schema-checked result into `staging/`. It reads it from the transcript: the helper's own, or the tool result in the child's. The child never copies card fields.
- **On failure.** If neither transcript holds the result in a form a script can parse, the child writes the card and it is tagged `copied_by_session`. The pilot counts these cases.

**S4 Identity** [pilot] (D2 missing risk 6, D8-02)
- An object's id is a prefix of the sha256 of its canonical form. There is no edit in place: a change is a new object.
- Question ids and approach ids are issued once by the coordinator and never reused.
- `commit.mjs` refuses an id prefix that collides with a different full hash.

**S5 Correction and retraction** [pilot] (D7-02, D2-07, D7 do-not)
- **Correction.** A correction is a new card with `supersedes` and a reason code. The old card counts as superseded once the new card is confirmed.
- **Retraction.** Only the check script writes `retracted`.
- **Nothing is deleted.** A fallen card stays readable with its label, so later evidence can restore it.
- **Citations are never re-pointed by a script.** A sentence that cites a fallen card goes stale (S9), because it may not hold for the new numbers.

**S6 Packs as frozen snapshots** [pilot] (D2 whole design (3), D2-02)
- **Content.** A pack is a manifest object: the hash of the question list, the sorted card ids, the conclusion sentences, and the parent pack hash.
- **Hash.** The card ids are content hashes, so the pack hash is a hash tree (Merkle, as the D8 source check corrected). Status is left out of the hash: the content has versions, and truth is a current view over it.
- **Repair.** A repair writes a new pack with a parent link. `refs/pack` is moved by an atomic rename.
- **Overflow.** The pack becomes a two-level index (a bounded summary per mechanism, plus card ids). No confirmed card is cut. A reviewer reads more cards by id (D2-02b).

**S7 Citations as foreign keys, checked at commit** [pilot] (D2-07, D2-08, D7-08, D4-10, D8-06)
- **Form.** Each sentence-bearing object (pack conclusions, a review, synthesis claims) names one `pack_hash`. Each sentence is `{sid, approach_id, measure, kind: fact|judgment, text, cites[], applies_to{}}`.
- **Constraints, checked by `commit.mjs`:**
  - (a) The schema is valid and its version is known.
  - (b) A fact sentence has at least one cite.
  - (c) Every cite resolves to a card in the named pack.
  - (d) Each `applies_to` key lies within the cited card's typed conditions. A condition the card has but the sentence leaves out is flagged as a dropped condition.
  - (e) Every number in `text` equals a value or a baseline of a cited card, at the precision printed.
- **On failure.** If (a), (b) or (c) fails, the object is rejected. If (d) or (e) fails, it is committed, the sentence is flagged and sent to the checker queue, and the gate refuses while the flag is open.

**What replaces "a card's conditions are copied field by field":** normalisation (D2-08).
- Conditions are stored once, in the card.
- No model ever copies them.
- Every page shows them through a join by `render.mjs`.
- A sentence carries only its declared scope, and the scope is checked against the card by (d).

**S8 Status relations** [pilot] (D7-01, D2-09)
- `status/card_status.jsonl` and `status/witness.jsonl` are append-only, and only the check script writes them.
- A card's current status is a fold over its lines.
- A witness pins `(card id, snapshot text sha256, quote offset)`, so that every later check reads the version that was checked.

**S9 Staleness propagates** [pilot] (D7-02, D2-07, D7-05, D2 missing risks 3 and 5)
- **Runner and timing.** `tms.mjs` labels every node, from the premises upward. It runs after every check run and every status change, and before every freeze, gate and render.
- **Card labels:** CONFIRMED, PENDING (not yet checked), UNVERIFIED, RETRACTED, SUPERSEDED.
- **Labels for sentences, verdicts and synthesis claims.** A node's cites form one conjunctive justification. The labels, from strongest:
  - STALE: a support fell, or a recorded input hash changed.
  - JUDGMENT: the kind is judgment, or a support is UNVERIFIED, or the support ends only in our own files or in a cycle (not well-founded).
  - PENDING.
  - IN.
- **Certificates.** A certificate stores the hash of its read set: the subject, the pack, and the `(card, status seq)` pairs it evaluated. It is void once the recomputed hash differs, which closes the phantom.
- **Output.** `views/labels.json`, and `views/repair.json`, which lists the nodes and the cards that caused them.
- **On failure.** The gate refuses any target with a STALE or PENDING node. JUDGMENT nodes pass, labelled as judgment.

**S10 Derived views** [pilot] (D2-08, D1-10, D7-05b, D2 missing risk 2)
- **Where and how.** Everything under `views/` is built by script, may be deleted, and is never edited.
- **The views:**
  - labels
  - `pack.md` and `review.md`
  - the synthesis table (approach by measure, with labels and with conditions by join)
  - the owner's page
  - `status.json` (the trace table: done, stale, missing, tainted)
  - `coverage.json` (approved question ids covered by CONFIRMED cards, over the union of all fields; this catches write skew)
- **Early cutoff.** Script steps are deterministic, so a view whose input hashes are unchanged is not rebuilt.

**S11 Declared inputs** [pilot] (D7-04, D7-05)
- **Manifest.** Each step has a manifest object: kind, brief hash, schema hash, model tier, tool profile, `inputs[(name, sha256)]`, expected outputs. The step key is the sha256 of the manifest.
- **Completion record.** The journal line that commits a step's outputs is its completion record. It carries the step key and the output hashes.
- **Discovered inputs.** The addresses a reader fetched cannot be declared in advance. They are recorded from its transcript as discovered inputs (Shake).

**S12 Reuse** [pilot] (D7-05, D7 do-not)
- **Runner.** `status.mjs`, before any step starts.
- **Reuse** a result when three things hold: a completion record with the same key exists, its outputs are present with matching hashes, and no output node is STALE.
- **Same key, some nodes STALE.** A repair step rewrites only those nodes, from the parent object and `repair.json`.
- **Never** rerun a model step whole, and never rerun one to verify it.
- **No completion record.** The step is redone from its inputs.

**S13 Read audit** [pilot] (D7-04, D5-07)
- **Runner.** `audit.mjs`, after each step and before it is accepted, over the transcripts of the session and its helpers.
- **Rule.** The undeclared reads are the reads, minus the declared inputs, minus the step's own outputs, minus the read-only trusted paths. If any remain, the output is tainted: it is not accepted, it is rerun once in a clean worktree, and then the field is failed with the paths named.
- **Auto-loaded files** never appear as tool calls. So the audit also compares the first call's context tokens with the lean baseline the pilot measures.

**S14 Source snapshots** [pilot, on the owner's word F5] (D2-09, D8-02, D5-04, D7 missing risk 6)
- **Runner and timing.** `snap.mjs`, called by `commit.mjs` at card commit.
- **What it does.** It fetches the address with plain Node fetch (no rendering). It stores the raw bytes and the extracted text under their sha256 in `.snapshots/`, outside git. The store is shared and only grows, by exclusive create: equal bytes get an equal name, so two writers are harmless (D1-11).
- **Checks read only the snapshot.** A later refetch with a different hash is recorded as `source_changed`, never as a mismatch.
- **No snapshot** (blocked, paywalled, or a PDF that cannot be extracted): the card is UNVERIFIED. Until F5 is given, a card checked through the fetch tool is at most `confirmed_by_summary`, which counts as JUDGMENT.

**S15 Fencing and ordering** [pilot] (D2 missing risks 7 and 8, D2-05)
- Every write script refuses an epoch lower than the one in `control/epoch` (exit 3).
- Journal lines carry `(writer, seq, prev_sha256)`. A merge orders them by those fields and never compares clocks.

**S16 Store check at restart and merge** [pilot] (D5-12, D2-03)
- **What it checks.** `fsck.mjs` recomputes every object's hash, the journal's hash chain, the foreign-key closure, and where each status line came from.
- **When.** Before any fresh session starts from a store, and at every merge.
- **On failure.** No restart and no merge. The coordinator is woken with the failing ids.

**S17 Cross-field reuse** [later] (D2-06, D8-08, D1-11, D7-05d)
- **What it does.** Between waves, `index.mjs` builds a read-only index from canonical source id to cards and snapshot. A child looks a source up before sending a reader; a hit becomes a declared input. A second card on the same key is kept as a second reading. If its number, baseline or conditions differ from the first, both go to the checker.
- **Why later.** It is built only if the measured overlap rate times reader tokens times the remaining fields exceeds its cost.

## Where the classical assumptions fail, and what is done

- **Writers commit confident falsehoods.** Constraints check references and scope, never truth. Truth stays a relation that only the checker writes (S8).
- **Lineage is only what is declared.** A sentence can rest on uncited reading. The pilot measures that share (u, D8-07). A same-window review has undeclared inputs, so it is labelled JUDGMENT (S13, S9).
- **Steps are not deterministic.** So values are logged, reuse is by key, and nothing is verified by a rerun. Early cutoff applies only to script steps.
- **Reads cannot be sandboxed.** So they are audited after the fact (S13).
- **The web keeps no versions.** So we keep them ourselves (S14).
- **The nodes are prose.** So a claim is matched across fields by `(approach_id, measure)` keys, not by its text.

## File formats

- **General.** UTF-8 JSON. Canonical form: sorted keys, NFC, no whitespace. Every file carries `schema_version`.
- **Card.** `{schema_version, kind:"card", field, question_ids[], source:{url, canonical_id, primary_id, date, evidence_type}, measured:{measure, value, unit, baseline, baseline_kind, direction}, conditions:{task[], model_family[], repo_size, language[], metric, other(≤40 words, counted)}, quote(≤15 words), measures[], approach_ids[], search_route, supersedes, supersede_reason, provenance:{step_key, fetched[]}}`. The id is `c_` plus 16 hex characters.
- **Pack.** `{kind:"pack", field, questions_sha, cards[], conclusions[sentences], index[{mechanism, summary, cards[]}], parent}`. The id is `p_` plus 16 hex characters.
- **Review and synthesis.** `{kind, field, pack_hash, step_key, parent, sentences[], verdicts[{approach_id, verdict, supports[sid]}], dismissals[{sid, out_list[(approach_id, measure, direction)]}]}`.
- **Certificate.** `{kind:"certificate", subject, pack_hash, read_set_sha, results}`.
- **Manifest.** `{kind:"step", step_kind, brief_sha, schema_sha, tier, tools, inputs[[name, sha]], outputs[]}`.
- **Journal line.** `{writer, seq, prev, epoch, op: commit|ref|taint, id, sha256, step_key, outputs[]}`.
- **Status line.** `{seq, card_id, status, reason, witness, run_id}`.
- **Witness line.** `{card_id, snap_text_sha, raw_sha, offset, found, number_bound}`.
- **Snapshot meta.** `{url, retrieved_at, http_status, content_type, raw_sha, text_sha, extractor}`.

**Layout.**
- `research/2026-11-harness-leads/plan/objects/`: question list, approach list, vocabularies; frozen and hashed.
- `fields/<n>-<name>/`: `staging/`, `objects/`, `journal.jsonl`, `status/`, `refs/` and `views/`.
- `views/`: programme-wide status and coverage.
- `control/epoch`.
- `.snapshots/{raw,text,meta}/`: outside git.
