# Operational corpus-map method (experimental successor)

**Status:** an experimental, operational successor to the proposed design in [`04-design/design.md`](../04-design/design.md). It is not an adoption of that design or of E1. The frozen design, E1 and the historical evaluators are unchanged.

- **Where the rules come from.** Every rule here is the design's rule unless a delta below (D-…) changes it. Each delta states the exact change and its reason.
- **What this file owns.** This file owns the method. It does not own task state, which is in `../SESSION_STATE.md`, and it does not own results, which are in `results/`.

## 1. What the method is for

A coding agent working on one part of the plan needs:

- what that part depends on;
- what it is derived from;
- the reasoning steps in between;
- the exact source lines;
- what is unresolved or missing.

The agent needs this without loading the whole corpus, and without trusting a prose summary. The method keeps a persisted map of the plan as it is written, and serves bounded, paged, evidence-carrying context packets from that map.

## 2. Stores, statuses and levels

| Store | Files in a store directory | Contains | Who writes it |
| --- | --- | --- | --- |
| Committed map | `s1.jsonl`, `s2.jsonl`, `s3.jsonl`, `s4.jsonl`, `manifest.json` | S1: attested edges, introductions, identity statements, relation definitions, ID-scheme statements, claims and untyped cues, each with its exact span and file version. S2: vocabulary decisions. S3: identity decisions. S4: gap annotations (none in the pilot). | `ingest`/`init` (S1), `decide` (S2/S3) |
| Candidate index | `candidates.jsonl` | S5: similarity, possible coreference and alias proposals, each with method, score and disposition. Pairwise, never clustered. | `resolve` only |
| Coverage ledger | `chunks.jsonl`, `ledger.json`, `ledger_events.jsonl`, `rejects.jsonl` | Per file version: read and unread chunk ranges, records linked, untyped cues, inert labels, dangling endpoints by subtype, external targets, open candidates, corpus trail, and every operation with its actor | `init`/`ingest`/`resolve`/`refresh` |

**The design's five partitions (PK-1), accounted explicitly:**

- B (S1–S3) is the committed map.
- A (S4) is `s4.jsonl` inside the committed map, read by no walking or gap operation.
- C (S5) is the candidate index.
- L is the coverage ledger.
- R (S6 results) is **not stored as facts**. Packets, chains, gaps and counts are recomputed from base records on every call (DR-1). `ledger.json` holds counts as ledger content, and nothing reads it as base facts.

**How the separation is enforced in code, not only by packaging:**

- Only `init` (structural) and `ingest` write S1, from a chunk's line range.
- Only `decide` writes S2 and S3.
- `resolve` writes only C and L.
- `context`, `chain`, `gaps`, `show` and `find` write nothing.
- No level reads `candidates.jsonl`. A test deletes it and checks that packets and gaps are byte-identical (`test_levels_never_read_candidate_index`). Its only readers are `find`, `worklist` (to propose S3 work) and the labelled `--candidates` section of a packet, which is marked "not evidence".

**Levels are unchanged:**

- L1 = S1.
- L2 = S1 + S2 at the current codebook.
- L3 = L2 + S3, with every S3 use shown as an analyst hop and its decision id.

Statuses never change after creation. Repetition never promotes a record.

## 3. Build procedure (incremental, bounded)

```bash
PY=python   # use: C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe -I -B
$PY tools/cmap.py init --store store/S1 --corpus corpus           # register, chunk, structural pass
$PY tools/cmap.py chunks --store store/S1 --pending                # the reading worklist
# one reader per chunk (fresh agent; sees READER.md + its own chunk only):
$PY tools/cmap.py chunk-show --store store/S1 <CHUNK>              # the reader's bounded view
$PY tools/cmap.py validate --store store/S1 --chunk <CHUNK> --file store/S1/incoming/<CHUNK>.jsonl
# afterwards, sequentially (only this step writes S1):
$PY tools/cmap.py ingest --store store/S1 --chunk <CHUNK> --file store/S1/incoming/<CHUNK>.jsonl --reader <id>
$PY tools/cmap.py resolve --store store/S1                         # candidate index + coverage ledger
$PY tools/cmap.py worklist s3 --store store/S1 --out s3-work.jsonl # identity work (ANALYST.md)
$PY tools/cmap.py decide s3 --store store/S1 --file s3-decisions.jsonl --analyst <id>
$PY tools/cmap.py worklist s2 --store store/S1 --out s2-work.jsonl --min 3
$PY tools/cmap.py decide s2 --store store/S1 --file s2-decisions.jsonl --analyst <id>
$PY tools/cmap.py resolve --store store/S1
```

