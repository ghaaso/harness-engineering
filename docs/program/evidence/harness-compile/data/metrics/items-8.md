# Items to classify, file 8: bottlenecks from the register

### PR-SUMMARY (bottleneck, family orchestrator, Partly closed: Mitigated by PR-body rules)
name: Compaction summaries misstate the latest state
what happens: Both compaction summaries got the very latest state wrong, and one dropped an open loop; the verbatim tail corrected both.
evidence: 2 of 2 summaries wrong on the latest state [M]; one auto compaction at 971,158 tokens, one idle at 580k [M].
what fixing it unlocks: With state kept in the repository, compaction becomes harmless.

### PR-TEMPOUT (bottleneck, family orchestrator, Closed: Evidence folder with sha256 manifest)
name: Raw workflow outputs lived only in temp
what happens: The raw W1/W2 workflow outputs that the register cites lived only in a temporary scratchpad folder.
evidence: All W1/W2 raw outputs were in %TEMP% [M].
what fixing it unlocks: Every register id traceable to a durable, hashed source.

### PR-PHASESIZE (bottleneck, family orchestrator, Closed: Split into P5b-1/2, P9-0a/b, P5 spike)
name: Phases too big for one session
what happens: A delta check found phases too large to finish in one session.
evidence: 3 phases: P5b, P9-0 and P1's CI check [M].
what fixing it unlocks: Predictable, session-sized phases.

### PR-SECRETS (bottleneck, family orchestrator, Partly closed: Mitigated by a fingerprint-only rule)
name: Journaled agent output could keep secrets
what happens: Every workflow output is journaled, so a secret pasted into an output would persist.
evidence: Not sized.
what fixing it unlocks: Secret scanning we can run safely.

### PR-CONFLICTS (bottleneck, family orchestrator, Partly closed: Managed by shared-file rules)
name: Parallel lanes edit the same files
what happens: Several lanes touch the same files: CLAUDE.md, config.py, conftest.py, the mobile contracts folder, specs.py and the attendance constants.
evidence: 6 shared-file groups listed in ship plan section 7 [M].
what fixing it unlocks: Conflicts resolved at rebase instead of by waiting.

### PR-DELIVERY (bottleneck, family orchestrator, Open: Accepted platform behaviour)
name: Corrections cannot interrupt a busy lane
what happens: A message to a lane arrives only when its current turn ends, so a correction cannot interrupt a lane mid-turn.
evidence: Not measured.
what fixing it unlocks: Corrections that land in time, delivered early as follow-up turns.

### B03 (bottleneck, family owner-process, Open: D06 answered; harness v2 phase 1 not built)
name: Work waits for me when I am away
what happens: Restarts wait for me: Docker and sessions stay down after a power-off, parked sessions wait for my message, and a resumed session can drift from its record.
evidence: About three days idle after the 6 Nov power-off at 14:58 [M]; no commits 7-8 Nov [M]; three more power-offs followed [M]. A 1 Oct limit stall lasted 3 h 06 min [M].
what fixing it unlocks: Idle time between 'could resume' and the next commit falls from about three days [M] to under three hours [T].

### B14 (bottleneck, family owner-process, Open: Harness v2 phase 2; not built)
name: I cannot see progress
what happens: During long calls I get no sign whether work is waiting, running or stalled, nor its queue position or the test running.
evidence: A check may wait up to 2,700 s [S] for a slot before a 5-18 minute run; one 49-minute foreground polling loop is on record [M].
what fixing it unlocks: The longest gap between heartbeats under 60 s [T]; I see waiting, running or stalled at a glance.

### PR-P0A (bottleneck, family owner-process, Partly closed: Section 7 lanes build ahead; P0a not started)
name: Code phases waited on my P0a
what happens: Ship plan v8 ran one phase at a time and its first phase, P0a, was my own pre-flight, so every code phase queued behind it.
evidence: Twelve days after v8 no code phase had started [M], because each one waited behind P0a. On 13 Nov production still answered Railway's edge 404 [M]; 37 of 56 phases wait behind P0a [M].
what fixing it unlocks: Parallel lanes now build ahead: eight lanes ran on 13 Nov [M]. Finishing P0a unblocks all work that reaches a phone or host.

