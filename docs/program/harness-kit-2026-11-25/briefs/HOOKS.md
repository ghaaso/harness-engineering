# Brief: the kit hooks hold a second person's sessions, in any project of hers (one Opus builder)

The owner's words are in `../OWNER-WORDS.md`. Read them first. They outrank this brief.

token limit 12 M (expected about 6 M, basis r58-0104)

Deliverable: .claude/hooks/kit-mode.mjs

## Why

The teammate clones this repository on a Mac, runs `node harness-kit/setup.mjs --apply` once, and from then on her
sessions are to be held to the method. Today the set-up wires three hooks; the two that hold the count of helpers
and the token limits are left out, no hook loads the rules at a session's start, and every hook assumes that the
work lives in this repository's folders. She works in a repository of her own.

Read `../CONTRACT.md` in full: sections 1 and 2 are the kit mode you build, section 6 the rules that bind you.
Then `../in/setup-report.md` (why two hooks stayed out, the smallest changes) and each hook's header comment.

## What to build

1. **`.claude/hooks/kit-mode.mjs`**: one function that, from `process.argv` and the hook's own folder, gives: kit mode
   or not, the clone, the project (`--project=<folder>`, else the clone), the state folder `<project>/.harness`, the
   log folder `<project>/.claude/logs`, and whether a usage tool exists (`--no-usage-tool` absent). Paths compared as
   real paths (a clone under a symlink, as `/tmp` on macOS, must match what the app sends). A hook that cannot load
   this module behaves as it does today.
2. **`window-ceiling.mjs` in kit mode**: the project is its root; a session past its line may write its hand-over
   under `<project>/.harness/` (state files and briefs) as it may under `research-tree/build/` here; the session
   lines are found from `<project>/.harness/*-STATE.md` the way they are found from the owner's state files today.
   Nothing in kit mode depends on a Windows-only folder.
3. **`tier-hook.mjs` in kit mode**: logs under the project; the routes stay beside the hook. Give it a test file of
   its own, `.claude/hooks/tier-hook.test.mjs`, that needs nothing outside `.claude/hooks/` (the cases of
   `selftest.mjs` that are about this hook, and the ten sample calls in `harness-kit/check-clone.mjs`);
   `selftest.mjs` keeps passing here. Do not build an effort check: find out whether a hook is shown an effort value
   on a helper start (the tool input of a real start in a transcript under this session's folder) and say in your
   report what building that check would take.
4. **`creep-gate.mjs` in kit mode**: the project is its root; briefs are read from `<project>/.harness/briefs/`.
   The way past its rules that cites an owner's ruling needs the record book: say in the report what it does where
   the record book is absent.
5. **`count-gate.mjs` in kit mode**: widths and holds are read from `<project>/.harness/WIDTHS.md`; logs and lock
   under the project. Its test file passes in a clean clone: the two cases that read the owner's
   `research-tree/build/WIDTHS.md` and `plan.json` skip where those files are absent, and say so.
6. **`fanout-gate.mjs` in kit mode**: the project is its root; the state file with the session and the cap is a
   `.md` file in `<project>/.harness/`; brief files are found as today (a `.md` path in a folder named `briefs`).
   A cited basis is good when it is a measured or observed record in `<project>/library/journal` (where that
   exists), or an entry of `harness-kit/basis.json` in the clone, or an entry of `<project>/.harness/basis.json`
   (her own measured costs). With `--no-usage-tool` the meter rule is off and each pass says so in the log; without
   it the meter rule is as today (the tool is `mcp__ccd_session_mgmt__get_usage`). Every other rule as today.
7. **`harness-kit/basis.json`**: made by a script from the record book, not typed: every record that
   `harness-kit/ORCHESTRATION.md` or `harness-kit/RESULTS.md` cites as the cost of a helper role or of a session,
   with status measured or observed: `{ "id", "status", "date", "claim" }` (the claim cut to its first 300
   characters). Keep the script beside it (`harness-kit/basis.build.mjs`); it runs only where `library/` exists.
8. **`harness-kit/tokens.mjs`**: `node harness-kit/tokens.mjs [--project <folder>] [<session id or its first characters>]`
   prints, for a session of that project, each helper with its description, model, messages and tokens, counted as
   the fan-out gate counts (input + cache creation + cache read + output, once per message id), and the session's
   own. `--basis "<what was measured>" <agent id>` adds that helper's figure as an entry of
   `<project>/.harness/basis.json` with an id `own-NNNN`, status measured and the date. This is how she gets limits
   with a basis of her own. Find the transcripts the way the app stores them (under the user's `.claude/projects/`),
   with no Windows-only path.
9. **`harness-kit/hooks/kit-start.mjs`**, a SessionStart hook on the model of `.claude/hooks/library-start.mjs`: at
   start, resume, clear and compaction it puts into the session, in this order: where the kit is (the clone's path,
   so a session in her own project finds the commands), the text of `harness-kit/RULES.md` (another helper writes
   it; cut at 9,000 characters; if it is missing, one line pointing at `harness-kit/ORCHESTRATION.md`), the names of
   the state files in `<project>/.harness/`, and after a compaction the line that the summary is not the record.
   A test file beside it.

## Tests

- Every existing test file of a hook you changed passes as before (say the counts before and after). New cases per
  hook for kit mode with a project in a temp folder: at least one call that passes and one that is refused.
- Every test file you add or change must pass in a clone that holds only what `main` holds (no `library/`, no
  `research-tree/build/`, no `.claude/settings.json`): `git ls-tree -r --name-only origin/main` shows it.
- Do not put a literal write into the teammate's folders in any command or test (the owner guard reads them).

## Hand-back

`docs/program/harness-kit-2026-11-25/in/hooks-report.md`: each file built or changed; for each hook the exact
command line the set-up must write (event, matcher, arguments); test counts; what is not tested (macOS, a live
session); what you could not do, with the smallest change. Return under 1,500 tokens.
