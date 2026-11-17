# o2: scheduling when several resources are scarce. State at hand-over, 2026-11-18

## Summary
- Wave 1 is done. Five Sonnet collectors read 47 papers. The five files are in this folder:
  `o2-multiresource.md` (7 papers), `o2-cluster.md` (8), `o2-classical.md` (11), `o2-memory.md` (9),
  `o2-quota.md` (12). Together they hold 60 quoted, 18 summary and 54 reasoned marks.
- Wave 2 has not run. Neither the table from bottleneck to method nor the library records exist yet.
- The reason: this coordinator reached 132,000 tokens of context. The brief's limit is about 130,000,
  and the brief says to write the state into the report and stop there.
- Helper runs used: 5 of 8. Weekly usage at the gate: 46 % (the stop is at 60 %).
- No paper needed the owner's sign-in. Fourteen could not be opened by any public route; they are
  listed in each file under "Could not open".
- Next: run the analyse brief, then the refute brief, then write the records. Both briefs are ready.
  The analyse helper overwrites this file with the draft report.

## The gate: how far each file can be trusted
| File | Read in full? | Weak spots |
|---|---|---|
| o2-multiresource | Model, algorithm, evaluation and limits read; proofs skimmed | Tetris and Graphene lose their digits in the text layer, so no headline gain of theirs is quoted. Joe-Wong et al. and Dolev et al. not opened |
| o2-cluster | Read by keyword search and section reading, not every page; cited by text line, not page | Paragon and "Borg: the next generation" not opened |
| o2-classical | Only Panigrahy et al. read in full; four read in their main parts; four in abstract and introduction | The three seed originals are paywalled: Garey-Graham 1975, Garey-Graham-Johnson-Yao 1976, Gonzalez-Ibarra-Sahni 1977. Their theorems are quoted as restated in later open papers and marked so. Woeginger 1997 and Shmoys-Wein-Williamson 1995 were also not read |
| o2-memory | 9 read; Merkel and Tang only in their authors' dissertations (chapters named) | The EuroSys 2010 and ISCA 2011 papers themselves were not opened. No measured study of a desktop like this PC was found |
| o2-quota | 12 read; Cruz and CBS proofs skimmed | No paper bounds the delay of a weekly or 5-hour window. Routing savings are in money or share of calls, never in tokens, and none was tested on coding agents |

## What the collectors report: not yet analysed or refuted
Each line is a collector's own reading of its file, with the mark it gave. Nothing here is a decision.
- Processor against memory (Borg, quoted, txt 648-655): when memory runs short Borg "immediately
  terminates tasks, from lowest to highest priority". When the processor runs short it "throttles
  usage". A memory shortage kills work; a processor shortage slows it.
- Memory limits set from measured use (Autopilot, quoted, txt 447, 460): slack falls from 46-60 % with
  manual limits to 23-31 %. Out-of-memory kills are 0.002 to 0.013 per task-day, against 0.069 for
  hard manual limits.
- Memory capacity is a cliff (Denning 1968, quoted, pp. 919, 921). Admit a job only while the working
  sets sum to at most the memory, with headroom; one job past that gives "a complete collapse of
  service".
- Memory bandwidth (Merkel thesis, quoted, txt 4129-4135 and 4202-4207): four memory-bound copies on one
  chip ran 3.9 times slower on Core2 and 2.7 times on Opteron. A memory-bound job beside processor-bound
  ones showed "no significant" slowdown.
- Pairing co-running jobs well is worth 20 % on average and up to 50 % for one job. It is "completely
  pointless if all the threads are the same" (Zhuravlev, quoted).
- Several scarce resources, worst case: list scheduling is within d+1 of optimal, where d is the number
  of scarce resources (restated in later papers, quoted there). Online first fit for vector packing is
  within d+0.7. With one bottleneck resource, plain first fit ordered by size is enough (Panigrahy et
  al., quoted).
- Ignoring dependencies costs a factor of the order of d (Graphene lemma, quoted). Gains rise with load
  and vanish once the cluster is saturated: Carbyne gained 1.57 times at 1x load, 1.76 to 1.91 at 2x,
  and nothing at 6x (quoted).
- Sharing whichever resource is the bottleneck now can be gamed and oscillates (DRFQ, quoted, Table 7).
  Fairness does not buy throughput: welfare is no better than a factor of m, the number of resources
  (Parkes et al., quoted).
- A refilling quota: the closest mechanism is CFS bandwidth control. A group gets a quota of time per
  period, is throttled when it is spent, and loses unspent quota at the period's end (quoted). The
  (sigma, rho) token bucket gives a worst-case delay bound (Parekh-Gallager Theorem 3, quoted).
- Cheaper model at equal output: FrugalGPT saved 59 to 98 % of cost against the best single model.
  RouteLLM saved 3.66 times at 95 % of GPT-4 quality on MT Bench, but only 1.41 to 1.49 times on MMLU and
  GSM8K. All quoted; all in money, not tokens.

## To resume (no reading needed beyond these)
1. Briefs, durable copies in the shared notes folder
   `C:\Users\User\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_f25313b3-9336-46d6-a086-0334e010c8eb\`:
   `o2-analyse-brief.md` (one `analyse:` helper on Opus) and `o2-refute-brief.md` (one `refute:` helper on
   Opus, run after the analyst). `o2-collect-brief.md` is wave 1's brief, kept for the record.
2. The paper texts (75 files, 77 MB with the PDFs) are in this session's scratchpad under `papers\`. A
   reboot or cleanup can clear them. Both briefs point at them for checking a quotation; the collect
   files carry the quotations themselves.
3. The analyst writes the draft report here, `o2-claims.md`, and a records draft. The refuter writes
   `o2-refute.md`. Then fold the verdicts into the report, and write the records to
   `library/journal/2026-11-18/o2.jsonl` in the format `library/README.md` gives at that time.
4. Helper runs left: 3. Read usage before the wave.
