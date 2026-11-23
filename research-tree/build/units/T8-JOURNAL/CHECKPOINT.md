# T8-JOURNAL checkpoint (2026-11-24, mid-build)

Brief: research-tree/build/briefs/TOP8-JOURNAL.md (read TOP8-COMMON.md first). Old copies of the four changed files: `old/`.

## Done (files written, not yet tested)
- `tools/journal-rules.mjs`: one rule set (ORDER, KINDS, STATUS, RANGE, validateRecord, parseLine, idOfLine) and the seal
  (git common dir: journal-seal.json with issued ids, line hashes, per-checkout known stats / sealed state / pending lines;
  journal-seal.d/<sha>.jsonl copies; journal-seal.lock), judgeFile, lineDiff, findCheckout (no git), headState.
- `tools/journal.mjs`: dry run default, `--append`, `--check`, `--adopt <file> [--apply]`; ids = max+1 in kind range over
  all files, index, HEAD and issued; `{#n}` placeholders; field order; CRLF kept; refuses if target changed outside tool.
- `.claude/hooks/journal-watch.mjs`: PostToolUse (Bash|PowerShell): stat fast path; reports once (exit 2) a journal file
  not in the tool's state or HEAD's.
- `tools/check-commit.mjs` v3: imports the rules; adds rule 4 (added line not in seal.lines -> refused) and rule 5
  (pending tool lines missing while HEAD unchanged -> refused); ids read by JSON.
- `.claude/hooks/record-guard.next.mjs` (copy, NOT live yet): header v3, checkFileTool refuses every write under
  library/journal and the seal; helpers inJournal, isSealPath, namesJournal flag, quiet(), dynRefusal added.

## Left
1. record-guard.next.mjs: hit() (dyn rule when namesJournal; inJournal any mode except restore; seal path; mode 'touch');
   holds() journal any mode; touch, patch, git apply/am, revert, reset <rev>, tar/unzip, dos2unix, sort -o, curl -o,
   ed; PS New-Item without -Force, Export-*, Invoke-WebRequest -OutFile; PS assignment from a command = dynamic;
   lexer `<` inputs; INTERP: allow tools/journal.mjs, read script files (quiet checkCode), bash/sh script files,
   powershell -File; checkCode: dynamic write path + namesJournal -> refuse; exec-like calls judged as shell;
   set namesJournal = /journal/i.test(command) in the main try.
2. selftest.mjs: flip the 9 append-passes cases to refused; new cases per route; journal-watch registration note.
3. tools/journal.test.mjs; .claude/hooks/journal-watch.test.mjs; P0 check-commit.test.mjs: copy journal-rules.mjs and
   journal.mjs into the temp repo, the 2 hand appends -> via tool, new cases (hand append refused, pending lost refused,
   field moved refused, leading-space duplicate id refused, adopted file commits).
4. Run all tests once; old-vs-new runs; measure watch and tool times; replace live guard; result.md with README text and
   settings entries (PostToolUse Bash|PowerShell -> journal-watch.mjs in both settings files); the top session must run
   `node tools/journal.mjs --adopt library/journal/2026-11-23/r57.jsonl library/journal/2026-11-23/t7.jsonl` then --apply.
