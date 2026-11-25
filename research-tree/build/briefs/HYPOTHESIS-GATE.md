# Brief: the hypothesis gate (a hook), 2026-11-25

owner: r58-0017
Deliverable: .claude/hooks/hypothesis-gate.mjs
token limit 20 M (expected about 12 M, basis r57-0173)

The owner's words outrank this brief. Read them first: `bash library/lookup.sh -f r58-0017` (run from the repository
root). Then read the standard and the form the hook must read:
`docs/program/RESEARCH-METHOD-RULES-2026-11-25.md`, from "The standard a hypothesis must meet" to the end.

## What to build

One hook, `.claude/hooks/hypothesis-gate.mjs`, its tests `.claude/hooks/hypothesis-gate.test.mjs` (node:test, run
with `node --test`), and a command-line form of the same checks, `tools/check-hypothesis.mjs <file>` (exit 0 and a
line "ok", or exit 1 and one line per fault), so that a session can check a document before it asks for a pass.
Wire the hook in `.claude/settings.json` as a PreToolUse hook for Write, Edit, Bash, PowerShell, Agent and
`mcp__ccd_session__start_session`, the way the other hooks there are wired (they use this PC's absolute path; do the
same). Look at `.claude/hooks/fanout-gate.mjs` and `window-ceiling.mjs` for how a hook here reads its input and the
session transcript.

## The three refusals

1. **Reading before writing.** When the call writes or changes a file matching
   `docs/program/hypotheses/*-HYPOTHESIS-*.md` (Write or Edit on that path; a Bash or PowerShell command that names
   such a path together with a write: `>`, `>>`, `tee`, `sed -i`, `writeFileSync`, `Set-Content`, `Out-File`),
   look in this session's transcript, from its last compaction onward (from the start if there was none), for a full
   read of BOTH `docs/program/learning/MECHANISMS-NEURAL.md` and `MECHANISMS-DATA.md`: a Read call on the file with
   no offset and no limit, or a Bash call whose command runs `cat` on the file. If either is missing, refuse and say
   which file to read. Find out from a real transcript how a compaction shows there (this repository's sessions have
   them under `C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/`); read only
   what you need of those files, they are large: scan from the end.
2. **The form and the references.** For a Write whose content is a hypothesis, and in `tools/check-hypothesis.mjs`
   for any file: every block that starts with `### D<number>.` or `### M<number>.` must hold the five labels
   (`**Alternatives.**`, `**Choice.**`, `**Why.**`, `**Rests on.**`, `**Refuted if.**`), each at the start of a line
   and each followed by text; `**Rests on.**` must hold at least one reference of an allowed kind; every `N x.y` or
   `D x.y` anywhere in the file must exist in the learning file (an entry is a line that starts with `**x.y ` in
   bold; `N 11` or `D 4` names a section, a line that starts with `## 11.`); every `record: <path>` must exist in the
   repository. A file with no decision block at all is refused. For an Edit, where the whole result is not in the
   call, do not refuse on form; the command-line check and the pass cover it.
3. **No step of the new work without the pass.** The new work's roots are `research-tree/build/data2/`,
   `research-tree/build/model2/`, `C:/research-runs/data2/`, `C:/research-runs/model2/` (either slash direction, any
   letter case of the drive). A call is a step of the new work when it writes under a root, runs a command that
   names a root, starts a helper or session whose prompt names a root, or reaches a rented machine (a command
   containing `ssh `, `scp `, `rsync ` or `runpodctl`). Under `data2` it needs a valid pass for the file matching
   `docs/program/hypotheses/DATA-HYPOTHESIS-*.md`; under `model2`, and for a rented machine, it needs valid passes
   for both the data file and `MODEL-HYPOTHESIS-*.md`. A pass is valid when `<hypothesis file>.pass.json` exists,
   its `sha256` equals the hash of the hypothesis file now, the file passes the check of point 2, and its `ruling`
   id is in `library/journal/` as a record of kind `ruling` and status `owner`. Reading (cat, ls, grep, the Read
   tool) is never refused.

Every refusal says in one or two plain sentences what is missing and what to do. The hook never edits anything.

## What it must not do

- It must not refuse or slow anything outside those paths and commands. The improvement round that is running
  (`research-tree/build/improve/`, `C:/Users/User/Documents/projects/card-run-2026-11/`, its docker and card
  commands, its helpers) was approved earlier and must be untouched: put a test in for it.
- On an internal error it lets the call through, except for a call that is clearly a step of the new work, which it
  refuses with the error named.
- Do not change any other hook or guard. In `.claude/settings.json` add only this hook's entries.
- The journal is only read. No commits, no branch changes (other sessions share this folder).

## Done when

The tests pass (cover each refusal, each allowed case, the pass going stale after an edit, the untouched round, a
session with and without a compaction); `node --test .claude/hooks/` still passes for the other hooks;
`tools/check-hypothesis.mjs` gives sensible faults on a small broken sample you write in a temporary folder. Then
add one row for this hook to `research-tree/build/ENFORCEMENT-TABLE.md` (what it enforces, what it cannot see).
Report in your final reply, in at most fifteen lines: what was built, the test counts, how a compaction is detected,
anything you could not make work, and the tokens you used. No second round of your own.

## Addendum (the owner's later word, journal r58-0021): seven labels and two sections

The form now requires SEVEN labels in every decision block, in this order: `**Depends on.**`, `**Alternatives.**`,
`**Ruled out.**`, `**Choice.**`, `**Why.**`, `**Rests on.**`, `**Refuted if.**`. A hypothesis must also hold a `## `
heading containing the words "graph of decisions" before its first block and a `## ` heading containing "Consistency
across the decisions" after its last block. The last section of the rules file says the same; where this addendum and
the text above differ, the addendum holds.
