# Refuting the library pathway map (2026-11-12)

This is the working behind the refuter's return. It checks the map before the owner sees it.

It proposes nothing for the library. Every "what to change" below is about the map, the page or the record.

**Tags.**
- [M]: counted or measured on this PC, from the files named.
- [S]: from an outside study or the vendor's price list.
- [G]: computed by the model. Its inputs include guesses, so the result is a guess too.

**Scripts.** Both are run from this folder with `node - < name.js.txt`. Each writes its own console file.
- `refute-map.js.txt` writes `refute-map-console.txt`. It covers:
  - the reproduction
  - the cost breakdown
  - the tilt tests C0 to C8
  - the corner search
- `refute-map-2.js.txt` writes `refute-map-2-console.txt`. It covers:
  - tied draws
  - the chain from arrival to "good entry in hand"
  - uses per entry
  - two simplifications that favour the library

Both read the map files and change only copies held in memory.

---

## 1. Must fix

**MF1. The fixed Opus price ratio decides the "owner's goal" cost comparison.**

Where it appears:
- Record §2, the row "Strong model directly (the owner's goal)", and §7, "Two settings are fixed" and "Calls are the same size".
- Page "Run it": the ratio box, and the slider labelled "Price of one Opus call over one cheap call. 2.00S".

The setting m_opus is 2 [S]. That is a per-token price ratio standing in for a per-call one. Its range has one value, so the runs never vary it.

The record's own call sizes give a per-call ratio near 1: Opus about 222,000 [M] cache-read tokens per call, Sonnet about 440,000 [M]. The source (F3 line 49) also says the two models were doing different work, so neither figure comes from a trial.

What changes when m_opus is set to 1:

| Measure | At 2 | At 1 |
| --- | --- | --- |
| Cost vs strong directly, best values | 0.89 [G] | 1.23 [G] |
| Cost vs strong directly, ensemble middle | 0.90 [G] | 1.17 [G] |
| Share of runs cheaper with a wrong rate no higher than strong directly | 3.4% [G] | 2.6% [G] |
| Cost vs the ladder | 1.03 [G] | 1.04 [G] |

The cost ratio against strong directly crosses 1. Against the ladder it barely moves.

When m_opus is drawn from 1 to 2 instead, the ensemble middle is 1.01 [G].

The leaves-out note gives the call sizes. It does not say that the headline ratio crosses 1 on them. The S tag gives a per-token figure the weight of a per-call one.

**MF2. The "0.0%" against the ladder comes from drawing the unknowns independently.**

Where it appears: record §6, line 202, and the page's "Many runs" share line.

Test (`refute-map-2-console.txt`, E1). The 35 [M] library-side unknowns were tied together and drawn again, over the same ranges. Each was turned so that a higher draw helps the library. A tie strength of 0 means independent draws, as the map does. A tie strength of 1 means all 35 move together.

| Tie strength | Library cheaper than the ladder | Cheaper, with a wrong rate no higher | Cost vs ladder, 5th percentile |
| --- | --- | --- | --- |
| 0 | 0.0% [G] | 0.0% [G] | 1.01 [G] |
| 0.5 | 13.7% [G] | 13.6% [G] | 0.96 [G] |
| 1 | 24.9% [G] | 24.9% [G] | 0.84 [G] |

The middle value stays at 1.04 [G] at every tie strength.

A search over the ranges (console section D) finds a setting with cost vs ladder 0.58 [G]. With bad entries that do not steal hits and that fade, it finds 0.53 [G].

The note "Ranges are drawn evenly and on their own" sits 18 [M] lines lower. It does not say which way it leans or by how much.

Next to the number, "0.0%" reads as "never". It is a product of the draw method as much as of the ranges.

**MF3. The walks judged steps by the earlier knowledge-store design, and nothing on the page or in the record says so.**

Where it appears:
- the grid in §3 and on the page
- the case notes
- the "Where it worked" list

The walkthrough workflow (`workflows/library-pathway-walkthroughs-wf_da3894a2-ff1.js.txt`, line 162) told walkers this: "If the existing design documents already contain a mechanism that handles a step, say so and count the step as working."

