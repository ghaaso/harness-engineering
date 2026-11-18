# a1 check 1: x44.jsonl (pacing) and x46.jsonl (quotas), Sonnet, 2026-11-19

Every record checked (not a sample): parse, field order, ids unique and in 0300-0399, each claim's numbers and names against the cited collect-file line (N-3 to N+3, script plus reading), "self-reported" on company figures, no `quoted` record from a summary or not-opened source. Refuter narrowings (a1-refute-1.md, a1-refute-2.md) applied per ROUND.md "Keeping the library clean". Files are uncommitted; no git writes.

| File | Records before | Parse faults | Order faults | Id faults | Numbers that did not stand | Corrected (text) | Narrowed (refuter) | Removed | Records after |
|---|---|---|---|---|---|---|---|---|---|
| x44 | 41 | 0 | 0 | 0 | 1 (x44-0331) | 1 | 7 | 0 | 41 |
| x46 | 54 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 54 |

Refuter verdicts met: PARTIALLY on A03, A05, A06, A10, A13, A16 (x44); A40, A41 (x46). No record states a REFUTED claim (A76 is a hypothesis with no record). A18, A19, A20, A24, A26 concern other files.

## Log, x44
- x44-0331 CORRECTED. Text said "AvgErr 96 percent against 18 percent" with the order unclear. Paper text smart-pacing line 672: the 96 percent is the controller of Agarwal et al. (LinkedIn) and 18 percent is Xu et al.'s own method (offline simulation, 1-minute slots, 10,000,000 requests). Claim and note rewritten.
- x44-0300 NARROWED (A03): added that Theorem 1's bound holds for any T >= 1 with constants in the revenue and consumption bounds; only the optimality of the order is asymptotic.
- x44-0308 NARROWED (A05): the no-early-stop property needs a cap mu_bar >= v_max/rho - 1, eps*v_max <= 1 and payment never above the bid; guarantee is a fixed gap of rounds (garbled in text).
- x44-0312 NARROWED (A06): no bound against a time-invariant benchmark; vanishing regret against the perfect pacing sequence benchmark.
- x44-0319 NARROWED (A10): marked as a static pacing-game model.
- x44-0321 NARROWED (A10): a stated reason for wide use, backed by a Balseiro et al. (2021) citation, not a result shown in the paper.
- x44-0326 NARROWED (A13): the three reasons given, not only the third.
- x44-0336, x44-0338 NARROWED (A16): median campaign life defined as time to spend 95 percent of the budget (paper text line 106).
- x44-0303 (m-dependence) was left as is: the refuter's A03 note adds detail but does not contradict it.
- x44-0323 stays `summary` (abstract quote carries no txt line in the collect file).
- All other x44 numbers stand at the cited lines (script check, no misses).

## Log, x46
- x46-0322 NARROWED (A40): "factors including"; no weights.
- x46-0323 NARROWED (A40): the page speaks of claude.ai with code execution enabled, nothing on Claude Code's compaction.
- x46-0328 NARROWED (A41): wrap-up applies to the five-hour session limit and a response already under way; nothing about the weekly limit.
- x46-0329 NARROWED (A41): once per weekly period on Pro, at each five-hour limit on Max, within the weekly limit; rolling out gradually.
- x46-0341 note updated: formula (MBS - 1)(Ts - T) confirmed at tm40.txt line 3789.
- x46-0347 to 0353 (SRE ch. 22): the collect file's gate summary item 6 ("not read for numbers") is stale. Block P14 (Second attempt, lines 156-162) reads ch. 22, txt 61-207, and marks it quoted (self-reported); the records follow that block and every quote and number (60 retries per minute, 64 attempts (4^3), 10,000 and 11,000 and 9,000 QPS) stand at line 157. Note on x46-0347 rewritten; no status change.
- x46-0304 and x46-0305 (Wikipedia GCRA) are `summary`, correct. No `quoted` record cites a summary or not-opened source (P6, P7, P8, P11, P15 give none). All numbers stand (script check, no misses); spot-checked in the saved texts: Cloudflare 0.003 percent and 6 percent, SRE 60 retries.
