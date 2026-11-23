# CLAIM fix round (FX-CLAIM with REDO), 2026-11-20

Branch `u/CLAIM`. Merge commit **316c99ca** (build 1ed537d8 into u/CLAIM; one conflict, `spec/guard-hook.mjs.md`,
resolved as the union: CGATE's "FX-CGATE as built" paragraph, then CLAIM's FX-CLAIM section). Fix commit and
final commit **2fd62e88**. Departures: `research-tree/build/departures/CLAIM.md`, section "Fix round", FX1-FX3.

## The failures in `tcb/test/redo.test.mjs` and their causes

| Subtest | Cause | Change |
|---|---|---|
| replace fence, stop request, stop verify on one row (exit 2, want 70) | Test setup. The row is `bound` with a manifest but has no attempt folder and no claim; FX-CLAIM's fence strict-creates the tombstone there and fails `no-parent` (2). Under CLAIM a bound attempt always holds its session's claim (bind needs it). | `makeRoot` gives a bound attempt its folder and its session's claim (strict create, as the hook makes it). Code unchanged. |
| replace bind: the same session completes the line (exit 6, want 70) | Test setup. Bind was called before any claim: exit 6 `not-claimed` is FX-CLAIM step 4 working. | The subtest first asserts exit 6 without a claim, then makes SID1's claim, then binds (FIX-JOIN 2b rows 6-7). Code unchanged. |
| the parent test | Failed because of the two above. | — |

With claims in place, REDO's repeat still completes a missing line only at the exact post-state (the redo
check is first in each hold), and bind still needs the claim. Two redo lines were wrong on the merge, though no
failing test showed them; two new subtests did (both failed before the change, lane CLAIM-fix-redo-1):

- **No-start fence** (FX1, `replace.mjs fenceRedo`): the repeat rebuilt the line as charged (`restart_charged`
  true) for a fence `lib.fence` left uncharged under `H_nostart`. Now: no `fails` entry of epoch E for a failure
  reason means that fence; `host`, `restart_charged`, `limit` false.
- **Stop request** (FX2, `stop.mjs stopRedo`, `targetClaim`): the repeat named the attempt's session (null when
  fenced at admitted) instead of the claim holder, and dropped `sessions` after a tombstone. Now the same sources,
  in the same order, as the request.

Cross-unit item (FX3): `guard-hook.mjs stepClaim` checks the session id with CGATE's `SESSION_ID_RE`
(`callerSession`). Specs: guard-hook (union and FX3 wording), replace and stop (one section each on the merge).

## Tests (MAIN's lane)

| Label | File | Tests | Pass | Fail | Not run |
|---|---|---|---|---|---|
| CLAIM-fix-redo-1 | redo.test.mjs, setup fixed, code not yet | 7 | 5 | 2 (the two new subtests, as predicted) | 0 |
| CLAIM-fix-redo-2 | redo.test.mjs, final | 7 | 7 | 0 | 0 |
| CLAIM-fix-replace | replace.test.mjs | 84 | 82 | 0 | 2 (skipped or todo) |
| CLAIM-fix-stop | stop.test.mjs | 43 | 40 | 0 | 3 (skipped or todo) |
| CLAIM-fix-guard-hook | guard-hook.test.mjs, from `hx-CLAIM` outside `.claude/` (removed after) | 26 | 23 | 0 | 3 (skipped or todo) |
| CLAIM-fix-e2e | `e2e/run-e2e.mjs`, from `hx-CLAIM` | 232 steps | 231 | 1 | 0 |

The one e2e failure is not CLAIM's: "handover bind (successor session)" exits 66 `usage`, `--nonce` required.
CGATE's `handover bind` needs `--nonce`; `build`'s `run-e2e.mjs` passes none (0 occurrences on `build`). CLAIM's
only change to that file is its two claim lines; CGATE's landing ran no e2e. It needs a fix on CGATE's side (the
e2e's successor bind must carry the nonce from `coord.json`), not done here.

Not run, as briefed: CLAIM's other unit files (admit, handover, lib, status, watch); the landing runs them.

## Tokens

`build-invariant: CLAIM fix with REDO's tests on the merge | calls 54 | tokens 6.08 M | context now 174.1 K`
(before this file; limit 7 M). Most of it is context re-read per call (about 160 K each), not output.
