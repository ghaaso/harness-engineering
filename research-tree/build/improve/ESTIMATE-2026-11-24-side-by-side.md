# Improvement round: finish time with card jobs side by side (2026-11-24, 22:10 UTC, coordinator 6, 02d5327b)

Base: `ESTIMATE-2026-11-24.md` (one job at a time, 19:10 UTC; report likely 2026-11-26 08:35 UTC). Updated with what was
measured since: GATE's report (`units/GATE/report.md`), the card job logs (`CR/logs/improve-U*.log`, U6 driver logs), `gate.log`.

## Answer
Report likely **Thursday 2026-11-26 about 02:15 UTC**; range **Wednesday 25 Nov about 20:30 UTC** to **Thursday 26 Nov about
12:00 UTC**. About 6 hours earlier than the one-at-a-time figure (08:35), not more, because the three large pieces cannot
share the card with each other (each needs more than half of what the card can give our jobs: 10,332 MiB).

## Measured since 19:10
- Side by side (GATE, real load): two U6 jobs give 1.67 times the throughput of one; three give 1.8 to 1.9 times.
- U3's A4 sweep finished 21:07-21:42 (0.58 h, estimate 0.8 h), alone: its 7B jobs need 8,864 MiB, no 2,048 MiB job fits beside.
- U6 zulip TGN n20 lr 1e-4: 2,709 s (with spill into system memory), epochs 141-168 s (the old estimate scaled 397 s).
- U6 zulip bip-TGN n20 lr 1e-4: 356-358 s an epoch alone, evaluation 10-14 s (the old estimate scaled 219 s).
- U6 small jobs (clinic, FixFlow) 1 to 5 min each since U6-FIX's checkpoint change (the old estimate had 2 to 12 min).
- U6 settings finished at 22:04: clinic 10, FixFlow 3, zulip 5 of 24 each.
- Zulip TGN-class jobs fill their 5,744 MiB allocator cap (card 6,618 MiB used with one alone); their real need is not measured,
  so two never run together and none runs beside U2 (5,376 + 6,144 > 10,332).

## Card hours left, at one-job speed (likely, low-high)
Cannot share with each other (serial):
- U3: A4 frozen run and A6: 4.8 (3.7-7.0).
- U2: sweeps and finals: 7.0 (5.6-9.6), not measured further.
- U6 zulip TGN and bip-TGN sweeps: 9.8 (8.6-10.9): 11 settings, n32 at 1.4 times n20 (1.2-1.6).
- U6 finals, zulip TGN part: 1.6 (0.9-3.0) (old 2.9 h scaled by the measured zulip TGN speed).
- U5 card (cross-fit and final, alone): 0.3 (0.2-1.0).
Sum 23.5 (19.0-31.5).
Can run beside those: U6 small settings (clinic, FixFlow, zulip DyGFormer-class) and small finals: about 5.5 h at one-job
speed; beside one other job they cost it about 1.1 h (pairs run at 1.67 times).
Card done: 24.6 h (19.9-33) after 22:06, plus about 0.5 h of hand-offs between steps.
After the card: 3.0 h (2.2-4.0): refuter, U7, the report.

## What could stretch it
1. U2's training (7 h) is still the old estimate; it has not run yet. It and the other two large pieces go one after another.
2. Disk: 28 GB free at 20:1x UTC against 13-27 GB of writes to come (old estimate, item 2); helpers stop below 10 GB. Freeing
   space is the owner's to approve.
3. A crash costs 0.3-0.9 h each; none since the driver change at 13:38 (about 8.5 card-loaded hours).
4. The weekly meter: 72 % at 22:10 UTC (1 point in 2 h tonight); line 85 %; only new helper starts stop at the line.
