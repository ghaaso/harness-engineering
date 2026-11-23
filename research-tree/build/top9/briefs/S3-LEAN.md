# S3 lean helper definitions. Name: S3-lean
Goal: helpers load only the tools their kind of job needs; tool descriptions are about 70 % of a helper's start-up
text (`research-tree/build/replays/replay-L2/RESULT.md`). Never tried here; library r57-0108 (the caller's model
value beats an agent definition's: documented, not tried).
1. Read replay-L2's RESULT.md and its scan script (in that folder) to know how a helper's first-call size is counted.
2. Read Claude Code's documentation on subagent definitions (the `tools` and `model` fields, where definitions live,
   whether a running session picks up a new definition). Web queries carry no project name or path. Check
   `.claude/settings.json` for how the archived FixFlow agents in `.claude/agents/` are switched off, so the new
   definitions are not switched off with them.
3. Write lean definitions for the kinds in `.claude/hooks/tier-routes.json` that helpers use (read, collect, run,
   build, analyse, refute; locate and extract if cheap), each with the smallest tool set the kind needs (reading
   kinds: Read, Grep, Glob, Bash, Write for the output file; collecting: add the web fetch and search tools; building:
   add Edit). Name them `lean-<kind>.md`. Add a short README line beside the tier routes saying they exist. Do not
   change the tier routes or any hook.
4. Do not start helpers yourself. Write the exact measurement for the coordinator: which two tiny helpers to start
   (one general-purpose, one lean-read, the same one-line task) and the command that reads each first call's input
   size from its transcript with replay-L2's scan. Give the expected saving from the documentation's tool list.
Output `research-tree/build/top9/out/S3-lean.md`.