### PR-OWNERWAIT (bottleneck, family owner-process, Open: Open by design)
name: Agent work waits on my actions
what happens: By design, deploys, restores over live data, key rotation and installs are mine; design agents need my answers and rig fixes need my administrator prompt.
evidence: 2 decision forms planned [T]; one administrator prompt per test-rig start.
what fixing it unlocks: Agents prepare exact commands and I run them safely; drills can run unattended once prompts are cleared.

### B02 (bottleneck, family first-use, Partly closed: Real-data switch merged; walk unbuilt (v2 pha…)
name: Gaps found only on the last day
what happens: Every clinic slice was tested on a synthetic seeder, so missing real-data paths (real data refused; fresh installs lacking tills and accounts) surfaced only on the last day.
evidence: Two [M] first-use gaps surfaced on the final day. No clean-install walk was ever run; the 'clean machine' drill still seeds synthetic data. The real-data switch merged 11 Nov (fb55599).
what fixing it unlocks: First-use failures caught at every gate instead of on the last day; the walk should fail on the commit before 11 Nov and pass after.

### B19 (bottleneck, family first-use, Open: D21 pending; harness v2 phase 4)
name: First-deploy steps not yet run on a real host
what happens: First-deploy steps have not yet run on a real host: certificate, off-site backups, alerts and a second-host restore. Several are not yet built.
evidence: No certificate script, off-host backup push, alert channel or ssh hardening exists [M]. A local VM hung at first boot in 3 of 3 creations [M].
what fixing it unlocks: A result file from a real host for each checklist gap; every step carries its command, expected result and a negative run.

### PR-FIELDEVIDENCE (bottleneck, family first-use, Open: Waits on me naming the APK commit)
name: Code reading cannot settle field questions
what happens: Field data is thin and the backend is down, so questions about phone-maker background rules or a commercial SDK can be settled only by device trials.
evidence: attendance_event held 9 rows lifetime [M]. main is 10 commits past the handoff, and the field APK is older than main [M].
what fixing it unlocks: A device protocol settles what code cannot; findings labelled by build; reliability evidence per phone maker.

### R2 (bottleneck, family tokens, Partly closed: one phase per session adopted (HR-C1); trial …)
name: Context growth in long sessions
what happens: Every call re-reads the whole window and adds to it, so our long-lived slice and orchestrator sessions run at very large windows. This is token lever 1.
evidence: Slice sessions took 66.4 % [M] of cache reads at about 306k [M] per call; 39 % [M] (FixFlow) and 74 % [M] (clinic) sat past 200k; Sonnet reached 963k [M].
what fixing it unlocks: A ceiling near the 367k [M] where Opus already stops, plus one phase per session; capping at 150-200k [T] targets our largest exposure.

### TK-LIMITACCT (bottleneck, family tokens, Open: unmeasured; caveat kept beside every token table)
name: How the usage limit counts tokens
what happens: We do not yet know how cache-read tokens count against the five-hour usage limit, so no token cut can yet be promised to reduce limit stops.
evidence: 14 [M] limit episodes in October; subagents caused 91 of 104 [M] limit errors. The counting rule itself is unmeasured.
what fixing it unlocks: Knowing which token cuts actually reduce stops, so we spend effort on the levers that keep lanes running.

### TK-REREAD (bottleneck, family tokens, Open: measured frame; levers 1-4 act on it)
name: Every call re-reads the whole window
what happens: Token use is calls times window size. Nearly every token is a re-read of context already in the window; the model's output is a tiny share.
evidence: Cache reads are 96.8 % [M] of 7.35 B [M] context tokens over 35,834 [M] calls; output is 0.75 % [M]. November testbed alone: 4.25 B [M] cache reads.
what fixing it unlocks: Any cut to the number of calls or the window size cuts tokens in proportion; this frame shows where levers 1 to 4 act.

