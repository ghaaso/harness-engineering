# Coordinator ruling 105, on values that are not finite numbers

Ruled by the coordinator on 2026-11-15 at about 09:58Z (file hash and exact time are in `progress.jsonl`,
line `rulings_105`), after stage B ended and before the end-of-run procedure, any selection, any report
and any held-out score. Raised by the coordinator: no script of the lane checks that a loss or a score is
a finite number, and a model whose training diverged would give rankings in an arbitrary order without
any step failing. It goes to the end of section M word for word, before the code freeze.

105. Values that are not finite numbers.
     (a) What was looked at. On 2026-11-15 the coordinator scanned the loss list in every stage-B part
     (2,385 parts; training losses only, no score): no loss is anything but a finite number, no list ends
     above one and a half times its start, and the 45 parts without a list are the untrained ones (the
     checkpoint with no co_changed fact, three seeds, fifteen settings).
     (b) Tuning. After step 1 and before the freeze the coordinator counts, in the assembled stage-B
     tables, the score rows whose score is not a finite number. It is a count per table; no score value
     is read out or kept. A count that is not zero stops the line until the coordinator has ruled.
     (c) Held-out. After the held-out run, and before the hashes go to the grader, the coordinator takes
     the same count over the held-out parts and tables and over the loss lists of the held-out units. A
     count that is not zero changes nothing in the run: the ranking stands as the frozen code made it,
     the grader gets the hand-off as it is, and the result states the count with the seeds and parents
     it touches. This is fixed now so that it is not decided after a result is known.
