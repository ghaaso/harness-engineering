# Issue: a coordinating session pays for its whole window on every wake

Logged 2026-11-24 at the owner's word ("log this into a file that this is an issue that occurs when coordinating with
subsession, so we could trace back to it later and work on this, improve it in the harness later on whenever it
occurs"). Status: open. Measured once, on one round; the fixes below are hypotheses.

## What happens

A session that starts child sessions or helpers and watches them is woken by every event: a helper's hand-back, a
child's turn ending, a background watch exiting. Each wake is a new model call that reads the coordinator's whole
conversation again (counted as cache reads). Once the window is large, each wake costs about the window's size, even
when the wake does one line of work ("read the watch output", "stop that session", "re-arm the watch").

## Measured here (round 8 of the session monitor, `docs/program/monitor/NEXT-ROUND-8.md` sections 7 and 8)

- The coordinating session (Claude Code session `b2aba103-a82a-43ad-95f5-a9238a61936f`, Opus) spent **21.3 M tokens in
  all, about 15.4 M of them in the clickable-prototype round** (from about 09:45 UTC), against about 44 M spent by the
  four builders it coordinated. Counted from its transcript: all four usage fields, once per message id.
- Its window was about 115 K at its start and about 290 K by the end; each wake cost roughly 0.25 to 0.35 M.
- Most of the round's wakes did almost nothing: per builder event, three calls (read the watch's line, stop the
  session, re-arm the watch), for four builders and three limit raises.

## Why it was so large this time

1. **The window was never handed over.** The same session did the previous step (reading the research, looking at
   screenshots, writing briefs) and then coordinated; nothing was moved to a fresh, small coordinator.
2. **It could not hand over.** The app refuses `start_session` on a turn begun by a notice, a helper or another session
   (memory note "A child session cannot start sessions"), so the session that started the builders had to stay their
   parent; a fresh coordinator started by it could not have started them.
3. **The spend watch woke the coordinator for every crossing** and could not stop a session itself, so each stop took
   a model call.
4. **Stopped sessions ran queued messages next** and overran their limits (builders ended at 9.2 to 12.4 M against a
   9 M limit), which caused more wakes and more stops.

## Ways to fix it (hypotheses; nothing tested)

- **Enforce a child's token limit inside the child**, by a hook that reads the child's own transcript and refuses tool
  calls past its limit (the way the window-ceiling hook refuses calls past a window line). The coordinator is then
  woken only when a child ends, not to police it.
- **Keep the coordinator's window small from the start:** a session that will coordinate does no reading of its own
  first; briefs point at files.
- **One watch per round that only reports ends**, not one per limit crossing.
- **Never queue a message to a running session as a limit change;** write the limit to a file the child's hook reads.
- **Measure the cost per wake** when this recurs (window size times wakes) and add it here.

Related: memory note "Token bottleneck measured" (the long coordinator window is the main sink, not file reads);
library record r57-0139 (an Opus orchestrator at about 114 K before its first helper returned).
