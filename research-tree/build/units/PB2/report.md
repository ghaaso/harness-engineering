# Unit PB2 report (returned as text by the builder; the app refused its write of this file; saved by session c599f391)

Branch u/PB2, final commit 8f9a4ce6 (cut from build 5d3a627a; not landed). Departures: research-tree/build/departures/PB2.md.
Confirmed from the app's bundled Claude Code 2.1.330 (read, not run; no outside request): the rule parser maps Task to Agent; a deny of the whole tool refuses the call before any allow rule is read, so denying Task blocked Agent(scorer), Agent(checker), Agent(reader).
Fix: Task removed from tools_deny and from the settings deny lists of coordinator, child, child-reviewing and canary; the guard hook still refuses a Task call (tool-not-allowed: not in tools_allow). Updated: guard-hook spec (tools_deny, T14), selftest spec, guard-hook T6 and T14, selftest role-files. New tests: guard-hook PB2 and selftest PB2 (fail when an allow rule's tool is denied whole under any of its names).
Tests (lane label: pass/fail/skipped): PB2-gh-t6t14b guard-hook T6, T14, PB2 3/0/0; PB2-gh-oldtemplates T14 and PB2 on build's old templates 0/2/0 (the new test fails on the old templates, all five blocked allow rules listed); PB2-st-rolefiles selftest PB2, PA-4, T11 3/0/0; PB2-gh-full whole guard-hook file from a detached checkout outside .claude 31/0/3 (3 need the app).
Test files for land.mjs: tcb/test/guard-hook.test.mjs tcb/test/selftest.test.mjs.
Not done: not run in the app; the alias table is from 2.1.330 only. Tokens 2.48 M (44 calls).
