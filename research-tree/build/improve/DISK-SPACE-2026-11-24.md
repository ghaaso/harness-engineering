# What fills C: and what can be freed without losing anything (2026-11-24)

The measuring was read-only: nothing was stopped, compacted or pruned. After the owner's yes (2026-11-24, 19:55 to 20:10 UTC) steps 1 to 3 of the plan at the end were carried out; see "Done" just below. This replaces the first draft of this file; the corrections to that draft are listed at the end.

## Done after the owner's yes

- **18 clean worktree checkouts removed** (CLAIM, CLOSE, OUT, PA2, PB, PB2, PT, REDO, S2.1, S2.2, W1, W2, W2m, W3, W3m, W4, W5, W6) with plain `git worktree remove`, each rechecked right before: clean, tip inside `build`, not locked, branch present. 9.3 GB.
- **8 more removed after their untracked files were copied out** (CGATE, PA, PC, PLAN, W7, S0.4, S0.5, S0.6): 549 files, 3.5 MB, copied and compared byte for byte into `research-tree/build/improve/worktree-extras-2026-11-24/<name>/files`, each with a MANIFEST. About 4.1 GB. PC2 was kept (a refute round on it may still be pending).
- **99 headless-Edge profile folders in Temp removed** (10.88 GB). 8 were skipped because a file in them was written within the hour.
- **Checked afterwards:** all 27 `u/*` branches are present and every tip is inside `build`; the worktrees left are the main checkout, `hb` and PC2.
- **Sessions:** none of the 154 sessions (77 archived) has its working folder in any of these worktrees; the app counts only 21 session worktrees, in the product repository and the old Clinic_Workshop copy. These 27 were made by the build for its units.
- **Free space:** 18.3 GB at the lowest (19:55 UTC), 43.5 GB afterwards. The 27 to 18 GB drop in the minutes before was partly the pagefile (24.7 to 27.5 GB allocated) and the WSL swap file (3.3 to 4.0 GB) growing while only 3 GB of 31 GB of memory was free; the rest was not traced. Over 25 minutes the Rust builds wrote 1.5 GB, the round 0.8 GB, Temp 0.3 GB.

## The short answer

C: is 930 GB. Free space was 41.4 GB when the measuring began and 27 GB at 19:37 UTC. It is falling by about 1.5 GB every 10 minutes, so at that rate the disk is full by about 22:30 UTC unless something changes. The round has been running again since 19:05 UTC.

How much can be freed with no result, checkpoint or evidence lost, and none of the owner's personal files touched:

| When | GB | What | Needs |
|---|---|---|---|
| Now | 9.3 | 18 old harness worktree checkouts (every commit stays in the branches) | nothing; plain `git worktree remove`, no `--force` |
| After one check each | about 51 | 11.4 headless-Edge profile folders in Temp; 13.9 uv cache; 12.6 duplicate files inside the old profile copy; 8.0 derived files in the round's folder; 4.6 worktrees with untracked logs; 0.65 other | the checks and the owner's word, as listed below |
| Later, by compacting Docker's disk | about 70 | 50.5 already free inside the Docker disk, plus 17.9 graph-test volumes and 0.6 empty Postgres volumes, plus 4.7 old build cache | the round's containers stopped for the compaction (they relaunch from their checkpoints) and an administrator shell |

Together about 130 GB. The big other lever is the owner's own files (about 469 GB, listed further down), which are not research files; whether to touch them is his call alone.

Tokens spent on this investigation: the eight helpers 1.19 M (expected 7 M, stop at 25 M); the weekly meter read 70 % before they started (round stop line 77 %).

## What is using the space (measured, GiB = 1024^3 bytes; robocopy list-only without junctions)

C: used 903 GiB. The folders found add up to about 933 GiB, so about 30 GiB is overcounted (hard links in the component store and the uv cache, and compressed files counted at full size); unreadable system folders (System Volume Information, WindowsApps, Windows\Temp) need an administrator and were not sized.

