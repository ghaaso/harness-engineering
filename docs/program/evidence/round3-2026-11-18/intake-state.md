# Intake of research round 3: state

Child session of the top session (local_f25313b3), run 2026-11-19. Ruling r57-0031: a lane reaches the board only after
a fresh reader checks a sample of its records and a recall test passes. This session prepares; the top session decides
corrections and replaces the board. `R:` = `docs/program/evidence/round3-2026-11-18/`.

Usage at start: week 57 % (stop at 62 %). Context at start: 96,000 tokens (stop and commit at 130,000).

## Lane files

| Lane | Records | Extractor files | Refute file |
|---|---|---|---|
| c1 | `library/journal/2026-11-19/c1.jsonl` | x30-x34, x43 | `R:c1-refute.md` |
| w1 | `w1.jsonl` | x25-x29, x40 (w1-collect-long), x41 | `R:w1-refute.md` |
| t1 | `t1.jsonl` | x35-x39, x42 | `R:t1-refute.md` |
| a1 | `a1.jsonl` | x44-x48 | `R:a1-refute-1.md`, `R:a1-refute-2.md` |

x40 is not in ROUND.md's table; its records cite `R:w1-collect-long.md`, so it is counted with w1.

## Samples (step 1), fixed before any helper ran

Rule: of the lane file's records whose kind is `result` or `fact`, in line order, the 5th, 10th, 15th ...; of each
extractor file, lines 8, 16, 24 ... `id@line` and `id@file:line`.

- c1: 46 result/fact records in c1.jsonl, sample 9: c1-0304@5 c1-0309@10 c1-0314@15 c1-0319@20 c1-0324@25 c1-0329@30 c1-0334@35 c1-0104@40 c1-0109@45
  - extractor files x30, x31, x32, x33, x34, x43, sample 21: x30-0307@x30:8 x31-0307@x31:8 x31-0315@x31:16 x31-0323@x31:24 x31-0331@x31:32 x31-0339@x31:40 x32-0307@x32:8 x32-0315@x32:16 x32-0323@x32:24 x32-0331@x32:32 x32-0339@x32:40 x33-0307@x33:8 x33-0315@x33:16 x33-0323@x33:24 x34-0307@x34:8 x34-0315@x34:16 x34-0323@x34:24 x34-0331@x34:32 x43-0307@x43:8 x43-0315@x43:16 x43-0323@x43:24
  - open records in c1.jsonl: 16
- w1: 76 result/fact records in w1.jsonl, sample 15: w1-0304@5 w1-0309@10 w1-0314@15 w1-0319@20 w1-0324@25 w1-0329@30 w1-0334@35 w1-0339@40 w1-0344@45 w1-0349@50 w1-0354@55 w1-0359@60 w1-0364@65 w1-0369@70 w1-0374@75
  - extractor files x25, x26, x27, x28, x29, x40, x41, sample 24: x25-0308@x25:8 x25-0316@x25:16 x26-0308@x26:8 x27-0308@x27:8 x27-0316@x27:16 x27-0324@x27:24 x27-0332@x27:32 x27-0340@x27:40 x28-0308@x28:8 x28-0316@x28:16 x28-0324@x28:24 x28-0332@x28:32 x28-0340@x28:40 x29-0308@x29:8 x29-0316@x29:16 x29-0324@x29:24 x29-0332@x29:32 x29-0340@x29:40 x40-0308@x40:8 x40-0316@x40:16 x40-0324@x40:24 x40-0332@x40:32 x41-0308@x41:8 x41-0316@x41:16
  - open records in w1.jsonl: 13
