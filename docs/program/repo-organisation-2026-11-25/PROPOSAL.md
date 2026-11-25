# Repository organisation: state and proposal (2026-11-25)

His words: `OWNER-WORDS.md` (they outrank this file). The page he looks at: `page/repo-map.html`.
Behind section 2: `in/research-tree.md`, `in/docs.md`, `in/rest.md` (three Sonnet readers, one pass, not checked
row by row; counts inside grouped rows are approximate, folder totals are from git).
Nothing in section 5 has been done. Each move waits for his approve:.
**Section 7 (two people, added the same day on his second message) replaces sections 4 and 5 where they differ:
read it before acting on either.**

## 1. Git state (by script)

| Line | Commits ahead of `main` | Where | What it is |
|---|---|---|---|
| `main` | 0 | PC and GitHub (GitHub is 2 ahead: PR 2, the pipeline diagram) | the archive from the split of 2026-11-16: 8,090 files (`recovered` 4,427, `docs` 3,080, `case-studies` 380, FixFlow `.claude` 120, `ops`, `migration`) |
| `transfer/2026-11-16-embeddings-final-and-setup` | 122 | GitHub copy is 19 behind the PC | the working branch from 16 to 24 Nov; PR 1 to `main` open since 16 Nov (7,906 files) |
| `build` | 228 | PC only | the tree build; holds 100 of transfer's 122 commits and all 27 `u/*` |
| `top9/track-plan` (this folder) | 255 | PC only | holds all of `transfer` and all of `build`; the newest line |
| working tree | | PC only | 1,480 files not committed (1,456 new, 24 changed), 83 MB: `research-tree/build/improve` 745, `docs/program/monitor` 494, `landings` 85, `runbig` 35 |
| `u/*` (27) | | PC only | finished unit branches, every one inside `build` (0 commits outside it) |
| `history/heads/*`, `history/remotes/*` (73) | | PC and GitHub, same tips | the old product repository's branches; 19 distinct tips; 296 commits, 115 of them reachable only through these branches (not through the 95 `history/*` tags or `main`) |
| `docs/2026-11-20-pipeline-diagram` | 1 | PC and GitHub | merged by PR 2 |
| `claude/affectionate-einstein-iexnez`, `claude/busy-fermat-n32uer` | | GitHub only | session leftovers; 2 and 5 commits not in the newest line |
| `work/2026-11-20-board-checker-simple-split` | | GitHub only | a teammate's branch, PR 3 open since 20 Nov |

Counts: 105 branches on the PC, 80 on GitHub, 96 tags, 3 work folders (this one, `.claude/worktrees/PC2` on `u/PC2`,
`../hb` on `build`; one changed file in each of the two). No session is running in this repository (read 2026-11-25).
Tracked files on the newest line: 17,297 (`research-tree` 7,888, `docs` 4,281, the rest 5,128).

## 2. What is there, by how far it is proven

| State | Pieces | Proof |
|---|---|---|
| A measured gain | the tree's test suite 596 s to 120.4 s (r57-0159); the testbed's check in parallel 855 s to 284 s (`docs/program/HARNESS-BOTTLENECKS-2026-11.md:25`, measured in the product repository before the split) | both are run time of a check; no gain on tokens or quality is on record |
| Works in daily use, gain not measured | 11 enforcement hooks with tests (`.claude/hooks`), the journal tool and commit check (`tools`), the record book (`library`), `lane.mjs` and `land.mjs`, the 8 lean helper types, the session tool of round 9 (not committed) | tests pass and each was seen working (r57-0151, r57-0120, t8-0107 to t8-0117, r57-0127); recall tests of the record book 8 of 14, 5 of 9, 4 of 10 answered surely (r57-0121, r57-0124, r57-0132) |
| Built and tested, never run for real | the tree scripts `research-tree/tcb` (1,037 tests pass; the pilot has not run: r57-0172), the protocol model's code | tests only |
| Tested, null in the form tried | the graph test, the embeddings test, the card run (embedders against BM25, a learned graph against counting), three replays (L11, L8, L6) | `GRAPH-TEST-RESULT-2026-11.md:11`, `COORDINATOR-REPORT.md:46-58`, `research-tree/build/runbig/FINAL-REPORT.md:14-22`, `replays/JUDGE-REPLAYS.md` |
| Designs, not built or not run | harness v2, the knowledge store, the decision rule v2, the tree protocol v2, the BAML and Horthy ideas | r57-0202, r57-0203, the board's "Hypotheses (all untested)" |
| Records | evidence folders, the journal, `recovered`, `migration`, `case-studies` | kept as they are (CLAUDE.md rule 1) |
| Papers of finished rounds | briefs, unit results, refutes, landings, state files under `research-tree/build` | |
| Output a script reproduces | 5,531 model-run files (23 MB, `research-tree/model/run-all.mjs`), built pages and images | |
| Leftovers | rejected and replaced monitor rounds (about 185 files, 28 MB), page-screenshot iterations (about 180 MB of png, most of it under `docs/program/evidence`, which rule 1 protects), three pasted test logs | |

