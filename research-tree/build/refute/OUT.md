PASS

# Refute OUT (FX-OUT: the outcome log and the READY fence)

Blind refuter, 2026-11-20. Branch `u/OUT` at e38717a3, not changed (still e38717a3 at the end). Design read: FIX-fence
0b, section 1 and Revision 5 point 3; FIX-JOIN points 2, 4, 8, 9, 11 and part 2c; fact F-P2 (the hook reads
`tool_input.content`, as F-P2 allows). Scratch: `.claude/worktrees/rOUT` and, outside `.claude/`,
`C:/Users/User/Documents/projects/hx-rOUT` (every guard-hook run, and every lib run with guard-hook, fsck, commit and
replace together), both detached at e38717a3, both removed at the end. Each mutation was one uncommitted edit,
restored byte for byte after its run (`git status` clean after every queue; the "not restored" flag on O1 was my
driver comparing two saved copies of one file). Every run went through MAIN's lane, label `rOUT-<id>`.

Baselines, nothing mutated: guard-hook + fsck + commit + replace 160 pass, 0 fail, 6 skipped (20/21/35/84 as in the
result); watch 65/0/4; status 30/0/2; selftest.test.mjs as its four shards 29/0/2 (`rOUT-selftest`).

## Invariants, one mutation each

| Id | Invariant | Mutation | Result |
|---|---|---|---|
| H1 | a READY Write takes a ready slot (child step 4) | the `outcomeAppend` call becomes `{result:'created'}` | caught: guard-hook FX-OUT 1, 2, hook clock |
| H2 | an Edit of READY is denied `ready-write-only` | the Edit returns (allowed) | caught: FX-OUT 1 |
| H3 | the READY's step is in `row.steps` | drop `!steps.includes(v.step)` | caught: FX-OUT 1 |
| H3b | its task and epoch are the hook's | `if (false)` | caught: FX-OUT 1 |
| H9 | its content passes `checkFormat('ready')` | drop the call | caught: FX-OUT 1 |
| H4 | a repair marker passes with no slot | drop `if (v.kind === 'repair') return` | caught: FX-OUT 1 |
| H5 | a fenced log denies `attempt-fenced` | `if (false)` | caught: FX-OUT 2 |
| H6 | READY is found by `pathKey` (case, `..`, trailing dot) | a plain string compare | caught: FX-OUT 1 |
| H8 | the hook's create is strict (makes no folder) | `strict: false` | caught: FX-OUT 1 (no `outcome/` gives `no-parent`) |
| H7 | as a process the budget counts from the process start (S0.4 refuter M25) | `() => d` | caught: FX-OUT hook clock. M25 is closed |
| O1 | the slot step comes after the profile and prefix checks (J point 9: a denied call writes nothing) | the step moved before step 5 | **survives** guard-hook (the only file that runs the hook) |
| L1 | R-a: a fenced slot makes the log fenced | drop `fenced = v.reason` | caught: guard-hook FX-OUT 2, replace FX-OUT 3, commit FX-OUT 5, fsck FX-OUT 6 |
| L4 | R-c: a slot that does not parse is tamper | `continue` | caught: fsck FX-OUT 6, guard-hook FX-OUT 2 |
| L5 | no gap | `continue` | caught: the same two |
| L6 | nothing after the fenced slot | drop | caught: fsck FX-OUT 6 |
| A1 | a repeat READY takes no second slot | drop the `identical` return | caught: FX-OUT 1 |
| L2 | R-b: the ready slot of a committed step is not pending | the filter ignores `row.commits` | **survives** all seven files (watch and status too, `rOUT-L2-ws`) |
| A2 | a create that loses its name reads the log again | `different` returns `created` | **survives** all files |
| A3 | the check runs on every read, so the fence refuses after a lost name | check on the first read only | **survives** all files |
| L3 | R-c: a slot must be a regular file (`lstat`) | drop | survives (tamper only) |
| L7 | a slot of another task or epoch is tamper | `if (false)` | survives: the second check catches the test's mixed-epoch log; a log whose slots are all foreign is read |
| L8 | a name with leading zeros is tamper | drop | survives (tamper only) |
| L9 | a slot with extra fields is tamper | drop the canonical compare | survives (tamper only) |
| F1 | fence step 2: another reason on a fenced log, 65 `fence-pending` | `if (false)` | caught: replace FX-OUT 3 |
| F2 | step 3: every refusal before any write (N1) | `predictFence` replaced by a pass | caught: FX-OUT 3 |
| F5 | step 4: `ready-wins` over every reason but first and tainted | `if (false)` | caught: T5, T5b (7 tests) |
| F6 | tainted appends after the ready slot | `ready-wins` for tainted too | caught: T5 |
| F7 | step 5: the fenced slot is written | the append replaced | caught: T5, FX-OUT 3 |
| F3 | no slot for first, or cut/drop with no attempt | drop the `p.step`/`p.to` guard | survives; equivalent: those attempts have no manifest |
| F4 | H1: no slot without a manifest | drop the manifest guard | survives; equivalent in reachable states: no manifest means no `outcome/` (FX-OUT 4 has no folder) |
| F8 | a dry run writes nothing | drop `!handle` | **survives** replace |
| F11 | `start` makes `outcome/` with the manifest | drop the `mkdirSync` | **survives** replace (the only file that runs start) |
| C1 | commit refuses a fenced log, 1 `attempt-fenced` (F7) | drop | caught: commit FX-OUT 5 |
| C2 | no ready slot, 2 `no-ready` | drop | caught: T15 |
| C3 | a slot of an earlier step only, 1 `ready-mismatch` | `if (false)` | caught: T15 |
| K1 | fsck check 10 runs | `{n: 0, failing: []}` | caught: fsck FX-OUT 6 |
| W1 | watch class 11 reads the log, not READY.json (J 2c, R5 row) | `readLog` built from READY.json | **survives** watch |
| W2 | a fenced log raises no class 11 | drop `log.fenced === null` | survives watch |
| S3 | status `readyPending` reads the log | built from READY.json | **survives** status |
| S1 | a fenced log is not pending | drop `log.fenced === null` | survives status |
| S2 | a bad log is the anomaly `outcome-tamper` | drop the push | survives status (the result says so) |