The case notes rely on that design without naming it:
- 9 [M] notes say "the other design". The page never defines it.
- f01-C1a, step 2: "A shell tool error is not a listed trigger."
- f01-C1a, step 9: "The design needs a fix commit and control pair." That list and that rule belong to the knowledge-store design, not to the owner's library brief.
- f03-C2, step 2: "The CI failure is a trigger." The walk says "a KS trigger (§7.2)". The page drops the "KS".
- The works item f10-1a credits "the design's scan for fixes not on the main branch". That scan is a knowledge-store mechanism.

So the grid mixes two designs. A reader takes "works" as the owner's design working.

**MF4. Some "Where it worked" items rest on a step the same walk rated broken or unspecified, or on a channel that is not the library.**

Where it appears: record §5, headed "Where the design worked in real cases", and the page's "Where it worked".

| Item | What the walk itself says |
| --- | --- |
| f01-C3a | Capture breaks: "No note anywhere ever recorded pdftoppm". The trigger is not specified. |
| f01-C4a | The trigger is not specified. The afterlife breaks: the cause went away about three hours after the note. The walk's own figure is "Saved: zero to one call per agent". The "15 failed clones" is its second sentence. |
| f10-3 | The saving came from a note in the memory index. |
| f08-1 | The saving came from the memory index. |
| f10-1b | The saving came from a check in the shared test run, "with no lookup". |
| f06-C4 | "CLAUDE.md already warns." |
| f07-5 | Steps 6, 9 and 10 break, and the walk says "PLAYBOOK still says GoTrue". |

There is also a tag problem. The savings are the walkers' estimates of what would have happened, yet they are tagged [M] ("Figures come from the walk records [M]").

**MF5. The comparison "what the library itself adds" is made against a ladder with no memory at all.**

Where it appears: record §1 ("No library") and §2; page "Run it".

Today's practice already has CLAUDE.md, the memory index, pushed notes and checks in the shared test run. The following show those channels doing part of the job, but the model has no such arm:
- LIM-55: "Solvers already write the lesson where builders look"
- the works items f10-3, f08-1, f10-1b and f06-C4

The leaves-out list does not mention this. The label "what the library itself adds" claims more than the comparison isolates.

**MF6. Four limitations are tied to settings that can move only in the library's favour.**

Where it appears:
- `limitations.json`: LIM-35 and LIM-40 (c_check_share), LIM-36 (partly) and LIM-62 (c_write, fix_on_found)
- `map.json`: the branches l3_exact_check, l3_wrong_check and l11_stored_fixed

The mechanical check in the map is perfect. It accepts every good entry and rejects every wrong one. Raising c_check_share can only help the library.

LIM-35 ("The entry's own test certifies the defect") and LIM-40 ("A check built on the old fix misses recurrence") are a check passing a wrong entry. No branch can show that.

Repair has no cost of its own. l11_stored_fixed costs R_rework × m_opus, the same as an escape left unrepaired. So LIM-62's upkeep has no term in the model.

Yet c_write ranks first for cost vs ladder (+0.42 [G]). That ranking makes LIM-62 look like it drives the result.

These four belong with LIM-44 and LIM-68, the limitations the model cannot show. At best values the size is small:
- a check that passes 30% [G] of wrong entries moves cost vs ladder from 1.035 to 1.036 [G]
- one Opus write per repair moves it by less than 0.001 [G]

**MF7. Code names and family codes appear as plain words.**

Where they appear:
- Record §4: every "Acts through …" line.
- Record §6: the "Moves it most" column (c_write, w_write, p_visible, h_harm, v_max, f_false, n_opus, o_opus, rho_retry and others).
- The page's limitations list and slider labels. Meanings appear only on hover.
- The page's limitation cards. They show "Contradicted in 7M families" without naming the families, and family codes (L01 to L10) appear in case ids.

This breaks the plain-English rule.

**MF8. The chosen sample is described with frequency words.**

Where they appear:
- LIM-05: "often a long command"
- LIM-09: "often in another part of the code"
- LIM-58: "often by agents"
- case f05-5: "the runner is often a subagent"

The 59 [M] cases are a chosen sample. They cannot carry "often".

---

## 2. Should fix

