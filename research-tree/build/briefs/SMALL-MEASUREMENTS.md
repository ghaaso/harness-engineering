# Brief: the eight small measurements (unit T3), 2026-11-25

The owner's words behind them, in full, are in `research-tree/build/briefs/GRAPH-TRANSFORMER-QUESTION.md`; they outrank
this brief. In short: are our weak graph results the model, our own settings or the data; are the good results real;
"any bad or wrong choice in either of these could lead to us having bad results ... we cannot be wasting our GPU
resources". He approved these runs on 2026-11-25 (journal, prefix r58): asked "Run the eight small measurements on your
PC now?", he answered, in full: "Yes, run them".

Read first: `improve/GRAPH-TRANSFORMER-ANSWER-2026-11-25.md` (section 4 lists the eight) and
`improve/FAILURE-MODES-2026-11-25.md` (rows 3, 5, 6, 7, 8, 9, 16, 17: each names the code lines, the figures and the
measurement). Then `improve/units/T1/report.md`, `improve/units/T2/report.md` and their `SCORING.md` files: T1 and T2
are the pattern for how a small run is done here (code in `improve/code/T1`, `T2`; outputs in `CR/improve/T1`, `T2`;
`CR` = `C:/Users/User/Documents/projects/card-run-2026-11/`). The analyst's two node scripts (`reach.js`, `hops.js`)
are in `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/7a07b86e-d52e-4da4-bd24-68ac48d870a3/scratchpad/`:
copy what you need into your own code folder.

Deliverable: research-tree/build/improve/units/T3/report.md (the eight results, each with its interval and what it
settles), with `SCORING.md` beside it written before any run. Done when the eight are answered or named as not run
with the reason.

## The eight (all on tuning data; each says what it settles)

1. **Does T2's gain stay when the edit cannot simply name its partner?** Rebuild T2's query with every diff line
   dropped that holds any alive candidate's path or file stem as a token; rerun B2+DIFF on tuning with B2's frozen
   settings, and FUSED (the untrained baseline given the same content) the same way. Report how much of the +0.015
   P@10 and of the +0.119 recall on truth without earlier co-change stays, and the share of tuning tasks whose diff
   names a truth file. (Row 16.)
2. **Is the temporal window the cap?** Plain counting restricted to the seed's last 19 and last 31 neighbour events,
   scored like every other arm, beside full counting and U6's best DyGFormer per repository. (Row 3.)
3. **How much do the tuning numbers owe to selection?** Split the 260 tuning commits in two halves (by repository,
   many random splits), choose on one half and score the choice on the other, from the per-commit scores on disk: for
   U5's choice among its 22 settings and epochs, U6's choices, B2's best of 40, and T2's B2+DIFF gain. Report the
   gain that survives the split against the in-sample gain. (Row 17.)
4. **Does TGN rank by file popularity instead of by pair?** Run U6's own `diag_tgn.py` on one saved TGN state per
   repository (states are pruned by a loop of the round: use what exists, read only). (Row 6.)
5. **Does a commit-size weight help the graph network?** U5's chosen setting with co-change edge weight hl90 / |e|,
   two seeds, against U5 as frozen (0.1308; its two seeds differ by 0.0011), as T1 ran its arms. (Row 5.)
6. **Would more zulip data move this form?** U5's chosen setting trained on 25, 50 and 100 zulip training blocks.
   (Row 8.)
7. **How much of pair TGN's low score is the training shortcut?** One setting, FixFlow and the clinic: the memory
   advanced to the commit's start before each batch, as the bipartite stream does it, against the same setting as it
   is. (Row 9.)
8. **Do harder training examples help the temporal models?** DyGLib's `historical` negatives, one setting of
   DyGFormer and one of TGN, FixFlow and the clinic, against the same settings as they are. (Row 7.)

Device for 7 and 8: FixFlow and the clinic are small (3,865 and 5,994 pair events). If one run takes under about
twenty minutes on 4 CPUs, run both sides of each comparison on the CPU and say so; a changed arm is compared only
with its as-is twin run on the same device and seed, never with U6's recorded card numbers. Otherwise use the card
through the gate.

## Rules

- **Scoring first.** `improve/units/T3/SCORING.md` before any run: the measure (the round's: P@10 on tuning commits,
  the paired bootstrap of `d4lib`), each comparison, and what result would count for and against each claim. Add to
  it later; do not rewrite it after seeing numbers.
- **Tuning data only.** Never open, score or print held-out blocks or truth.
- **Like with like:** the same commits, candidates and scorer on both sides of every comparison.
- **Your own files only.** Code in `research-tree/build/improve/code/T3/`, outputs in `CR/improve/T3/`, notes and
  report in `research-tree/build/improve/units/T3/`. Read U4's, U5's, U6's, T1's and T2's code, tables and saved
  states; never write into their folders and never change their code: import it or copy what you need.
- **The machine is busy and the card is full.** The round's jobs must not be starved or touched. CPU jobs in the
  image `d2-embed-gpu:3`, network off, at most 4 CPUs and 8 GB each, at most two at once. Python only in a container.
  A card job only through the card gate, as U5 does it (`code/U5/run_gpu.sh`, `code/cardgate.sh`), declaring its
  need; it waits its turn behind the round. Keep each foreground command under two minutes; longer jobs in the
  background with a flushed log that you read in short calls.
- No download, no install, nothing sent anywhere. Evidence and the journal are not written.
- Disk: C: has about 27 GB free and the round needs it. Keep your outputs under 1 GB and say what they hold.
- **Report** as your reply, at most eighteen lines: per measurement the numbers with their intervals and what they
  settle; then what was not run and why. Save the same text as `report.md`; if the app refuses that write, say so in
  the reply.

Kind: build-invariant, Opus. Do not start helpers. Aim to finish within about two hours.
