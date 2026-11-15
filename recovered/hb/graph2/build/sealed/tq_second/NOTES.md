# tq_second: the blind second reading of the 50 TQ questions

What this is: answers to `tasks/tq_questions.jsonl`, written from the code alone at the frozen commit a31924a3818f4ac94b695906d107c72c912792b2. No extractor, graph output, research schema or other reader's answers were read.

How the answers were made: the commit was exported with `git archive` to `build/tmp/tq2` (deleted afterwards). The answers came from grep and reading the code: following call chains, routes, the ORM writes and the migration `upgrade()` bodies.

Files:
- `answers.jsonl`: one record per question with `id, split, kind, answer, evidence[], confidence, reading, reader, commit`. Each `evidence` entry is a file:line with a short note.
- `build_answers.py` and `part_routes.py`: the answers written as data, plus a writer that checks all 50 ids are present. Rebuild from `build/` with:
  `python -I sealed/tq_second/build_answers.py tasks/tq_questions.jsonl sealed/tq_second/answers.jsonl`

Numbers:
- 50 answered: 39 high confidence, 11 medium (ids 3, 12, 18, 20, 21, 23, 25, 31, 33, 39, 44).
- 170 answer items in total. Five answers are empty: 15, 17, 27, 39 and 46.
- Tune: 16 high and 4 medium. Held-out: 23 high and 7 medium.

How ambiguous questions were read (each record's `reading` field has the details):
- Q21: `device` is left out. Its upsert runs only when `installation_id` is sent, and the mobile client never sends it. A static reading that ignores the payload would add `device`.
- Q25: only the env `settings.labour_rate_paisa` reader counts (the 0040 seed). The per-shop key reader is not counted.
- Q39: the `JobDetail.evidence` in L224 is the backend schema, not the web page's `JobDetail` component, so it is treated as a name collision.
- Q12: no client regexes the literal `(current status: X)`. The question was read as asking which code pulls FastAPI's `detail` out of a rejected transition. `failureReason` is generic and borderline.
- Q44: the static reach goes through `JobService._detail`, which calls `_fuel_rate` and then `effective_int`. That covers every route that returns a `JobDetail`.
- Nested functions are named `Outer.inner`, for example `AppProvider.markReady` and `ArrivalAfterVideoScreen.recordVideo`.

Deviations: none from the task. The export was deleted when done. Nothing was run on any held-out task commit; this pass only reads code at the frozen main commit.
