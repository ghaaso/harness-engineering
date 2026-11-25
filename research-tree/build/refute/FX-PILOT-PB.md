BREAKING: the coordinator's settings deny `Task`, and the app's Claude Code (2.1.330) reads that as a deny of the whole `Agent` tool, so `Agent(scorer)` is refused before the guard hook is asked. The fault was there before PB and is wider than PB.

# Refute FX-PILOT unit PB (the scorer can be started): blind review of `fa8d28c1..7542fe1b`, run on `build` 5d3a627a

## Breaking

1. **`tcb/settings/coordinator.json`:37 `"Task"` in `permissions.deny`** (`profiles/coordinator.json`:22 puts it there: T14 and
   `selftest.mjs`:469 require settings to deny every `tools_deny` entry).
   - **What the harness does with it.** This is a static reading of the app's bundled binary
   (`Claude-Data/.../claude-code/2.1.330/.../claude.exe`), not a run in the app. The rule parser normalises every rule's
   tool name through a legacy table, `{Task:"Agent",KillShell:"TaskStop",...}`, in the code
   `return{toolName:zl(t.toolName),ruleContent:n}`, so `"Task"` becomes a rule on the whole tool `Agent`. Before any
   allow rule is looked at, the per-call check (`vNt`) returns `deny` "Permission to use Agent has been denied." for a
   rule that covers the whole tool. Its only exemption is the end-conversation tool (`mU`). So
   `Agent(scorer)` (PB's line 30) and `Agent(checker)` are both refused. The same holds for `Agent(reader)` in
   `settings/child.json`, `child-reviewing.json` and `canary.json` (line 16 of each).
   - **Failing test** (scratch `tcb/test/refute-pb-alias.test.mjs`, lane label `rPB-alias`). It extracts the table from the
   binary, checks that the parser applies it, then for each settings template checks that no allow rule's tool is also
   denied as a whole tool. Result: 1 fail:
   `coordinator.json: allow Agent(scorer) is overridden by a blanket deny of Agent`, the same for `Agent(checker)`, and
   `Agent(reader)` in child, child-reviewing and canary.
   - **What it should do.** The coordinator can start the scorer. Drop `Task` from `tools_deny` and the settings deny
   list of every role that starts helpers (coordinator, child, child-reviewing, canary), and update spec/T14/selftest.
   The guard hook still refuses a `Task` call, because `Task` is not in `tools_allow`. Without this, Comparison 1's
   blinding check is `not_run` and the children have no readers.

## What PB itself claims: each mutation was caught (guard-hook tests T6, T7, PB, T14; baseline passes; lanes `rPB-mut1`, `rPB-mut2`)
`scorer` dropped from the coordinator's agent types; `Agent(scorer)` dropped from settings; scorer reads all of `views/`;
scorer gets `Glob`; `scorer` added to the child's types; the helper keeps the folder's profile (guard-hook.mjs:440);
the agent file's tools set to `Read, Grep`; the agent body differs from the brief; `Bash` dropped from `tools_deny`;
`fetch: any`. Ten of ten were caught. The full guard-hook file passes on build: 30 pass, 3 needs-app skipped (`rPB-gh-base`).

## Small items
- `guard-hook.mjs`:28 `PLAIN_ROLES` lists `reader` and `checker` but not `scorer`. This has no effect, because helpers never get `--role`.
- `audit.mjs` (coordinator form) checks a helper's reads only for queue batches and `sealed/`. A scorer that read
  `views/comparison.json` would not be listed. The hook blocks that read while the run is live.
- No script installs `<root>/.claude/agents/scorer.md` for the coordinator; `replace.mjs` installs agent files only
  for attempts. The run root's set-up must copy it next to `checker.md`.
- PB left the scorer out of `selftest.mjs`'s role lists. PA fixed that afterwards (c9f5067e).
- It is not proven that an Agent helper with `tools: Read` can return `StructuredOutput`, which compare reads
  (spec/compare.mjs.md:106, needs the app). The checker depends on the same thing.
- Not tested: `Agent(scorer)` from child-reviewing and canary. They use the same code path as the child, which is tested.
