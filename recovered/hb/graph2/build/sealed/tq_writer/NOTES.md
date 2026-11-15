# TQ writer notes (sealed)

## What was built
- `build/tasks/tq_questions.jsonl`: 50 questions. Each has id, split, kind, question (target, the scope rule for its kind, and the commit) and answer_form. It holds no answers, evidence or hop counts.
- `build/sealed/tq_writer/answers.jsonl`: everything above, plus target, selection tags, the exact answer, answer_items, evidence (item, file:line, note), hops, naive_search_gets_wrong and notes.
- Sources: `tq_defs.py` (commit, scope and answer-form text for each kind), `tq_data_a.py` (Q1-25), `tq_data_b.py` (Q26-50) and `build_tq.py` (validates and writes both files).
- Every answer was read from the code at commit a31924a3818f4ac94b695906d107c72c912792b2, using a `git archive` export. No extractor was run.

## How to run
```
python -I build_tq.py <frozen-export-dir>   # with the dir: checks every evidence file and line exists
python -I build_tq.py                       # without: writes the files with no evidence check
```
Python: `C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`. The export used was deleted after the run. To recreate it:
`git -C <repo> archive a31924a | tar -x -C build/tmp/tq_frozen`

## Numbers
- 50 questions: ids 1-20 are tune and 21-50 are held-out.
- Questions per kind (tune / held-out):

| Kind | Tune | Held-out |
| --- | --- | --- |
| screen_tables | 3 | 3 |
| tests_reach | 2 | 4 |
| invariants_on_file | 3 | 3 |
| other_half | 2 | 4 |
| setting_readers | 2 | 4 |
| migrations_touch_table | 3 | 4 |
| route_clients | 3 | 4 |
| change_reach | 2 | 4 |

- Five answers are fully empty: Q15, Q17, Q27, Q39 and Q46. Q10, Q22 and Q45 each have one empty half (real or fake).
- Hops (reader's count): 19 questions at 1, 17 at 2, 4 at 3, 3 at 4, 1 at 5, 3 at 6, and one each at 7, 8 and 9.
- Q44 (effective_int, a hub) is the largest answer, with 40 items.

## How targets were chosen
- Each kind covers every runtime it can reach: backend, web manager, mobile, and the ops console with its BFF.
- Across the set, 11 of the 12 backend slices are targeted. The health slice is left out because it has one route and no data.
- Each kind has:
  - at least one hub, such as jobs/service.py, effective_int, apiSend, the technician table, job_event or AppContext;
  - at least one empty or small answer;
  - where the kind allows it, at least one multi-hop chain that crosses runtimes.
- Every question records the trap a text search falls into, in naive_search_gets_wrong. Examples:
  - a path in a comment only;
  - the same path called with a different method;
  - a name collision (Settings and shop_setting, security.py twice, JobDetail);
  - an FK that only references the table;
  - a docstring mention;
  - the BFF hop;
  - a body flag instead of a route call.

## Deviations
- Each answer was produced by one reader, as the protocol says. The blind check by a second reader and the third pass on disagreements were not done here; they are left to the orchestrator.
- Kinds have 6 or 7 questions, not an exact 6.25. migrations_touch_table and route_clients have 7. Tune holds 2 or 3 of each kind.
- tests_reach is answered at file level, not test-function level.
- change_reach is static reach. Data guards are recorded in notes but do not shrink the answer. Example (Q8): the web createJob never sends whatsapp_consent.
- invariants_on_file uses an explicit rule set (a)-(d), given in the question text. Q18 relies on two rule-(d) items (L199, L224), which are the most debatable.
- Doc versus code (Q12): CLAUDE.md says three clients regex the "(current status: X)" detail. The code has four sites that extract it on transition paths, and none matches the suffix itself.