### TK-PREFIX (bottleneck, family tokens, Open: measured; trial not run; inline commands mitigate)
name: Fixed start-up cost per agent
what happens: Every agent window first loads a fixed prefix (system prompt, tool and connector schemas, skills, memory, CLAUDE.md, brief) and re-reads it every call. Token lever 2.
evidence: About 70k [M] per agent: tools 34k, connectors 17k, skills 9k, system 8k, memory 2k [M]. The prefix is 27 % [E] of all tokens, 47 % [E] of FixFlow's.
what fixing it unlocks: Deferred schemas, fewer connectors and no skills in agent sessions remove most of it, per the token report; fewer tiny fan-outs multiply it less.

### TK-LOOKUP (bottleneck, family tokens, Open: measured exposure; batching not yet trialled)
name: Calls that only read or search
what happens: Many calls only read or search, and each one re-reads the whole window. This is token lever 3: an exposure, not a saving.
evidence: FixFlow: 64 % [M] of calls, 55 % [M] of tokens; clinic: 52 % and 41 % [M]. November testbed: 54.7 % [M] of calls re-read 43.6 % [E] of context tokens.
what fixing it unlocks: Batching two lookups into one command removes about a third [E] of all calls, and with them a third of the re-reads.

### TK-OWNOUTPUT (bottleneck, family tokens, Open: estimated; breakdown measured on two clinic sessions)
name: The model's own output carried forward
what happens: Thinking, echoed commands and file contents the model writes stay in the window and are re-read every later call. Filtering reads cannot remove them. Token lever 4.
evidence: 26 % [E] of all tokens: 15 % FixFlow, 31 % clinic [E]. One clinic session's growth: thinking 31.5 % [M], Write 13.9 % [M], Edit 7.4 % [M].
what fixing it unlocks: Writing big files through a script and compacting after write-heavy phases target this share directly; the size of the saving is still to measure.

### TK-SUMMARIES (bottleneck, family tokens, Open: measured; no change trialled yet)
name: Compaction summaries re-read every call
what happens: Each compaction leaves a summary in the window, and every later call re-reads it.
evidence: 8 % [E] of all tokens: 11 % clinic, 2 % FixFlow [E]. Main sessions compacted 48 [M] times in the clinic and 9 [M] in FixFlow.
what fixing it unlocks: Shorter or fewer summaries; a compaction adapter used 6-17 % [M] more tokens for the same recall, so plain notes are the bar to beat.

### TK-FETCHED (bottleneck, family tokens, Open: measured; digest untested; needed share unmeasured)
name: Fetched file content fills the windows
what happens: Content fetched by reading and searching fills about a quarter of the windows and is re-processed every later call; a small hot set recurs across sessions.
evidence: 26 % [E] (2026-11-12); 27-28.5 % [E], or 22.3 % [E] by an independent method (2026-11-11). 72 paths [M] hold half; within-window repeats only 0.5-1.5 % [E].
what fixing it unlocks: This is what indexes, digests and knowledge stores aim at; a digest lasting across sessions could pay if a shorter form stands in for the lines.

### TK-BLIND (bottleneck, family tokens, Partly closed: caveats kept beside every table)
name: Small gaps in the token measurement
what happens: Some calls never reach transcripts, some groups include unrelated sessions, and part of the window content is unclassified, so the token shares carry small gaps.
evidence: About 1 % [E] of calls missing (harness-internal Haiku); about 3 % [E] of the FixFlow group unrelated; 5-8 % [E] of window content unclassified.
what fixing it unlocks: Closing the gaps firms up every share in the token report.

### TK-BUDGET (bottleneck, family tokens, Open: KS yield rule designed; shared budget not set)
name: Remedies and side tracks share one budget
what happens: Adopting every remedy at once would recreate the usage-limit stops, and side tracks like the knowledge store compete with ship phases for Opus quota and my attention.
evidence: A measured ceiling of two lanes at a time [M]. The knowledge store needs about six sessions to its go/stop point, half on Opus, then five more [E].
what fixing it unlocks: One shared budget across remedies keeps the ship plan unblocked while improvements still land.

### TK-HAIKUCLIFF (bottleneck, family tokens, Partly closed: mitigated by splitting large dumps)
name: Haiku price cliff above 100k input
what happens: Haiku loses its price advantage once a prompt passes about 100k input tokens, so a cheap extractor can quietly become an expensive one.
evidence: Threshold about 100k [S] input tokens, per the orchestration design; our extractor prompt sizes are not tallied.
what fixing it unlocks: Cheap extractor agents stay cheap.

