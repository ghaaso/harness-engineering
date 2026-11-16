# tms.mjs: specification (unit U2b)

Source of truth: `CONTRACT.md` §2.1 (`views/labels.json`, `views/repair.json` are tms's, writeAtomic),
§3.1-§3.4, §3.15, §3.16 (certificate void on a changed read-set hash), §3.18 (`sesoi`), §3.7 (`check`).
Design rules: R16, R19 (labels with staleness), R37, R38 (a dismissal is an open hazard with a bar),
R40; problems P1, P15, N15.

## Purpose
The one label script. From card status, the store's objects and input hashes it labels every card,
sentence (pack conclusions = claims, review sentences), verdict, dismissal and certificate, writes the
labels and a typed repair list, reports gate targets holding STALE or PENDING nodes, and reopens
dismissals (exit 10).

## Command line
```
node tcb/scripts/tms.mjs --root <abs> --ce <n> [--target <task>.<step>]... [--now <iso>] [--dry-run]
```
`--target` (list) restricts the exit-1 judgement to those commit records; default: every commit record.

## Reads
`store/objects/*`, `store/commits/*`, `store/status/card_status.jsonl`, `run/ledger.jsonl` (`intake`
flags, `queue` lines for `lib.flagCleared`), the current frozen protocol per field
(`lib.currentProtocol`, CONTRACT §3.18), the previous `views/labels.json` (only to tell newly
reopened dismissals), `run/coord.json`, `run/tasks.json`.

## Writes
`views/labels.json` and `views/repair.json` (writeAtomic; the formats below are the contract's
[labels] and [repair], CONTRACT §3.22); a `check` ledger line {check: "tms", subject: "labels",
result: pass|fail, reasons} when the labels' sha256 or the result differs from the last `tms` check
line, and always when the newly reopened list is non-empty; that line then carries the reason
`{code: "reopened", detail: [keys]}` (the watcher's class-10 source, CONTRACT §1.4).
- labels.json: `{schema_version, inputs: {status_seq, objects, commits, flags}, cards: {<c_id>: {label:
  pending|witnessed|confirmed|unverifiable|rejected|superseded, status_seq}}, nodes: {"<obj_id>#<sid>":
  {label: STALE|PENDING|JUDGMENT|IN, why: slug[], causes: c_id[]}}, verdicts: {"<r_id>#<approach_id>":
  {label, why}}, dismissals: {"<r_id>#<sid>": {label: standing|untested|reopened, why, matched: c_id[]}},
  certificates: {<x_id>: VALID|STALE}, targets: [{commit: "<task>.<step>", ok: bool, bad: node[]}]}`.
  No timestamp, so equal inputs give equal bytes.
- repair.json: `{schema_version, items: [{node, label: STALE|PENDING, object, causes: [{card_id, code}]}]}`
  sorted by node.

## Labels
- **Card**: the last `card_status` line's status, `pending` without one; `superseded` when a card whose
  `supersedes` names it is `confirmed` (R16; overrides every status).
- **Sentence**, highest applying wins, STALE > PENDING > JUDGMENT > IN:
  - STALE (`why`): a cite is `rejected` or `superseded` (`support-fell`); the object's pack has a
    successor (a stored pack whose `parent` is it, named by a commit record) (`pack-repaired`); the
    object's `questions_sha` (its pack's, for a review) differs from `lib.questionsSha` of the current
    frozen protocol's `question_ids` (`questions-changed`, CONTRACT §3.18).
  - PENDING: a cite is `pending` or `witnessed` (`support-unchecked`); an `intake` flag on this sid for
    which `lib.flagCleared` is false (`flag-open`, CONTRACT §3.15).
  - JUDGMENT: kind `judgment` (`judgment-kind`); no cites (`uncited`); a cite `unverifiable`
    (`support-unverifiable`) or whose last status line carries `check.verdict` `unclear` (`support-unclear`).
  - IN: every cite `confirmed`, none of the above.
- **Verdict**: the highest label among the sentences in `supports`; none → JUDGMENT (`unsupported`).
- **Dismissal** (R38): `reopened` if a support card is `rejected`/`superseded`, or a `confirmed` card
  anywhere has `measured.{approach_id, measure, effect}` equal to an `outlist` entry (`outlist-match`);
  else `standing` if a support card is `confirmed`, has `measured.approach_id`/`measure` equal to the
  dismissed sentence's, numeric `value` and `baseline` with |value − baseline| < `sesoi[measure]` of
  the field's frozen protocol, and conditions covering the sentence's `applies_to` (every declared
  value present in the card's conditions); else `untested` (`no-bound`, or `no-sesoi`).
- **Certificate**: recompute its `read_set` with each card's current status seq (the seq of its last
  status line, 0 without one), `lib.readSetSha(read_set)` (CONTRACT §3.16, shared with certify);
  differs from `read_set_sha` → STALE, else VALID.
- **Target**: a commit record's pack and review outputs; `ok` iff none of their nodes is STALE or PENDING.

## Steps
1. Parse args; read everything without the lock. A cite, `pack`, `parent`, `supersedes` or `read_set`
   id with no stored object → exit 2 `dangling` (fsck reports the breach); an unparseable complete line
   in `card_status.jsonl` → 2 `status-unreadable` (a torn tail is ignored); a frozen protocol whose bytes
   do not hash to its ledger sha → 2 `protocol-unreadable`; a `--target` naming no commit record → 2
   `no-target` (the record is a file, so this is not a usage error).
2. Compute labels in the order cards → sentences → verdicts → dismissals → certificates → targets.
3. Newly reopened = `reopened` now and not `reopened` in the previous labels.json (absent file: all).
4. `withRunLock` + `checkCe` (64); writeAtomic both views; append the `check` line if due.

## Exit codes
10 `reopened` (a dismissal newly reopened; wins over 1, because the coordinator must act on it); 1
`stale-or-pending` (a target holds a STALE or PENDING node); 0 otherwise; 2 `dangling`,
`status-unreadable`, `protocol-unreadable`, `no-target`; 64, 66, 67, 70, 75.
Result: {cards: {label: n}, nodes: {label: n}, bad_targets: [{commit, bad}], reopened: [key],
stale_certificates: [x_id], labels_sha}.

## Behaviours
- T1 A pack with one fact citing a confirmed card → node IN, target ok, exit 0, labels.json and
  repair.json written, `check` line pass.
- T2 Same with the card's last status `witnessed` → PENDING `support-unchecked`, exit 1, repair item.
- T3 Cites `[confirmed, unverifiable]` → JUDGMENT; a judgment-kind sentence citing confirmed cards →
  JUDGMENT; uncited judgment → JUDGMENT `uncited`; all exit 0.
- T4 A cited card's last line becomes `rejected` → STALE `support-fell`, causes [that id], exit 1. Card B
  `supersedes` A and B is confirmed → A labelled `superseded`, sentences citing A STALE.
- T5 Precedence: cites `[rejected, pending]` → STALE; `[pending, unverifiable]` → PENDING.
- T6 An `intake` flag `scope-outside` on (p_x, s1) → node PENDING `flag-open`; after a status line
  with `check.node` `p_x#s1`, verdict `confirmed`, reason `sentence-check` for every cited card, from
  a batch whose `queue` line is newer than the flag → IN; the same line from a batch queued before the
  flag → still `flag-open`.
- T7 A committed pack P2 with `parent` P1 → review sentences on P1 STALE `pack-repaired`.
- T8 Verdict supported by s1 (IN) and s2 (PENDING) → PENDING; no supports → JUDGMENT.
- T9 Dismissal with a confirmed support card, |value − baseline| = 0.5 < sesoi 1.0, conditions covering
  → standing; = 1.5 → untested `no-bound`; measure absent from `sesoi` → untested `no-sesoi`.
- T10 A confirmed card matching an outlist (approach, measure, effect) → reopened, exit 10, a `check`
  line with reason `{code: "reopened", detail: [key]}`; run again unchanged → exit 0 (not newly
  reopened; still `reopened` in labels.json), no new line.
- T11 A certificate whose read-set card gains a status line → STALE; unchanged → VALID.
- T12 `--target f1-research.pack` while only the review holds PENDING → exit 0.
- T13 A cite to an absent card → exit 2 `dangling`, no view written; torn last status line → ignored,
  exit as without it.
- T14 Run twice with equal inputs → identical labels.json bytes, one `check` line only.
- T15 `--ce` stale → 64, nothing written; lock busy → 75; `--dry-run` → no view, no line.

## Needs the app
- None (pure computation over files).
