# replay-L2 (L2 with L27): scoring, written before any count (2026-11-23)

## Records in
- Every transcript under `C:/Users/User/.claude/projects/*/`: session files `<folder>/<id>.jsonl` (role "session") and
  helper files `<folder>/<id>/subagents/*.jsonl` (role "helper", kind = the word before the colon of the description in
  `.meta.json`, "none" when the description has no such word).
- Project by folder name: `harness` = folders starting `C--Users-User-Documents-projects-harness-engineering`;
  `run` = `C--research-runs-2026-11-harness-leads`; `fixflow` = folders holding `FixFlow` or `EMS-workshop1` (the
  product repository; its harness worktrees before the 16 November split stay here, as filed); `clinic` = folders holding
  `Clinic-Workshop`; `other` = the rest (scratch workspaces, downloads, coursework), reported but not judged on.
- Month = month of the first call's timestamp.
- Out: transcripts with no assistant call carrying usage; synthetic calls (model `<synthetic>`). This replay's own
  transcript is in if it is on disk when the scan runs (it is small; said in RESULT.md).

## Unit of count: tokens, from the usage fields, once per message id
- Context of a call = input + cache_creation + cache_read. Fresh = input + cache_creation + output (as `RUN:tools/lib.mjs`).
  All = the four fields.
- **Prefix of a window (P)** = context of its first call: everything loaded before the model's first output (system
  prompt, tool schemas, deferred-tool names, skill listing, CLAUDE.md and memory, session context, the brief or the
  owner's first message). After a compaction (a call whose context falls below half the previous one) a new window starts
  and P for it is not re-measured; the first window's P is used for the whole file. Stated as a limit.
- **Prefix re-read** = P counted once in every call of the file (P x calls): the prefix's share of all context tokens.
  This is the same measure as S12 (TB:35, 27 %), so S12 is checked like with like.
- **Prefix fresh** at a call = max(0, min(P, context) - cache_read), capped at input + cache_creation of that call: the
  part of the prefix not served from the cache. Split into: at the first call of a file (a start) and at later calls
  (a rewrite after a lapse or break; L24's ground, reported only as the prefix's part).
- **Start written vs read**: at the first call, cache_creation + input against cache_read.
- **Components** (only where the transcript has the attachments, recent format): characters of the skill listing,
  deferred-tool names, CLAUDE.md and memory files (`instructions`), session context, the first user message (the brief).
  Converted at a ratio fitted on the data (first-call context against component characters across helpers whose
  system and tool part is the same); the residual is "system prompt and loaded tool schemas", not split further.
- **Loaded, never used**: per file, whether any Skill call was made (skill listing used), any ToolSearch call (deferred
  list used), and which tool families were called. Counted as files and as tokens of the unused component.

## Hit, miss, ceiling
- Not a detection test: no hit or miss. The result is three shares, by project and role: prefix re-read / all context
  tokens; prefix fresh / all fresh tokens; prefix fresh / all tokens.
- **Ceiling of a lean prefix** on the meter: if every prefix were cut to a lean size L, saved = (P - L) x calls on cache
  reads plus (P - L) per fresh prefix write. Given for L = the brief alone plus 5,000 tokens (a mini-SWE-agent-like
  harness, f8:37) and for L = P minus the unused components only (the removable part measured here). In tokens, fresh
  and cached apart; the meter weight of a cached read is about 1 % of a fresh token (S17), shown as an index, not money.

## What would mean "do not pilot" L2/L27's prefix arm (decided now)
- If prefix fresh is under 10 % of all fresh tokens in every project with records, a lean prefix cannot move the meter
  by more than 10 % on the fresh side; with cached reads at about 1 %, the cached side adds under 3 points even at S12's
  27 %. Then: do not pilot the 384 M prefix arm; L2's quality arm (curated briefs) stands apart, since it is judged on pass
  rate, not tokens.
- If prefix fresh is 10 % or more of fresh tokens in some project: pilot there, sized by that share.
- S12 is "checked" if the re-read share lies within 5 points of 27 % on the same projects; otherwise the new figure
  replaces it, with the reason.
