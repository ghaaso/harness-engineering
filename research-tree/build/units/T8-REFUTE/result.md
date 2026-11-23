# T8-REFUTE result (top session 8, 2026-11-24)

The review is `research-tree/build/refute/TOP8.md`. No hook, tool or settings file was changed. Probe scripts here:
`b1-probe.mjs` (B1), `b2-probe.mjs` (B2), `ceiling-replay.mjs` (the ceiling's line functions replayed over a transcript).

Breaking: B1 the window ceiling refuses at a helper's or session's 2nd-3rd call after one large result (line below
zero) and tells a helper to return LIMIT (4 of 459 helpers and 2 post-compaction main sessions in history); B2 the
fan-out gate refuses every first start of a wave once, the count gate counts that refused start as pending for 16.7 s,
so a retried wave of more than 10 is refused at "number 21" and told to wait for a finish; B3 the root's W* is applied
to every main session (child build sessions get about 181-232 K, section 5 rejected W* for builders); B4 numbers cited
to a result.md, not a record, and typed lock times. Thirteen non-breaking points follow in the review.
Self-tests all pass: ceiling 89, count 19, fan-out all, report 23, watch 12, journal tool 22, guard 245, plan gate 37.
Settings entries to add: none.