| Item | GiB | Whose | Note |
|---|---|---|---|
| Users\User\Downloads | 248.9 | the owner's | two game archives 149.9, a SafetyHub export 74.9 (dated 24 Nov), installers about 21 |
| Docker data disk (`docker_data.vhdx`) | 138.6 | shared | 88.0 used inside, 50.5 free inside but not returned to C: |
| Bilal_Migration (old PC profile copy) | 72.0 | the owner's | see the cautions below |
| Steam library | 52.7 | the owner's | |
| Windows, Program Files, Program Files (x86), ProgramData | 41.5, 41.0, 66.2, 43.8 | system and programs | not ours |
| The round's folder (`card-run-2026-11`) | 54.7 | the round | models 29.0, D4 baseline 15.3, improve 9.2, repos 0.8 |
| Topaz models, Tencent GameLoop | 26.6, 16.0 | the owner's | |
| `rust-work` | 18.9, growing | the Rust migration | six build folders hold 16.9 of it |
| `.fixflow-cache` | 15.0 | the FixFlow product | |
| Codex workspace and app state | about 14.5 + 1.6 | the owner's | |
| uv package cache (real files) | 13.9 | cache | see below |
| Harness worktrees | 13.9 | this repository | 27 checkouts of about 0.51 each |
| ClinicStagingRig | 10.4 | the clinic | |
| Windows temp | 11.4 headless-Edge profiles, 0.4 old loose files | cache | |
| Pagefile 19.7, hibernation file 12.4 | | system | |

## Why C: is shrinking now

- `rust-work` grew from 10 to 18.9 GiB while this was measured (about 9 GB in two hours). It holds six separate build folders (`target-inst`, `target-server`, `target-fence`, `target-win`, `target`, `target-reader`), 16.9 GiB, all rebuildable, written by the Rust migration work (cargo and rustc were running). One shared build folder, or cleaning the finished ones, would stop most of the growth. That is that work's call.
- The round's own saves (`improve/`, 27 files written in 15 minutes) are the other writer. Not traced further.

## What each safe item is, and why it is safe

