# Ideas the mappers ruled fixflow-only or none (source rows: horthy-survivors-A.md, -B.md, -C.md)

36 items.

### G1-F010 (horthy, adopt in the PR)
- idea as mapped: Three cheap CI checks for FixFlow's remaining prose traps, each added in a phase already touching that config: ruff TID251 banning hmac.compare_digest outside the security modules, and a mobile JSON assertion rejecting an empty eas.json env value and the Sentry plugin in app.json.
- fit: fixflow-only -> none [no-relation; cost: script]
- how it fits: Serves FixFlow's L3/W2 backpressure on three named FixFlow traps. The testbed's nearest counterpart is the root's 15 lesson files (CR-01) and the compile's 'promote a recurring lesson into a deterministic check' (section 6), but none of the 21 bottlenecks is a recurring known trap that a lint would catch.
- attaches to: -
- caveat: Overlaps G1-F011; the traps are FixFlow-specific (Expo, Sentry, compare_secret).
- proof on the record: -
- reopened part: -

### G1-F011 (horthy, adopt in the PR)
- idea as mapped: Three history-backed CI checks: eas.json empty env values, app.json Sentry plugin unless SENTRY_DISABLE_AUTO_UPLOAD is set, Ruff banned-api on hmac.compare_digest; mobile checks also as a local npm script. CLAUDE.md prose stays until D11.
- fit: fixflow-only -> none [no-relation; cost: script]
- how it fits: Same three FixFlow traps as G1-F010. No testbed gate round, claims line or merge in the record failed on a trap of this kind, so no bottleneck number would move.
- attaches to: -
- caveat: Duplicate of G1-F010; merge them.
- proof on the record: -
- reopened part: -

### G1-F046 (horthy, adopt in the PR)
- idea as mapped: In the P0a, P3b, P3c and P4a briefs, secrets pass by variable name, committed records name the variable not the value, agents never Read or cat a .env; the owner decides on a project deny rule for reading .env files.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line; needs owner decision]
- how it fits: Targets FixFlow phases that handle prod secrets. The testbed has never run on a real host (B19), so no testbed session held deploy secrets; the B19 rented-host step and the B11 encrypted bundle would later, but the record holds no secret-leak event to change.
- attaches to: -
- caveat: Becomes relevant to v2 only once B19's rented host or B11's encrypted bundle exists.
- proof on the record: -
- reopened part: -

### G1-F004 (horthy, trial in the PR)
- idea as mapped: Only as the authoring rule for F001's wrapped CLAUDE.md arm in E1, if E1 adds oblique probes for missed triggers: each conditional block gets one narrow trigger; the always-true content stays bare.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: An authoring rule for FixFlow's E1 context-file experiment. The testbed's context-machinery trials (A5-10..A5-14, A7-06) found no gain, and no bottleneck is about the instructions file being missed.
- attaches to: -
- caveat: Context machinery measured null or worse in the testbed (plus 6 to 17 percent tokens); no bottleneck proof depends on it.
- proof on the record: -
- reopened part: -

### G1-F016 (horthy, trial in the PR)
- idea as mapped: A regression check of CLAUDE.md invariant adherence when the model changes, attached to E1: same frozen SHA, old and new model side by side, repeated runs.
- fit: fixflow-only -> none [no-relation; cost: extra-agents-per-phase]
- how it fits: An E1 add-on for FixFlow. The testbed record holds no model change mid-build and no bottleneck caused by one.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G1-F022 (horthy, trial in the PR)
- idea as mapped: Trial splitting off only single-runtime material into directory-scoped CLAUDE.md files, keeping cross-runtime rules and a pointer index in the root; test briefs and diff-only reviewers too, since nested files load only on Read.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line; needs owner decision]
- how it fits: FixFlow has three runtimes; the split is about them. The nearest testbed lever is section 3.6's 'smaller mandatory pre-read' for slice sessions, but their 306k per call is not shown to come from the instructions file, and the trial does not shorten the root file.
- attaches to: -
- caveat: A context-machinery change, and those measured null in the testbed. Diff-only reviewers would lose moved rules.
- proof on the record: -
- reopened part: -

### G1-F048 (horthy, trial in the PR)
- idea as mapped: Extend the backend's quiet g() wrapper, with a pass/fail/skip count line, to the native web and mobile gates, only if a single green-run measurement shows their output is worth cutting.
- fit: fixflow-only -> none [no-relation; cost: script]
- how it fits: FixFlow's web and mobile gates. The testbed check is a pytest gate already behind a wrapper with a heartbeat and watchdog. A printed skip count does not by itself close A7-13 ('verify passes when every test is skipped'); an assertion would.
- attaches to: -
- caveat: Output trimming is context machinery; the testbed's 66 percent slice sink is not shown to come from check output.
- proof on the record: -
- reopened part: -

