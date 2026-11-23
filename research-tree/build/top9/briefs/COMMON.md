# Common rules for every helper of top session 9 (2026-11-24)

Repository: `C:/Users/User/Documents/projects/harness-engineering` (read its CLAUDE.md rules 1-7 first; they bind you).
`RUN:` = `C:/research-runs/2026-11-harness-leads/` (read only).
- Write only your own output file(s) named in your brief, under `research-tree/build/top9/out/` (or the files your
  brief names). Do not edit evidence, the journal (`library/journal/`), `docs/program/pipeline-diagram/`, or anything
  under `RUN:`. Do not commit, push, install, download or train.
- Every statement you write carries its place: `path` plus section heading or line number. Mark each as
  [quoted] (a published source as the file quotes it), [measured]/[observed] (measured or seen here), or
  [hypothesis] (reasoned, untested), as the source marks it (library record r57-0010). Never upgrade a mark.
- Say what you did not read or could not open, in a section "Not read".
- Keep every shell call under 240 s (`timeout` at most 240000, never 300000); put anything longer in the background
  with a log and read the log in calls under 240 s. A gap over 300 s between your calls rewrites your whole context
  (about 160 K tokens; r57-0176). Do not sit idle waiting.
- Write the output file early and add to it as you go (the app has restarted and killed helpers before).
- Your final reply to the coordinator: at most 120 words: the output path, a three-line gist, and anything
  blocked. Everything else goes in the file.
- Plain words; no new internal labels.
