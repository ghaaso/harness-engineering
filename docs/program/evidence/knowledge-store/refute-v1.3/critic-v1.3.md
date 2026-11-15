# critic:v1.3

## Overall

The v1.3 fold-in mostly follows §12.7, but it left about 25 places where the text contradicts itself, is stale, or claims more than it delivers. None changes the architecture, and all can be fixed by editing text or phase scopes. Every item is quoted from the working copy, which matches 1e4211f byte for byte. I diffed it against v1.2 (e274bd3) to say which version introduced each item.

Most serious first:
(1) §3.4 now holds two opposite rules in one paragraph. K12 says a changed protective-test blob makes the verdict inconclusive. KS-O12 says the same changed blob makes it PRESENT/applies. KS-6b keeps the K12 rule, while KS-3's fixture expects applies.
(2) §4.1 step 5 ("inconclusive behaves as a miss") and §7.1/§7.6 (exit 3/4 count as a miss and the phase proceeds) were never revisited. For do_not_apply entries this lets the forbidden change through, which is exactly what rule 1 of §0 and KS-O9 say must not happen.
(3) A --diff warning card still withholds the do-not-apply reason until `verify --target proposed` returns applies. Before KS-6b, that verify returns not_applies for a second door that does not touch the protective test, and §7.2's diff routine never runs verify at all. This reproduces the very finding KS-O12 was meant to fix.
(4) The hunk-level rule ("path-only prints nothing") does not hold for ex3. Its precondition is the whole-file JobDetail.jsx blob, and a changed precondition item counts as a hunk-level match. PaymentModal is defined inside JobDetail.jsx (line 866, 11 commits on main), so every edit to that file prints ex3's card. That noisy route is also the only way KS-5's naive-PaymentModal synthetic can be caught, because §3.3 builds ident handles from a fix diff and a check, and ex3 has neither.
(5) D17's caller-pin pytest would fail ship phase P7b-1's CI. P7b-1's scope says "set_pin requires the current PIN", which adds a verify_pin caller outside login (today set_pin at service.py:122 does not call it). That breaks "A KS phase never gates a ship phase". D17 is also scheduled post-pilot, conditional on a go, although the §12.7 ruling says "fix it in CI first".
(6) The --diff run list differs in each place it appears: §7.2 says three runs including close, §0's diagram and KS-A4 name review instead of close, and the §12.7 ruling lists four. §7.7 and §9 still cost a quiet phase at "two cheap turns".
(7) ks close is still specified as printing "two counts", yet it must now also report close-time --diff warnings and "unexamined" misses. KS-3's close scope has neither the diff re-run nor the extra counts.
(8) `--action "<the phase Goal>"` has no input in most phases. The critic's figure is 33 of 45; the ship plan on PR #182's branch has 12 **Goal lines across 45 phase headings, and P12a and P7b-1 have none.
(9) The missed_existing data model does not hold together:
- the lookup row has no watermark;
- lookups are host-local and never restored, while the outcome event is journaled;
- n in "k of n" has no writer;
- D16 still opens the install decision at k ≥ 3 regardless of n, which is the ratchet §12.7 itself warned about.
(10) There are leftovers in KS-3 (symbol spans, span hashes, the unique-anchor rule, protected spans), stale "KS-6" names, "the one Routing sentence" in KS-7, an uncorrected register (T-03 on LIMIT, E-07's "> ~1,000 entries" trigger), and earlier amendments (F7, F8, F16, K14, KS-A2) that the O-amendments supersede without the note the document uses elsewhere.

§0 claims that "every miss is counted" for do-not-apply entries, but nothing counts a live miss. It leaves the diff arm out of the pilot description, has the wrong diagram path, and lists incomplete touchpoints.

All checks were read-only. Nothing that needs the store to exist was run.

## Contradictions

- **A:** §3.4 (critic K12, kept in v1.3): "for a `do_not_apply` entry the protective test's blob must equal the approved one or the verdict is `inconclusive` (critic K12)"; KS-6b Scope: "for `do_not_apply` entries the protective test's blob must equal the approved one, else `inconclusive` (K12)"
    - **B:** §3.4, same paragraph (KS-O12): "in `target_mode: tree` the entry is `applies` only when the forbidden change is already on the target (the protective test fails there, or its blob differs from the approved one); in `target_mode: proposed_change` ... PRESENT means the protective test fails against the proposed change, or the protective test's blob differs from the approved one"; KS-3 fault list: "a fixture diff that inverts ex6's protective test (the `proposed` target must return `applies`, HEAD `not_applies`)"
    - introduced by: KS-O12 (K12's sentence was left in place beside it)
    - resolution: State the precedence once in §3.4. The declarative half is a separate check, a path_state on the protective test file: a changed blob means PRESENT/applies. The executable half (KS-6b) needs the approved blob to trust the run; on a changed blob it returns inconclusive(protective_test_modified), and for do_not_apply that is never a miss (see the next item). Mirror this in the KS-3 and KS-6b scopes.
- **A:** §4.1 step 5: "`inconclusive` behaves as a miss and escalates"; §7.1: "3 when the store is unavailable and 4 when it is busy (`store_busy`), both of which callers treat as a miss"; §7.6: "If `ks` is missing or exits 3 or 4, the phase proceeds without it"
    - **B:** §0 rule 1: "For a 'do not apply this fix' entry the rule is the reverse: the store reads the change about to be merged ... so that it rarely misses, and every miss is counted"; §1.3: "a miss lets the forbidden change through, so their triggers are recall-first". Before KS-6b, Docker-down, K12's modified-blob case and exit 3/4 all route a do_not_apply verify to 'miss'
    - introduced by: KS-O9 and KS-O12; the v1.2 miss semantics in §4.1, §7.1 and §7.6 were not revisited
    - resolution: For do_not_apply and open_defect entries reached through --diff or --prescription, render inconclusive and exit 3/4 as an 'unverified warning: the Opus reviewer rules', recorded as its own outcome (e.g. `dna_unverified`), never as a miss. Keep miss semantics for solved entries only. Say so in §4.1 step 5, §7.1 and the §7.6 text.
- **A:** §12.7, the critic's KS-O12 finding: "the reason behind a do-not-apply was withheld exactly when an agent was about to break it"
    - **B:** §4.1 step 4: a --diff warning card "never changes the entry's status, and the fix stays withheld until `ks verify --target proposed` returns `applies`". Before KS-6b only the declarative blob half exists, so a second-door diff that leaves the protective test untouched verifies `not_applies` and the reason stays withheld. §7.2's diff bullet and §7.6 never call verify; only the --prescription bullet does.
    - introduced by: KS-O10 and KS-O12
    - resolution: For `fix_kind: do_not_apply`, print the prohibition sentence on the warning card unconditionally: withholding exists to stop someone acting on a wrong fix, and a prohibition is not a fix. Add "run `ks verify <entry> --target proposed --diff <merge-base>`" to §7.2's diff bullet and to the §7.6 text.
- **A:** §7.2: "On the change itself, three times per code phase ... at the first commit ..., at PR-ready, and inside `ks close` over the merged change"
    - **B:** §0 diagram: "M[a PR's diff<br/>first commit, PR-ready, review]" (review, no close); §12.3 KS-A4: "at first commit, PR-ready and review"; §12.7 point-2 ruling: "at first commit, PR-ready, `ks close` and in the Opus review" (four); §7.6 Routing adds a reviewer run at the PR head SHA; §7.7: "pays one conditional first-commit lookup (often one line) and one `ks close` turn: two cheap turns"; §9: "the quiet-phase cost is two cheap turns"
    - introduced by: KS-O10, KS-O11, KS-O13 and KS-O20 (the diagram); §7.7 and §9 were left as v1.2/KS-F16 wrote them
    - resolution: Use one list everywhere: first commit, PR-ready, the Opus review at the PR head SHA, and ks close. Restate §7.7 and §9: a quiet phase pays three unconditional session turns plus one reviewer call. Fix the §0 diagram and KS-A4 to match.
- **A:** §5.2: "`ks close` also re-runs `ks lookup --diff` over the merged change ..., so the warning count at close covers commits made after PR-ready"; §4.5: "`ks close` reports never-examined misses as 'unexamined', never as zero"
    - **B:** §5.2: "The closing message states the two counts the command prints: events not yet pushed ...; entries newly suspect or reported"; §7.1: "`ks close` (scan ... plus sync, one line of output with the two counts)"; KS-3 Scope "one line of output with the two counts" and Done-when "`ks close` prints its two counts"
    - introduced by: KS-O10 and KS-O17
    - resolution: Have ks close print four counts: unpushed events with the age of the last push; entries newly suspect or reported; --diff warnings at close; unexamined misses. Amend §5.2, §7.1, §7.6's evidence line and KS-3's scope and done-when, and add the close-time --diff re-run to KS-3.
- **A:** §7.1/§7.2: "a path-only overlap is logged as `path_only` and prints nothing, so shared files do not fire on every phase"; §12.7: the hunk-level rule was added because "shared files would otherwise fire on most phases"
    - **B:** §7.1: "a warning needs a hunk-level match (... or a changed config or precondition item)", and §3.4: "ex3: the `JobDetail.jsx` blob unchanged, whole-file, KS-O4". PaymentModal is defined at src/features/jobs/pages/JobDetail.jsx:866 and 11 commits on main touch that file, so every JobDetail.jsx edit prints ex3's card. §3.3's `ident` is "Built from: the fix diff and the check inputs", and ex3 (an open_defect with no fix and no check until P12a) has neither, so it has no `logPayment` handle. KS-5's go synthetic ("the naive `PaymentModal` `useState` fix") can therefore only be caught through that noisy whole-file route.
    - introduced by: KS-O4 combined with KS-O10 and §12.7's hunk-level interpretation
    - resolution: Before KS-6b, count a changed whole-file precondition item as path_only unless a changed-hunk identifier also matches. Let the author name `ident` handles for open_defect and do_not_apply entries (e.g. `logPayment`, `PaymentModal`) in §3.3. Add an unrelated JobDetail.jsx edit to KS-5's must-stay-silent set.
- **A:** §10 rules: "A KS phase never gates a ship phase"; §7.6: "the store never blocks or delays a ship phase"; header: "it changes nothing in that plan"
    - **B:** D17 (KS-O6): "a backend pytest that pins the closed caller sets of `identity.security.verify_pin` and `create_access_token` to `IdentityService.login` ... so a second door through a new file fails CI before the merge". Ship plan P7b-1 Scope (PR #182 branch): "`set_pin` requires the current PIN for self-service", a new verify_pin caller outside login (today set_pin at service.py:122 does not call it), plus O-05 item 4's known-device bypass. Once landed, the pin fails P7b-1's CI by design.
    - introduced by: KS-O6
    - resolution: Choose one. (a) Land the pin as an owner-ruled ship-plan amendment to P7b-1 that names the allowed callers and requires set_pin to honour the lock. (b) Give the pin an allow-list that P7b-1 extends under reviewer sign-off, and carve D17 out of the "never gates" rule in plain words. Either way, correct "P7b-1 builds exactly that second door" to name set_pin as well.
- **A:** §12.7 point-1 ruling: "Fix it in the repository's CI first (D17's caller-pin pytest), amend the text second"
    - **B:** D17: "when ex6 is verified, a backend pytest ..."; KS-6b Deliverables: "the D17 PR ... opened once ex6 is verified (KS-O6)". KS-6b runs only on a KS-5 go, and D17 itself says the pin works "with no store involved".
    - introduced by: KS-O6
    - resolution: Decouple the caller-pin PR from ex6's store verification, since it needs only stdlib `ast`, and schedule it as a standalone owner-ruled PR (before P7b-1). Otherwise reword the ruling to "last, and only after a go".
- **A:** §7.2 and §7.6: "`ks lookup --diff <merge-base> --action \"<the phase Goal>\"`"; §7.2: "the `--action` match runs independently of the path join"
    - **B:** §12.7 Missed-by-the-critique: "33 of 45 have no `Goal` line to pass as `--action`". Checked on PR #182's SHIP-PLAN-2026-11.md: 12 `**Goal` lines across 45 phase headings, and P12a (line 656) and P7b-1 (line 1022), two of the three silent-example phases, have none.
    - introduced by: KS-O10
    - resolution: Define the --action input as the Goal if present, else the phase heading plus its Scope bullets, and make KS-5's diff arm use the same input.
- **A:** §4.4 (KS-O19): "a dense-only rank-1 hit with a rank margin may raise an entry to candidate, never to lead, still behind the gate"
    - **B:** §4.1 step 4: "**Candidate** requires coverage ≥ θ_cand or any exact handle or a lead-shaped hit on a non-validated entry" (no dense route). §4.1 step 2: probe-in-lookup gives "a cheap agent ... a gated lead in one call", and KS-F9 lets "an `applies` from probe-in-lookup" lift a hit to lead, so a dense-only hit on a declarative entry would be promoted. KS-F11 bars probe-in-lookup from dropping do_not_apply or open_defect entries, so dense-only hits on those kinds are never pruned. "rank margin" is undefined and is not among §4.2's owner parameters.
    - introduced by: KS-O19
    - resolution: Add the dense route to step 4, conditional on D16 having fired. State that a probe-in-lookup `applies` cannot lift a dense-only hit above candidate. Define the dense margin (e.g. μ_dense on cosine) in §4.2 as an owner parameter.
- **A:** §12.7 point 3: "'3 ever' with no denominator ratchets toward an install"
    - **B:** D16: "the install decision opens when **k ≥ 3 vocabulary-class misses** have been recorded ..., reported as **k of n** examined misses". n is only reported, not part of the trigger, and nothing writes n: §7.3 writes `outcome(missed_existing)` only for a `same` ruling; `related` and `new` rulings leave no event.
    - introduced by: KS-O18
    - resolution: Either make the trigger a rate (k ≥ 3 and k/n ≥ an owner fraction) or state that the ratchet is accepted. Journal every same, related or new ruling (e.g. a `missed_check` event) so that n exists.
- **A:** §3.1 (K3): lookup events "go to a **host-local log** (`store/local/` ..., never journaled, never pushed) ... A restore therefore excludes lookups by design"; §5.6: "lookups are never restored"
    - **B:** §4.6: "`v_missed_existing`: a `lookup.miss` whose later `outcome(missed_existing)` names an entry that existed at the lookup's index watermark". The outcome is journaled but the lookup is not, so after a rebuild, a restore or on a second host the view loses its join and its watermark. §3.6's lookup row lists no watermark, and §3.1's watermark is a sha256 over sorted ids, which cannot be inverted back to an entry set.
    - introduced by: KS-O17
    - resolution: Carry what the view needs inside the missed_existing outcome event (lookup id, canonical-query digest, the decision, the index's ingested-event count or highest ingest sequence). Add that watermark field to §3.6's lookup row.
- **A:** D5b: "ruled at KS-6b's start beside D9"; KS-O2: "ruled at KS-6b's start beside D9"
    - **B:** KS-6a Entry: "KS-5 go; D9 ruled"; D9: "Blocks KS-6 ... yes, but only when KS-6 starts"; KS-6b Entry names only D5b
    - introduced by: KS-O2
    - resolution: Either rule D5b at KS-6a's entry together with D9 (one owner sitting), or delete "beside D9".
- **A:** KS-3 Scope (KS-O1): "**no code-token lexer, no span anchoring and no code mutant** (all moved to KS-6b under D5b); code-file footprint items are whole-file blobs"
    - **B:** The same KS-3 Scope: "the protective test's blob and the protected spans compared over the proposed tree", "`capture` (fix diff, check inputs, symbol spans, ...)", "CRLF→LF before span hashes", "unique-anchor rule"; §3.4: "The declarative half (blob and span comparison over the proposed tree) is KS-3's"
    - introduced by: KS-O1 (KS-3 not fully cleaned) and KS-O12 (added 'protected spans')
    - resolution: KS-3 compares blobs and config_key values only. Move symbol spans, span hashes and the unique-anchor rule to KS-6b, and write in §3.4: "blob comparison in KS-3; span comparison from KS-6b".
- **A:** KS-3 Done when: "every fault injection returns `inconclusive`"
    - **B:** KS-3's fault-injection list includes "a fixture diff that inverts ex6's protective test (the `proposed` target must return `applies`, HEAD `not_applies`)", the data-value mutants ("which must not count"), and "a stranded-fix fixture and a regression fixture for the scan"
    - introduced by: KS-O12 and KS-O1 added items; the scan fixtures were already mismatched in v1.2
    - resolution: Split the list three ways: fault injections (expect inconclusive), specificity mutants (expect ABSENT) and behaviour fixtures (an expected verdict each). Add the ex6 proposed-target fixture to the done-when.
- **A:** §1.4 (KS-O5): "an on-demand name search over owner-named guarded identifiers, run against a PR's diff, is in scope (§5.5, §7.2; KS-O5)"
    - **B:** §3.5 `guarded_refs`: "author-named allowed sites ... optionally after KS-6b ... off the KS-0 → KS-5 path"; KS-O8: "author-named"; §5.3: "the owner never repairs entries"; §7.4: "there is no per-phase owner work"
    - introduced by: KS-O5 and KS-O8
    - resolution: In §1.4, write "author-named" and "optional after KS-6b". Say that the pre-pilot route is changed-hunk identifiers matched against `ident` handles.
- **A:** §9: "A parser-based reader (D5b) removes exactly one of KS-C14's four fooling modes (comments and strings that quote the bad code)"
    - **B:** §3.4: "comments and docstrings are stripped before `regex_in_span` ... but **value probes** ... read string-literal *values* as typed tokens, never stripped"; D5b: "a `regex` rule sees a node's whole text"; §12.5 F7: "comments, docstrings and strings stripped with a small language-aware lexer"
    - introduced by: KS-O3 and KS-O4
    - resolution: §9 should say the reader removes comments that quote the bad code, while strings are read as values and can still fool a regex rule. Add a "superseded in part by KS-O1/O3" note to F7 in §12.5.
- **A:** §7.2: a hunk-level match is required "so shared files do not fire on every phase"; D21: the hook is ruled on "only if the diff arm's false-fire rate is acceptable"
    - **B:** D8 go and KS-5 Done-when: "the diff arm catching every synthetic forbidden diff with its false-fire rate reported". No ceiling is set, so a go is compatible with a card on half of all phases. KS-O15 reads "the replay's false-fire rate", while KS-9 reads "the diff arm's live false-fire rate".
    - introduced by: KS-O14 and KS-O15
    - resolution: Put a false-fire ceiling into D8 as an owner parameter (e.g. at most 1 in 10 replayed main commits print a card), and say which rate, replay or live, D21 reads.
- **A:** D8 and KS-5: "**go-minimal** = keep the declarative class only (KS-7 restricted to declarative entries, KS-9 runs, KS-6 and KS-8 skipped)"; KS-7: "Under go-minimal only declarative entries are wired in"
    - **B:** KS-7 Scope: "adding the §7.6 sentences verbatim". Those sentences mandate --diff at first commit and PR-ready and the reviewer's do-not-apply check, whose entries (ex6, ex4, ex3) are not declarative. D8's go-minimal has no condition on the diff arm.
    - introduced by: KS-O14
    - resolution: State whether go-minimal wires the --diff routine and the Routing sentence (only if the diff arm met its go criterion) and for which entry kinds.
- **A:** §7.2: "any warning is copied into the draft PR's decisions journal" (§7.1: warnings are raised for `do_not_apply`, `open_defect` and trap footprints)
    - **B:** §7.6 plan text: "copies any do-not-apply or trap warning"; the Routing sentence: "names every do-not-apply warning it printed"; §7.8: "The do-not-apply class is the exception". The open_defect warnings, ex3 among them, are neither copied nor reviewed.
    - introduced by: KS-O10 and KS-O11
    - resolution: Write "any do-not-apply, open-defect or trap warning" in §7.6 and in the Routing sentence.
- **A:** §3.1 (KS-F2): "exit `store_busy`, which callers treat as neither a miss nor a failure"
    - **B:** §7.1: "**4 when it is busy** (`store_busy`), both of which callers treat as a miss"
    - introduced by: pre-existing (v1.2); it matters more now, because KS-O9 made a miss unsafe for do_not_apply entries
    - resolution: Settle on one wording. For the do_not_apply routes, treat it as an unverified warning, as in the second item above.
- **A:** §11 intro: "Only D1 is needed now; D1b after the audit; D7 before KS-2; D5b at KS-6b; D21 at KS-9"
    - **B:** KS-1 Entry "D3, D4 and D6 ruled"; KS-5 Entry "D8 ruled or defaulted"; KS-6a "D9 ruled"; KS-7 "D10 and D11 ruled"; KS-8 "D13 ruled"
    - introduced by: pre-existing (v1.2 had "Only D1 ...; D7 before KS-2"); KS-O20 extended the sentence without completing it
    - resolution: List every ruling point, or say "the others carry defaults and are confirmed at their phase's entry".

## Amendment mismatches (§12.7 line vs section text)

- **KS-O1** claims: the code-token lexer, symbol-span anchoring and the code mutants move from KS-3 to KS-6b; code-file footprint items are whole-file blobs until then (§3.4, §3.5, §10 KS-3)
    - section says: KS-3 still has "`capture` (... symbol spans ...)", "CRLF→LF before span hashes", "unique-anchor rule", "control pairs with **refactor mutants** as mandatory golden negatives, the comment-injection specificity control" and "the protected spans compared over the proposed tree". §5.1 trigger (1) and §5.2 still hash "symbol span" items with no KS-6b qualifier.
    - fix: Strip the span and code-mutant items from KS-3 and from §3.4's general specificity list (or mark them "from KS-6b"). Add "(from KS-6b)" to the span terms in §5.1, §5.2, §3.7 and §7.1.
- **KS-O2** claims: D5b "ruled at KS-6b's start beside D9"
    - section says: D9 is ruled at KS-6a's Entry ("KS-5 go; D9 ruled"), and KS-6b's Entry names only D5b
    - fix: Either drop "beside D9" or move D5b to KS-6a's entry.
- **KS-O3** claims: "KS-F7 verbatim" plus "value probes read string-literal values as typed tokens"
    - section says: F7 as recorded in §12.5 (the KS-C6 and KS-C14 rows) says "comments, docstrings and strings stripped with a small language-aware lexer" and "comment- and string-aware matching". O3 keeps string values and withdraws the lexer, so the change is not verbatim, and §12.5 carries no supersession note.
    - fix: Write "KS-F7's applies rule verbatim; its string stripping and lexer superseded", and add that note to F7 in §12.5, as was done for KS-R1, KS-A4 and K23.
- **KS-O5** claims: §1.4: "an on-demand name search over owner-named guarded identifiers is in scope"
    - section says: §3.5 and KS-O8 make `guarded_refs` author-named, optional, after KS-6b and off the KS-0 → KS-5 path
    - fix: Change §1.4 to "author-named, optional after KS-6b", and name `ident` matching on changed hunks as the in-scope route.
- **KS-O6** claims: "P7b-1 builds exactly that second door and must keep the CLAUDE.md invariant" (§11 D17)
    - section says: P7b-1's Scope on PR #182's branch also adds "`set_pin` requires the current PIN for self-service", a second verify_pin caller outside IdentityService.login. O-05 item 4 (the known-device bypass) need not add a caller at all. The pin therefore fails P7b-1's CI, which §10's "never gates a ship phase" forbids.
    - fix: Name set_pin as well, and record how P7b-1 and the pin coexist: an allow-list entry, or an amendment to P7b-1's scope ruled by the owner.
- **KS-O8** claims: `guarded_refs` "computed from the PR diff by `ks lookup --diff`"; affects §3.5, §4.1 and §10 KS-9
    - section says: No KS phase's Scope builds `guarded_refs`. KS-9 only measures "`guarded_refs`' false-alarm rate from git history if KS-O8 is wanted", and no D-row says who decides whether it is wanted. §5.5 and §9 nonetheless rely on it ("is seen only once `guarded_refs` exists").
    - fix: Add a phase slot, e.g. "KS-6b or later, under a new D-row with default off", and name who switches it on.
- **KS-O9** claims: "for `do_not_apply` and `open_defect` entries the triggers are recall-first and their misses are measured" (§0 rule 1, §1.3, §3.3)
    - section says: No view counts a live miss of these kinds. `v_missed_existing` is written only by `ks record --lookup` for a newly solved entry, and a do-not-apply miss produces no new record. The only recall measurement is KS-5's offline diff arm. §3.3's `tmpl` row still says "brittle on reworded messages (splits: safe)", and §4.1 step 5 still treats inconclusive as a miss.
    - fix: Either add a writer, so that an Opus reviewer or a later phase records `outcome(missed_dna, entry, pr)` when a forbidden change lands without a warning, or reword to "recall measured offline at KS-5 and through late catches at KS-9". Qualify "splits: safe" as "safe for solved entries".
- **KS-O10** claims: `--diff` is "built in KS-2/KS-3" and "runs again at PR-ready and inside `ks close`"; the §12.7 ruling also lists "in the Opus review"
    - section says: KS-3's `close` scope has no --diff re-run and still prints "the two counts". KS-3's Entry says it "does not depend on KS-2 except for probe-in-lookup", yet close's diff re-run needs KS-2's lookup --diff, and KS-2's join over config_key and precondition items needs KS-3's `capture`. §7.2 says "three times" and leaves out the review run.
    - fix: Add "re-run `ks lookup --diff` over the merged change; print its warning count" to KS-3's close. Restate the KS-2/KS-3 dependency. Use one four-run list.
- **KS-O11** claims: the §7.6 Routing bullet gains the reviewer's `ks lookup --diff` sentence (§7.6, §7.8, §9)
    - section says: §7.6 now has two Routing sentences, but KS-7's Scope still installs "the §7.6 sentences verbatim to SHIP-PLAN §0 and the one Routing sentence"
    - fix: In KS-7, write "the two Routing sentences".
- **KS-O12** claims: `applies` defined for do_not_apply through proposed_change in §3.4, §4.1, §7.1, §7.2 and §10; "the declarative half in KS-3"
    - section says: §4.1 step 5, the gate definition, still lists targets "HEAD, a mainline sha, or the working tree" without `proposed`, and keeps "`inconclusive` behaves as a miss". In §7.2 only the --prescription bullet uses proposed_change; the --diff bullet never calls verify. KS-3's declarative half compares "protected spans" that KS-3 cannot build. K12's opposite rule (a changed blob gives inconclusive) still stands in §3.4 and KS-6b.
    - fix: Add `proposed` to step 5's targets with do-not-apply semantics. Add the verify call to the §7.2 diff bullet and to the §7.6 text. Drop spans from KS-3. Reconcile with K12 as described in the contradictions.
- **KS-O13** claims: KS-A4 and K23 corrected: the first-commit lookup is an early hint, not "pre-edit"
    - section says: §12.3 KS-A2 still records "the `action` handle and `--files --action` pre-action lookup" as adopted. §12.5 F16 still specifies "the first-commit `--files --action` lookup runs only when the phase's Scope paths intersect an entry footprint" with no supersession note, and §7.7 still costs it as "one conditional first-commit lookup".
    - fix: Add a "superseded by KS-O10" note to KS-A2 and to F16, and restate §7.7.
- **KS-O17** claims: writer for `v_missed_existing`: "three detectors ... over the entries that existed at the lookup's index watermark"; "`ks close` reports never-examined misses as 'unexamined'"; affects §3.6 and KS-3
    - section says: §3.6's lookup row lists no watermark field, and lookups are host-local and never restored (§3.1, K3). §5.2, §7.1 and KS-3's close print only "the two counts". Only a `same` ruling writes an event, so the "n" in "k of n examined misses" has no source.
    - fix: Add a watermark (ingested-event count plus digest) to the lookup row. Copy the needed lookup fields into the outcome event. Journal related and new rulings. Add the unexamined count to ks close.
- **KS-O18** claims: "> ~1,000 entries" is relabelled a threshold-recalibration checkpoint and is no longer an install trigger
    - section says: The register's E-07 line in §2.2 still ends: "The numeric trigger (≈ 5% \"missed, entry existed\" over 50 lookups or > ~1,000 entries) is inferred, an owner parameter."
    - fix: Append "*superseded by KS-O18: k ≥ 3 vocabulary-class misses (D16); the size arm is a recalibration checkpoint (§4.2)*".
- **KS-O19** claims: the register's E-07 line amended: "the Sciavolino mapping marked inferred; LIMIT cited for 'small does not make dense win' only"
    - section says: E-07 only lists "(BEIR, Sciavolino entity queries, LIMIT; no cited study is below about 3.6k documents; *reworded by KS-O19*)" and does not mark Sciavolino as inferred. T-03 in §2.1 still says "BM25 is the robust baseline (BEIR; dense fails on entities/identifiers; BM25 beat embedders on LIMIT at 46 docs)". §2's errata list (line 138) does not mention either correction.
    - fix: Mark the T-03 and E-07 claims as corrected by KS-O19, matching §4.4's reading, and add both to the errata sentence at the top of §2.
- **KS-O20** claims: §0 "the diagram's diff path" updated
    - section says: The diagram reads "first commit, PR-ready, review", while §7.2's three runs are first commit, PR-ready and ks close. ks close is missing from the diagram, and review is missing from §7.2.
    - fix: Make the diagram node read "first commit, PR-ready, review, close" and match §7.2 to it.

## Leftovers

- Unqualified "safe": a split template is a miss, and for do_not_apply and open_defect entries a miss is not safe — §3.3, `tmpl` row: "brittle on reworded messages (splits: safe)"
    - fix: "(splits: a miss, safe for solved entries only, counted otherwise)", matching the `prose` and `not_when` rows.
- "Over-invalidation, the safe direction": for do_not_apply entries, whole-file precondition items cause over-firing of --diff warnings, and KS-O7 notes that `suspect` caps an entry at candidate exactly when it matters — §3.4, second bullet: "code-file footprint items are whole-file blobs until then (over-invalidation, the safe direction)"
    - fix: "(over-invalidation: costs a re-verification for solved entries and noise for --diff warnings, §7.2)".
- The general specificity mutant list still includes the SQL-case and YAML-quoting mutants without qualification, though KS-O4 calls the SQL one vacuous until KS-6b's normaliser and no YAML probe exists before KS-6b — §3.4: "semantics-preserving refactor mutants (file move, comment edit quoting the bad code, identifier rename, YAML quoting, SQL case)"
    - fix: Add "(code, YAML and SQL mutants from KS-6b; before it, the data-value mutants of KS-3)".
- Span terms with no pre-KS-6b qualifier — §5.1 trigger (1) "symbol span"; §5.2 "span hashes over LF-normalised bytes"; §3.7, §7.1, §7.2 and KS-O10 "`symbol_span` hashes" in the --diff join; the §0 diagram "touches a protected span"
    - fix: Add "(from KS-6b; before it, whole-file blobs and changed-hunk identifiers)".
- KS-3 scope keeps span and code-mutant machinery that KS-O1 moved to KS-6b — KS-3 Scope: "`capture` (... symbol spans ...)", "CRLF→LF before span hashes", "unique-anchor rule", "the comment-injection specificity control", "the protected spans compared over the proposed tree"
    - fix: Move these items to KS-6b's scope.
- KS-3's stated dependency is stale — KS-3 Entry: "KS-3 does not depend on KS-2 except for probe-in-lookup". Close's --diff re-run (§5.2) needs KS-2's lookup --diff, and KS-2's --diff matching of config_key and precondition items needs KS-3's `capture`.
    - fix: Write "... except probe-in-lookup and close's --diff re-run (both in 3b after KS-2)", and have KS-2's done-when use fixture footprints.
- Quiet-phase cost still the v1.2/KS-F16 figure — §7.7: "one conditional first-commit lookup (often one line) and one `ks close` turn: two cheap turns, not zero"; §9: "the quiet-phase cost is two cheap turns"
    - fix: Change to three unconditional session turns (first commit, PR-ready, close) plus the reviewer's --diff call.
- KS-7 still installs one Routing sentence — KS-7 Scope: "and the one Routing sentence"
    - fix: "the two Routing sentences (§7.6; KS-O11)".
- Stale "KS-6" name after the K16 split into KS-6a and KS-6b — §8 rule 1: "stored `unverified_seed` until KS-6" (KS-4 says "until KS-6b"); D8 and KS-5 go-minimal: "KS-6 and KS-8 skipped"; D9: "Blocks KS-6 ... only when KS-6 starts"
    - fix: Write "KS-6b" in §8, "KS-6a, KS-6b and KS-8 skipped" in D8 and KS-5, and "KS-6a" in D9.
- Earlier amendments superseded by v1.3 carry no supersession note, against the document's own convention (KS-R1, KS-A4, K23 are annotated) — §12.5 F7 (strings stripped by a small lexer), F8 ("ex3: the caller span unchanged"), F16 (the conditional first-commit `--files --action` lookup); §12.6 K14 (hand lexer; "ast-grep as a D5 option; fallback rate a KS-9 metric"); §12.3 KS-A2 ("`--files --action` pre-action lookup")
    - fix: Add "superseded by KS-O1/O3" (F7, K14), "by KS-O4" (F8) and "by KS-O10/O13" (F16, KS-A2).
- Register lines not corrected for KS-O18 and KS-O19 — §2.1 T-03: "dense fails on entities/identifiers; BM25 beat embedders on LIMIT at 46 docs"; §2.2 E-07: "(≈ 5% ... over 50 lookups or > ~1,000 entries)"; §2 errata sentence (line 138)
    - fix: Mark the corrections inline and list them in the errata sentence.
- The Index port has no diff input — §6.3: `lookup(query, context, files, action)`
    - fix: Add `diff` (changed paths, hunk identifiers, changed items) to the signature.
- The lookup row has no watermark, and examined-but-not-same rulings leave no event — §3.6 lookup row; §7.3 ("a `same` ruling writes `outcome(missed_existing, ...)`")
    - fix: Add a watermark field, and a journaled event for related and new rulings so that n exists.
- The dense-only candidate has no margin parameter — §4.4 "a dense-only rank-1 hit with a rank margin"; §4.2 lists only θ_lead, θ_cand, μ and the trigram length
    - fix: Add μ_dense to §4.2 as an inferred owner parameter, set when D16 fires.
- The gate's target list omits the proposed target — §4.1 step 5: "on the caller's target (HEAD, a mainline sha, or the working tree ...)"
    - fix: Add "or `proposed` for `do_not_apply` entries (§3.4)".
- D21's hook joins on one edited path, which the hunk-level rule silences — D21: "calls the same `--diff` join on the edited path"; §7.1: "a path-only overlap is logged as `path_only` and prints nothing"
    - fix: Specify `git diff <merge-base> -- <path>` over the working tree, so that the hunk-level rule applies.
- `guarded_refs` is relied on but built by no phase — §3.5, §5.5 and §9 ("is seen only once `guarded_refs` exists"); KS-9 "if KS-O8 is wanted"
    - fix: Assign it to a phase after KS-6b and add a D-row with default off.

## Owner page

- Rule 1 says that for a do-not-apply entry the store "rarely misses, and every miss is counted". The body has no live counter for such misses: v_missed_existing fires only when a new solved entry is recorded, and a forbidden change that slips through creates none. §4.1 step 5 and §7.1 treat inconclusive and exit 3/4 as misses, and §9 admits that a second door in a new file is invisible until `guarded_refs` exists, which no phase builds. Only KS-5's offline diff arm measures recall. Reword to "recall is measured once offline at the pilot and through late catches at the checkpoint".
- Rule 1 names only "do not apply" entries. The body (§1.3, §3.3, §7.1) makes open_defect entries recall-first too, and --diff also warns on trap entries.
- The pilot is described as replaying "real symptoms blind against both incumbents" with "a kill criterion". Since KS-O14, D8's go also requires "the diff arm catching every synthetic forbidden diff", and that criterion is not mentioned. No false-fire ceiling exists either; refuter KS-V1 found that 48.7% of commits would warn.
- The diagram node reads "first commit, PR-ready, review". §7.2 says first commit, PR-ready and ks close, and the §12.7 ruling lists all four. It also says "touches a protected span", but no spans exist before KS-6b.
- "after a go, four more" does not match §10's budget: "KS-6a, KS-6b, KS-7, KS-8, KS-9 (five more, one large)". This is already in v1.2.
- The touchpoint "starting Docker Desktop for one phase" does not match KS-6a and KS-6b, which both use the Docker-gate slot, and KS-6b runs test ids in Docker. The touchpoint list also leaves out D5b at KS-6b, D21 at KS-9, the D16 install decision when it fires, and the D17 backend pytest PR. The note on the critique says D5b and D21 "are ruled after it", but neither appears among the touchpoints.
- The header and §0 say the track "changes nothing in that plan", and §10 says a KS phase never gates a ship phase. D17's default-yes caller-pin pytest would fail ship phase P7b-1's CI, because P7b-1's Scope adds a current-PIN check in set_pin, a new verify_pin caller outside login. §0 says nothing about this.
- "Your critique ... added no touchpoint before the pilot" is literally true. But the critique changed the go criteria in D8, which the owner rules or defaults at KS-5's entry, and changed D17's default to add a backend CI test. §0 should mention both.
- Rule 2, "Nothing acts on a hit until the entry's own check finds the cause's condition present in the current code", does not cover the --diff warning card. That card is copied into the PR journal and must be answered by the reviewer without any check, and a proposed_change verify reads the proposed tree, not "the current code". Rule 2 should name warnings as the exception.