### G1-F069 (horthy, trial in the PR)
- idea as mapped: Sonnet implementation briefs get one field naming 1 to 3 existing files to mirror, filled by the explorer locator; tested with a blind paired probe.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: Extends FixFlow's brief contract (ORCH section 5.3). The testbed has a brief contract (A1-05), but none of its bottlenecks traces to implementers choosing the wrong pattern; B01's fix defects came from added state, not from a missing exemplar.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G1-F098 (horthy, trial in the PR)
- idea as mapped: Audit the section 0 obligations in P1 and P2a; only if a step is missed, move that moment into a short checklist in the fixflow-orchestration skill.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: An audit of FixFlow's phase routine, which has never run. The testbed's root missed steps of a different kind (unread final heads, B17), which the compile answers with a recorded reader field, not a checklist.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G3-F105 (horthy, adopt in the PR)
- idea as mapped: One line in the fixflow-orchestration skill's session-start step: the phase id comes from the owner's opening message or the skill args, never inferred from the checklist; if missing, the session asks.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: FixFlow allows concurrent phases and its branch names do not name phases. Testbed slices each have their own worktree, branch and task record (A1-03, A8-08), so the slice id is not inferred; no bottleneck traces to a wrong slice id.
- attaches to: -
- caveat: Asking when the id is missing would stall a released parked start while the owner is away (B03).
- proof on the record: -
- reopened part: -

### G3-F117 (horthy, adopt in the PR)
- idea as mapped: A written save rule: a Workflow script is kept only after its shape ran in a second phase or answers a recorded failure, its header naming those uses; plus a transcript-grep retire check per skill at the phases section 9 names.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: Library hygiene for FixFlow's skills and workflows. It matches section 6's honest 'self-evolving' and the root's 15 lesson files, but no bottleneck proof depends on library size or reuse.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G3-F029 (horthy, trial in the PR)
- idea as mapped: A rough mockup of states and copy, written into the brief for the 4 new-screen phases and checked by the owner without blocking; worth most on mobile phases where a copy mistake costs a fleet APK.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: FixFlow's new-screen phases and APK cost. The testbed has a screenshot-and-rubric pipeline (CR-08). B02's end gaps (real data refused, no till or account creation) were missing production paths, which a states mockup would not reveal; the zero-seed journey does.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G3-F033 (horthy, trial in the PR)
- idea as mapped: A model-drafted signatures and call-stack 'Shape' block in the existing draft PR body, only for Opus phases with control-flow changes or new surfaces; no skill or tool built.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: A FixFlow phase-design artefact. B01's defects came from fixes adding state; the compile answers with a per-fix table of how new state ends and a scripted blast-radius list. A model-drafted call stack is a weaker, model-written version of that list.
- attaches to: -
- caveat: A model-written call stack is a model claim, the B12 problem; the scripted list is preferred.
- proof on the record: -
- reopened part: -

### G3-F070 (horthy, trial in the PR)
- idea as mapped: A phase-scoped trigger tally: for each skill, count loads (Skill calls plus preloads through dispatched agents) only in the phases its description names, to catch triggers that never fire.
- fit: fixflow-only -> none [no-relation; cost: script]
- how it fits: A W2 signal on FixFlow's 13 skills. The testbed record holds no bottleneck from a skill failing to load.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G5-F024 (horthy, trial in the PR)
- idea as mapped: A trial structural cut of the private-data leg: a restricted research agent type with deny rules for context reading web, transcript or third-party text, and no WebFetch or WebSearch in sessions holding prod credentials.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line; needs owner decision]
- how it fits: Aimed at FixFlow sessions that hold Railway and GitHub credentials. The testbed holds no prod credentials (nothing has run on a real host, B19) and no injection event is recorded.
- attaches to: -
- caveat: Restricted agent types are a measured cause of refused writes (B16); a v2 research type must keep Write to its report folder.
- proof on the record: -
- reopened part: -

### G2-F018 (horthy, adopt in the PR)
- idea as mapped: One ship-plan §0 sentence fixing document precedence by domain: owner correction > plan on main > Plan @ sha > design note; CLAUDE.md plus code for stack facts; other conflicts stop and get a journal entry.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: Serves FixFlow W3. The testbed's stale AGENTS.md and context map (B13) are stale, not conflicting by rule; a precedence order does not shrink the board or remove root edits at merge.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G2-F021 (horthy, adopt in the PR)
- idea as mapped: A one-row swap in CLAUDE.md's doc map: 'Start here' moves from HANDOFF-2026-07-28 to SHIP-PLAN §0.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: A FixFlow doc-map edit for W3. No testbed counterpart moves a bottleneck number.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G2-F031 (horthy, adopt in the PR)
- idea as mapped: One permissions.deny block with Bash and PowerShell forms of 'railway up' and 'railway run', optionally 'git push --force'. Not a hook.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line; needs owner decision]
- how it fits: Makes FixFlow's recorded Railway outage trap mechanical. The testbed's nearest hazard, archiving a session the owner was using (B15), runs through session tools, not these commands, and B15's remedy is a dry-run reaper.
- attaches to: -
- caveat: A permissions config change: owner decision under the no-wiring rule.
- proof on the record: -
- reopened part: -