1. **18 clean worktrees (9.28 GB).** CLAIM, CLOSE, OUT, PA2, PB, PB2, PT, REDO, S2.1, S2.2, W1, W2, W2m, W3, W3m, W4, W5, W6. `git status --ignored` is empty in each, every tip commit is already inside branches `build` and `top9/track-plan`, and the u/* branches stay. Confirmed by a second check (commits not in `build`: 0 for each). One gap no command can see: a session whose working folder is inside a checkout. The sessions list shows all of them in the repository root. Use plain `git worktree remove`; it refuses a dirty checkout. `hb` stays (branch `build` is checked out only there).
2. **9 worktrees with untracked files (4.63 GB).** CGATE, PA, PC, PC2, PLAN, W7, S0.4, S0.5, S0.6. Their only extras are generated logs and test scratch of under 1 MB each. Copy the logs the unit result files cite (CGATE, S0.4, S0.5, S0.6) first. Keep PC2 until no refute round on it is pending.
3. **Headless-Edge profile folders in Temp (11.4 GB).** `checks-edge-*`, `edge-r8-*`: leftovers of screenshot checks. One was live at check time (a session's screenshot run), so skip every folder a running `msedge` names or written in the last hour.
4. **uv cache (13.9 GB).** The real files are in the Claude app's package copy (`AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Local\uv`); the folder at `AppData\Local\uv` is a merged view of the same files and counts only once. Nothing in it is a result; the round does not use it (it trains inside Docker). Only 6 big files are hard-linked into the owner's `lectures` environment, which survives. Emptying it downloads nothing; refilling it is a download, so the owner's word first (rule 3). Clear it with `uv cache clean` from a Claude session or through the package path, not the real `AppData\Local\uv`. The pip cache adds 0.25 GB.
5. **Duplicate files inside Bilal_Migration (12.6 GB).** `Users\OGDCL` is a second pass of `User`; 14,826 files have an identical twin in `User`. Only 666 of them were hash-checked; hash all before deleting, and tell the owner first (it is his old PC's archive). Delete by the hashed file list, never the folder: 6.7 GB of `Users\OGDCL` is not duplicated.
6. **Derived files in the round's folder (about 8.0 GB), at a pause of the round only.** The 73 `rules-60.head` files (7.07 GB) are rebuilt byte for byte from the raw `rules-60` by the `sed | grep` step in `anyburl.sh` (checked on all 89 head files). Never remove the raw `rules-60`: it is not rebuildable identically. Also: 32 superseded `rules-20` files 0.26, `apply-graph.txt` 0.15, the pristine `SweRankEmbed-Small` weights 0.26 (point the pin check in `FETCHED.md` at `-local` first), four dead U6 `.pt.tmp` files 0.07, U5 `zulip.partial.npz` 0.2. Never touch `bip-tgn` `ckpt.pt.tmp`.
7. **Docker, inside the disk (frees C: only after compaction).** The 13 `gt-*` volumes (17.3 GB) are rebuildable stores of the finished graph test; their results are in the evidence folder. 15 empty Postgres volumes (0.6 GB). Old build cache (4.7 GB): `docker builder prune -a --filter until=168h -f`. Names only: never `docker volume prune -a` or `docker system prune -a --volumes` (they would also delete the 26 clinic databases and the FixFlow volumes), and not `docker container prune` (it would turn the clinic databases into unlinked volumes and delete the Elasticsearch data).
8. **Compaction.** The file holds 88.0 GiB; the rest is free inside. Needs Docker Desktop quit, `wsl --shutdown`, then an elevated `Optimize-VHD`. No data is deleted, but every container stops: the round's jobs run with `--rm` and no restart policy, so they lose work since their last checkpoint and must be relaunched. Not measured: how much it really returns and how long it takes.

## The owner's choices (not decided here; none is a research file)

About 469 GB: Downloads 248.9 (the two game archives 149.9 are the largest single files on C:), Steam 52.7, Topaz models 26.6, Tencent GameLoop 16.0, `.fixflow-cache` 15.0, Codex workspace 14.5, Blackmagic 13.1, ClinicStagingRig 10.4, `.harness-extraction-2026-11-15` 8.2 (a backup the research data was rebuilt from), the raw `rules-60` 7.5 (keep), FixFlow and clinic Docker volumes about 14, unused Docker images about 12.7 (each costs a rebuild or pull), Rust build folders about 17 after that work ends, and smaller ones. The SafetyHub export (74.9 GB, dated 24 Nov) is another project's data with a session working in it: probably the only local copy.

## Never candidates (kept)

The round's models (27.4 GB, a 29 GB re-download), the D4 baseline and rule files, `improve/` outputs and checkpoints, `recovered/` and `docs/program/evidence/`, the paused and running round containers and the image `d2-embed-gpu:3` (`:1` and `:2` free about 0 bytes: they share its layers and the round's scripts name them), the postiz containers, session transcripts under `.claude`, `C:\research-runs` and the pilot's run root, the Rust work while it runs.

Bilal_Migration is not junk: about 58 GB of its content exists nowhere else by path or by big-file name and size. It holds the only complete history of the `Clinic_Workshop` repository (443 commits, no remote), uncommitted work, personal media and `.ssh` keys. Keep all of it except the item 5 twins.

## Two things the owner should know

- A git config inside the old profile copy (the `fyp` repository, also its twin under `Users\OGDCL`) has a Hugging Face access token embedded in a remote URL. It was not copied here. Revoking it is cheap.
- No tip of any harness worktree or `u/*` branch is on a remote: the whole build history lives in one `.git` on this PC.

## Corrections to the first draft of this file

- uv cache: 13.9 GB of real files, not 17 + 19 GB; the Claude package path and `AppData\Local\uv` are one set of files.
- The PowerShell total of 617 GB for the profile was wrong: PowerShell followed junctions and counted files several times. Robocopy without junctions is used above.
- Docker free inside the disk was estimated at 40 GB; measured: 50.5 GiB.
- `Bilal_Migration` is not a duplicate of the live profile: 71 of its 72 GB exist only there.
- Worktrees: 18 clean (9.28 GB) and 9 with untracked files (4.63 GB), 13.9 GB in all.

## Not checked

- Whether any session works inside `hb` or a Temp folder (the sessions list shows none inside the worktrees that were removed).
- A full hash of all 14,826 twins in the old profile copy (666 were hashed).
- What writes about 1.5 GB per 10 minutes besides the Rust build folders and the round.
- Shadow copies, System Volume Information, the true size of WinSxS, Windows\Temp and Delivery Optimization (need an administrator).
- Whether compaction returns the full 50.5 GiB and how long it takes.
- The contents of the owner's personal folders (only names, counts and sizes were read).
- Sizes mix GiB and GB; totals are rounded and carry an error of a few percent.

## The steps in order (written out, none run)

1. `git worktree remove <name>` for the 18 clean worktrees (9.28 GB), no `--force`.
2. Headless-Edge folders in Temp older than one hour and not named by a running `msedge` (11.4 GB).
3. The nine worktrees after copying their cited logs (4.63 GB).
4. At a round pause: the card-run derived files (about 8 GB).
5. With the owner's word: the uv and pip caches (14.2 GB) and the twins in the old profile copy (12.6 GB).
6. When the round can stop its containers for a few minutes: remove the `gt-*` volumes and the empty Postgres volumes by name, run the build cache prune above, then quit Docker Desktop, `wsl --shutdown`, and compact `docker_data.vhdx` (about 70 GB).
