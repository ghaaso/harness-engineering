# Departures: unit PC (FX-PILOT, branch u/PC)

1. **No new role. The existing role `control` becomes the single-session role.** PILOT-PLAN section 4 unit 3 asks for "a new
   single-session role in TASK_ROLES". The tree already has that arm: stage `control` and role `control` (CONTRACT:314-315,
   the task-row and tasks-plan schemas, guard-hook.mjs:27, selftest.mjs:61). replace.mjs:27-30 gives it the child brief by
   fallback, labelled `solo` so the brief does not name the comparison (spec/briefs.md:12, replace T13b), and audit.mjs:373
   exempts it from the lean-baseline flag. What it lacked was search and fetch: its profile allowed only Read, Glob, Grep and
   Write, with fetch `none`. The fix gives `profiles/control.json` the readers' search and fetch (WebSearch, WebFetch with
   fetch `any`, ToolSearch) plus Edit on staging. Agent and Task are denied, `agent_types` is empty, so it cannot fan out.
   `settings/control.json` is changed to match. The child brief's no-readers line now says to search and fetch directly.
   A second role would have duplicated `control` in two schemas, guard-hook, selftest, replace's label and audit's
   exemption, and the pilot would have had two possible roles for S1, one of them unable to search. A new settings template
   would also lack unit PA's tier hook after the rebase.
   Shown by: guard-hook.test.mjs T7 (control's Agent and Task are denied), T9 (control fetches any URL, WebSearch is allowed,
   Write outside staging is refused) and T14 (the shipped profile and settings); the selftest shards (settings agree with
   the profile); replace T13b (the brief still says `solo`).
2. **lib.test.mjs S0.5** pinned all 17 round-3 keys as guesses. `attempt_max_ticks` is now computed (source `measured`), so
   the test checks that instead. The other 16 keys are unchanged.