1. **Bad entries take hits away from good entries.**
   - Where: map.json, the wrong_share expression; record §2, loop R1; leaves-out list.
   - The bad share counts all bad entries against the coverage that good entries created. So a bad entry takes hits from a good one, and also adds look-alikes.
   - Without that, wrong_share at the last period is 0.17 [G] instead of 0.49 [G]. The headline does not move (C2).
   - The stock picture and loop R1 depend on this, and it is not listed.
2. **Bad entries never fade from what a lookup returns.**
   - Where: record §7, "Bad entries stay bad".
   - wrong_share reaches 0.69 [G] at 36 periods.
   - With no stealing and with fading, it is 0.04 [G] at 36 periods (C8, C8b).
   - The listed item says only that bad entries do not turn good. It does not say they keep being retrieved.
3. **A good entry never helps the retry or Opus.**
   - Where: map.json, where every l5_*_wrong branch leads to L6_wrong; record §7, "A wrong entry acts once".
   - Only the wrong-entry side is listed.
   - The size is small: 0.1% [G] of work reaches Opus with a good entry already used (C4).
4. **The library is used very little at best values, and the page does not show it.**
   - Of 300 [G] pieces per period, 1.5 [G] end with a good entry in hand. That is 0.5% [G] of work.
   - A wrong entry reaches the cheap model in 1.9% [G] of work.
   - Writes add 0.43 [G] and lookups 0.29 [G] per piece over the ladder.
   - This is why every ratio is flat across the 12 periods.
   - Where the chain loses work (E2), for visible pieces the cheap model alone would get wrong:
     - 12.0% [G] of all work
     - 50% [G] looked up
     - 1.9% [G] of them end with a good entry in hand
   - Uses per good entry per period are 0.024 [G]. R9 measured 0.03 to 0.07 [M] hits per entry per 30 days, for exact repeats. Held occurrences before the lookup are 0.34 [G] per entry. Most are lost at the trigger, which looks up 50% [G] of visible and 15% [G] of latent pieces.
5. **The leaves-out item on the ladder undersells the walks.**
   - Where: record §7, "A fixed ladder and one gate".
   - LIM-45 is contradicted in 6 [M] families: no case climbed.
   - Step 8 was "not reached" in 23 [M] cases and "works" in 3 [M].
   - LIM-42 (the higher tier was not who caught the error) has 12 [M] cases.
6. **"The other design" and "listed trigger" have no definition on the page.**
   - Where: case notes.
   - This is separate from MF3. Even after that is disclosed, the reader needs a one-line definition next to the notes.
7. **Some limitations show "on the map: 0 branches" with no reason given.**
   - Which: LIM-22, LIM-24 and LIM-66.
   - Their unknowns act through class chances or stocks, not branches. The page does not say so.
8. **LIM-26's settings do not fit its mechanism.**
   - LIM-26 ("Parallel windows pay before any entry can exist") is tied to d_deliver and k_fill.
   - Its mechanism is the delay inside a period. The model represents that only by working out each period on its starting stocks.
9. **Tags on single settings.**
   - e_right is tagged M, but one of its three sources is an outside study (AgentBrew 24 to 38%).
   - m_fable's best is 3 [S], while its note says about 3.3 [S].
   - u_similar's best, 0.15 [S], sits below its study's low end of 17% [S].
10. **Untagged numbers in the case notes.**
    - 162 [M] of 590 [M] step notes contain a number with no tag.
    - Many are version numbers or ids. Others are quantities, such as "29 days later" (f01-C1a), "14 minutes" and "four hours" (f03-C2), "20 days" (f03-C3).
    - The page gives the case section no tag of its own.
11. **"Episode" and "seed".**
    - Slider meanings say "episodes" where the page says "piece of work".
    - "Seed" is never defined.

---

## 3. Tilt

All rows show the last of 12 periods at best values, plus a 1000-run ensemble (seed 20261112), unless the row says otherwise. Every value is [G].

