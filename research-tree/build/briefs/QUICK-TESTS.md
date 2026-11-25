# Brief: the two quick tests of the approaches survey (2026-11-25, the owner's word: "Yes, run them")

The owner's words behind them, in full, are at the top of `research-tree/build/briefs/APPROACHES-REVIEW.md`; they
outrank this brief. In short: a plateau across sizes of one model is an architecture question; evaluate different
approaches; reason from what past results showed. His approval of these two runs and the token cap are in the
journal (prefix r58, 2026-11-25, quote "Yes, run them").

The survey is `research-tree/build/improve/APPROACHES-2026-11-25.md`: read it in full first, above all its sections
on what the plateau does and does not show, on what past results say, and on what to test first (T1 and T2). It
names the files and lines. The claim under test is this session's own sentence "the limit is the signal, not the
size": T1 and the probe of T2 can show it false tonight.

## The two units

**T1, the plateau checks.** On tuning data, for the task of files that change together (D4):
- the ceiling: how much of the truth each source of candidates can reach at all, per repository and per kind of
  seed file (files with much history, little history, none), with the scoring written per kind;
- the U5 graph network without the count features in its pair head, and without the graph (the pair head alone),
  against U5 as it is: what the graph adds and what the counts add;
- two seeds for the settings compared, so that a difference can be told from run-to-run noise;
- training with hard negatives where U5 drew them at random.
About a third of a card-hour, the rest CPU.

**T2 probe, the content of the change.** The words of the seed change (the identifiers in its diff) as one more
feature of the learned ranker B2, scored by keyword match against each candidate file; and, for a fair comparison,
the same content given to the untrained baseline. Read the gain per kind of seed file: the question is whether
files with no shared history improve. CPU only. Mind the cut in time: the seed change is the query itself and may
be read; nothing after it, and nothing of the other files' changes in that commit (they are the truth).

## Rules for both

- **Scoring first.** Before any run, write `SCORING.md` in your unit's folder: the measure (as the round's: P@10 on
  tuning commits, the paired bootstrap of `d4lib`), the comparison and what result would count for and against the
  claim. Do not change it after seeing numbers; add, do not rewrite.
- **Tuning data only.** Never open, score or print held-out blocks or truth. Selection, if any, on tuning.
- **Like with like:** every new arm against the baseline on the same commits, the same candidates, the same scorer,
  with the same information where the task changes.
- **Your own files only.** Code in `research-tree/build/improve/code/T1/` or `T2/`, outputs in
  `CR/improve/T1/` or `T2/` (`CR` = `C:/Users/User/Documents/projects/card-run-2026-11/`), your notes and report in
  `research-tree/build/improve/units/T1/` or `T2/`. Read U4's, U5's and U6's code and tables; never write into
  their folders, never change their code: import it or copy what you need into yours.
- **The machine is busy.** Card jobs only through the card gate, as U5 does it (`code/U5/run_gpu.sh`,
  `code/cardgate.sh`), declaring their measured need. CPU jobs in the image `d2-embed-gpu:3`, network off, at most
  4 CPUs and 8 GB each, at most two at once, so the running jobs are not starved. Python only in a container.
  Keep each foreground command under two minutes; long jobs in the background with a log you watch.
- No download, no install, nothing sent anywhere. Evidence and the journal are not written.
- Disk: about 36 GB free and other jobs need it; keep your outputs under 3 GB and say what they hold.
- **Report** as your reply, at most fifteen lines: what you ran, the numbers with their intervals, what they say
  for and against the claim, what you did not run and why. Save the same text as `report.md` in your unit's
  folder; if the app refuses that write, say so in the reply.

Kind: build-invariant, Opus. Do not start helpers. Aim to finish within about three hours.
