# Brief: the research run's field helper brief and its step templates (helper of top session 5; kind analyse, Opus)

The owner approved the research run on 2026-11-20 (r57-0046; the plan `H:research-tree/build/NEXT-STEP.md`, path e2 of
`COMPLEXITY.md` version 2). Under a Fable coordinator, one Opus helper per field (seven fields, the direction's lanes
2-8) runs that field's own helpers and returns ten lines. You write that field helper's brief, one for all seven, and
the templates it fills for each of its helpers. At the same time helper A writes the coordinator's brief, the run's
`CLAUDE.md` and the other briefs, and helper C builds the run's scripts; all three follow
`H:research-tree/build/briefs/RUN-INTERFACE.md` (read it first: paths, units, tags, prefixes, returns, the scripts).
`H:` = `C:/Users/User/Documents/projects/harness-engineering/`; `RUN:` = `C:/research-runs/2026-11-harness-leads/`. A
blind review of your files follows; write so a reviewer can check each line against its source.

## Read, from the files (r57-0009), the parts you need
- `H:CLAUDE.md`; the board `H:library/INDEX.md`; `H:library/README.md` (record schema, how records are added);
  `H:library/lookup.sh` (how a helper in `RUN:` calls it); `H:.claude/hooks/tier-routes.json`.
- `H:research-tree/build/COMPLEXITY.md` version 2 sections 2 (one field's units, tokens, calls and window; the 296 K
  bound for R_same), 5 (step 3 is the field; his review idea), 6; `ROUTER.md` version 2 section 4 (models and effort
  per step) and section 6 (quiet scripts, returns, no separate counts); `FAULTS.md` version 2 section 0.
- `H:docs/program/evidence/round3-2026-11-18/ROUND.md` in full (the steps, standards for a paper, the report, library
  records, keeping the library clean); one lane's files as a worked example, e.g. `R:t1-brief-*.md` if present, else
  `R:t1-report.md`, `R:t1-gate.md`, `R:t1-refute.md` (`R:` = `H:docs/program/evidence/round3-2026-11-18/`).
- `H:docs/program/RESEARCH-DIRECTION-2026-11-16.md` in full (sections 2-6: the embeddings test's assumptions, what
  counts as a lead, the lanes and the files each must build on, the rules for every lane, what comes back).
- `H:docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`, by its headings: a field's research (packs, the quote
  gate, the refuter), R_same, the fresh arm, the fixed review form, F1 and its scoring, what each guards against.

## Write (design only; in `RUN:`)
1. **`RUN:briefs/FIELD.md`**: the field helper's brief. The coordinator starts it as `orchestrate: f<n> <slug>` with
   the one-line prompt `Read and follow RUN:briefs/FIELD.md for unit f<n>; your limit is <L> M tokens`. It says: the
   field's question and the files it must build on (the direction's section 4 row and section 5 rule 4, per field, in a
   table for f2-f8, with the library search words for each field's prior records: fields 4 and 7 have many, COMPLEXITY
   section 6); the steps (COMPLEXITY section 5 step 3 and ROUND.md steps 1-5: Sonnet readers at once, library first
   and records quoted from a paper read in full reused (r57-0130); the Opus report writer, which then reviews the
   field's part of the planted copy in the fixed form (R_same) only where its report ended under 296 K, else records
   the pair as not run; the Sonnet gate beside the fresh Opus refuter, which first writes the same fixed-form review
   from the claims alone (the fresh arm), then refutes; `tools/shuffle.mjs`, then the blind Sonnet scorer against the
   field's plants in `sealed/planted-key.json`, scoring plants found with the right reason (primary), citation
   failures, use outside conditions, tokens, and R_same's factual sentences that cite nothing; the Opus fold; Haiku
   extraction, one per collect file, at once; a Sonnet check of every record; a commit of the field's files only); the
   leads scored against the problem sheet's sinks (`sheet/SHEET.md`) and the direction's section 3 (what a lead is);
   each step's kind, model and effort (ROUTER section 4) and its limit (measured expected plus a buffer, r57-0038, from
   COMPLEXITY section 2's figures, formula shown); how it waits (only `tools/wait.mjs` calls of at most 150 s, which
   also print its tokens; no separate count call); what it never reads itself (collect files, paper texts, reports:
   helpers read them and return ten lines; ROUND.md limits); its `STATE.md` after each step and how a restarted field
   helper goes on from the first step whose output is missing; its limit and what it does at it (return LIMIT with
   the state written); its return and `RETURN.md`, `DONE.md` last (interface).
2. **`RUN:briefs/field/<step>.md`**: one template per helper of a field (readers, report writer with R_same, gate,
   refuter with the fresh arm, scorer, fold, extractor, record check) with placeholders the field helper fills
   (`{n}`, `{slug}`, `{prefix}`, `{x_files}`, `{topic}`), so that the field helper writes no brief from scratch. Each
   names its inputs and outputs at the interface's paths, its records, its limit and its return (at most ten lines).
3. **`RUN:briefs/field/review-form.md`**: the fixed review form both arms use, from the protocol (each row: the claim
   of ours, what is wrong with it, the source with its place, the condition it holds under), so the scorer compares
   like with like.

## Rules
Keep the approved plan: change nothing it decided (the steps and checks of COMPLEXITY section 5 step 3, the models,
the reuse of library records). Where it leaves a gap, fill it from the sources and list each fill, with its source, in
a last section "Fills" of `FIELD.md`. Marks [m] measured (path), [r] read (path:line), [c] computed with the formula,
[e] estimate (range). A mechanism from the recorded research, a number computed (r57-0001, r57-0002); nothing asked of
the owner. No web request is needed; make none; the field helpers' readers make them, with nothing of ours in any
search or URL (H: CLAUDE.md rule 4), and download only what `RUN:DOWNLOADS.md` names (helper A writes it: public papers
from open copies, at most 40 MB each, into `RUN:papers/<unit>/<short>/`). Read-only everywhere except
`RUN:briefs/FIELD.md`, `RUN:briefs/field/` and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/0fedf9f2-6bb0-4fa4-bcd6-133df5bb66ca/scratchpad/run-field/`.
Start no session, helper, workflow, schedule or wake; change no setting; no commit; no command over 150 s (a call over
about 180 s is moved to the background and you can stall).

## Tokens and return
Expected about 8 M, limit 18.6 M (analyse on Opus, E 1a, n = 19). Your counter:
`node H:research-tree/build/tools/tokens-self.mjs "run field brief"` every 10 calls from call 30. At about 330 K context
or at the limit, write the files as they stand with "Left to do" and return LIMIT. Return at most ten lines: the files;
one field's expected tokens and its helper's window; the limit per step; the number of fills; anything against the
interface; your token count.
