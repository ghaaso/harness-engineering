# Agent A, r58c: state after the 2026-11-14 hard reset (checked 22:12-22:40Z, from disk only)

Windows was last alive at 21:45:25Z and rebooted at 22:03Z. No container was started after the reset. The only run
since then is r58c/A/test_ktest_race.sh, a host-only check that uses a stub `docker` on PATH and starts no container.

## 1. Bytes on disk against the last record

Two records were used: the sha256 each test log prints for the bytes it tested (logs of ktest-a7, a8 and a9), and
READY-format's manifests.

| file | sha256 now | last record | state |
|---|---|---|---|
| train/HANDOFF-FORMAT.md | 9f86534c30968f698d668cde15fc70f8a9768d7f227430129db36cf9aafc118e | READY-format, the coordinator (9f86534c) | same, frozen (rev 1b) |
| train/answer_level.py | c992fbedc65ced5e3830fbe8b26d58d68d678fd3fede226624593ea4b132bc71 | test_answer_level.log, test_heldout.log (a8) | same |
| train/answer_level.js | 0d346e665ba24323505958c8f3f6ec30bdf09978bf969900d9cf3aebfae13f7a | a8 logs | same (unchanged this round) |
| train/heldout.py | 2e520639cffc217875af96180031cbc9d12c0099e5d1c44bff5ffb885bdc7184 | test_heldout/_e4 (a8), test_probe (a9) | same |
| train/heldout.sh | 2af19db1a09766ef37058b964151a0c46e9b5dbc4a91397cff55c6db2c5d5e23 | test_heldout (a8), test_leak_audit, test_probe (a9) | same |
| train/heldout_inputs.js | 991ca06e6c16d0221b92478b5fe12194c9f113da43177b29abdcede21a376ff7 | test_heldout.log (a8) | same |
| train/leak_audit.py | 629c0df397c596fc6c9f57e70b55469dceef62df2067496c001c8fe0c18958e2 | test_leak_audit.log (a9) af4360a1 | changed after the reset: comment only (rulings 92-93 dates), see 3 |
| train/r58/tests/test_leak_audit.py | e548cadeb366e44cc5fe8936d4962856efce7c0c6437c6db186726003a40f39c | written 21:41:55Z, after a9 started | the g_net fix (see 2); intact (tail and r92 block read back, no NUL bytes) |
| train/r58/tests/test_answer_level.py | afaba67fe72b3187c61363dd255697acfcf0b4d84bd45acc350566b9ddf1e7df | a8 PASS | not edited since |
| train/r58/tests/test_heldout.py | 2b8dce322bd49b578d07a6898bf267ca5c2bf1572d1d3c7fd3005311c75bc298 | a8 PASS | not edited since |
| train/r58/tests/test_heldout_e4.py | 36ce3ae552cda1c349a3dcccaeaef8b00e340be114daad82452bffe2efb6a1c7 | a8 PASS | unchanged this round |
| train/r58/tests/hotest.py | 52c53c45e3b06960f6377ba22608b1579465e01b57c801f0c594fe766a5247f6 | a8 PASS | not edited since |
| train/r58/tests/test_probe.py | 7f25de7356d58521e6d2383ee9e3566185005c4c53da0972d70a04971f77acbc | a9 (failed, see 2) | not edited since |
| r58c/A/precheck_handoff.py | e0cc88fa2ae852b22d180c4f0c03cd9946fa021cc3d33a848026b282ad15b9a7 | precheck_handoff.log (a8), READY-format | same |
| r58c/A/build_handoffs.py | f76aee86316214f6ddfc815e8b83cbcd2e71b30b443637aab13880fab774dfae | build_handoffs.log (a7) | same |
| r58c/A/ktest.sh | 910aa06c6e902fe402e1690bb8003a925d3f10dec7276ce380c003acf1d52dc3 | before: r58c/A/pre/ktest_r92.sh 7a1cf8df | changed after the reset: the start-race fix (see 3) |
| r58c/A/test_ktest_race.sh | e882a8bf6031aa3bf73a5808e4bed9b50745f4c85f73e554ae98e969efce4b35 | new after the reset | PASS (logs/test_ktest_race.log) |
| r58c/A/write_ready.js | d76c05a6cbad174379683327d2e01f4d9e1d28d7a5b20777086fa7f6c442653a | wrote READY 9c1104c0 | same |
| r58c/A/sums.js | 2cdf03308c7567e253bdb9e9003fc7ebb3ff0e04ccecd55f10722797ca495727 | - | list extended (new files) |
| r58c/READY-format | 9c1104c0b8bd0bb0f09cf3a66d6031dcbedba98dac020b964d261ad84d0ab39e | given to the coordinator | same |
| r58c/handoff-test/tune/HANDOFF.json | 0565f62aa96403ae646905a733d2240722d033bee9eeab69f4dbb3708430fb8c | READY-format | same; all 182 manifest rows of both hand-offs re-hashed, 0 differ |
| r58c/handoff-test/heldout/HANDOFF.json | d229db04cfa3b21ffc5f9d7f171b1995b863fe3d3cea29feb6eba85e8698ddd9 | READY-format | same |
| r58c/A/out/ho_rec/item27.json (TEST record) | 7bab6b299c14d911b37f88c12997500a874fdae9b7d6576e2b82dc065d8d12dc | READY-format | same |

