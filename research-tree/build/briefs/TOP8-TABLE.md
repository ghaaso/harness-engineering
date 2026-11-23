# T8-TABLE: every rule of the method and what enforces it (analyse, Opus)

Read `briefs/TOP8-COMMON.md` first. You write one file only: `research-tree/build/ENFORCEMENT-TABLE.md`, plus your
result file.

## The question
For every rule of the method (CLAUDE.md rules 1 to 7; every row of the board's "Before you do this" table; every
owner's ruling r57-0001 to r57-0056 on the board), one row: the rule (short, with its record id); what enforces it
today (hook, script, commit check, plan gate, a written rule only), naming the file; what that cannot see; whether
it was broken and when (the mistakes r57-06xx and t7-06xx; the five of 2026-11-23 in `briefs/TOP8-ENFORCEMENT.md`;
find them with `bash library/lookup.sh mistake` and in the journal of 2026-11-23); whether a hook or a script can
enforce it and the input it needs (what a hook is told: r57-0106; and, measured 2026-11-24, the transcript path
gives the context size: `research-tree/build/TOP8-STATE.md`); if not, say so plainly and why.

## Read
`library/README.md` section "What enforces these rules"; `.claude/hooks/` (tier-hook, record-guard, plan-gate,
library-start, tier-routes.json) and `tools/check-commit.mjs`, enough to say what each refuses; r57-0151, r57-0011,
r57-0402, r57-0105, r57-0106, r57-0156, r57-0518, r57-0164, r57-0165; the extractor records on hooks as documented
and as probed (x01, x08, x13: `bash library/lookup.sh <word>`; `-f` for a full record).

## Mark what three units are building now
T8-CEIL (window ceiling hook), T8-COUNT (helpers at once), T8-JOURNAL (journal tool and the guard closed to shell
writes): mark those rows "being built (T8-...)", not as enforced.

## Then: which remaining rules could get a script or hook check now
Rank the rest by how often broken and how cheap a check is. In particular, say whether a script check is possible for
"a limit has a measured basis" (r57-0038, r57-0617: for example a brief's limit must cite a measured record) and for
"reports to the owner: the picture first, few numbers, no internal labels" (r57-0017, rule 6; memory note "Big
picture, not figures"): what input it would read, what it would refuse, what it cannot see. Do not build; propose,
with the input and a rough size. Keep the table compact (one line per rule), then at most 40 lines of ranked
proposals. Limit 14 M tokens.