## 3. The rule for `main`

His rule: `main` holds what is proven, what works, with metrics that prove it.

The classical problem is promotion between lines in configuration management, and the standard solution is a stable
line fed from an integration line through a gate with a stated criterion (Debian's unstable to testing, the kernel's
next to mainline, git-flow's develop to main). Borrowed whole:

- `build` is the integration line: everything, all records, where every session works.
- `main` is the stable line: a piece arrives only through the gate.
- The gate: (1) the piece has run for real, not only under its tests; (2) a record with status measured or observed
  gives its number; (3) his approve:. The README on `main` lists each piece with its number, its record, and which of
  the seven measures the number is on.

The assumption that fails here: in those systems the whole tree is promoted. Here "proven" is true of single pieces,
so promotion copies named paths from `build` to `main` (one direction only), and `main` is a subset of `build`.

Applied today: the hooks, the journal tool and commit check, the record book they read, `lane.mjs` and `land.mjs`,
CLAUDE.md with the settings and lean helper types pass (1) and (2): about 130 files. The tree scripts do not pass (1)
until the pilot runs. The session tool is not committed and its move to Rust is under way. Null results and designs
do not pass. The archive now on `main` is a record, not a proven piece: it stays on `build` at the same paths, byte
for byte, and under a tag.

## 4. Branches after the tidy-up

| Name | What it is for | Lives |
|---|---|---|
| `main` | proven pieces only | always |
| `build` | everything; the one place to work | always |
| `u/<unit>` | one unit being built; made and landed by the build's scripts | until it lands |
| `<area>/<what>` (`tree`, `graph`, `library`, `monitor`, `hooks`) | a side line by a person or a session, named for what it is; no dates, no session names | until merged into `build` |
| tags `history/*`, `archive/*` | frozen lines: the old product history, the split, leftovers | always, as tags |

Branches on the PC 105 to 2; on GitHub 80 to 3 (`main`, `build`, the teammate's).

## 5. The moves, in order

1. **Save.** Commit the 1,480 files onto the newest line (by area; the 17 downloaded papers under
   `research-tree/build/locks/papers` are left out by an ignore line, as papers are not committed: w1-0700). Push the
   line to GitHub (the repository is private). After it nothing exists on this PC only.
2. **One working line.** Move `build` to the newest commit (it is already inside it: no merge), switch this folder to
   `build`, delete `top9/track-plan`, `transfer/...` and `docs/2026-11-20-pipeline-diagram` here and on GitHub, close
   PR 1 with a note, bring the PC's `main` up to GitHub's.
3. **Finished unit branches.** Delete the 27 `u/*` and remove the two extra work folders, after reading the one
   changed file in each.
4. **Archive as tags.** Tag each of the 73 `history/...` branches under the same name, here and on GitHub, check
   that all 296 commits are reachable from tags, then delete the branches. The two `claude/...` leftovers the same way
   under `archive/`.
5. **`main` holds only what is proven.** Tag today's `main` as `archive/split-2026-11-16`; a pull request brings the
   proven set onto `main` and takes the rest off its tip (8,090 files to about 130). Nothing is lost: `build` and the
   tag hold every file.
6. **Keep it that way.** A small script is the only way onto `main` and refuses without a measured or observed record;
   the landing script deletes a unit branch when it lands; CLAUDE.md gets the branch rules in a few lines.

For him or the teammate, not done by a session: PR 3's base becomes `build`.

## 6. Checked, and not known

- Checked by script: every `u/*` is inside `build`; `build` and `transfer` are inside the newest line; the history
  tags alone do not hold the archive (115 commits); `history/*` is read by name by no script (`migration/extract.py:47-49`
  made them once).
- Not known: whether the two `claude/...` leftovers hold anything the newest line lacks in content (7 commits);
  what the changed file in `hb` and in `PC2` is; whether the commit check passes all 1,480 files at move 1.
- Not in this pass: thinning `build` itself (generated output, leftovers). Most of the weight is under
  `docs/program/evidence`, which rule 1 protects.

## 7. Two people (his second message; replaces sections 4 and 5 where they differ)

His words: `OWNER-WORDS.md`, second message. In short: two people work here; it must be easy to see who did what;
nothing the other person has done and pushed is modified; the repository and his side get cleaner.

### 7.1 Who pushed what (read from GitHub and the commits, 2026-11-25)

| Person | GitHub login | What is theirs |
|---|---|---|
| Bilal (the owner; this PC) | `ghaaso`, admin; commits as "Muhammad Bilal" | all 186 commits on `main` and all 255 on the newest line; PR 1 and PR 2; `transfer/...`, the diagram branch, the 73 `history/*` branches (pushed at the split); the two `claude/*` branches (cloud sessions, by their content his: one holds the work split of 2026-11-17 written in his voice, the other two record commits of the top session) |
| Eashah (the teammate) | `eashah-uwu`, write | one branch, `work/2026-11-20-board-checker-simple-split`, 4 commits ahead of `main`, PR 3 open since 2026-11-20; 20 files, all new: the folder `work/` (`wp10b-ci`, `wp11-decisions`, `assignment-simple`, two run logs, a README), `tools/run_checks.sh`, `.github/workflows/claude-files-check.yml` |

- No path is common: `work/`, `.github/` and `tools/run_checks.sh` do not exist on `main`, on the newest line or in
  this folder. PR 3 adds files only (+2,582, -0), so it applies after every move below.
- The work split of 2026-11-17 (who takes which package: 12 rows for Eashah, 15 for Bilal) exists only on
  `origin/claude/busy-fermat-n32uer` (`docs/program/WORK-SPLIT-2026-11-17.pdf`, `docs/program/work-split/`, 5 commits):
  not on `main`, not on the newest line. His note of 2026-11-24 (his track: the tree, graphs, embeddings, training,
  invariants, enforcement; "the library and optimization" the teammate's for the moment) is later than it.
- GitHub cannot guard either side: branch protection (and with it required review by code owners) is refused for a
  private repository on this plan (the API's answer, 2026-11-25). A guard can only be a hook on this PC.

### 7.2 The borrowed design

Problem: several owners in one repository. Standard solution: a namespace per owner for branches, an ownership
file for paths, a shared stable line changed only by pull request, the server enforcing who may change what.
The assumption that fails here: the server does not enforce (7.1), so the enforcing part is a hook on his side,
which binds his sessions and nobody else.

### 7.3 Branches (replaces section 4)

| Name | Whose | What it is for | Lives |
|---|---|---|---|
| `main` | shared | proven pieces; changed only by pull request; each person merges only their own | always |
| `bilal/build` | Bilal | everything of his; where his sessions work | always |
| `bilal/<what>` | Bilal | a side line named for what it is | until merged into `bilal/build` |
| `u/<unit>` | Bilal, this PC only, never pushed | one unit being built, made and landed by the build's scripts | until it lands |
| `work/...` today, any name Eashah chooses | Eashah | theirs; never pushed to, deleted, renamed, merged or rebased from this PC | theirs to say |
| tags `history/*`, `archive/*` | Bilal | frozen lines | always, as tags |

After: 2 branches on the PC (`main`, `bilal/build`), 3 on GitHub (those and Eashah's).
The rule for `main` in section 3 binds Bilal's pieces. Whether Eashah's follow it is for the two of them.

### 7.4 The moves (replace section 5)

Never touched in any move: Eashah's branch, PR 3, and the paths in 7.1.

1. **Save.** As section 5 move 1, but the line is pushed as `bilal/build` (a new branch; nothing existing on
   GitHub changes).
2. **One line of his.** Rename the newest line to `bilal/build` here (no merge: `build` and `transfer` are inside
   it); switch this folder to it; delete `build`, `top9/track-plan` and `transfer/...` here, and `transfer/...` and
   the diagram branch on GitHub; close his own PR 1 with a note; bring the PC's `main` up to GitHub's. Two places
   name the branch `build` in code: `.claude/hooks/plan-gate.mjs:366` (`refs/heads/build`) and the default in
   `research-tree/tools/land.mjs:128`; both are pointed at `bilal/build` and `plan-gate.test.mjs` and `land.test.mjs`
   are run once (a hook is invariant-sensitive code: an Opus builder, tier routes). No unit is in flight.
3. **Finished unit branches.** As section 5 move 3 (all on this PC only).
4. **Archive as tags.** First bring the work split onto `bilal/build` (the 5 commits of
   `origin/claude/busy-fermat-n32uer`: 4 new files, no path in common). Then as section 5 move 4, the two `claude/*`
   branches included.
5. **`main` holds only what is proven.** As section 5 move 5, with two changes: the pull request is opened and not
   merged until he says Eashah has seen it; and it removes only what his account committed (all of today's `main`).
6. **Keep it that way.** (a) A guard hook on this PC: refuses a write to Eashah's paths (7.1) by Write, Edit or
   shell, and any push, delete, rename or forced update of a ref outside `bilal/*`, `u/*`, his tags and a pull
   request to `main`. (b) The promotion script of section 5 move 6. (c) The landing script deletes a unit branch
   when it lands. (d) A short ownership file at the root (who has which folders and branch names) and the branch
   rules in CLAUDE.md.

### 7.5 Not known

- Whether Eashah works from other branches or forks not yet pushed.
- Whether Eashah wants the `eashah/` prefix for new branches: theirs to say; nothing here depends on it.
- Whether the split of 2026-11-17 still holds row by row after his note of 2026-11-24.
