# TQ resolution (third pass)

What was built:
- `sealed/tq_reference.jsonl`: final reference answers for the 50 TQ questions. Each record has the answer, `answer_items`, `accept_aliases`, `hops` (the writer's count), the writer's structured evidence, the second reader's evidence, `pre_resolution` (exact or resolved), and a `resolution` block with file:line for each resolved question.
- `sealed/tq_agreement.txt`: the agreement figures and the kinds of disagreement.
- `tasks/tq_questions.jsonl`: 31 questions reworded, ids kept, none dropped. The pre-resolution copy is `tq_resolve/tq_questions.before.jsonl`.
- Scripts in `sealed/tq_resolve/`:
  - `compare.py`: raw comparison.
  - `check_names.py`: checks every path::symbol at the frozen commit.
  - `resolve_data.py`: the decisions.
  - `resolve.py`: writes the reference, the questions and `resolve_stats.json`.

How to run (Python at C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe):
1. Export the frozen commit:
   `git -C <repo> archive a31924a3818f4ac94b695906d107c72c912792b2 | tar -x -C build/tmp/tq_resolve`
2. Run `python -I sealed/tq_resolve/resolve.py <build> <build>/tmp/tq_resolve`. It is idempotent: it reads the before-copy of the questions.
3. Delete the export when done.

Numbers:
- Exact match before resolution: 46/50 (tune 17/20, held-out 29/30).
- Item agreement: 162/179 = 0.905. After normalising the spelling of nested functions: 48/50 and 0.983.
- Disagreements by kind:
  - Spelling of nested functions: Q7, Q12.
  - Field vs class: Q24.
  - Generic basename under rule (a): Q18.
- The final reference matches the writer on 47 questions and the second reader on 49.

Deviations:
- No question was dropped. Instead the ambiguity was fixed in the wording.
- The second reader gave no hop counts, so the hops are the writer's alone and were not checked blind.
- Agreed answers were not re-read against the code, because only disagreements were in scope. The 12 shared judgement calls are listed in tq_agreement.txt.
- The rewording touched questions that had no disagreement (a uniform naming clause and a uniform rule-(a) clause). No agreed answer changes under the new wording.