| Variant | Cost / wrong vs ladder | Cost / wrong vs strong | Bad share of library | Ensemble middle, cost vs ladder | Runs better than the ladder |
| --- | --- | --- | --- | --- | --- |
| C0, as built | 1.03 / 1.01 | 0.89 / 1.91 | 0.49 | 1.04 | 0.0% |
| C1a, m_opus = 1 | 1.04 / 1.01 | **1.23** / 1.91 | 0.49 | 1.04 (vs strong 1.17) | 0.1% |
| C1b, m_opus drawn 1 to 2 | 1.03 / 1.01 | 0.89 / 1.91 | 0.49 | 1.04 (vs strong 1.01) | 0.0% |
| C2, bad entries do not steal hits | 1.03 / 1.01 | 0.89 / 1.91 | **0.17** | 1.04 | 0.7% |
| C3, bad entries fade at the stale rate | 1.03 / 1.01 | 0.89 / 1.91 | 0.44 | 1.04 | 0.0% |
| C4a, good entry helps Opus | 1.03 / 1.01 | 0.89 / 1.91 | 0.49 | 1.04 | 0.1% |
| C4b, good entry makes Opus right and free (a bound) | 1.03 / 1.01 | 0.89 / 1.91 | 0.49 | 1.04 | 0.2% |
| C5, c_write range 0.5 to 15, best 2 | 1.02 / 1.01 | 0.88 / 1.91 | 0.49 | 1.04 | 0.1% |
| C6 = C2 + C3 + C4a | 1.03 / 1.01 | 0.89 / 1.91 | 0.16 | 1.03 | 1.4% |
| C7 = C6 with m_opus = 1 | 1.03 / 1.01 | 1.23 / 1.91 | 0.16 | 1.03 | 1.2% |
| C8, 36 periods | 1.04 / 1.01 | 0.89 / 1.92 | **0.69** | 1.04 | 0.0% |
| C8b, 36 periods with C2 + C3 | 1.03 / 1.01 | 0.89 / 1.91 | 0.04 | 1.03 | 1.4% |
| E1, tied draws at strength 0.5 / 1 | not changed | not changed | not changed | 1.04 | 13.6% / 24.9% |
| E4, the check passes a wrong entry 30% of the time | 1.036 / 1.009 | not run | not run | 1.042 | 0.0% |
| E4, repair costs one Opus write | 1.035 / 1.008 | not run | not run | 1.042 | 0.0% |

**Which way it leans, and by how much.**
- The structural choices that work against the library are stealing, bad entries that never fade, and no help up the ladder. They move the ratios against the ladder by about 0.01 [G] at most. Use is too low for them to matter: 0.5% [G] of work.
  - They do change the stock picture, and so the loops the page draws.
- Two simplifications favour the library: the perfect check and free repair. They move cost vs ladder by 0.001 [G] or less at best values.
- The single largest lean is the fixed Opus price ratio. It favours the library on the owner's-goal comparison: cost vs strong directly is 0.89 [G] as built and 1.23 [G] at the measured per-call figure.
- The 0.0% against the ladder is set by the independent draws. Tied draws give 13.6 to 24.9% [G], and the ranges hold a setting at 0.58 [G].
- Two more favour the library and could not be sized:
  - The ladder has no memory at all, and the model has no arm with today's notes.
  - The walks count the knowledge-store design's mechanisms as working. That touches the grid, not the engine.

---

## 4. Numbers checked

**Engine re-run.** Every figure in record §2 matches, and the page's "Run it" table matches too.

| Way of working | Cost | Wrong rate | Cost at cheap / Opus / Fable |
| --- | --- | --- | --- |
| Strong directly | 29.9 [G] | 11.2% [G] | 0.0 / 26.9 / 3.0 [G] |
| Ladder | 25.7 [G] | 21.2% [G] | 12.5 / 12.3 / 0.9 [G] |
| Library, first period | 26.4 [G] | 21.2% [G] | 12.8 / 12.5 / 1.0 [G] |
| Library, last period | 26.6 [G] | 21.4% [G] | 12.9 / 12.7 / 1.0 [G] |

- Ratios, first / last period:
  - against the ladder: cost 1.03 / 1.03 [G], wrong rate 1.00 / 1.01 [G]
  - against strong directly: cost 0.88 / 0.89 [G], wrong rate 1.90 / 1.91 [G]
- Stocks at the start of the last period: 63.5 [G] good and 62.0 [G] bad.
- **Time path:** all 12 periods match. The ratios are flat across them.
- **Ensemble:** 1000 runs, seed 20261112, last period. The percentiles match the record and the page:
  - cost vs ladder: 1.01 / 1.04 / 1.10 [G]
  - wrong rate vs ladder: 1.00 / 1.01 / 1.08 [G]
  - cost vs strong: 0.47 / 0.90 / 1.81 [G]
  - wrong rate vs strong: 1.00 / 1.86 / 6.06 [G]
