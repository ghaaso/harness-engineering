# P1 cold-resume trial — result (2026-11-13)

Agent: fresh Sonnet, given only the repo path, the plan path and "read SHIP-PLAN section 0 and P1".
Judged against expected.json (10 facts) by the P1 lane lead.

Score: 10 / 10 recovered (exact names and values: X-FixFlow-Api: 1; 32-byte gate with dev/test
exemption; 403 "PIN must be changed by the manager"; MIN_PIN_DIGITS_TECH 6 / min_length 6;
FIXFLOW_LEGACY_JWT_SECRET / _EXPIRES_AT, write routes only, exp not enforced, sub/ver/active kept;
docs off + body caps; full deep-health list incl. FIXFLOW_GIT_SHA; ping 48 -> 240 h + O08-F07;
-rs --junitxml skip gate + CLAUDE.md head check + --passWithNoTests; draft PR / Plan @ sha / hatch).
No miss, so no plan fix was needed to recover the facts.

Plan defects the trial exposed (for the coordinator; the lane does not edit docs/program):
1. P1 Entry (lines 322-328) says commit expected.json to docs/program/evidence/... and "fixes any
   miss in the plan (same PR)" -- contradicts section 7.1 (program files are the coordinator's).
   The lane wrote it to C:/Users/User/.fixflow-cache/handoff/p1/ instead.
2. "a known default PIN" (line 336) names no list. Lane ruling: the seeded PIN 1234
   (migrations 0004, 0012) and its 6-digit extension 123456; one constant shared by login,
   set_pin (API + script) and deep-health default_pin_active.
3. "write routes" (line 341) is undefined (method or allow-list?). Lane ruling: by HTTP method
   (POST/PUT/PATCH/DELETE), in the one auth dependency.
4. P1 Resume line 381 names branch fix/backend-first-boot-gate; section 7 lanes run on their
   worktree branch (claude/p1-backend-boot-gate-e5a6e7). Resume works from the PR either way.
5. Section 0 Gates (line 57) says Appendix A is on postgres:17 "from P3a on"; the agent could not
   tell which stack P1 uses -- section 7.4 answers it (16 until P3a), but section 0 does not
   point there.
6. P1 Done-when does not say "merged; deploy-train row added" although section 0 makes every
   behaviour-changing phase add a row; P1 also feeds the drain image, so whether it needs a
   train row is ambiguous.