### TK-TIER (bottleneck, family tokens, Partly closed: pinned agents on PR #185; savings unmeasured)
name: Built-in agents inherit the expensive model
what happens: The built-in Explore agent runs on the session's model, so a cheap lookup can bill at the top tier unless each agent file pins its tier.
evidence: Not measured. The orchestration design records the inheritance; our fixflow-explorer agent is pinned to Haiku.
what fixing it unlocks: A tier pinned per role (Haiku locator, Sonnet gates, Opus refuters) runs each job at its cheapest fitting tier.

### TK-CACHEBREAK (bottleneck, family tokens, Partly closed: pull-only rule defined in the designs)
name: Pushed context breaks the prompt cache
what happens: Putting graph or memory output into the system prompt or CLAUDE.md changes every window's start, so each commit invalidates the cached start of all of them.
evidence: Not measured; identified in the graph build (2026-11-12) as a design hazard.
what fixing it unlocks: Pull-only tool results keep the prompt cache intact as we add retrieval.

### L1 (bottleneck, family tokens, Open: trial designed; none run)
name: Verifier effort level chosen without evidence
what happens: Most verifiers run at xhigh effort, set without paired evidence. Horthy's October 2026 SlopCodeBench report says medium often matched or beat xhigh at lower cost.
evidence: Outside data is one run per setting: medium 28 vs xhigh 25 of 196 [S] strict passes. 87 idea families and 224 cards [M] bear on it.
what fixing it unlocks: Cheaper verifiers at equal quality if medium matches xhigh; the trial's bar is at most 0.6x [T] the incumbent's tokens.

### W1 (bottleneck, family tokens, Open: trim gated behind the knowledge-store pilot)
name: CLAUDE.md is too long
what happens: CLAUDE.md is the only guaranteed way an agent sees a lesson, and every agent pays for it every call; at 390 lines it is nearly twice the adherence limit.
evidence: 390 lines [M] against about 200 [S] where adherence falls. About 7.5k [E] tokens per agent (designs), or about 10k [E] (Horthy sweep). 150 families, 313 cards [M].
what fixing it unlocks: Higher rule adherence without dropping any rule, and a shorter file once diagnostic stories move into the knowledge store.

### LIB-KS-COST (bottleneck, family tokens, Open: bound benchmarked; store not built)
name: Each store lookup costs time and tokens
what happens: Checking the index against the journal each call takes time; each Bash lookup re-reads the caller's context, and the skill description rides every call.
evidence: 23-35 ms [M] at 5k entries, 57-87 ms [M] at 20k; 49-55 ms [M] with 4-8 callers. 2,000 characters cost about 860 [M] tokens; skill description about 620 [M].
what fixing it unlocks: Lookups cheap enough to run routinely; the routine adds about three fixed turns per phase.

### LIB-FUNNEL (bottleneck, family library, Open: modelled; limitation list awaiting my agreement)
name: Library reuse funnel: where work drops out
what happens: In the reasoning-cache library, a cached answer is reused only if a chain of conditions all hold; at middle values the modelled yield is tiny.
evidence: Of 100 pieces the cheap model gets wrong, 0.35 [G] end right at middle values. Match carries 94.0 % [G], capture 78.1 % [G]; 51 of 60 [M] unknowns are guesses.
what fixing it unlocks: At the all-good setting 53.9 [G] of 100 reach the window and 31.7 [G] end right: the prize if the chain holds.

### LIB-S1 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 1: what the window holds
what happens: At the start of a task too much applies, and short helper windows start without the session's lessons.
evidence: Alone 1.4 % [G], last 17.9 % [G] of the full fall; 2 [M] limitations, both from thought experiments; no chosen case broke here [M].
what fixing it unlocks: Up to 17.9 % [G] of the 30.6 % [G] full fall, if this were the last step left unsolved.

### LIB-S2 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 2: nothing triggers a lookup
what happens: Nothing fails, so no lookup starts; a lookup can cost as much as the fix, comes after the failed call is paid, and the cause sits elsewhere.
evidence: Alone -5.3 % [G], last 68.0 % [G]; 6 [M] limitations; 24 of 59 [M] chosen cases break here, 11 [M] more unspecified by the design.
what fixing it unlocks: Up to 68.0 % [G] of the full fall: the third-largest step weight.

