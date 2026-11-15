# Harness v2, phase 1: what the read-only start found (2026-11-11)

The owner accepted the plan on 11 November ("Yes, start phase 1"). This is the part of phase 1 that needs no further decision and changes nothing: measurements. Everything here was read-only. Nothing was installed, no setting was changed, nothing was written to the clinic repository, nothing was committed.

## 1. Token baseline per slice session (saved)

`token-baseline-2026-11.txt` and `.json`, from `token-baseline.js.txt`. Same counting as the compile's tally: 19 folders, 184 files, 557 MB, 4,252.9M cache-read tokens. All November transcripts are still on disk; the oldest file was last written on 1 November.

- The root and its subagents: 24.4 % of tokens. Three slice sessions carry another 42 %: nervous-newton (20.0 %), epic-blackwell (12.8 %), admiring-shirley (9.3 %).
- Eleven of the eighteen slice sessions never passed 367k of context.

## 2. Compactions: the compile undercounted, and the 400k window was in effect for Opus

`compaction-by-model-2026-11.txt`, from `compaction-by-model.js.txt`.

- **48 automatic compactions in main sessions in November** (50 counting subagent transcripts). The compile counted four, in the root only.
- **38 of the 48 came between 366k and 387k, and every one of those ran on Opus 5.5.** That is where a 400k window triggers. Opus sessions have that window by themselves.
- Slice calls on Opus: 5,879 calls, 1,306.5M cache-read, largest context 367k. Slice calls on Sonnet: 3,297 calls, 1,452.4M, largest 963k. Sonnet sessions read more tokens in fewer calls.
- The root compacted six times, not four: twice near 367k while it ran on Opus (3 and 6 November), once at 574k, three times near 970k on Fable.

**What this changes.** Compile §9.4 says the 400k window was "built here, never switched on" and that nothing tests an earlier window on real slice work. The setting was never applied, but the effect was there for every Opus session, on real slice work, 38 times. The calls above 400k are on Sonnet and Fable. The phase 5 trial is therefore narrower: a 400k window for Sonnet slice sessions. The record's Opus-against-Sonnet difference is a comparison across models doing different work, not a trial.

## 3. Every power-off joined to what was running

`shutdown-join-2026-11.txt`, from `shutdown-join.js.txt` and `shutdown-events.json` (Windows System log, read-only). It reads timestamps from all 2,443 transcripts on this PC, and the clinic git log.

- **25 unexpected shutdowns since 1 October**: the compile's 24 since 7 October, and one on 6 October.
- **15 of the 25 had no Claude call, in any project, in the ten minutes before.**

| What was running | Count | Which |
| --- | --- | --- |
| Several sessions working (a call within a minute) | 6 | 3 Nov 16:32; 4 Nov 01:28, 14:21, 15:58, 18:41; 6 Nov 14:58 |
| One session working | 2 | 29 Oct 00:38; 10 Nov 15:08 |
| Nothing running, no flag | 6 | 11, 15, 17 Oct; 3 Nov 18:43; 6 Nov 00:01; 7 Nov |
| Around sleep (one with the crash code) | 6 | 7, 23 Oct; 5 Nov; 6 Nov 18:11; 8 Nov; 10 Nov 15:25 |
| Power button held, PC idle | 5 | 6, 13, 27 Oct; 2 Nov 16:20 and 23:06 |

- Build load can explain six at most. Eleven point at the sleep path or at a PC that hung while idle and was forced off. Six came with nothing running and no flag: those are the ones a mains cut would look like.
- The compile listed the events by the day they were logged at the next boot. By the day they happened: 17 October (not 18), two on 2 November, two on 3 November (not one and three).
- What it cannot show: whether a check was running, temperature, power draw, or a mains cut.

## 4. Facts read for the decisions

| Fact | Value |
| --- | --- |
| Sleep on mains | after 900 s (15 minutes); hybrid sleep on; hibernate never; no battery |
| Docker Desktop start at sign-in | off |
| Second drive attached | none; only C: (256 GB free) |
| Encryption tools | BitLocker tools present (Windows 11 Pro); no gpg, no 7-Zip |
| Debugger | none installed; the 7 October dump is there (6 MB) |
| Temperature without an install | not readable from a normal session |
| Clinic repository | `git fsck --full` clean; 55 MB packed; 36 branches; 19 worktrees; no remote; three leftover temp objects |
| Uncommitted clinic work | six untracked paths in the main checkout (research output, the context system and its tests), one path in the s01 worktree. A bundle alone would not carry them |
| Transcript clean-up setting | not set in the user settings or in the clinic's project settings |

## 5. What is waiting

- **On the owner:** where the copy goes; Docker start at sign-in; no sleep on mains; a sensor logger and a debugger (installs); how sessions resume; notes on power cuts at home.
- **Not started:** the restart chain, the resume list and the nightly copy. They are scripts for the clinic repository and need a session working there, on the owner's word.
