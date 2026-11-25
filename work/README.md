# work/

New work from the 17 Nov split, kept apart from the archived evidence (AGENTS.md: new work goes in new files).

| Folder or file | Row in the split | What it is |
| --- | --- | --- |
| `wp11-decisions/` | Row 1, WP11 | The decision board: every decision still owed, built from `decisions.json`. Open `index.html`; rebuild with `python3 build.py`. |
| `wp10b-ci/` | Row 2, WP10b-CI | A record-only check of `.claude/` agent and skill files. Run `python3 work/wp10b-ci/check_claude_files.py`; add `--enforce` to fail on errors. CI runs it from `.github/workflows/claude-files-check.yml`. |
| `assignment-simple/` | — | The 17 Nov split rewritten in plain words, with each package placed on the 20 Nov pipeline map. The original split wins where they differ. |
| `run-checks-*.txt` | — | The output of `tools/run_checks.sh`, which runs the repository's existing test suites in a temporary copy. |

Everything here is record-only: nothing blocks a merge, deletes a file or changes archived evidence.
