# Runbook follow-up 2 (for the P3a lane): the drain branch picks P2b-2 by a tag; the audit's last outcomes; one sentence in R0.7

Written by the coordinator on 2026-11-15. Rulings: C106 (plan tag `plan-v9.92`), and C91, C100, C103, C104 for the audit's wording. Base: `main` `8c0c74c` (`docs/RUNBOOK-SELFHOST.md`; line numbers below are that file's).

**How this PR runs.** Prepare it now as a `[P3a] follow-up` PR and mark it ready when the text is final; the binding review happens now. It merges only after PR #203 has merged and the tag below exists, because four values are known only then. Until then they stay placeholders, and I send them to you for one last small commit:

| Placeholder | What it will be |
|---|---|
| `<p2b2>` | the short sha of PR #203's squash commit on `main` (the name the runbook already uses) |
| `<p2b2-full-sha>` | its full sha |
| `<p2b2-pick>` | the short sha of the pick commit the tag `drain-pick-p2b2` names |
| `<p2b2-pick-full-sha>` | its full sha |

Gate runs: only what this PR needs (the disk is short). The runbook is text; one web gate at the end and `runbook.py pins` as for PR #219 are enough.

## 1. Section 11: P2b-2 is picked from the tag `drain-pick-p2b2`, not from its squash (ruling C106)

**Why.** Since ruling C105, PR #203 also modifies `backend/tests/test_bill_single_writer.py` (it gives P8b's tripwire a table of read sites). `release/drain` does not have that file: it came with P8b. `git cherry-pick -x <p2b2>` of the squash, as 11.4 says today, would stop on `CONFLICT (modify/delete)`. I reproduced that twice: with the C105 commit on my drain tree, and with a squash-equivalent of the whole PR (eight files, parent `8c0c74c`) on the cut after P1 and the fix. The PR's other seven files are pure additions:

```
backend/scripts/drain_audit.py
backend/scripts/drain_audit_report.py
backend/tests/drain_fixture.py
backend/tests/test_drain_audit_integration.py
backend/tests/test_drain_audit_report.py
backend/tests/test_drain_audit_rules.py
backend/tests/test_drain_fixture.py
```

**What will exist after the merge.** One commit made by the coordinator: its parent is `main`'s commit of before the merge, its whole change is those seven files, and each blob is identical to the squash's. The annotated tag `drain-pick-p2b2` on `origin` names it and is never moved or deleted (the same rule as `drain-pick-tz-fix`, ruling C32). The pick commit is not an ancestor of `main`.

**Rehearsed.** On `a31924a`, the picks of `87bbe88`, `drain-pick-tz-fix`, a local seven-file candidate and `90ea88d` each applied cleanly; 11.6's four source lines and 11.7's file-list check came out as written with the candidate in the squash's place; the resulting tree is the one the P2b-2 lane's and my drain gates run on.

**The lines to change** (all eight uses of `<p2b2>` are in section 11):

1. Intro, lines 2531 to 2547. The third of the four commits is the pick commit, fetched by the tag. Say why in one or two sentences next to the existing ones about the fix: the squash `<p2b2>` on `main` also changes a test file this branch does not have, so it is not the one to pick; the tag's commit holds the PR's seven added files, each byte-identical to the squash's.
2. 11.1, the block at 2551 to 2565 and its Check. The loop `for c in 87bbe88 <p2b2> 90ea88d` still checks that each of the three squashes is on `main` with one parent (the squash is needed for the comparison below). Add for the new tag what the block already does for the fix: `git cat-file -t drain-pick-p2b2` prints `tag`; `git rev-parse 'drain-pick-p2b2^{commit}'` prints exactly `<p2b2-pick-full-sha>`; one parent; `git merge-base --is-ancestor drain-pick-p2b2 origin/main` with its exit code printed, 1 expected, and the same two STOP readings for 0 and 128. Add the content check, which is the point of the whole arrangement: the pick commit lists exactly seven files, and each has the squash's blob. A form whose tag syntax I tested on the existing tag `drain-pick-tz-fix` (the comparison itself I ran on the local candidate, by its sha); run it on the real tag when the tag exists, in the last small commit:

   ```bash
   git show --name-only --format= 'drain-pick-p2b2^{commit}' | grep -c .        # 7
   for f in $(git show --name-only --format= 'drain-pick-p2b2^{commit}'); do
     [ "$(git rev-parse "drain-pick-p2b2^{commit}:$f")" = "$(git rev-parse "<p2b2>:$f")" ] || echo "DIFFERENT: $f"
   done                                                                          # prints nothing
   ```

   Any `DIFFERENT:` line, a count other than 7, or another sha is a STOP for the coordinator, like a missing tag.
