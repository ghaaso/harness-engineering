CLOSING: main-module guard through a junction (all 24 tcb scripts)

ROOT = C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/tcb-build

SAFE CALL USED
- Every runMain script: one unknown flag, `--main-guard-probe`. lib.parseArgs refuses it with `usage` 66 before anything is read (CONTRACT section 1: an unknown flag exits 66 before anything is read; exit table 66 usage). Started with cwd = the test's temporary folder and an empty stdin.
- guard-hook.mjs: no arguments and an empty stdin. It answers exit 2 with `[guard-hook] deny <code>` on stderr and decides nothing.
- Compared: exit code plus the one JSON line on stdout (deepEqual of the whole object); for guard-hook, exit code plus the deny code.

TABLE (guard before | failed before the fix | changed)
- admit           | lexical path.resolve compare (isMainModule)            | yes | yes
- audit           | none: runMain called unconditionally                    | no  | no
- certify         | none: runMain unconditional                             | no  | no
- check-queue     | lexical path.resolve compare (const isMain)             | yes | yes
- commit          | none: runMain unconditional                             | no  | no
- compare         | none: runMain unconditional                             | no  | no
- cost            | realpath of both sides, catch -> false                  | no  | no
- fsck            | none: runMain unconditional                             | no  | no
- gate            | none: runMain unconditional                             | no  | no
- guard-hook      | import.meta.main, lexical, then realpath (fixed in U3)  | no  | no
- handover        | lexical path.resolve compare (isMainModule)             | yes | yes
- harvest         | none: runMain unconditional                             | no  | no
- promote         | none: runMain unconditional                             | no  | no
- protocol-freeze | none: runMain unconditional                             | no  | no
- render          | none: runMain unconditional                             | no  | no
- replace         | lexical path.resolve compare (isMainModule)             | yes | yes
- seed            | lexical path.resolve compare (const isMain)             | yes | yes
- selftest        | none: runMain unconditional                             | no  | no
- snap            | realpath of both sides, catch -> false                  | no  | no
- status          | none: runMain unconditional                             | no  | no
- stop            | lexical path.resolve compare (isMainModule)             | yes | yes
- tms             | none: runMain unconditional                             | no  | no
- watch           | none: runMain unconditional                             | no  | no
- witness         | realpath of both sides, catch -> false                  | no  | no

The fix (inline, the same in all six): import.meta.main === true -> main; else, if argv[1] is a string, compare a key of argv[1] with a key of fileURLToPath(import.meta.url) (path.resolve, lower-cased on win32 as each script did before), and if they differ compare the key of fs.realpathSync(path.resolve(argv[1])); any throw -> false. This is guard-hook's comparison and fallback. Only the guard block changed (plus a three-line comment); no lib.mjs edit, no export, no exit code or output change. All six already imported fs.

NEW TEST: ROOT/tcb/test/main-guard.test.mjs (24 tests, one per script)
One junction for the file (ROOT/tmp/mg-XXXX/tcb-link -> ROOT/tcb), removed with rmdirSync (link only), then the empty temp folder with rmdirSync; never a recursive remove. One child process at a time. Each test asserts: the real path is refused (66 usage, or exit 2 with a deny code for guard-hook) and is not a silent exit 0; through the junction it is not a silent exit 0, has the same exit code and the same machine-readable answer. Checked afterwards: no mg-* folder left in ROOT/tmp.
- Before the fix: 24 tests, 18 pass, 6 fail. Failing: admit, check-queue, handover, replace, seed, stop, each "junction: silent exit 0".
- After the fix: 24 tests, 24 pass, 0 fail, 0 skipped.

SUITE AFTER THE FIX (one lane command per file, --test-concurrency=1, tap reporter; tests/pass/fail/skipped, all exit 0)
admit 38/36/0/2; audit 28/24/0/4; certify 17/17/0/0; check-queue 27/24/0/3; commit 35/34/0/1; compare 27/25/0/2; cost 26/24/0/2; fsck 20/20/0/0; gate 24/22/0/2; guard-hook 19/16/0/3; handover 22/19/0/3; harvest 21/19/0/2; promote 24/22/0/2; protocol-freeze 29/27/0/2; render 33/30/0/3; replace 81/79/0/2; seed 31/28/0/3; selftest 31/29/0/2; main-guard 24/24/0/0.
Every number matches the e2e-fix baseline for the same file. Subtotal of the 18 existing files run: 549 tests, 516 pass, 0 fail, 33 skipped (+ main-guard 24/24/0/0).

NOT DONE (handed to the coordinator, who now runs them)
- selftest.test.mjs ran (label mg-suite-selftest) and ended exit 0 (numbers above). The harness moved that foreground call to the background after 180 s on its own; I set no background flag.
- Not run: snap, status, stop, tms, watch, witness, lib (560 s), and the self-test run (selftest.mjs run --root <tmp copy> --ce 1).
- Earlier I also let one batch (cost..promote) run as a single Bash loop; it was moved to the background the same way. All its files ended exit 0 (numbers above). The loop retried on lane exit 75 (busy) with a 5 s pause; it never had to.

HASHES
- No fixture or test stores the hash of a changed script, as far as I found: fixture ledgers carry writer_sha values but nothing checks them against the current scripts (the suites above passed after the change). The self-test's tcb_sha (a hash of the whole tcb/ copy) will differ from the 9a0a17ea... recorded in done/e2e-fix.json; that is a result, not a stored expectation. Not verified by a self-test run.

DOCUMENT LINES THAT SHOULD FOLLOW (not edited; another agent owns them)
- CONTRACT (section 1, script conventions) or spec/lib.md: "A script that guards its entry decides it is the main module by import.meta.main, else by comparing the real path of process.argv[1] with its own file (import.meta.url is already a real path); a lexical compare is wrong: started through a junction or symlink it exits 0 doing nothing."
- done/fix-U1.json note-main-guard (not_fixed) is now fixed for admit, replace, stop and handover; check-queue and seed had the same defect and are fixed too.
- Optional: list main-guard.test.mjs among the suite's test files wherever the suite is enumerated.