### LIB-S3 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 3: query words miss the lessons
what happens: A query in symptom words misses lessons stored in mechanism words, and the query carries the asker's own worry or guess.
evidence: Alone 1.9 % [G], last 24.8 % [G]; 2 [M] limitations; 10 of 59 [M] chosen cases break here.
what fixing it unlocks: Up to 24.8 % [G] of the full fall if this were the last step left.

### LIB-S4 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 4: the match returns the wrong thing
what happens: What comes back can be an unfound strong-model defect, a look-alike, one fact with different answers per project, or disagreeing partial matches; no cross-project path.
evidence: Alone 10.9 % [G], last 94.0 % [G], the highest step weight; 15 [M] limitations; 26 of 59 [M] chosen cases break here.
what fixing it unlocks: The biggest single step: up to 94.0 % [G] of the full fall.

### LIB-S5 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 5: delivery into the window
what happens: Parallel windows pay before any entry can exist, and a compaction can drop a fetched entry mid-task.
evidence: Alone -0.3 % [G], last 11.7 % [G]; 2 [M] limitations; 2 of 59 [M] chosen cases break. Real cases showed index lines do arrive.
what fixing it unlocks: Small: up to 11.7 % [G]; real cases suggest delivery already mostly works.

### LIB-S6 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 6: in the window but unused
what happens: An entry present in the window is not applied; two checked answers do not make a checked merge, and order matters when lessons merge.
evidence: Alone 0.5 % [G], last 30.3 % [G]; 3 [M] limitations; 31 of 59 [M] chosen cases break here.
what fixing it unlocks: Up to 30.3 % [G] of the full fall.

### LIB-S7 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 7: the check cannot confirm equality
what happens: Matching the strong model matches its mistakes too; reviews are costly, tests stay green while defects surface later, and an entry's own test can certify a defect.
evidence: Alone 2.3 % [G], last 16.2 % [G]; 10 [M] limitations; 38 of 59 [M] chosen cases break here, the most of any step.
what fixing it unlocks: Up to 16.2 % [G]; the gate decides equal output, the library decides cost.

### LIB-S8 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 8: failure and the escalation ladder
what happens: Higher tiers lack the missing fact too, a higher tier was often not who caught the error, trade-offs between lessons end with me, and handoffs pollute windows.
evidence: Alone -3.6 % [G], last 8.8 % [G]; 7 [M] limitations; 21 [M] chosen cases break here and 23 [M] never reach it.
what fixing it unlocks: Up to 8.8 % [G]; most of its effect acts through the shared gate and ladder unknowns.

### LIB-S9 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 9: capturing the lesson
what happens: 'Solved' moves after the entry is written, a conditional 'no' hardens into 'never', the writer cannot know which details matter, and asides never count.
evidence: Alone 9.2 % [G], last 78.1 % [G], second only to match; 10 [M] limitations; 22 of 59 [M] chosen cases break here.
what fixing it unlocks: Up to 78.1 % [G] of the full fall; with match, the step to study first.

### LIB-S10 (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Step 10: entries go stale
what happens: Facts outside the repository change with no event, corrections miss copies, later fixes change older entries' truth, and private or untrusted text can travel with entries.
evidence: Alone 3.7 % [G], last 29.9 % [G]; 12 [M] limitations, 2 [M] of them not in the model; 29 of 59 [M] chosen cases break here.
what fixing it unlocks: Up to 29.9 % [G] of the full fall.

### LIB-Q (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Condition: entry quality
what happens: Whether what arrives is right and used rightly; it covers look-alikes, staleness and checks promoted into the shared tests.
evidence: Alone 6.0 % [G], last 104.1 % [G], the largest group weight; 22 [M] library unknowns.
what fixing it unlocks: Left at middle while all else is good, quality alone keeps the library above the ladder (1.029 cost, 1.038 wrong rate [G]): good entries are the condition.