- **Resumption.** A fresh agent continues from `chunks --pending` and `status`. Nothing depends on conversation memory. A chunk is `unread` until ingested. An unread chunk makes every file it belongs to "partly read", and makes dangling-endpoint gaps provisional (GM-7). Reading an oversized file is just more chunks.
- **What reading does not prove.** Reading a chunk is not proof of complete extraction. Record counts, rejects and untyped cues are kept per chunk.

## 4. Query procedure (what a fresh agent does)

See `QUICKSTART.md`. In short:

1. `status`: freshness check.
2. `find`: labelled S5 suggestions for where to start.
3. `context <start> --budget N`: paged evidence packet with gaps, frontier and coverage.
4. `show path:lines`: exact source lines.
5. `chain`: derived chains over walkable kinds at L2 or L3.
6. `gaps` and `coverage`.

## 5. Refresh procedure (source changes)

```bash
$PY tools/cmap.py status  --store store/S1 --corpus <corpus on disk>   # CHANGED files are reported
$PY tools/cmap.py refresh --store store/S1 --corpus <corpus on disk>   # preserve, remap, supersede, flag
$PY tools/cmap.py chunks  --store store/S1 --pending                   # only new chunk texts need readers
# readers + ingest as in section 3; analysts re-decide flagged S3 decisions; then resolve
```

**What refresh does:**

- **Unchanged chunks.** Chunks are identified by a hash of their text. A changed file is re-chunked. Records of chunks whose text is unchanged are kept with their ids, and their line spans are remapped if the chunk moved.
- **Changed chunks.** Records of changed or removed chunks are superseded. They are kept in the file and excluded from every answer.
- **Structural records** of the changed file are regenerated.
- **Analyst decisions.** S3 decisions whose members or spans in view were superseded are flagged `needs_review` and are not applied until an analyst re-decides them.
- **Derived results** are never cached as facts, so nothing stale survives.
- **Before refresh.** Every query checks file hashes. Records from a changed file are listed as STALE, never presented as evidence and never expanded.

## 6. Deltas from the proposed design (experimental, not adopted)

