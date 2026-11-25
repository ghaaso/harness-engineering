# PB2: departures from the design

1. **`tools_deny` no longer holds `Task` for the roles that start helpers** (coordinator, child, child-reviewing,
   canary; profiles and settings). The design (`spec/guard-hook.mjs.md` "tools_deny (all ...) ... Task") put it in
   every role. Why: Claude Code 2.1.330 (its bundled `claude.exe`, read statically) maps a permission rule's tool
   name through its legacy table `{Task:"Agent",...}` (the parser's `{toolName:zl(...)}`), and its first permission
   step (`vNt`, called before any allow rule) returns deny for a rule on the whole tool, so `Agent(scorer)`,
   `Agent(checker)` and `Agent(reader)` were refused. The guard hook still refuses a `Task` call there, now
   `tool-not-allowed` (it is not in `tools_allow`). The other roles keep `Task` denied (they start no helper).
   Tests: guard-hook `T6` (Task -> tool-not-allowed for child, child-reviewing, canary, coordinator), `T14`, `PB2`;
   selftest `PB2` and `PA-4`.
2. **selftest `role-files` gains a check**: no allow rule shares its tool with a whole-tool deny (no content, `()`
   or `(*)`; MCP server rules) under any of the app's names. The alias table is copied from the 2.1.330 bundle; a
   later app version may change it (not checked against any other version). Spec: `spec/selftest.mjs.md` step 2,
   `spec/guard-hook.mjs.md` T14.
