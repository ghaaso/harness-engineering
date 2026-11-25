# Fix round 1 of the harness view (2026-11-24, after looking at the stage 1 screenshots)

Stage 1 is built in `build/template.html` and works: the owner's map, parts lit by use, a session's path numbered,
a part's readers and writers in both views. These are the fixes, in order. Change `build/template.html` only.

1. **Rules by what enforces them.** Every rule in `rules.json` has `whole: false` (no rule is refused in every form),
   so the summary now reads "0 refused by a hook, 0 checked at commit, 41 partly refused, 57 written only", which hides
   the one split the owner asked for. Count and colour by `by`, over distinct rules only (skip rules that have a `same`
   field: they restate another rule):
   - `hook` or `setting`: "refused by a hook" (green);
   - `script`: "checked at commit" (blue);
   - `both`: "hook and commit check" (green with a blue edge, or a split square);
   - `none`: "written only" (grey outline).
   Say once, in the summary and in the legend: "none is refused in every form; a rule's detail says what passes"
   (`cannotSee`). Drop "partly refused" as a category.
2. **Refusing versus reminding.** In a rule's detail, list the enforcers that refuse (enforcer `acts` refuses,
   refuses at commit, settings) apart from those that only remind or report (`reminder`, `acts` reminds, reports). The
   start hook must not appear as an enforcer of a rule it only reminds of.
3. **Hook chips: used.** A hook part is "used" in the stretch when its log has lines for sessions in the stretch
   (`hookSeen[<hook name>].n > 0`, or `hk[<id>][1] > 0`) or it refused a call there (`denials`, `hk[<id>][2]`), not
   from `use` alone. Today the record guard, the plan gate and the commit check show idle with "Everything" selected,
   though their logs hold lines (check: `.claude/logs/record-guard.jsonl`, `plan-gate.jsonl`). "Bypassed" comes only
   from `hk` (expected > seen) for sessions in the stretch, and from a hook not switched on in a session's folder
   (`hooksOn`), as round 2 did. A hook with no way to tell (no `hk` entry, log without sessions) is "used" if its log
   has lines in the stretch's time span, else "no record", drawn as idle with a dotted edge and named so in the legend.
4. **Documents written and never read.** `data.orphans` holds them. In the harness view's summary (nothing selected),
   add one line: "<n> documents written and never read since", clickable; the click lists them in the right column
   (path, the session that wrote it, when). This is the first piece of the feature "built but untouched".
5. **Page size.** The page is 483 KB against the browser pane's 512 KiB limit. Keep the template's own growth small
   (no new libraries, compact code). Another helper trims the data at the same time.

Check with headless Edge screenshots as in stage 1 (`s2-<view>.png`), at least: harness view with nothing selected,
with a part selected (`hook:record-guard`), with a session selected; the time view. Look at each.