### G2-F045 (horthy, adopt in the PR)
- idea as mapped: A CI step linting .claude/skills frontmatter and agent fields, plus extending the Alembic-head check to stale head literals in skills; slash paths warn-only.
- fit: fixflow-only -> none [no-relation; cost: script]
- how it fits: W4 hygiene for FixFlow's skill set. Its stale-literal half is the same mechanism as the testbed's documents-against-code tests (CR-06), which already exist, so it adds nothing to B13's step of asserting routing documents against the plan.
- attaches to: -
- caveat: The testbed already practises CR-06; skill frontmatter is not a recorded failure there.
- proof on the record: -
- reopened part: -

### G2-F056 (horthy, adopt in the PR)
- idea as mapped: Add 'git fetch origin' to §0 before the resume diff and before recording Plan @ sha.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: FixFlow W3. The testbed has no remote (B11), and its worktrees share one repository's refs, so a fetch changes nothing there.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G2-F134 (horthy, adopt in the PR)
- idea as mapped: In P1's cold-resume judging, classify each miss as rule absent or rule present-but-missed, citing the plan line, before editing the plan.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: FixFlow W3 judging. The nearest testbed counterpart, the root's 15 lesson files (CR-01), is not a bottleneck, and the tag would move no proof number.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G2-F192 (horthy, adopt in the PR)
- idea as mapped: Right before every --body-file write, fetch the live PR body with 'gh pr view --json body' and edit that, never a copy rebuilt from memory.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: The testbed has no PR bodies. Its counterpart, the root editing the 800-line board, is removed outright by B13's generated board, so a fetch-before-write rule would be obsolete there.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G2-F037 (horthy, trial in the PR)
- idea as mapped: Habit: invoke /fixflow-orchestration explicitly at phase start and prompt the close step explicitly, instead of relying on description matching.
- fit: fixflow-only -> none [no-relation; cost: none]
- how it fits: Guarantees FixFlow skill loading. In the testbed, slice briefs (A1-05) are already passed explicitly; no bottleneck records a skill failing to load.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G2-F066 (horthy, trial in the PR)
- idea as mapped: A one-word cause tag on §0 owner-corrections journal entries, so a correction caused by an ignored rule shows up as a repeat across phases.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: FixFlow journal hygiene. The testbed's nearest record, the root's lesson memory (CR-01), is not a bottleneck, and B21's carried findings are P3 review findings, not owner corrections.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G2-F115 (horthy, trial in the PR)
- idea as mapped: A 5 to 8 line 'paste to open a phase' block inside SHIP-PLAN §0, with separate first steps for code and operations phases, naming only steps that leave no trace.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: Lowers FixFlow skip risk. In the testbed the counterpart is the parked-start release message (CR-02) and the slice brief; no bottleneck records skipped opening steps, and B03's problem is that no message is sent at all.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G2-F123 (horthy, trial in the PR)
- idea as mapped: At most one clause in the Opus reviewer brief naming boundary- and gate-config diffs, trialled across phases and adopted only if a config change goes unnamed.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: FixFlow review hygiene. The testbed already guards its check with 'nothing weaker' proofs and failure demonstrations (A8-10), and no bottleneck records an unnamed gate-config change.
- attaches to: -
- caveat: If B06/B18's container gate lands, it is a planned gate-config change; this clause would only name it.
- proof on the record: -
- reopened part: -

### G2-F186 (horthy, trial in the PR)
- idea as mapped: A one-off owner watch of P1 through its first code commit, using §0's owner-corrections journal, kept only if it catches a costly departure in time that the transcript audit would have found too late.
- fit: fixflow-only -> none [no-relation; cost: none; needs owner decision]
- how it fits: A FixFlow first-run safeguard. In the testbed, owner presence is the scarce input (B03), and B14's remedy is a heartbeat, not watching.
- attaches to: -
- caveat: Requires the owner present, the reverse of B03's goal.
- proof on the record: -
- reopened part: -

