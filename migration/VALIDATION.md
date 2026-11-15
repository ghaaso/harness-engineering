# Extraction validation

Checks were performed on the extracted files or an isolated temporary validation copy. Source projects were not modified by the checks.

- All 3,252 initial source-manifest records matched source bytes and destination SHA-256 hashes: 2,840 working-tree/context files and 412 branch-object files.
- All 296 original/extracted commit-map entries were reachable and retained identical path/blob/mode trees within the selected extraction paths. Research branch variants and alternate device-lab history are preserved.
- Reference report build: passed; 484 ideas, 12 themes, 130 bottlenecks, 16 packages.
- Short report build: passed with the same source counts.
- Library model: **61 / 61 tests passed**.
- Library revision-4 regression: **119 targets checked, zero misses**; 75,364 numeric comparisons, largest relative difference approximately 5.90e-17.
- Recovered Claude context package: **85 tests run, one skipped, no failures** (the suite uses synthetic fixtures).
- Initial release: all seven ZIP hashes and **37,664 unique objects** passed verification, covering **84,765 data paths**. A real restoration of 31 smoke-model/input files to a separate temporary directory passed.
- An independent high-confidence credential scan covered current text, 2,229 reachable historical text objects, and text/links from eight PDFs (661 pages). No actual credential was identified. Raster images were not OCR-scanned. Additional recovered text was scanned during capture; this is not a guarantee that every possible sensitive datum has been recognized.

Final validation passed for **7,862 directly preserved files**, all **eight archives**, and **44,357 unique release objects** covering **96,420 data paths**. The final text credential scan reported no high-confidence matches in 7,096 current text files and 5,460 historical text objects. See `validation/final-checks.json` for the recorded totals. Report checks do not establish the scientific correctness of the underlying findings. Full training, held-out evaluation, live infrastructure, Android builds, and application suites were not rerun for a byte-preserving extraction.

All 96,420 data paths were then restored into the new local repository. A final `--include-restored-data` check verified **104,282 files with zero failures**. These data files are intentionally ignored by ordinary Git operations; the private release is their portable storage.

To repeat the offline report and model checks, copy the relevant directories to a temporary directory first: some historical check scripts write their output next to preserved evidence. The commands used were `node docs/program/evidence/harness-compile/build/build.cjs`, the same command with `--short`, and Node reading `engine-test.js.txt` / `rev4-regression.js.txt` from stdin in `docs/program/evidence/library-pathways`.
