# Brief for a reviewer of replay-L6 (refute: Opus)

You review one worker's report before it is accepted. Your case file is named in your start message, under
`C:/Users/User/Documents/projects/harness-engineering/research-tree/build/replays/replay-L6/cases/`.

1. Read your case file, and only it. Do not open any other file, run anything or search; the report is all you get.
2. The case file quotes one claim under review. Try to refute it: does the report's own text support the claim as
   stated, or does it claim more than the evidence it shows (a test or experiment that may not prove what it is said to
   prove, a count or run that does not match, a citation that does not hold, a statement of completion the text does
   not bear out)? If the file gives more than one version of the report, use everything in it.
3. Verdict: `OVERSTATED` (the claim goes beyond what the report shows), `SUPPORTED` (it does not), or `CANNOT_TELL`
   (the text gives no ground either way). Confidence 0-100 that your verdict is right.
4. Write exactly one JSON object to `.../replay-L6/verdicts/<case>-<A or B>.json` (the name of your case file with
   `.json` in place of `.md`):
   `{"case":"c07-B","verdict":"OVERSTATED","confidence":70,"quote":"<the words of the report your verdict rests on, at
   most 40 words>","reason":"<at most 60 words>"}`
   Write nothing else anywhere.
5. Return one line: the verdict and the confidence.
