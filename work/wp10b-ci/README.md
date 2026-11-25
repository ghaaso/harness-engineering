# Claude files check (WP10b-CI)

Checks every `.claude/agents/*.md` and `.claude/skills/*/SKILL.md`: the `---` header is there and closed (FM1), `name` and `description` are set and the name matches the file or folder (FM2), each agent pins a `model` (AG1), lists its `tools` with at most 7 entries (AG2) and only names skills that exist (AG3), and each skill description stays within 1024 characters, with a warning above 1000 (SK1).

Run it from the repo root: `python3 work/wp10b-ci/check_claude_files.py` (options: `--root DIR`, `--max-tools N`, `--json OUT`, `--enforce`). Tests: `python3 -m unittest discover -s work/wp10b-ci`.

Record-only (the default) prints the table and always exits 0, so it never blocks a merge. `--enforce` exits 1 on any error-level finding; turn it on once the record has been clean for a while. Warnings never fail.

To use it in FixFlow: copy `check_claude_files.py` into that repo (for example `tools/`), then add one step to an existing workflow job that already has Python:

    - run: python tools/check_claude_files.py --json claude-files-report.json

Add `--enforce` to that line when you want it to block.

The CI workflow here is `.github/workflows/claude-files-check.yml`. The first real run on this repo is in `first-run.txt` and `first-run.json`.
