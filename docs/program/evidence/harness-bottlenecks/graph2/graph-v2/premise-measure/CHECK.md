# Independent check of the premise measurement (2026-11-14)

The checker wrote its own scripts and recomputed the numbers from `rows.jsonl`, `findings-classified.json`,
`reuse-hits.jsonl`, `stale-exposures.json` and its own read-only `git log --all --diff-filter=A`. Scripts and output
are in the scratch folder `graph-v2-work/premises/check/`. It read the lane's scripts only to find the cause of a
mismatch. The input files still match the hashes in `input-hashes.txt`. No transcript text was printed.

| Claim (NOTES.md / result.json) | Claimed | Recomputed | Match |
|---|---|---|---|
| CQ1 reads of tracked files: calls / fetched / carried | 15.6 / 7.1 / 4.1 % | 15.6 / 7.1 / 4.1 % | yes |
| Untracked files in the repository folder | 28.8 / 22.4 / 25.1 % | 28.8 / 22.4 / 25.1 % | yes |
| Scratch folders | 50.8 / 66.9 / 67.8 % | 50.8 / 66.9 / 67.8 % | yes |
| Transcripts / other outside / unresolved, % of calls | 1.3 / 3.2 / 0.4 | 1.2 / 3.1 / 0.4 | rounding (79.2 and 199.6 of 6,340 calls) |
| Own git test of "tracked when read" against the row labels | - | agrees on 7,771 of 8,775 rows; the rest are 664 clone rows and 275 `.claude/worktrees` rows (repository copies, labelled tracked on purpose) and 65 reads of the repository root itself | yes |
| Re-read of a file the same agent transcript wrote: calls / carried | 23.9 / 21.5 % | 23.9 / 21.5 % | yes, see note 1 |
| Same transcript, or same session under 24 h: calls / fetched / carried | 72.1 / 81.8 / 83.9 % | 72.0 / 81.8 / 83.9 % | yes, see note 1 |
| Same session at any age: calls / carried | 86.4 / 92.2 % | 86.4 / 92.2 % | yes |
| Another session wrote it | 6.3 % of calls | 6.3 % | yes |
| Findings with all checkable premises tracked here | 12/60 = 20 % (Wilson 12-32) | 12, 20.0 % (11.8-31.8) | yes |
| Same, no bare judgement | 7/60 = 12 % (6-22) | 7, 11.7 % (5.8-22.2) | yes |
| All checkable premises in the repository folder | 16/60 = 27 % (17-39) | 16, 26.7 % (17.1-39.0) | yes |
| Any version control or pinned | 17/60 = 28 % (19-41) | 17, 28.3 % (18.5-40.8) | yes |
| Counterfactual, every cited file content-hashed | 32/60 = 53 % (41-65) | 32, 53.3 % (40.9-65.4) | yes |
| At least one premise of kind d or f | 44/60 = 73 % (61-83) | 44, 73.3 % (61.0-82.9) | yes |
| Deterministic (type Q); all 7 re-checkable from this repository | 7/60 = 12 % (6-22); 7 | 7, 11.7 % (5.8-22.2); 7 | yes |
| "Expressible as a query (Q, or script result M)" | 19/60 = 32 % (21-44) | Q or M = 22/60 = 36.7 % (25.6-49.3); 19 is the `r9` field (new or typed) | **no, see note 2** |
| Interpretation | 41/60 = 68 % (56-79) | 41 (`r9` interp), 68.3 % (55.8-78.7) | yes |
| Finding-level kind shares f, b, e, c_repo, c_scratch, d, a, bx, c_other, ax, epin | 63, 32, 25, 25, 23, 22, 20, 15, 8, 5, 3 % | same, Wilson intervals equal | yes |
| Premises: total, mean, median, maximum; per-100 split | 219, 3.65, 3, 10; 18/14/12/11/11/10/8/7/6 | same | yes |
| Six of seven Q findings from files B and I | 6 + E5 | B,B,E,I,I,I,I | yes |
| Needles found / shown in another session / in 2+ other sessions | 56 / 43 / 27 | 56 / 43 / 27 | yes, see note 3 |
| Exposures: all / in other sessions; gap median | 1,193 / 504; 57 h (n 150) | 1,193 / 504; 57 h (n 150) | yes |
| CQ1-read files read in 2+ sessions | 108 of 2,529 (4.3 %), 10.6 % of CQ1 carried | 94 of 2,245 (4.2 %), 9.9 % of CQ1 carried | **no, see note 4** |
| Maximum sessions per file | 5 | 5 | yes |
| Stale use: exposures after the change / I9, B5 / corrected fact also shown / stale sentence written afterwards | 6 / 5, 1 / 5 of 6 / 0 | 6 / 5, 1 / 5 of 6 (one only before the exposure) / 0 | yes |
| B5's document tracked | `docs/program/G2-deep-dive-gate-2026-11-01.md` | `git ls-files` lists it | yes |

**Spot checks (ground truth).** 15 seeded paths (seed 20261114, 8 labelled tracked, 7 untracked) were checked with
`git ls-files --error-unmatch`. 15 of 15 agree. For 5 seeded findings (H3, L5, F4, F3, B5), the quoted text was found
in the cited file, near the cited line. Eight-word windows: 11/11, 19/20, 1/1, 2/2 and 2/2; the one L5 window that
was not found has punctuation that differs.

**Notes**
1. The 24-hour share reproduces only with the lane's rule for files that have no recorded write: their age is taken
   from the file's birth time, which was read at analysis time. With only the recorded writes (age since the last
   recorded write, no birth-time fallback), it is 49 % of calls and 75 % of carried tokens, and "same agent" is
   17.4 % instead of 23.9 %. NOTES.md states the birth-time rule for "same agent" but not for the 24-hour age.
2. The row label in the headline table is wrong, not the count. 19 is the number of findings classified `r9` new or
   typed. Type Q or M gives 22 (36.7 %). Step 2's "32 % could be" uses the same 19.
3. This matches after the lane's own scanning transcript (82 hits) and the 747 hits that have no timestamp are
   dropped. Neither rule is stated in NOTES.md. With the lane's transcript kept: 60 found, 49 in another session,
   36 in two or more.
4. In `perfile.json`, a path counts as a directory only when it is inside the repository. 284 extensionless paths
   outside it (scratch directories listed or searched) are counted as files, and 14 of them were read in 2+
   sessions. 10.6 % is a share of the carried tokens on perfile files, not of all CQ1 carried tokens; over all CQ1
   carried it is 10.3 %, and with directories excluded it is 9.9 %. The conclusion ("most CQ1 traffic stays inside
   one session") holds either way.

**Wording.** Three phrasings are stronger than the evidence:
- "Most of the label is not an earlier lane's conclusion at all: 72 %": this depends on the birth-time fallback
  (note 1). Recorded writes alone give 49 % of calls.
- "Expressible as a query ... (Q, or script result M)": mislabelled (note 2).
- "10.6 % of CQ1 carried tokens": wrong denominator, and directories are included (note 4).

Everything else stays inside its stated caveats: one coder, 12 hand-picked files, cluster bootstrap reported.

2026-11-14 (after this check): `result.json` brought in line with these corrections by WORK `premises/check/align-result.js.txt` (`expressible_as_query` 22/60, `reuse.files` 94 of 2,245, 9.9 % of all CQ1 carried; nothing else changed; pre-change copy `check/result.before-align.json`); `check/agree.js.txt` confirms NOTES.md and result.json agree.
