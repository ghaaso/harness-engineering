# From 21 problems to solved designs: the record (2026-11-16)

Amendment 3 of `docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md` left 21 problems of the session tree,
each with a rule written for the occasion. The owner then ruled that these problems are instances of
problems that established branches of computer science have already solved, and that the fixes should
be those branches' standard solutions, applied properly. This folder is the record of doing that. The
result is `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`.

## What ran

| Step | Agents | What it did | Folder |
|---|---|---|---|
| Map | 8 field experts (Opus), then 8 source checkers (Sonnet) | Mapped the problems to classical solutions: 103 mappings, each with the classical problem, the standard solutions and their sources, the assumptions that fail for language-model sessions, and a mechanism for this tree | `map/` |
| Design | 6 layer designers (Opus) | One specification per borrowed design: execution, storage, integrity and assurance, evidence method, shape and cost, completeness | `design/` |
| Model | 1 builder, 1 fidelity reviewer (Opus) | An explicit-state model of the coordination rules, checked over all interleavings with fault actions; then a review that re-ran it and broke each mechanism on purpose | `model/`, `model-review/` |
| Cost | the shape designer | A cost model computed from the measured token figures, with every input tagged measured, transferred, guessed or illustrative | `cost/` |
| Integrate, attack, settle | 1 integrator, 4 refuters, 1 mapper, 1 reviser (Opus) | One document; attacked on classical assumptions, on whether it can run on this harness, on simplicity and cost, and on the owner's requirement; 27 edits ruled and applied | `design/` |

The fields: distributed systems; databases, indexing and storage; operating systems and cost models;
software reliability and safety; security and integrity models; statistics, experimental design and
evidence synthesis; classical AI, formal verification and build systems; information theory and
interfaces.

Tokens: 1,484,854 for the map (16 agents, 12 minutes) and 2,743,461 for the design, model and attack
(15 agents, 82 minutes).

## What the model check found

With every mechanism present, six flaws in the specification of the execution layer: a restart carried
a fenced attempt's uncommitted output forward; a lost wake-up after the watcher's own exit was
permanent; pause detection worked only inside one live watcher; a second watcher could start; an
escalated task was left running; admission did not count sessions whose stop was unconfirmed. Each fix
is a standard one and is written into version 2 (rules R2 and R4 to R10). The fidelity review
reproduced the run and found the search exhaustive within its bounds, but it also found several of the
model's properties vacuous and many rules not modelled. **The model has not been extended with the
fixes and run again.** Version 2 says so and blocks itself on that run (its rule R57).

## Limits

1. The classical sources were checked mostly from memory of standard records; about 26 of about 226
   citations were looked up. The corrections the checkers made are applied in version 2.
2. No source measured a tree of language-model sessions like this one. Every borrowed guarantee rests
   on assumptions that fail here in part; version 2 says where, layer by layer.
3. The cost figures rest on guessed inputs (see the tags in `cost/inputs.json`). They fix the method,
   not a prediction.
4. The model is bounded: two fields, a small budget of faults, abstract time.
5. Ten facts about the harness are believed and not verified (version 2, section 13).

## Files

- `map/`, `design/`: `result.json` (the workflow's combined result), `agents/*.json` (each agent's
  full return), `workflow-script.js.txt` (every brief as sent), `MANIFEST.sha256`.
- `model/`: `model.mjs`, `check.mjs`, `out.txt` (the real output), a README. Run with Node 24.
- `model-review/`: the reviewer's variants of the model and its reruns.
- `cost/`: `cost.js`, `inputs.json`, `computed.txt`.
