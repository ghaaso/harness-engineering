# L4 rehearsal evidence (PR #201 at 8c2383e)

Evidence bundles written by the rig's two entry scripts (`ops/lab/rehearsal/`), copied from
`C:/Users/User/.fixflow-cache/handoff/evidence/l4/` on 2026-11-14. Everything here ran on the
coordinator's PC against stand-ins; no value in these files belongs to a real host or account.
Each folder's `run.txt` names the rig commit, the ref rehearsed and its sha.

The lane's final set (rig `8c2383e`; its "main" is `16e154e`):

| Run | Ref | Result |
| --- | --- | --- |
| `20261114T044959Z-restore` | main `16e154e` | DONE 45, FAILED 3, AMBIGUOUS 5 |
| `20261114T044742Z-train` | main `16e154e` | DONE 73, FAILED 1, AMBIGUOUS 2 |
| `20261114T052657Z-restore-mutate` | main `16e154e` | 13 of 13 mutations caught |
| `20261114T052427Z-train-mutate` | main `16e154e` | 5 of 5 mutations caught |
| `20261114T045941Z-restore` | PR #209 `bcbf506` | DONE 53, no FAILED, AMBIGUOUS or MOVED |
| `20261114T051000Z-train` | PR #209 `bcbf506` | DONE 76, AMBIGUOUS 1 (12.6) |
| `20261114T051235Z-restore` | `53c6046` (PR #209's base) | DONE 46, FAILED 4, AMBIGUOUS 3 |
| `20261114T052156Z-train` | `53c6046` | DONE 74, FAILED 1, AMBIGUOUS 2 |

The reviewer's own runs for the verdict (`docs/program/evidence/reviews/201-8c2383e.txt`):

| Run | Ref | Result |
| --- | --- | --- |
| `20261114T054121Z-restore` | main `e6f85c5` | DONE 45, FAILED 3, AMBIGUOUS 5 |
| `20261114T055103Z-train` | main `e6f85c5` | DONE 73, FAILED 1, AMBIGUOUS 2 |
| `20261114T055411Z-restore` | PR #209 `bcbf506` | DONE 53: the run that lifted the hold on #209 |
| `20261114T060507Z-train` | PR #209 `bcbf506` | DONE 76, AMBIGUOUS 1 (12.6) |
| `20261114T060751Z-restore-mutate` | main `e6f85c5` | 13 of 13 mutations caught |
| `20261114T061533Z-train-mutate` | main `e6f85c5` | 5 of 5 mutations caught |

`L4-c51-209-vs-53c6046.md` is the lane's row-by-row comparison of PR #209 with its base (ruling C51).
The FAILED rows on `main` before PR #209 are the runbook defects that PR #209 fixed.

The reviewer's runs for PR #213 (the rig's follow-up, at `7b0580a`; verdict `docs/program/evidence/reviews/213-7b0580a.txt`), all with the rig as that PR has it:

| Run | Ref | Result |
| --- | --- | --- |
| `20261114T095121Z-restore` | main `6f430ce` | DONE 51, AMBIGUOUS 2 (6.4 twice), not rehearsed 9 |
| `20261114T100259Z-train` | main `6f430ce` | DONE 75, AMBIGUOUS 1 (12.6); the timezone check ran under Pacific/Kiritimati |
| `20261114T100559Z-restore` | PR #211 `11cf740` | DONE 53, no FAILED and no MOVED: **the run that met the rehearsal condition for PR #211** (ruling C64) |
| `20261114T101831Z-train` | PR #211 `11cf740` | DONE 75, AMBIGUOUS 1 (12.6) |
| `20261114T102239Z-restore-mutate` | main `6f430ce` | 13 of 13 mutations caught |
| `20261114T103152Z-train-mutate` | main `6f430ce` | 5 of 5 mutations caught |

On PR #211's text every deliberate mistake around the restore (WT13 (b), WT16 to WT20) stopped with the writes kept; on `main` at `6f430ce` the delete ran in each.
