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

## 4b. Android backup off (ruling C98, added 2026-11-14 22:15)

Found by the phone-side reviewer of PR #203 and confirmed by the coordinator: `technician-app/app.json` has no
`expo.android.allowBackup` key, and Expo's default is true (`@expo/config-plugins/build/android/AllowBackup.js`:
`config.android?.allowBackup ?? true`). So Android Auto Backup is on: a reinstall, or a replacement phone restored from a
Google backup, gets the app's storage back as of the backup: the install id, the queues, the discard list, the drain
manifest head and its receipt, and the sign-in token. A restored queue replays old writes, a row that was discarded
after being entered by hand comes back as pending, and contract point 1 ("a cleared or reinstalled app mints a new
id") is not true while backup is on.

In the values commit: set `expo.android.allowBackup` to `false` in `technician-app/app.json` (the key and that one
value only; nothing else in the file changes). It is an Expo config field handled at prebuild, not a config plugin.
Prove it with the Android compile gate: the merged manifest of the built APK carries `android:allowBackup="false"`.
Say in the marker where that line was read. CLAUDE.md's Mobile section gains one sentence: the app's data is not
backed up by Android, so a reinstalled phone starts empty and signs in again.

Check and say in the marker: whether anything else in the build sets or overrides the attribute (a library manifest,
`tools:replace`), and whether `fullBackupContent` or `dataExtractionRules` is set anywhere.

## 4c. The after-report reads its discard list once (ruling C103, added 2026-11-15)

Found by the phone-lens reviewer of PR #203: `afterSend.ts:122-138` builds the report's `storage` facts from
`readAllRaw` and `buildManifest`, and then reads the discard list separately with `readDiscardLog()`. If the list goes
bad at storage level between those two reads of one attempt, that one report carries `discards: []` with no sign that
the list is unreadable, and the audit reads a discarded row as `missing` (exit 3, the code that halts the fleet) until
the next report, which carries the sign and heals it.

In the values commit: the after-report takes its discard list from the same raw read as its storage facts, so a
report whose list could not be read always carries the sign. A test for the interleaving (the list readable at the
first read and unreadable at the second: the report must carry the sign, or the list as first read). Nothing else in
`afterSend.ts` changes; the shape of the report does not change.

## 5. The marker

One commit with the two values and the above. In the marker: the mutation that the new K2 line kills; the gate
(typecheck, Jest, `expo export`); the Android compile gate when the coordinator asks for it.
