PASS

# Refute of CGATE (FX-CGATE), u/CGATE at b44ef80a (refuter `refute: CGATE`, 2026-11-20)

Blind review against FIX-fence 3 and its Revision 5 notes, the FIX-JOIN points naming FX-CGATE (3, 4, 8, 9; 2b rows
1, 2, 5, 6; 2c), branches Q5 and PROBE 1(c), fact F-P1b, `units/CGATE/result.md` and `departures/CGATE.md`.
Mutations in my own checkouts (`.claude/worktrees/rCGATE`; guard-hook from `C:/Users/User/Documents/projects/hx-rCGATE`),
both detached at b44ef80a, every file restored after each run, both removed at the end; the builder's branch is
unchanged. Scripts: my scratchpad `rCGATE/` (mut.mjs, spec-gh.mjs, spec-other.mjs, shards.sh, probe-title.mjs).

## Baselines (lane labels rCGATE-ghA, rCGATE-hD, rCGATE-sE, rCGATE-selftest-shards)

| File | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|
| guard-hook.test.mjs (outside `.claude/`) | 25 | 22 | 0 | 3 |
| handover.test.mjs | 23 | 20 | 0 | 3 |
| status.test.mjs | 33 | 31 | 0 | 2 |
| selftest.test.mjs, 4 shards at once | 31 | 29 | 0 | 2 |

Same as the builder's table.

## Invariants: one mutation each

| # | Invariant (design place) | Mutation | Result |
|---|---|---|---|
| GM1 | Bind: a session named in an earlier `coord-session-*` never binds (step 2) | drop the `earlierBinding` line | caught, G1 |
| GM2 | Bind: X equals `successor_nonce` (step 2) | drop the nonce comparison | caught, G1 |
| GM3 | Bind: a file naming another session is `bound-elsewhere` (step 2) | never deny on `different` | caught, G1 |
| GM4 | Step 3: only the session bound at coord.json's ce acts; others Read only | any bound file admits any session | caught, G1 G2 G4 |
| GM5 | Step 4: row active/admitted at E | drop `step !== 'admitted'` | caught, G4 |
| GM6 | Step 4: a repeat with equal session and tool_use_id is allowed (ablation "by bytes") | deny every `different` | caught, G4 |
| GM7 | Point 9 order: identity gate before the one strict create | identity gate moved after the creates | caught, G2 G4 |
| GM8 | Stop target an app id only; a CLI UUID is never a target (the id-gap safety) | accept a bare UUID | caught, G3 |
| GM9 | Step 5: a foreign record at the intent name is `record-tamper` | drop the check | caught, G3 |
| GM10 | Step 6: any other text writes nothing | every text falls to `no-such-session` | caught, G5 |
| GM11 | Step 6: Post only for the coordinator's stop tools | drop the stop-tool test | caught, G5 |
| GM12 | Step 6: the caller is a UUID | drop the check | caught, G5 |
| GM14 | Post events never run the PreToolUse steps | drop the Post dispatch line | caught, G5 |
| HM1 | handover bind refuses a wrong nonce (step 1) | accept any nonce | caught, H1 |
| HM2 | bind clears the nonce | keep it | caught, T11 H1 |
| HM3 | raise writes a fresh nonce | none written | caught, T6 H1 |
| HM4 | bind without the hook's file is `not-bound` | drop the check | caught, H1 |
| HM5 | bind takes no `--session` | accept it | caught, X1 |
| SM1 | owner `closed` takes the CLI UUID only (step 7) | any subject | caught, S1 |
| SM2 | owner `closed` writes outcome `owner` | writes `stopped` | caught, S1 |
| TM1 | selftest `close-folders` fails closed (0b(b)) | always passes | caught, selftest T11 |
| GM6b | Step 4: a repeat counts only with a non-null tool_use_id (PROBE 8(b)) | drop `tuid !== null` | **survives** (full file 22/0/3) |
| GM13 | `session_tools` on the coordinator profile only | drop the role check | **survives** (full file 22/0/3) |

