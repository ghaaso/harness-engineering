# replay-L38: proposed library records

1. kind fact, status measured. "Of 57 later helpers paired with their closest earlier report or library record
   (TF-IDF, stratified over six cosine bins, 949 helpers in four project groups), a blind Opus judge found 0 conclusions
   worked out again: 18 deliberate continuations, 10 independent checks by design, 29 different questions."
   Evidence: research-tree/build/replays/replay-L38/score.out.txt lines 2-11; judge-1..3.verdicts.tsv.
2. kind fact, status measured. "Estimated re-derived helper tokens: 0.00 % of 5,950 M helper tokens in each group
   (harness 290, run 301, FixFlow 221, clinic 137 helpers); one-sided 95 % bound about 100 of 949 helpers, mostly
   from the cosine 0.3-0.5 bin (334 helpers, 12 judged); below 0.3 (509) unsampled."
   Evidence: replay-L38/score.out.txt lines 13-18; RESULT.md "Upper bound".
3. kind fact, status observed. "The library was consulted 486 times in harness and run transcripts (259 harness
   helpers, 158 run helpers, 69 harness sessions), about 3.06 M characters returned; hits not classified."
   Evidence: replay-L38/lookups.out.txt line 1-2.
4. kind fact, status measured. "Helpers carry 76.5 % of tokens in harness, 97.4 % in the run, 30.2 % in FixFlow,
   17.5 % in clinic; main sessions, where a brief-level replay cannot see a re-derivation, carry the rest."
   Evidence: replay-L38/score.out.txt last four lines.
5. kind result, status reasoned. "L38: do not pilot now (rule fixed first: under 1 % in every group of 50+ helpers);
   measure first only if wanted again: about 300 more judged pairs from the 0.3-0.5 bin (about 1.7 M tokens) plus
   main-session sub-questions. The premise questions (C132) stay open: no return to score them on."
   Evidence: replay-L38/RESULT.md "What it changes next"; SCORING.md last section.
