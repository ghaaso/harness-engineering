# Protocol addendum 7 — graphify as shipped, scripted, on the known-answer sets

Written 2026-11-13, before graphify was installed and before any graphify answer existed. The
owner approved this step ("Yes, run it"): install graphify, pinned, in the test container only, and
run its code layer on the tasks and questions that already have reference answers. No agent runs
and no model is called.

## A. Install

1. Package `graphifyy` version 0.9.108 from PyPI (the project's official package; repository
   Graphify-Labs/graphify), with its dependencies, into a new image built on top of the test
   image. Nothing is installed on the host.
2. Everything downloaded is listed with name, version, size and hash. The package metadata must
   point at the official repository; any other package with a similar name is refused.
3. `graphify install`, its hooks and its instruction block are never run or written anywhere.
4. Every graph build and every query runs with the container's network switched off, so no file
   content can leave the machine. If a step cannot run with the network off, it does not run and
   that is reported.
5. Inputs are clean exports of the parent commit (no git history, never the working tree).

## B. The arm

6. G1 is graphify's code layer as shipped: its parser-built graph, queried through its own
   commands and options. The model-read document layer is not run in this step.
7. An adapter of ours turns a task seed into a graphify call and reads graphify's ordered result
   as a ranked list of files. The shared packer then renders that list exactly as for every other
   arm (file granularity, signature lines, the same token budgets). So the comparison is about
   which files graphify picks and in what order, not about how it prints them.
8. Every choice the adapter makes is listed. A refuter checks that graphify is used the way its
   authors intend.

## C. Tuning and freezing

9. At most 10 configurations, built only from graphify's shipped commands and options (which
   command, depth, direction, budget), run on the tuning split only. The builder never sees a
   reference answer or a score.
10. The grader selects one configuration by the rule of addendum 4 item 1 and freezes it with a
    hash of the adapter code before any held-out task is run.

## D. Held-out run

11. Run once: the same 770 held-out tasks (T1, T1x, T2, T3, T4) and the 30 held-out questions.
    The graph for each task is built from the export of that task's parent commit, with the
    removed documents of T3 and T4 taken out.
12. Comparators are the stored held-out answers of the frozen arms: the typed primary, the
    scripted search primary and both floors. Nothing of theirs is re-run.

## E. Comparisons, declared now

13. G-1 (primary): graphify against the typed primary, T1, recall inside an 8,000-token answer,
    paired by commit, 10,000 resamples.
14. G-2 against scripted search; G-3 against the changed-together floor; G-4 against the
    same-folder floor. Each is also shown on T2 and T3, at 2,000 and 4,000 tokens, and split by
    where the seed lives (mobile app, backend, web).
15. G-5 (native form): graphify's own answer text at its default budget, scored on which
    reference files it names, against each arm's file recall at 2,000 tokens.
16. G-6 (questions): the question text given to graphify's query command; recall, precision and
    F1 of the reference items found in its answer, against the typed store and scripted search,
    on 30 questions and on the 22 untouched ones. Descriptive.
17. Wording as in addendum 3 item 18: "better" only if the T1 interval excludes zero and the sign
    agrees on T1, T2 and T3; "equivalent" only if the whole interval lies within plus or minus
    0.05; otherwise "inconclusive".

## F. Limits declared in advance

18. Code layer only. The one independent gain reported for graphify sits in its model-read
    document layer, which this step does not run.
19. No agent. This says nothing about tokens in a session or about whether an agent would use
    the tool.
20. Graphify builds no route, URL, table or changed-together links for this stack. Tasks and
    questions that need them are reported as their own group, where graphify is expected to miss
    for lack of the link.
21. The typed arms had 60 tuning configurations each; graphify gets at most 10 because it has
    fewer shipped options. Reported as a difference in tuning effort.
22. One repository. Never worded as "graphify does not work" or "graphify is worse in general":
    it is its code layer, on these task kinds, on this repository.