## The two questions

**(1) The id gap.** CGATE's code does not make a close unsafe under it. The hook names close records only by
`local_<uuid>` and refuses a bare UUID, `self` or a path as a stop target (GM8 shows G3 pins it); the owner act takes
only a CLI UUID (SM1 shows S1 pins it). So no hook record can answer a lookup by CLI id, and today nothing reads
`run/close/done/` at all (no reader of `closeDone` on `build`). Every close therefore ends with
`status owner --act closed`: safe as far as the hook goes, liveness through that act. One consequence to carry to
FX-CLOSE and the root: that act is runnable by the coordinator itself (W1's allow-list admits `status owner` with any
`--act`; the quote file lives under `plan/notes/`, a coordinator write prefix; CONTRACT decision 25 makes owner acts
coordinator-relayed). Under the gap, the safety of every close (Slots) rests on the coordinator relaying a true owner
statement, the trust R9's three-round fallback already had, now on every close instead of the stuck ones. Building the
map (departure 1, candidate (a)) is what takes it off that path.

**(2) Parts that need the app.** Fail closed in each case read:
- Post events not delivered, another payload shape, another text, a hook timeout: nothing is written, the intent
  keeps the slot, the close falls to the owner act (G5's "any other text" cases; GM10).
- A caller id that is not a UUID: Pre denies `stale-coordinator`, Post denies `bad-input`, nothing written.
- A permission prompt or the app's own start rule refusing after the PreToolUse hook allowed: a stop leaves an intent
  without a done (slot kept); a start leaves `start.json`, so the lease runs out and a `crash` no-start fence is
  charged (branches "thin" item 1; safety holds, NoChargeWithoutFault does not). An allow is exit 0 with no JSON, so
  the hook never approves a prompt on the owner's behalf.
- Fail-open shapes, none live today: START_ABSENT is a deny-list, so a future start-tool field that moves the session
  would pass (today's schema, read here, has no field the list misses); and the coordinator settings now name
  `PostToolUseFailure`: if an app version dropped a settings file over an unknown event, the PreToolUse guard would
  go with it (M3 shows CLI 2.1.325 knows the event; not measured on another version).

## Small items

1. GM6b: the PROBE 8(b) rule (no tool_use_id, a second start is `start-issued`) has no test. The code is right; with
   it removed, a harness without tool_use_id would let one coordinator start an attempt twice. M3 measured that
   PreToolUse carries tool_use_id, and FX-CLAIM makes a duplicate inert.
2. GM13: `sessionToolsError` (role, prefix, membership in `tools_allow`, overlap) and its selftest copy are tested only
   through the shipped profile; T14 pins the shipped files, so only a later profile edit is exposed.
3. The Post-mode parse is unanchored (`includes`). Probe (`probe-title.mjs`, lane rCGATE-probe, no mutation): a
   `stop_session` answer, which leaves the process alive, whose embedded title holds "Session <t> is already
   archived." or "Session <t> not found." makes the hook write `stopped` or `no-such-session`. Moot under the gap,
   and a title of at most 60 characters cannot hold those 61-71 character sentences if the app enforces its limit;
   anchor the match (whole answer, archive tool for `stopped`) before any app-to-CLI map lands, or a stop can free a
   live slot.
4. The start tool's `initiation` is not checked: `own_initiative` makes a card the owner can start long after
   `start.json` and its lease (a late session, inert under FX-CLAIM's tombstone but counted until closed by the owner
   act); `offer` can never start (its follow-up carries `proposal_id`, refused), so it always ends in a charged
   no-start. Requiring `user_asked` makes a start happen at the call or not at all.
5. Docs: FIX-fence 3's "Changes" also names CONTRACT's coord.json text and R12; the nonce is in the schema and in
   `spec/handover.mjs.md`, CONTRACT has only 3.21 (BUILD-PLAN's row for CGATE).

Tokens: `refute: CGATE coordinator start gate review | calls 58 | tokens 9.53 M | context now 254.6 K` (before this file).
