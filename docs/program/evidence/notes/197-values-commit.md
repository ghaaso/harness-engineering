# PR #197 (P2b-1): what the values commit carries besides the two values

Written by the coordinator on 2026-11-14 (rulings C90 and C92, plan tag `plan-v9.80`). Send this file's path to the
P2b-1 lane together with the owner's two values (the domain name; the fleet's highest versionCode). The last re-read
by the PR's reviewer (agent `a66da7388f906a308`) covers `dbc95a2` to the values commit.

Nothing below changes how the phone behaves. Take the wording as given; do not add a claim that no test shows.

## 1. The storage-order sentence (reviewer's finding 1 at `dbc95a2`)

Where: `technician-app/src/features/drain/installId.ts:27-30`, and the same statement in the PR body's C88 section
("It assumes the storage runs every operation in the order asked").

Remove: "It also assumes the storage runs every operation in the order it was asked for, which was not checked on a device."

Put instead: "The storage library as installed (@react-native-async-storage/async-storage 1.23.1, its default module)
runs one context's operations in order (one serial executor per module instance) but does not order two contexts'
operations against each other. Whether a headless task and the foreground hold two module instances was not checked
on a device."

Why: the window does not depend on in-order storage; it exists because two contexts' operations are not ordered
against each other (`AsyncStorageModule.java:66` and `:69` in the installed package).

## 2. "Minted once" / "never rewritten", four places (rulings C90, C92)

Contract point 1 now reads: the id is read from storage for every document, is not rewritten once it is stored, and at
the very first mint two processes that both find none each write one, the last write staying.

- `technician-app/src/features/drain/installId.ts:4-5` ("A UUID minted once per install ... and NEVER rewritten by a later read")
- `technician-app/src/features/drain/constants.ts:36` ("minted once, never rewritten")
- `CLAUDE.md:78` ("an install id minted once")
- row 1 of the PR body's contract table ("It is never rewritten")

Each says: minted at first use and not rewritten once it is stored; where there is room, the exception at the very
first mint. The two test names that say "a single context mints once" are already true and stay.

## 3. Two test lines (the reviewer's notes)

- K2 (`drainGate.test.ts:1744`): before the relaunch, a second `fast.drainAll("t1")`, asserting the uploads are still
  `[F]`. This pins "a context whose gate is already open in memory does not look again"; today a mutation of
  `drainGate.ts:574` and `:670` passes all 63.
- X1 (`drainGate.test.ts:1762`): one more assertion that a LATER manifest's `discards` holds the entry with the
  earlier `install_id` (the "and manifest" half of the header's sentence; true in code at `manifest.ts:414`, no test).

## 4. The pointer to contract point 9

`installId.ts:30-31` points at contract point 9 for how the audit reads an entry or a trace under the earlier id.
Point 9 is amended once the audit lane has walked it; if that has happened by the time of the values commit, make the
pointer say what point 9 then says, in one clause. If not, leave it.

## 5. The marker

One commit with the two values and the above. In the marker: the mutation that the new K2 line kills; the gate
(typecheck, Jest, `expo export`); the Android compile gate when the coordinator asks for it.
