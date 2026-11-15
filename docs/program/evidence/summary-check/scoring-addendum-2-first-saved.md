<!-- Section 1.10 of docs/program/SUMMARY-CHECK-2026-11.md exactly as first saved: after the read of the kept tail, before any line after a boundary had been listed. Saved 2026-11-14T09:28:44.739Z. sha256 of the text below this line: c2eb702669a9430da728a4fe3ae37756c0b5beade083fc2cc90458dfa08d7a11 -->
### 1.10 Added after the read of the kept tail, and fixed before it was run: did the next window repeat it

Written after the read of 1.9 was finished and before any line after a boundary had been listed. A copy
as first saved is in `docs/program/evidence/summary-check/scoring-addendum-2-first-saved.md`.

**Why.** 1.9 says how often the summary is behind the kept tail. It does not say whether that costs
anything, because the next window is also given the tail. What it costs can be read from the record with
no judgement: did the next window do again something the kept tail had already done?

**What the script compares.** For every hand-over, each call and each model message in the kept tail,
against the first six calls and model messages after the boundary.

| a repeat is | when |
| --- | --- |
| a file written again | the same path, and the same text written |
| a command run again | the same command text, once spaces are collapsed, for a call that changes state (1.9) |
| a message sent again | the same recipient and the same text |
| an agent, workflow or session started again | the same description and prompt |
| a message said again | a model message that shares more than half of its three-word runs with a model message in the kept tail, both at least eight runs long |

Reads, searches, status calls, plan updates and test runs repeated are not counted: doing one twice
changes nothing. Shell commands the script cannot class are counted apart and not in the rate.

**The rate.** Hand-overs in which the next window repeated at least one thing, over all hand-overs; and
the same split by the verdict of 1.9, since a repeat is expected only where the summary was overtaken. No
hand judgement enters it. It is a floor: a next window that redoes the work in different words, or acts
on a stale statement in some other way, is not caught.