- The top-5 rankings match. The share better is 0.0% [G] against the ladder and 3.4% [G] against strong. No draw was adjusted.
- Of 1000 [G] draws:
  - 0 [G] are cheaper than the ladder
  - 57 [G] have a lower wrong rate than the ladder
  - 606 [G] are cheaper than strong directly
  - 50 [G] have a wrong rate no higher than strong directly
- **Cost breakdown**, library minus ladder, per piece, best values: writes +0.43 [G], lookups +0.29 [G], retry +0.06 [G], Opus +0.06 [G], rework +0.03 [G]. The cheap attempt is about −0.02 [G]. The totals are 26.57 [G] and 25.68 [G].
- **The bad stock over 12 periods.** Good written: 83.8 [G].
  - Into bad: staleness 20.6 [G], bad on write 27.9 [G], escapes written 25.3 [G].
  - Repaired out of bad: 4.6 [G].
- **Grid:** the totals from `walkthroughs/walkthroughs.json` match record §3 and the page, row by row. All 590 [M] step statuses in `cases.json` equal `walkthroughs.json` (0 [M] differences).
- **Ten case notes** were read against the walk files: f01-C1a, f01-C3a, f01-C4a, f03-C2, f03-C3, f06-C4, f07-5, f08-1, f10-1b and f10-3.
  - The statuses all match.
  - The notes are faithful rewordings.
  - Two kinds of change: knowledge-store references are dropped ("a KS trigger" becomes "a trigger"), and f01-C4a's first saving figure is left out (see MF3 and MF4).

**Ten parameters against their cited files:**

| Setting | Tag | Check |
| --- | --- | --- |
| u_exact | M | R3: 3 to 5 [M] of 48 to 50 [M], with an upper bound of 22% [M]. Matches. |
| u_similar | S | F2 X-05: 17 to 45% [S], from secondary reads. Matches. The best value, 0.15 [S], sits below the low end. |
| k_fill | S | F4: APC 2% [S] at 1 and 46% [S] at 100; AWM about 40 [S]; SWE-Exp 300 [S]. Matches. |
| c_check_share | M | R2/R9: 3 of 15 [M], 6 of 15 [M], about 3 of 116 [M]. Matches. R2 adds that checkable entries are already in the shared test run (feeds MF5). |
| a_wrong | S | F5 C1, ClashEval: over 60% [S]. Matches. |
| q_exact | S | F4, Dynamic Cheatsheet. Matches. |
| q_similar | S | F4/F5. Matches. |
| e_right | M | R2: 1 of 5 [M] (it also says 1 of 7 [M]); D7: 5 of 8 [M]; AgentBrew: 24 to 38% [S]. Mixed sources under one M tag. |
| m_opus | S | F6 s(iv) and the vendor prices: 2× per token [S]. The setting is per call (MF1). |
| m_fable | S | The best is 3 [S]; the note says about 3.3 [S]. |
| c_write | G | R9 1.2: 0.4 to 3.8 million [M] tokens including a reviewer, about 2 to 15 [G] calls at 250,000 [M] tokens each. Matches. |

---

## 5. Limitations: a sample of 15

`all-breaks.json` holds 119 [M] breaks. Each is absorbed by exactly one limitation [M]. Case counts match the breaks they absorb, except four [M], and each of the four is explained in the `counting` notes:
- LIM-05: 5 [M] against 4 [M]
- LIM-58: 14 [M] against 13 [M]
- LIM-31: 17 [M] against 16 [M], with L01 added from a walk note
- LIM-27: 1 [M] case and no break, taken from a walk note