| ID | Exact change | Design element affected | Reason |
| --- | --- | --- | --- |
| D-CHUNK | Readers read one **chunk**, not one whole file. A chunk is a heading section, or a merged run of small sections, of at most 6,000 characters. Large sections split at blank lines or table-row boundaries, and continuations carry the table header and heading path as read-only context. Read ranges are recorded per chunk. | RP-1 (whole-file reader), CL-2 | Bounded context and incremental construction; oversized files become several chunks. |
| D-STRUCT | A deterministic structural pass records headings, mermaid node declarations and arrows, and table row keys. Bare links that no reader record covers get an automatic `(link)` edge. These are S1 records with the automated actor. | RP-2, RP-3 (who records), CL-7 | Determinism; readers' context is spent on prose relations. |
| D-E1 | Rows of tables with an exact `ID` header introduce their key (frozen E1 rule), applied experimentally. | RP-2 | Row keys are the plan's own identifiers. E1 stays **unadopted** for the design. |
| D-IDLED | A heading or a first-column key cell that begins with an ID token gets that token as an alias. A key cell counts only under a header whose first cell contains the word ID, for example `ID / timing`. Aliases are used only by D-SCHEME and by the candidate index. They are not identity by string equality. | RP-2 | Section and question IDs (S00–S12, Q-01–Q-15) are otherwise never introduced. The pending user decision on compound headers **for the design** is not decided by this experimental use. |
| D-SCHEME | A reader-recorded **ID-scheme statement** ("Decision IDs A01–A14 … are in [decision log](decision-log.md)") resolves exact ID tokens of that family, inside the statement's scope, to the aliased introduction in the linked file. The scope is the stating file unless the span states a wider one. | ID-3 (adds a fifth S1 route) | An explicit textual statement with a definition link. It keeps the "file-local unless stated" ruling. |
| D-DOC | A link to a whole in-scope file resolves to a **document referent** for that file version. In packets, a document referent expands to its outline, not to every record. | ID-3 a, ID-12 | A link to a file is an explicit reference to the document. Previously these 16 pilot links dangled. |
| D-ID8 | The successor's resolver gathers every referent reachable at the level: S1 routes, plus S3 `same` and creation decisions at L3. Exactly one means resolved. Zero means unresolved. Several means unresolved, with the conflict listed. An S3 record never overrides an S1 referent. | ID-8 (implemented correctly here; `tools/reapply.py` unchanged) | Needed for L3 packets. An ID-2 (c) creation decision counts as an admitted L3 statement for its listed expressions (L3 review R10). Tested on synthetic graphs: zero, one and several referents, and S3 affecting only L3. |
| D-LIST | ID lists and ranges ("S05–S08", "USER-04/05") are one expression and do not resolve at L1/L2 (`cannot tell`). At L3 an analyst `split` decision may replace them by items, labelled analyst split items, with items not written in the text flagged. | ID-10, the 2026-10-07 ruling, plan-amendment-1 note 4 | Keeps plan level `cannot tell` while allowing labelled analyst branches. |
| D-UNSPEC | Dangling endpoints keep their single role but carry a subtype: absent slot; external target outside the mapped scope (with the target); conflict; "unresolved, an introduction with the same name or ID exists (identity not established)"; or "**named, not specified in mapped scope**". The subtype comes from an exact coverage check against committed introductions, not from the candidate index. | ID-9, GM-4 (reporting only) | Named foundations never specified become first-class and visible. The 2026-10-07 ruling that "a requirement names content nobody supplies" is a coverage tally is **not** changed: D-UNSPEC concerns names in relation slots. |
| D-MISSPREM | An absent foundation slot of a `fails_to_follow` kind stays a dangling endpoint (GM-4 precedence unchanged), with the qualifier "missing premise". | GM-4, open question 37 | Conclusions without supplied premises are visible without changing precedence. |
| D-CLAIM | Readers record explicit decision, recommendation, conclusion and status statements as `claim` (S1). A derived review flag, "claim without attested premise in mapped scope", lists decision, recommendation and conclusion claims with no relation cue on their lines. | New S1 type; S6 flag | Required by the continuation. It is a review flag, never proof that no support exists (an empty answer does not establish independence). |
| D-CITE | Parenthetical source citations with no relation word get the reserved label `(citation)` (like RP-5's `(link)`). | RP-5 | Makes support that lies outside the mapped scope visible as a frontier. |
| D-CTX | **Context packets.** From start referents (named, never chosen by similarity), the packet expands breadth-first by depth through section containment (records inside a heading's section) and incident edges (records whose slot resolves to the referent). Then it follows the referents of those records' slots. This is *selection*, not derivation: no direction is assumed, no relation is created, and every label stays as written. Packets default to **L3**, with each analyst hop labelled. Budget is approximate tokens per page; pages never split a sibling group (one cue, coordinated items); a FRONTIER lists unexpanded referents; MORE lists omitted record ids; COVERAGE states the read status of touched files and out-of-scope targets reached. | QL-7 default for this query type; DR-* unchanged for chains | Bounded answers without silently dropping prerequisites; limits made visible. |
| D-FRESH | File updates are **in scope** for the successor: freshness is checked at query time, stale records are excluded, and refresh works as in section 5. | Block D11 (file updates out of scope), design-wide | Required by the continuation. A span still belongs to one file version; refresh only moves unchanged text. |

Not implemented, and not claimed:

- DR-7 joint hops are only marked, not fully reported per member.
- DR-5 cycle detection in `chain` is simplified to return-to-start. Converging routes are listed, not called cycles.
- S4 annotation tooling.
- Codebook sense splits (KM-17).
- Multi-reader reconciliation (CL-10). Each chunk has one reader.

## 7. Limits

- Readers and analysts are models.
- One reader per chunk, so there is no agreement measure.
- The chunk boundaries and the 6,000-character budget are choices, not optimised values.
- Similar names propose S3 work but never decide it.
- Reproduced counts and synthetic tests do not establish better coding-agent work. That is what `validation/` measures, within its declared limits.