### LIB-COMES (bottleneck, family library, Open: similar-case coverage unmeasured on my work)
name: Condition: how much work repeats
what happens: An entry can help only if work repeats. Files repeat but questions mostly do not, so the ceiling is how often our work repeats.
evidence: Alone 0.2 % [G], last 82.4 % [G]. Files are 65-76 % [E] of reading; questions repeat in 7-9 % [E]; verified hit rate 0.5-4 % [E] per hard encounter.
what fixing it unlocks: Break-even near half the work repeating, or a fifth at low running cost [G]; similar-problem reuse is the untested upside.

### LIB-REACH (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Condition: reach of an entry
what happens: Whether an entry gets to the cheap model when one could exist: it must be written, looked up, found and present in the window.
evidence: Alone -12.4 % [G], last 68.2 % [G]; 8 [M] library unknowns.
what fixing it unlocks: High reach with good entries is the winning corner (0.82 cost, 0.67 wrong rate against the ladder [G]); with poor entries it costs 1.43-1.53 [G].

### LIB-RUN (bottleneck, family library, Open: mapped and weighed; no fix agreed)
name: Condition: library running cost
what happens: What a lookup, a screen, carrying an entry and writing an entry each cost.
evidence: Alone 3.3 % [G], last 10.4 % [G]; 4 [M] library unknowns. A strict entry costs 0.4-3.8M [E] processed tokens to write.
what fixing it unlocks: Kept low, running cost holds the all-good cost ratio at 0.75 [G] instead of 0.92 [G] against the ladder.

### LIB-GATE (bottleneck, family library, Open: modelled; not library-specific)
name: Shared unknowns: the gate and ladder
what happens: Tests, review, retries, and Opus and Fable accuracy set the wrong rate for all three ways of working, so they carry no weight among the library’s steps.
evidence: Middle-value wrong rates: library 21.4 %, ladder 21.2 %, strong model 11.2 % [G]. With gate and ladder at good ends: 2.8 %, 2.8 %, 0.5 % [G].
what fixing it unlocks: A gate at its good end brings the ladder's wrong rate to 7.9 % [G], near the strong model's 8.5 % [G]: better checks pay everywhere.

### LIB-UNNAMED (bottleneck, family library, Open: listed; not yet named as limitations)
name: Unknowns no limitation names yet
what happens: Some library unknowns carry part of the fall with no named limitation: the ceiling on parts held, whether a lookup finds the same problem, whether promoted checks run.
evidence: These seven unknowns carry the last 37.1 % [G] of the full fall; moving every step in turn reaches 62.9 % [G].
what fixing it unlocks: Naming them completes the map, so the whole 30.6 % [G] full fall is explained.

### LIB-REACHPAY (bottleneck, family library, Open: one critic's statement; not refuted)
name: Little current FixFlow work the library reaches
what happens: Only a small share of FixFlow's recorded tokens sit in windows that edit code or fail a check; most of the record is programme and harness work.
evidence: 11 % [M] of FixFlow's tokens vs 78 % [M] in the clinic; about 85 % [M] of FixFlow's record is harness or library work. Ten build sessions: 1.5-1.6B [E] tokens.
what fixing it unlocks: Gives the library an honest reach figure to beat; reach on ship-phase build work is still to measure.

### LIB-PRICE (bottleneck, family library, Open: model draws the ratio between 1 and 2)
name: Opus price ratio is uncertain
what happens: The price list says Opus costs 2x [S] per token, but per call Opus read about half the cached tokens Sonnet did, so the per-call ratio may be nearer 1.
evidence: Opus about 222,000 [M] cached tokens per call vs Sonnet about 440,000 [M]. Cost against the strong model: 0.89 [G] at ratio 2, 1.23 [G] at ratio 1.
what fixing it unlocks: Settling the ratio decides whether the library beats the strong model on cost at all.

### LIB-KS-RESOLVE (bottleneck, family library, Open: designed in knowledge store v1.3.1; audit not run)
name: Hard problems re-solved at the top tier
what happens: Past diagnoses live only as prose (CLAUDE.md, HANDOFF, G2 register, W2 notes), none searchable by symptom, so a recurring defect is paid again at the top tier.
evidence: 3 to 5 [M] same-cause repeats among 48 [M] fix commits on main (a body read found at least five); 72 [M] fix commits on all refs; HANDOFF lists 7 [M] recurring shapes.
what fixing it unlocks: A cheap agent finds, checks and reuses a recorded fix instead of Fable or Opus working it out again.