Scratch tests (`rout-race.test.mjs`, lane `rOUT-RACE-*`): with a `create` seam that lets the other party's slot land
at the name first, (1) the fence's append must throw `ready-wins` and leave one ready slot, (2) the hook's append must
return `fenced` and leave one fenced slot, (3) R-b. On e38717a3: 3 pass. A2 fails (1) and (2), A3 fails (1), L2
fails (3). So the code is right at these sites; only the unit's tests do not pin them.

## Findings (none breaking: at every surviving site the code is right, by reading and, for A2, A3 and L2, by the scratch tests)

1. **The race FX-OUT exists for has no unit test (A2, A3).** Every test runs one party at a time, so the test-and-set's
   lost-name path ("taken: read the log again", fence step 5 "a hook's ready slot takes that name first: exit 5") is
   unpinned. If a later edit drops it, a fence that loses the name revokes a READY that won (ReadyNotDiscarded). The two
   scratch tests above, in lib.test.mjs (they need only `outcomeAppend`'s `create` seam), would pin it.
2. **`start` making `outcome/` is untested (F11).** Every FX-OUT test makes the folder itself. Without the line, every
   hook READY is denied `no-parent` and no attempt can finish. One assertion in a replace start test pins it.
3. **The dry run's "writes nothing" is untested with `outcome/` present (F8).** Without `!handle`, a `--dry` fence of a
   running attempt with no ready slot writes a real fenced slot: commit then refuses and the hook denies (R-a), without
   the CAS. A dry-run case in FX-OUT 3's world (the tree hash unchanged) pins it.
4. **R-b is untested (L2).** Without it, after the first step of a multi-step row commits, every later non-tainted
   fence of that attempt is refused `ready-wins`, and watch and status report a READY that is already committed.
5. **The readers' switch from READY.json to the log is untested (W1, S3; W2, S1 for a fenced log).** The `readyFile`
   helpers of watch.test.mjs and status.test.mjs write READY.json and the slot together, so no case tells the two
   apart. A slot with no READY.json (the hook died after its create) and a READY.json with no slot would pin it.
6. **The hook's order (O1).** No test has a READY Write that a later check denies, so a slot taken by a call that is
   then denied (FIX-JOIN point 9) is not caught.
7. Tamper shapes L3, L7, L8, L9 (departure 5) are untested: no writer inside the protocol can make them.

## The builder's three open items

- **The three shared lines** (CONTRACT 3.6's row "READY of e present", guard-hook.mjs header line 8 "No step writes
  yet", `spec/status.mjs.md` line 62 `ready-unparseable`): not breaking. The code follows 3.12, 3.23 and 4.6; no
  script or test reads `ready-unparseable` (grep); the header is a comment. 3.6 and line 62 now contradict 3.12 and line
  28, and status.test.mjs is written "from spec/status.mjs.md and CONTRACT.md only", so S2.2 must reword them (they
  are in departures 3 and 6).
- **No status test of `outcome-tamper`** (S2 survives): not breaking. A bad log still stops the fence and commit (exit
  3), the hook (deny) and fsck check 10, and those are tested (FX-OUT 2 and 6); the status anomaly only names it.
- **selftest.test.mjs not run:** not breaking. I ran it: 29/0/2, the same as S0.4's run. Its fixtures write no READY,
  run no `commit record` and fence only `first` (grep of `tcb/fixtures`).

## Small items

- FIX-fence's migration line ("attempts started before the fix finish under today's rule") is half built: the hook
  denies `no-parent` and commit reads only the log, so a pre-fix attempt cannot finish. No attempt has run (no pilot),
  so nothing is lost.
- The hook's log reads (`outcomeState`: lstat, readdir, slot reads) use `fsRetry` with no budget; only the create is
  budgeted. The hook's other reads (`readTasks`, profiles) are the same.
- status's catch labels any error of the log read `outcome-tamper` (with `why` null when it is not tamper).
- The scratchpad is shared between helpers: another helper's `mut.mjs` replaced mine during this review. Prefix
  scratch files with the unit.

Tokens: `refute: OUT outcome log and READY fence review | calls 63 | tokens 11.51 M | context now 274.8 K` at the last
count before the race runs; about 13.5 M at this file, against an expected 5.4 M and a limit of 15.6 M.
