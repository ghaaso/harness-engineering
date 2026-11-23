# replay-L6: proposed library records

1. kind fact, status measured. "On 37 paired clinic cases (17 overstated, 20 accurate), an Opus refute reviewer that
   reads two versions of a worker's report flagged 2 of 17 overstated claims against 4 of 17 with one version.
   False alarms were 3 of 20 against 1 of 20. Discordant pairs: overstated 0 B-only and 2 A-only; accurate 2 B-only and
   0 A-only (McNemar exact p = 0.50 each)." Evidence: replays/replay-L6/RESULT.md "Counts", "Paired comparison";
   tally-out.txt; tally.json.
2. kind ruling-applied, status measured. "Under SCORING.md's fixed rule, L6 is not piloted: B's net gain on the
   overstated cases is -2, below 3. Both arms flag under a quarter of the overstated claims (23.5 % and 11.8 %), so
   report-reading review is not the lever on S4 in these records. That points to the executed checks of L11 and B12.
   One project, report text only, about 20 cases a class: a sizing result, not a verdict on the family."
   Evidence: RESULT.md "The do-not-pilot rule".
3. kind fact, status measured. "An Opus refute reviewer that reads one case file of 10-14 KB costs about 184-188 K
   tokens over 3 calls, almost all of it the fixed prefix. A second version of the report adds about 3 K (+1.7 %, 37
   reviewers an arm). The earlier figure of +18 K came from 5 reviewers an arm." Evidence: RESULT.md "Tokens";
   tally-out.txt.
4. kind fact, status measured. "Building replay cases from the clinic records (one claim with v1 and v2 report texts,
   blinded) cost 12.40 M tokens with three Sonnet readers for 50 cases, about 248 K a case. The forecast had put this
   step at nothing. The whole replay-L6 cost about 33.7 M." Evidence: RESULT.md "Tokens"; the builders' transcripts
   (descriptions "read: replay-L6 cases group 1-3").
5. kind fact, status measured. "Of 25 recorded overstatements with a report claim, 17 have a second version of the
   report on record, and so do 20 of 25 accurate controls. Source a, an earlier commit of the same file, exists for only
   10 of those 37, and it gave no hit in either arm on its 5 overstated cases." Evidence: assemble-out.txt; RESULT.md
   "By source".
6. kind open task, status reasoned. "Not tested: other projects; reviewers with access to code, tests or cited evidence
   files; a generated second version for the 13 cases without one; a diff or change-told reviewer; other models or
   voting." Evidence: RESULT.md "What was not tested".
7. kind mistake, status observed. "replay-L6 returned early once without being asked, before its helpers ended, and
   put no cost on case building in its plan, which overran the unit's tokens. replay-L6b started 16 reviewers at once
   and hit the app's limit of 20 helpers a session. The coordinator then capped it at 4 at once." Evidence: the two
   units' transcripts; RESULT.md.