### LIB-KS-VALUE (bottleneck, family library, Open: pilot planned; audit KS-0 waits on my KS-D1)
name: Knowledge store value not yet proven
what happens: No source shows hard defects recur here often enough for a symptom store to beat grep; avoided cost has no baseline, and few entries can lead without Docker.
evidence: Recurrence and avoided cost are unmeasured; every past fix was top-tier. Build: about six sessions to go/stop, five after [E]. 3 [M] worked examples can lead without Docker.
what fixing it unlocks: A pilot verdict with a kill criterion decides further investment; break-even is then measured going forward.

### LIB-KS-STALE (bottleneck, family library, Open: designed; not built)
name: Stored fixes go stale
what happens: Stored fixes go stale when code, versions or remote resolvers change; hashing whole files invalidates too much, and some changes leave no local trace.
evidence: Not quantified; the design names the EAS cloud image, Railway defaults and data state as changes with no local trace.
what fixing it unlocks: Entries stay useful through fine-grained invalidation, and stale ones are flagged by an event, never by age.

### LIB-KS-PRIVACY (bottleneck, family library, Partly closed: mitigated by rule; KS-D7 awaits my answer)
name: Private data reaches the model provider
what happens: Everything an agent reads reaches Anthropic under my account terms, and customer names and addresses slip past local pattern scrubbing.
evidence: A documented known miss for names and addresses. The design assumes a consumer account with 30-day [S] retention until I state otherwise.
what fixing it unlocks: A safe store by structural rule: no raw production data, only templates with typed placeholders.

### LIB-KS-FALSELEAD (bottleneck, family retrieval, Open: gate, abstention and flags designed; not built)
name: Wrong matches acted on as leads
what happens: Agents copy near-matching records, wrong ones included: one error template can have several causes, a probe proves a condition not a cause, and tests can fake artifacts.
evidence: One Node error code has 3 [M] causes; EAS build 15 had 2 [M]. Parsing the files removes 1 of the 4 [M] ways a probe can be fooled. Pilot target: zero acted false leads [T], unmeasured.
what fixing it unlocks: Leads that cheap agents can trust and act on safely.

### LIB-KS-OUTSIDE (bottleneck, family retrieval, Open: accepted limit; designed as candidates only)
name: Root causes outside the repository
what happens: EAS builds and secrets, Railpack detection, the Supabase pooler and phone vendor behaviour leave no local trace; races look identical on good and bad runs.
evidence: Not sized. The design caps such entries at inconclusive, candidates only, when they cannot be probed locally.
what fixing it unlocks: Entries can still lead when I paste the build or deploy log, and races become checkable through tests that encode them.

### LIB-KS-RECALL (bottleneck, family retrieval, Open: accepted limit; writer and classifier designed)
name: Word lookup misses reworded symptoms
what happens: A word-matching lookup misses a symptom sharing no word with any stored handle, and misses are counted only when a later record examines them.
evidence: Expected below about 0.2 [E] counted misses per 8-week window. The zero-shared-terms classifier misclassed 6 of 7 [M] measured paraphrase misses.
what fixing it unlocks: Recovers vocabulary misses and gives a measured trigger for adding embeddings (KS-D16).

### LIB-GRAPH-CONTRACTS (bottleneck, family retrieval, Open: partly mapped by script; value unproven)
name: Cross-runtime contracts break silently
what happens: Client calls to routes, settings keys, the migration chain, slice contracts, outbox kinds and file-bound invariants are not imports, so search and import graphs miss them.
evidence: A script matched 65 of 73 [M] client URL literals to 77 [M] route decorators; 46 [M] settings keys; 46 [M] migration links.
what fixing it unlocks: A scripted contract map as a review input could show what a change might break; its value is unproven.