3. 11.4, line 2612: `git cherry-pick -x drain-pick-p2b2`. Check as 11.3a does for the fix: the trailer names `<p2b2-pick-full-sha>`, and `git show --stat HEAD` lists the same seven files as `git show --stat 'drain-pick-p2b2^{commit}'`.
4. 11.6, lines 2630 to 2636: the third source line is `(cherry picked from commit <p2b2-pick-full-sha>)`. Say what the wrong pick looks like: unlike the fix's squash, P2b-2's squash does not apply here at all; a conflict at 11.4 means it was picked.
5. 11.7, line 2672: the list loop reads the pick commit's files (`'drain-pick-p2b2^{commit}'`) where it reads `<p2b2>` today. With the squash there the check would fail on the test file.
6. The tag message, line 2760: name both, for example `P2b-2 <p2b2> picked as <p2b2-pick> (C106)`.
7. 11.13, re-cut after a window fix (from 2848): one sentence. A fix whose `main` squash touches a file this branch does not have cannot be picked as it is; the coordinator makes its pick commit and tag the same way, and a conflict stays a STOP.

Keep the sentence "Cutting the tag is the last Scope item of P2b-2".

## 2. Section 8: the audit's last outcomes and how each is cleared

The reviewed source is the script itself at PR #203's head `ff4c34f` (review record `C:/Users/User/.fixflow-cache/handoff/reviews/203-ff4c34f.txt`): `backend/scripts/drain_audit.py`, the module docstring, `_ASK_THE_PHONE` and its users, the help of `--ack-unreadable`, the exit codes; and `backend/scripts/drain_audit_report.py`, its two clears lines. A clean tree at that head: `C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/rv203-head-server`. The P2b-2 lane wrote what it wants section 8 to say in its ready markers, under "FOR THE RUNBOOK": `C:/Users/User/.fixflow-cache/handoff/ready/203-2375fd6`, `203-cccabf6`, `203-ba7952b` and `203-ff4c34f` (the last one replaces the storage-card clause of the one before).

What section 8 must carry, in the script's own terms:

- The outcome `not_judged` and exit code 4: a row that would end `missing` or `residue` while the discard list that could clear it is absent or cannot be trusted.
- `--ack-unreadable INSTALL_ID:discards`, what it clears (`unreadable_reviewed`) and what it never clears (a newest after-report with no discard list: that one is cleared by hand only).
- What the owner does before acknowledging, word for word as the script says it: he reads that phone's Drain Report, whose storage card lists the stores and the kept copies that were unreadable when the snapshot was taken; anything else (a list or a store that went bad later, unreadable record parts, a key the phone could not read) is on no screen and is named only in the audit's note; he asks the technician what was discarded or pending there.

Do not restate a rule from memory of an earlier round: three wordings of that last sentence were wrong by one claim each before this one passed. Quote the script.

## 3. R0.7: the daily check gets the restore sentence the weekly one has

From the review of PR #219 at `e08828f` (its backlog note): R0.7's daily check (line 3179, "a lower <n> ... : R10") has no exception for a restore. On the morning after restoring an older dump taken after 0048, the head seq can drop and send the owner to R10.3 about a restore he already knows about. Give the daily check the same restore sentence the weekly check got in C102.

## 4. Not in this PR

The rig lane's items (`ops/lab/rehearsal/train.sh:271`, the 34 drifted rows of `runbook-pins.tsv`) stay with the rig lane; it follows this PR's final text.

## 5. The marker

When ready: `C:/Users/User/.fixflow-cache/handoff/ready/<pr>-<sha7>` with the changed lines, the placeholders still open, and what you ran.
