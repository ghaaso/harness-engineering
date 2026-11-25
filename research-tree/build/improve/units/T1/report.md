(Saved unchanged by the top session from T1's reply of 2026-11-25: the app refused the helper's own write of this file.)

T1 (plateau checks, D4, tuning only, 260 commits; scoring fixed first in `units/T1/SCORING.md`, one arm added mid-run and marked there). All ran on CPU, 0 card-hours: 9 training runs of about 2-10 minutes each, B2 refit, stratum scorer. Code: `improve/code/T1/`; outputs (112 MB: scores, runs, strata.json): `CR/improve/T1/`. Checks passed: the B2 refit and U5's saved state reproduce their recorded per-commit P@10 exactly.
1. **Ceilings.** Pooled P@10 ceiling 0.263 (FixFlow 0.438, clinic 0.374, zulip 0.212). Counting reaches 0.124 and B2 0.138, so about half the ceiling is used. Restricting picks to files with earlier co-change gives a ceiling of 0.321 / 0.172 / 0.181 (pooled about 0.198). Counting still leaves about 0.07 P@10 unused inside history itself.
2. **Reach.** History reaches 70 / 34 / 79 % of truth. Imports reach 25 / 18 / 25 %, the same folder 29 / 18 / 37 %, names 6-9 %. PPR and text are above 0 for nearly every file, so they set no limit on reach.
3. **Truth files with and without earlier co-change (against counting, pooled).**
   - B2: +0.0080 [+0.0055, +0.0107] on "with", +0.0054 [+0.0033, +0.0078] on "without".
   - U5 as frozen: +0.0044 [+0.0014, +0.0075] on "with", +0.0028 [+0.0012, +0.0047] on "without".
   - Recall@10 of "without" truth: counting 0.004, U5 0.041, B2 0.106.
4. **Seed kinds.** No tuning seed has zero earlier changes, so the "none" kind is empty. B2's gain is largest on seeds with 1-5 changes: +0.043 [+0.029, +0.057], against +0.009 on seeds with more.
5. **Ablation.** Each arm is the mean of 2 seeds, compared with U5 as it is (0.1308; its two seeds differ by -0.0011 [-0.0030, +0.0009]).
   - Count features without the graph: 0.1292, -0.0016 [-0.0039, +0.0005].
   - Graph without the count features: 0.1069, -0.024 [-0.031, -0.017], below counting's 0.124.
6. **Hard negatives.** All 20 negatives from the counting top 50: 0.0441, -0.087 [-0.098, -0.076]; zulip falls to 0.012. Mixed form, 10 from the top 50 and 10 uniform: 0.1098, -0.021 [-0.026, -0.017]. Both gain a little on "without" (+0.006 and +0.003) and lose more on "with".
**For the claim:** in this network the graph adds nothing over the counts (inside seed noise), and the graph alone is worse than counting. Changing the training target to hard negatives hurts instead of helping. This one GraphSAGE form adds nothing beyond its count inputs, and its size and target are not what holds it back.
**Against the claim, or narrowing it:**
- Learned arms do not tie counting on "with": B2 gains +0.008 there by ordering files that have co-change history. So the room inside history (about 0.06-0.07 P@10 under its ceiling) is not shown to be out of reach. Only shown is that this network does not reach it.
- B2's gain on "without" (recall 0.106) comes from name, folder and import features. That is new input, as the survey predicted.
**Not run:**
- U6's temporal models on the kinds: their columns were not finished, and they are not mine to write.
- More than 2 seeds; hard negatives for B2 or U6; other graph forms (GAT; seeds only for the frozen setting).
- Held-out data, never opened.
- About a third of a card-hour was planned; nothing needed the card, because U5's chosen network trains in minutes on 4 CPUs.

Process notes: one run (`nocount_s0`) died silently at first with exit 0 and no traceback, probably memory pressure in the shared VM; it was rerun cleanly (old log kept as `nocount_s0.died1.log`). For about 20 s three of my jobs ran at once because a waiter matched an old log line; I stopped the extra one (`mix_s0`) and reran it later. No other unit's job, file or folder was touched.