- t1: 83 result/fact records in t1.jsonl, sample 16: t1-0104@5 t1-0109@10 t1-0114@15 t1-0119@20 t1-0303@26 t1-0308@31 t1-0313@36 t1-0318@41 t1-0323@46 t1-0328@51 t1-0333@56 t1-0338@61 t1-0343@66 t1-0348@71 t1-0353@76 t1-0358@81
  - extractor files x35, x36, x37, x38, x39, x42, sample 34: x35-0107@x35:8 x35-0115@x35:16 x35-0123@x35:24 x36-0307@x36:8 x36-0315@x36:16 x36-0323@x36:24 x36-0331@x36:32 x37-0307@x37:8 x37-0315@x37:16 x37-0323@x37:24 x37-0331@x37:32 x38-0307@x38:8 x38-0315@x38:16 x38-0323@x38:24 x38-0331@x38:32 x38-0339@x38:40 x38-0347@x38:48 x39-0307@x39:8 x39-0315@x39:16 x39-0323@x39:24 x39-0331@x39:32 x39-0339@x39:40 x39-0347@x39:48 x39-0355@x39:56 x39-0363@x39:64 x39-0371@x39:72 x39-0379@x39:80 x39-0387@x39:88 x39-0395@x39:96 x42-0307@x42:8 x42-0315@x42:16 x42-0323@x42:24 x42-0331@x42:32 x42-0339@x42:40
  - open records in t1.jsonl: 11
- a1: 49 result/fact records in a1.jsonl, sample 9: a1-0304@6 a1-0309@11 a1-0314@16 a1-0319@21 a1-0324@26 a1-0329@31 a1-0334@36 a1-0339@41 a1-0344@46
  - extractor files x44, x45, x46, x47, x48, sample 23: x44-0307@x44:8 x44-0315@x44:16 x44-0323@x44:24 x44-0331@x44:32 x44-0339@x44:40 x45-0307@x45:8 x45-0315@x45:16 x45-0323@x45:24 x45-0331@x45:32 x46-0307@x46:8 x46-0315@x46:16 x46-0323@x46:24 x46-0331@x46:32 x46-0339@x46:40 x46-0347@x46:48 x47-0307@x47:8 x47-0315@x47:16 x47-0323@x47:24 x47-0331@x47:32 x47-0339@x47:40 x48-0307@x48:8 x48-0315@x48:16 x48-0323@x48:24
  - open records in a1.jsonl: 19

## Steps

| Step | State | Output |
|---|---|---|
| 1 sample checks, 4 Sonnet `read` | done (w1, a1 helpers first skipped the extractor lines; sent back, now complete) | `R:intake-sample-<p>.md` |
| 2 corrections packets, 2 Opus `analyse` | running | `R:intake-corrections-c1-a1.md`, `R:intake-corrections-w1-t1.md` |
| 3 draft board, 1 Opus `analyse` | done: 218 lines, 15 look-up rows, all 320 ids checked to exist | `library/INDEX-draft.md` |
| 4 recall test, Sonnet `test` then Opus `analyse` | test running (week 58 %) | `library/tests/recall-test-4.md` |
| 5 checks, usage, commit, push | pending | |

## Step 1 results (week 57 % after the step)

| Lane | Sample | Stands | In part | Does not stand | Cannot check | Notes |
|---|---|---|---|---|---|---|
| c1 | 30 | 28 | 2 (c1-0329, x31-0315) | 0 | 0 | six c1 records cite the collect file's section header, not the quoted line |
| w1 | 39 | 39 | 0 | 0 | 0 | three line slips that change no mark |
| t1 | 50 | 46 | 4 (x35-0123, x37-0323, x38-0307, x39-0323) | 0 | 0 | four line slips |
| a1 | 32 | 31 | 1 (a1-0344) | 0 | 0 | records cite section anchors, not lines |

Refuted claims appearing as `result`: none in any lane. Company figures without "self-reported": w1 x27-0341;
c1 x32-0337, c1-0331, x33-0303, x33-0304; t1 and a1 none (their unlabelled company records carry no figure).

## Step 2 results so far

- w1/t1 packet: 24 open records (w1 13, t1 11; extractor files none); 7 proposed corrections, 6 right, 1 right in
  part (w1-0511: CAID put worktrees above one agent, 59.1 against 53.1 %); replacement ids r57-0310..0314,
  r57-0410..0411 provisional (may clash with the c1/a1 packet).
- c1/a1 packet: running.