Parse checks:
- `node --check` passes on train/answer_level.js, train/heldout_inputs.js, r58c/A/write_ready.js and r58c/A/sums.js.
- `sh -n` passes on r58c/A/ktest.sh, r58c/A/kt_inner.sh, train/heldout.sh and r58c/A/rehearse.sh.
- Python (no host python): the a9 container imported and ran leak_audit.py (af4360a1). The test logs show the other
  Python files ran on these same bytes. I read back the two Python files written after a9 (the comment patch of
  leak_audit.py, and the r92 block and tail of test_leak_audit.py). Neither is torn and neither holds a NUL byte.

## 2. Test results on disk

| log | result | note |
|---|---|---|
| logs/precheck_handoff.log (a8) | PASS | both TEST hand-offs, 0 problems; 4 tamper cases caught |
| logs/test_answer_level.log (a8) | PASS | r91 and pick8 checks, lines 52-59 |
| logs/test_heldout.log (a8) | PASS | |
| logs/test_heldout_e4.log (a8) | PASS | |
| logs/build_handoffs.log (a7) | PASS | |
| logs/test_leak_audit.log (a9) | FAIL, 2 checks | r92_both_guards_parsed and r92_audit_fails_on_a_differing_guard. The test's "changed flag" copy replaced `--network none` at its first match, which is a comment (guard line 5), so the run lines did not change. Fixed in the test (it now replaces the run-line text `--network none --cpus 6 -m`). The audit code was right: in the same run the changed-CAP copy was refused, and the old-guard-only call was refused. |
| logs/test_probe.log (a9) | FAIL | `PermissionError: [Errno 13] ... probe.json.part -> probe.json` (heldout.py:780 os.replace) at 21:49Z, in the minutes before the hard reset. The same code passed in ktest-a3, and this round did not change heldout.py's probe path. Treated as a failure of the dying host's bind mount, not a code defect. The rerun is queued. |
| logs/test_ktest_race.log (host, after the reset) | PASS | the before bytes miss a rival; the current bytes stop only their own container and exit 14 |

## 3. Phase 2 and the later rulings: done or partial

Done, code and test:
- MF-6, 7, 8, 9, 10, 11 and 13; HD-11; the four leak_audit defects; ruling 89; the staging and freeze manifests.
- Ruling 90: test_leak_audit r90_* checks, PASS in a9.
- Ruling 91: test_answer_level r91_* checks, PASS in a8.
- pick8 test set: pick8_named_set, build_handoffs and the precheck. READY-format rev 2 is written. HANDOFF-FORMAT is
  frozen at 9f86534c.

Done in code, test PASS pending:
- Rulings 92-93 in leak_audit.py: `ruling92()` and `docker_runs()`. Both stage-B guards are parsed. Their docker run
  lines may differ only in the MIN_FREE_GB and START_FREE_GB values, after each script's own variables are expanded.
  A real audit must be given both guard-stageB.sh and guard-stageB-r92.sh. The result goes in `res['ruling92']` (key
  `text`, also printed in AUDIT.md) and its problems go into coverage. After the reset only the comment changed, to
  the ruling-93 dates. The fixed test is queued.
- The launcher start race (r58c/A/ktest.sh): it checks again right before `docker run`, starts the container under
  the lane lock, and checks `docker ps` again 3 s after the run. If another ktest-* appeared, it removes only its own
  container and exits 14. Checked on the host (PASS). It still needs its first real use.

Partial:
- test_probe: needs a clean rerun.
- RUNLOG-A.md: not written yet. It needs the PASS lines of the queued runs, so it is the last step of TEST-QUEUE.md.
- The probe and rehearsal on the card: not run by A (the card belongs to the coordinator).