### G4-F022 (horthy, adopt in the PR)
- idea as mapped: A reading rule for this review's L1 effort decisions only: a single-run gap of a few strict passes means no detectable difference for either effort level, and then cost and task transfer decide. No run quotas.
- fit: fixflow-only -> none [no-relation; cost: none]
- how it fits: Scoped by the refuter to FixFlow's L1 effort decision. The testbed record has no effort benchmark for it to read. No gate round, claims line or merge would have changed.
- attaches to: -
- caveat: The same reading discipline would apply to the B17 replay of seven misses, where small gaps are noise, but the narrowed rule is not written for it.
- proof on the record: -
- reopened part: -

### G4-F044 (horthy, adopt in the PR)
- idea as mapped: One ship plan §0 line: launch the per-PR reviewer and the implementers with an explicit effort taken from §3, never through a path that inherits Fable's.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: The testbed already states model and effort on every start (A1-01, four tiers). No testbed gate or token figure would have changed.
- attaches to: -
- caveat: Already practised in the testbed, so it adds nothing to v2 beyond keeping A1-01.
- proof on the record: -
- reopened part: -

### G4-F077 (horthy, adopt in the PR)
- idea as mapped: After local gates are green, if the same CI job fails on 3 consecutive pushes, stop, journal it and hand it to the owner; never rerun to green without journaling the log; PR Auto-fix off on phase PRs.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: The testbed has no remote and no CI (B11), so there is no CI job or gh run history. Its counterpart, a cap on review rounds, is already in the B01 first step as at most two rounds.
- attaches to: -
- caveat: Becomes relevant to the testbed only after B11 adds a remote with CI.
- proof on the record: -
- reopened part: -

### G4-F008 (horthy, trial in the PR)
- idea as mapped: One zero-dependency rule (ruff TID251 banning hmac.compare_digest outside core/security.py) plus a 10-PR count of how many confirmed defects an existing linter could express.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: The ban is a FixFlow file rule. The testbed's fix-induced defects cluster in fixes that add state (a hold, a lock, a marker, a cutoff), which are semantic and not lint-expressible, so no gate round would have changed.
- attaches to: -
- caveat: The count could be replayed on the testbed's finding tables once B21 parses them, but the narrowed version is a FixFlow 10-PR count.
- proof on the record: -
- reopened part: -

### G4-F017 (horthy, trial in the PR)
- idea as mapped: One slow-loop design audit as a trial, excluding boundary edges and the two large service files, with a refuter-gated pass bar of 2 or more owner-accepted findings.
- fit: fixflow-only -> none [no-relation; cost: extra-agents-per-phase]
- how it fits: The nearest testbed counterpart is the parked production-readiness review card under B17. But B17's proof is unread final heads at merge, and another model audit does not change who read a head.
- attaches to: -
- caveat: More model reading against a two-lane budget; the refuter warns summed review remedies recreate the stops.
- proof on the record: -
- reopened part: -

### G4-F032 (horthy, trial in the PR)
- idea as mapped: A pass bar written before F034's medium-vs-xhigh trial: 3 repeats per arm, item-by-item comparison against xhigh's own variation, an unknown token count counted as a fail. Skip without an F034 trial.
- fit: fixflow-only -> none [no-relation; cost: none]
- how it fits: Bound to F034. The compile's replays already carry pre-written bars (B12 false flags under 10 %, §6 fewer than six of ten), so the testbed gains nothing new.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G4-F185 (horthy, trial in the PR)
- idea as mapped: Only the reviewer-brief half: check complexity and over-engineering in review, excluding CLAUDE.md-protected defensive code.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: The testbed's fix-induced defects were bugs in state the fix needed, not unrequested abstractions; the B01 state-ending table targets them better. No gate round would clearly have changed.
- attaches to: -
- caveat: A simplify check can push reviewers to strip guards, which is how a lock or hold gets broken.
- proof on the record: -
- reopened part: -

### G4-F228 (horthy, trial in the PR)
- idea as mapped: A rerun of the committed, mixed-verdict knowledge-store refuter set at high effort, gated on G4-F203, where xhigh is actually spent.
- fit: fixflow-only -> none [no-relation; cost: extra-agents-per-phase]
- how it fits: The corpus is FixFlow's knowledge-store refuter set. The testbed has no counterpart corpus with committed mixed verdicts in the compile.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -

### G4-F125 (horthy, trial in the PR)
- idea as mapped: Mobile parity only: run tsc --noEmit --noUnusedLocals once in technician-app on main; at least one real hit means add noUnusedLocals to its tsconfig, zero means skip and record the count.
- fit: fixflow-only -> none [no-relation; cost: brief-or-config-line]
- how it fits: A FixFlow mobile tsconfig flag. The testbed has no technician-app and no gate round tied to unused code.
- attaches to: -
- caveat: -
- proof on the record: -
- reopened part: -