| Item | Real mechanism? | Wording faithful? | Right step? | Acts through fits? | Notes |
| --- | --- | --- | --- | --- | --- |
| LIM-05 lookup after the failed call | yes | yes, except "often" (MF8) | 2, trigger: yes | yes | 5 [M] cases |
| LIM-22 the first time is full price | yes | yes | 4, match: yes | yes | Contradicted in L01 and L08, and shown as contradicted. 0 branches (SF7) |
| LIM-24 popular entries look better | thought experiment only | yes | 4 and 10: yes | partly | 0 branches (SF7) |
| LIM-26 parallel windows | yes | yes | 5, delivery: yes | no (SF8) | Contradicted in L04 and L08, and shown |
| LIM-27 compaction drops an entry | yes | yes | 5: yes | yes, d_deliver | 1 [M] case, contradicted in 4 [M] families, and shown |
| LIM-31 matching the strong model's mistakes | yes | yes | 7: yes | yes | 17 [M] cases |
| LIM-35 the entry's own test certifies the defect | yes | yes | 6 and 7: yes | no (MF6) | |
| LIM-36 the real check is outside | yes | yes ("every vendor case" is 5 of 5 [M]) | 7: yes | partly (MF6) | |
| LIM-40 a check built on the old fix | yes | yes | 7: yes | no (MF6) | |
| LIM-42 the higher tier did not catch it | yes | yes | 7 and 8: yes | yes | 12 [M] cases (SF5) |
| LIM-45 hard problems pay every rung | thought experiment only | yes | 8: yes | yes | Contradicted in 6 [M] families ("no case climbed"), and shown (SF5) |
| LIM-55 solvers already write the lesson | yes | yes | 9: yes | partly: the write cost only, not the baseline (MF5) | |
| LIM-58 facts outside the repository | yes | yes, except "often" (MF8) | 10: yes | yes | 14 [M] cases |
| LIM-62 repair can cost more than the fix | yes | yes | 9 and 10: yes | no (MF6) | |
| LIM-66 a new model changes the need | thought experiment only | yes | 10: yes | yes, through class chances | 0 branches (SF7) |

**Missing from the list or from the leaves-out note:**
- the memoryless baseline (MF5)
- the perfect mechanical check (MF6)
- the walks' use of the knowledge-store design (MF3)
- bad entries stealing hits, and never fading from retrieval (SF1, SF2)

Contradicted items are shown as contradicted wherever I sampled, but the family names are missing (MF7).

---

## 6. Rule check

- **Fixes.** None in the page copy. The build report flagged five wordings: "The fix would be…", "The fix is…" (twice), "the answer is a policy choice" and "Subagents should return…". Each describes a past case or quotes a record. None proposes a remedy for the library.
- **Verdicts.** None found. The 0.0% line and the "Where it worked" heading come closest (MF2, MF4).
- **Untagged or wrongly tagged numbers:**
  - savings tagged [M] although they are estimates (MF4)
  - e_right (SF9)
  - quantities in the case notes (SF10)
- **Samples as rates:** the four uses of "often" (MF8).
- **Jargon:**
  - code names (MF7)
  - "the other design" and "listed trigger" (SF6)
  - "seed" and "episode" (SF11)
  - in case notes, terms such as CI, PR, seq and FK with no definition. The owner may know some of these.

---

## 7. Cold read

The page text is about 9,400 [M] words. By section, about:

| Section | Words |
| --- | --- |
| Intro, tag legend and word list | 440 [M] |
| Map | 970 [M] |
| Cases | 1,120 [M] |
| Limitations | 3,070 [M] |
| Works | 580 [M] |
| Run it | 2,000 [M] |
| Many runs | 520 [M] |
| Leaves out | 710 [M] |

- **Before the map.** The owner passes the intro, the tag legend and a 12 [M]-term word list. That is short. The map itself is dense: 40 [M] boxes, a route tree and four selectors.
- **The answer comes late.** The three-way table and the ratios appear after about 7,600 [M] words, in section 4. The cases, all 69 [M] limitations and the works list come first. The many-runs share comes after about 8,400 [M] words. No line near the top says what the model gives at its best values.
- **Too long.** The limitations list is the longest part. Each card repeats code names and family codes.
- **Will confuse:**
  - the code names on sliders and cards
  - "the other design"
  - family codes without names
  - "Contradicted in 7M families", where the "M" next to a count reads as a unit
  - a works list that mixes the library with notes that already exist
  - the ratio box against strong directly, which reads as a saving although it rests on a fixed setting
- **Sits too far down.** The leaves-out list, which has the caveats that change how the headline reads, is the last section.