### LIB-GRAPH-HUBS (bottleneck, family retrieval, Partly closed: measured; partly handled in graph tuning)
name: Hub files make impact lists too long
what happens: The files that change most are hubs with many dependants, so a raw list of everything downstream is too long to use.
evidence: 42 % [M] of code-file changes and 73 % [M] of code commits touch a file with reach over 15; median reach is 2 [M].
what fixing it unlocks: Depth limits, grouping and a hub cut keep touch lists near 15 [T] files, small enough for a reviewer.

### LIB-GRAPH-POWER (bottleneck, family retrieval, Partly closed: handled in the frozen protocol; limit remains)
name: Test sets too small for small gains
what happens: Our graph test's held-out set can detect only large differences, so 'inconclusive' is a likely and honest result rather than a failure.
evidence: 75 [M] held-out commits; smallest detectable recall difference about 0.09 [E]; detecting 0.05 needs about 110 [E] paired commits.
what fixing it unlocks: A larger or rolling-origin task set would let the test resolve the 0.05 [T] difference we care about.

### LIB-GRAPH-MOBILE (bottleneck, family retrieval, Open: measured 2026-11-13; unexplained)
name: Graph gain is concentrated in mobile
what happens: On held-out commits the typed graph's lead over search comes from mobile-app seeds, and every arm lost recall from tuning to held-out.
evidence: Typed minus search on T1: mobile +0.151 [M], backend +0.012 [M], web +0.025 [M]. Mobile seeds rose from 17 % to 36 % [M]; every arm lost 0.06-0.17 [M].
what fixing it unlocks: Knowing why mobile seeds gain shows where a typed graph pays, so we can use it there first.

### LIB-GRAPH-BASELINE (bottleneck, family retrieval, Partly closed: floors built into every graph report)
name: Folder layout is already a strong baseline
what happens: In our vertical-slice layout folders already encode much connection information, and co-change history is thin, so any method must beat both simple floors.
evidence: On tuning no arm beat the co-change floor (0.752 [M]) by 0.05; directory floor 0.719 [M]. Held-out: typed beat co-change by +0.063 [M], fragile without five best commits.
what fixing it unlocks: Fusing signals helped a few points (top-10 precision 0.28 vs 0.26 [M]); the floors keep every claim honest.

### LIB-GRAPH-TRUTH (bottleneck, family retrieval, Partly closed: mitigated in the frozen protocol)
name: Graph-test answer keys can mislead
what happens: Using co-change history as the answer key favours arms that use co-change, and many changed files were new in that commit, so no store could return them.
evidence: 33-36 % [M] of changed files were added in the same unit; 15-19 % [M] of the rest lie beyond 5 hops.
what fixing it unlocks: Questions read from the code give an answer key independent of the extractor, so arms are compared fairly.

### LIB-EVAL (bottleneck, family retrieval, Open: held-out scored by script; no agent run)
name: Context aids never tested with an agent
what happens: No context aid (graph, map or recall journal) has run with an agent in the loop, so we do not know whether an agent finishes faster or with fewer mistakes.
evidence: 0 [M] agent runs; the held-out graph test (2026-11-13) used a fixed search script. A quality comparison was forecast at 156M-512M [E] tokens.
what fixing it unlocks: Answers my real question: whether a graph, map or recall layer saves an agent work.

### MC-ACCESS (bottleneck, family retrieval, Partly closed: audio solved locally; X replies, LinkedIn, sl…)
name: Research sources blocked or still unread
what happens: YouTube captions, X posts and podcast transcripts were blocked, research agents can lack web tools, and some talks, threads and slides are still unread.
evidence: YouTube answered 429 [M] for five days; X returned 402 [M]. Nine recordings, about 7 hours, transcribed in about 12 minutes [M] of GPU time. 29 [M] items unread first pass.
what fixing it unlocks: Fuller research coverage; the verifiers talk and the Twelve Factor Factories talk may bear on review backpressure (L3).

### PR-PRIMARYSOURCES (bottleneck, family retrieval, Open: open; no manual page fetched yet)
name: Agent skills rest on unchecked facts
what happens: Some skill packages rest on unchecked facts: PostgreSQL lock-level claims come from FixFlow code comments, and Odoo-side unknowns stay open until fetched or answered.
evidence: Not measured. The skill packages mark both as UNVERIFIED or OPEN.
what fixing it unlocks: Trustworthy migration review and exactly-once Odoo postings.

