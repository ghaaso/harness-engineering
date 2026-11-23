# W3 result (FX-W3: acts that create work need a live confirmed arm), 2026-11-20

- **Branch** `u/W3`, **final commit cf7211ec** (63e36ff6 code, faa87c45 brief, a61a129d tests, 9e59ad65 specs and
  CONTRACT, cf7211ec e2e and fixture). `build` tip 2a8480af is the base: the merge was already up to date.
- **Tests** (MAIN's lane, at a61a129d; later commits change no script or test file):
  - `W3-tests-a`: watch, status, lib: 328 tests, 319 pass, 0 fail, 8 skipped, 1 todo (lib "FX-PLAN T1 total
    table", which waits on FX-CLOSE step 3, not W3's).
  - `W3-tests-b`: replace, handover, stop: 160 tests, 152 pass, 0 fail, 8 skipped.
  - `W3-guard`: guard-hook from the detached checkout `hx-W3` outside `.claude/`: 31 tests, 28 pass, 0 fail,
    3 skipped (removed after).
  - New tests: replace "FX-W3 not-armed" and "FX-W3 revocation never gated", watch "FX-W3 unarmed record",
    guard-hook "FX-W3 hook", status "FX-W3 endturn", and lib "FX-W3 armedState". Old fixtures adapted: replace
    roots armed by default, endturn tests write the reconcile's turn.json, the slot record's `turn_seq_at_reg`,
    the brief line's last sentence, G4 armed.
- **e2e** (`W3-e2e2`, detached checkout at cf7211ec): 232/232 steps ok. The first run (`W3-e2e`) failed at
  fence first and start (`not-armed`) and the selftest fixture `replace/good-fence-first`; adapted as departure 11.
- **Departures:** `MAIN/research-tree/build/departures/W3.md` (11 items).
- **Tokens:** helper 1: 16.59 M (stopped at the 330 K checkpoint); helper 2: `build-invariant: W3 lock and arm
  successor | calls 82 | tokens 12.00 M | context now 225.5 K` before these two files; about 28.7 M for the unit.
- **Not done:** `tcb/test/selftest.test.mjs` not run (the fixture changed; the e2e's selftest run passes every
  fixture). FX-W4's dead-man, which reads the unarmed records, is B1-4's.
