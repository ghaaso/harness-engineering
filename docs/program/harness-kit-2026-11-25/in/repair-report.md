# Repair of F1 and F2 (2026-11-26)

Done: both faults repaired in the JavaScript hooks and the Rust programs, one new case in each of the three test files,
clippy clean, README and RULES lines written. Nothing committed.

## F1. Opus window in the fallback table

- `.claude/hooks/window-ceiling.mjs` 94-96: `WINDOW_BY_FAMILY` gains `opus: 400_000` (comment cites r57-0107). A window
  given in the settings still wins, so this PC is unchanged.
- `harness-kit/rust/crates/kit-window-ceiling/src/limits.rs` 23-29: the same entry (array of 3).
- `.claude/hooks/window-ceiling.test.mjs` 436-446, new case: settings `{}`, an Opus transcript at 400 K (past the
  348 K compaction line of a 400 K window, under its W* of 437 K), an Edit of `src/app.py`: refused. Checked against
  the old hook: this case fails there (exit 0), so it shows the fault.
- `harness-kit/README.md` 113-116: without an Opus window in your settings the hook takes 400 K; if Opus compacts
  before about 330 K the line is never reached; the key is `modelSettings.<model id>.autoCompactWindow`, the three
  files it is read from, and the example.

## F2. The kit form of `--end` named

- `.claude/hooks/count-gate.mjs` 53-56 (`KIT_END`), 96 (`--clone=` also left out of an `--end` reason in kit mode), 184-186:
  in kit mode the stale text is `node "<this hook>" --end <helper id> "<why>" --harness-kit "--clone=..." "--project=..."
  (ids and silences: node "<this hook>" --status <8> <same kit arguments>).` Without `--harness-kit` the text is unchanged.
- `harness-kit/rust/crates/kit-count-gate/src/main.rs`: `KitEnd` in `Places` (built in kit mode from the program's own
  path, `--clone=`, `--project=`), passed to `decide`; the same text with `"<kit-count-gate.exe path>"`.
- `.claude/hooks/fanout-gate.mjs` 57-64 (`kitEnd`) and the cap refusal (about line 351): in kit mode the refusal adds
  `A helper that died without ending (an app restart) stays reserved until ended by hand: <count-gate program> --end
  <helper id> "<why>" <kit arguments> (what the count gate counts: <program> --status <8> <kit arguments>).`
- `harness-kit/rust/crates/kit-fanout-gate/src/main.rs`: `kit_end` (line 321; the count-gate program beside this one),
  appended to the cap refusal in kit mode only.
- New cases: `fanout-gate.test.mjs` K12 (kit cap refusal names `--end` and `--status` with the clone and project paths);
  `count-gate.test.mjs` "kit: the refusal names --end and --status ... (repair F2)".
- `harness-kit/README.md` 118: the line under the cap. `harness-kit/RULES.md` K3: the line, with K3 reworded to stay
  under the limit (5,999 characters).

No existing expectation changed: no old case held kit-mode `--end` text.

## Tests, both ways

| file | JavaScript | Rust (`KIT_HOOK_BIN_DIR`) |
|---|---|---|
| window-ceiling.test.mjs | 135 passed, 0 failed | 135 passed, 0 failed |
| fanout-gate.test.mjs | 49 ok, all passed | 49 ok, all passed |
| count-gate.test.mjs | 28 pass, 0 fail, 2 skipped (as before) | 28 pass, 0 fail, 2 skipped |

Cargo (one call, `--offline --locked -j 6`, own target dir): fmt, clippy `-D warnings` clean, crate tests 19 + 21 + 19
pass, release build ok. Tested on copies in the scratch folder, then the six files were copied into `.claude/hooks/`
in one step (byte-identical to the tested copies).
