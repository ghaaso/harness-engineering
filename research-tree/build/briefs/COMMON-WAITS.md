# Line for the common brief of any unit that starts helpers (new file, 2026-11-24)

Why a new file: the existing common briefs are per session (`briefs/TOP8-COMMON.md` is top session 8's, finished) and
say only "keep each shell call under about 2 minutes" with no reason and no polling rule. Paste this block into the
common brief of a new top session, as the rule after "Keep tool calls short".

- A helper's prompt cache lives 5 minutes (r57-0176). Any gap over 300 s between two of your model calls (a shell
  call that runs long, a sleep, a wait for another helper) rewrites your whole context at full price, about 160 K
  tokens a time. Keep every shell call under 240 s: set `timeout` to 240000 or less (never 300000); start anything
  that may run longer in the background, writing to a log file, and read the log in calls that each end within 240 s.
  Do not run a foreground command with no timeout if it may pass 120 s (it is moved to the background and you wait).
