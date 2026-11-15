# Bottleneck register ids (map each idea to the ids it answers)

Only these ids are valid. Raw ids in the records (OB4, REV-B3, G-B1, TOK-2 and so on) map through the alias table at the end; a record id like B05 maps to itself.

| Id | Family | Name |
| --- | --- | --- |
| B01 | review | Fix rounds that create new defects |
| B02 | first-use | Gaps found only on the last day |
| B03 | owner-process | Everything stops when the owner is away |
| B04 | orchestrator | One orchestrator is the serial gate |
| B05 | machine | The PC powers off unexpectedly |
| B06 | check | The check is slow on Windows |
| B07 | check | Checks queue behind each other |
| B08 | machine | Memory is short on this PC |
| B09 | check | A check hung with no named cause |
| B10 | machine | Nothing restarts after a reboot |
| B11 | machine | The work exists only on this PC |
| B12 | review | Agent reports overstate what was done |
| B13 | orchestrator | Shared documents have one writer |
| B14 | owner-process | The owner cannot see progress |
| B15 | machine | Worktrees and containers pile up |
| B16 | orchestrator | Agent reports flow through the orchestrator |
| B17 | review | Nobody reads the final commit |
| B18 | check | Tests ran only on Windows |
| B19 | first-use | Nothing has run on a real host |
| B20 | check | Load test not rerun after the fix |
| B21 | review | Minor findings pile up uncounted |
| R2 | tokens | Context growth in long sessions |
| R4 | orchestrator | The pile-up after a stop |
| B3-LOOP | machine | Usage limits stop every lane at once |
| TK-LIMITACCT | tokens | How the usage limit counts is unknown |
| TK-REREAD | tokens | Every call re-reads the whole window |
| TK-PREFIX | tokens | Fixed start-up cost per agent |
| TK-LOOKUP | tokens | Calls that only read or search |
| TK-OWNOUTPUT | tokens | The model's own output is carried forward |
| TK-SUMMARIES | tokens | Compaction summaries re-read every call |
| TK-FETCHED | tokens | Fetched file content fills the windows |
| TK-BLIND | tokens | Gaps in the token measurement |
| TK-BUDGET | tokens | Remedies and tracks compete for one budget |
| TK-HAIKUCLIFF | tokens | Haiku price cliff above 100k |
| TK-TIER | tokens | Built-in agents inherit the expensive model |
| TK-CACHEBREAK | tokens | Pushed context breaks the prompt cache |
| L1 | tokens | Effort level for verifiers is unmeasured |
| W1 | tokens | CLAUDE.md is too long |
| W2 | review | Agents' compliance is self-reported |
| W3 | orchestrator | Resuming from repo state is untested |
| W4 | orchestrator | Agents lack tested domain skills |
| W5 | orchestrator | Workflows are not saved for reuse |
| L3 | review | Verifiers not shown to catch defects |
| LIB-FUNNEL | library | Reasoning-cache library reuse funnel |
| LIB-S1 | library | Step 1: window contents at task start |
| LIB-S2 | library | Step 2: nothing triggers a lookup |
| LIB-S3 | library | Step 3: query words miss the lessons |
| LIB-S4 | library | Step 4: the match returns the wrong thing |
| LIB-S5 | library | Step 5: delivery into the window |
| LIB-S6 | library | Step 6: present in the window but unused |
| LIB-S7 | library | Step 7: the check cannot confirm equality |
| LIB-S8 | library | Step 8: failure and the escalation ladder |
| LIB-S9 | library | Step 9: capturing the lesson |
| LIB-S10 | library | Step 10: entries go stale |
| LIB-Q | library | Condition: entry quality |
| LIB-COMES | library | Condition: how much work repeats |
| LIB-REACH | library | Condition: reach of an entry |
| LIB-RUN | library | Condition: library running cost |
| LIB-GATE | library | Shared unknowns: the gate and ladder |
| LIB-UNNAMED | library | Unknowns no limitation names |
| LIB-REACHPAY | library | Little FixFlow work the library could reach |
| LIB-PRICE | library | Opus price ratio is uncertain |
| LIB-KS-RESOLVE | library | Hard problems re-solved at the top tier |
| LIB-KS-VALUE | library | Knowledge store value not yet proven |
| LIB-KS-DIFF | review | Forbidden changes merge silently |
| LIB-KS-BLIND | review | Changes the store's warnings cannot see |
| LIB-KS-FALSELEAD | retrieval | Wrong matches acted on as leads |
| LIB-KS-STALE | library | Stored fixes go stale |
| LIB-KS-OUTSIDE | retrieval | Root causes outside the repository |
| LIB-KS-RECALL | retrieval | Lexical lookup misses reworded symptoms |
| LIB-KS-RUNCHECKS | check | Stored checks cannot run safely on Windows |
| LIB-KS-COST | tokens | Each store lookup costs time and tokens |
| LIB-KS-DUP | orchestrator | Parallel sessions solve the same problem |
| LIB-KS-PRIVACY | library | Private data can reach the model provider |
| LIB-KS-POLICY | review | Store safeguards are policy, not locks |
| LIB-GRAPH-CONTRACTS | retrieval | Cross-runtime contracts break silently |
| LIB-GRAPH-HUBS | retrieval | Hub files make impact lists too long |
| LIB-GRAPH-POWER | retrieval | Test sets too small for small gains |
| LIB-GRAPH-MOBILE | retrieval | Graph gain is concentrated in mobile |
| LIB-GRAPH-BASELINE | retrieval | Folder layout already a strong baseline |
| LIB-GRAPH-TRUTH | retrieval | Graph-test answer keys can mislead |
| LIB-EVAL | retrieval | Context aids never tested with an agent |
| MC-FS | machine | Windows file-system traps for shared stores |
| MC-DOCKERCACHE | machine | Docker VM page cache hoards RAM |
| MC-NETPOOL | check | Docker network address pools exhausted |
| MC-AV | machine | Antivirus blocks toolchain files |
| MC-QUEUE | check | Unfair gate queue starved FixFlow lanes |
| MC-GATETIME | check | Gate runs take minutes |
| MC-NATIVE | check | No native Android compile gate |
| MC-NOEMU | check | No Android emulator inside Docker |
| MC-SHAREDDB | check | Two test runs could share a database |
| MC-TOOLS | machine | Missing local tools on the PC |
| MC-ENVSKEW | check | Local gates differ from CI and prod |
| MC-PREBUILD | machine | Native prebuild would pollute the repo |
| MC-TIMEOUT | check | Re-issuing a command after a timeout |
| MC-INJECT | machine | Bypass-mode agents near stored credentials |
| MC-ACCESS | retrieval | Research sources blocked or unread |
| MC-HEREDOC | orchestrator | Shell tool mangles long scripts |
| MC-CPU | machine | CPU contention from parallel sessions |
| MC-ENGINE | machine | Graph engines hard to run here |
| MC-HOOKCOST | machine | Hook and proxy overhead is unmeasured |
| PR-P0A | owner-process | Code phases waited on the owner's P0a |
| PR-OWNERWAIT | owner-process | Agent work waits on owner actions |
| PR-VERIFYBUDGET | review | Verification budget spent first-come |
| PR-SEVERITY | review | Severity labels drift between stages |
| PR-CAPS | review | Silent caps hid findings |
| PR-SCRIPTTEST | check | Workflow-script bugs found only by review |
| PR-AGENTNULL | orchestrator | Agent failures are indistinguishable |
| PR-BRIEFTEST | review | Brief edits cannot be tested cheaply |
| PR-BRIEFFACTS | orchestrator | Agents start without the settled facts |
| PR-EVFORMAT | check | Evidence-format checks misfire |
| PR-DOCDRIFT | review | Docs and memory drift from the code |
| PR-SUMMARY | orchestrator | Compaction summaries misstate the latest state |
| PR-TEMPOUT | orchestrator | Raw workflow outputs only in temp |
| PR-PLANLOSS | review | Plan rewrites can lose content |
| PR-PLANDEFECTS | review | Plan revisions carry defects |
| PR-PHASESIZE | orchestrator | Phases too big for one session |
| PR-FALSEGREEN | check | Green checks that test nothing |
| PR-MOBILEBOUNDARY | check | Mobile code boundaries not enforced |
| PR-SCREENTEST | check | No screen tests for the mobile app |
| PR-FIELDEVIDENCE | first-use | Code reading cannot settle field questions |
| PR-PRIMARYSOURCES | retrieval | Agent knowledge lacks primary sources |
| PR-SECRETS | orchestrator | Journaled agent output could keep secrets |
| PR-AUTHORBRIEF | review | Author wrote its own reviewer's brief |
| PR-DRAIN | review | Drain branch could absorb unrelated work |
| PR-CONFLICTS | orchestrator | Parallel lanes edit the same files |
| PR-DELIVERY | orchestrator | Corrections cannot interrupt a busy lane |
| PR-OUTSIDEEVIDENCE | review | Outside harness ideas have weak evidence |

## Alias table (raw id -> register id)

- TOK-13 -> B05
- B-POWER -> B05
- B-RAM -> B08
- OB1 -> B10
- Docker-autostart parts of ksA-8/§9-no-docker -> B10
- ksA-11 -> B11
- D14 -> B11
- OB15 -> B12
- SK-3 -> B12
- OB14 -> B16
- T1 -> R2
- TOK-2 -> R2
- REV-B1 -> R2
- REV-B3 -> R2
- L2 -> R2
- OB6 -> B3-LOOP
- REV-B5 -> B3-LOOP
- BML-1 -> B3-LOOP
- §12-lost-runs -> B3-LOOP
- TOK-8s stop count -> B3-LOOP
- T2 -> TK-PREFIX
- TOK-3 -> TK-PREFIX
- OB4 -> TK-PREFIX
- Fixed cost -> TK-PREFIX
- KS-C9s 63k figure -> TK-PREFIX
- G-B1 -> TK-LOOKUP
- A5-06 -> TK-OWNOUTPUT
- G-B2 -> TK-FETCHED
- G-B3 -> TK-FETCHED
- G-B10 -> TK-FETCHED
- T4 -> TK-BUDGET
- KS-K8 -> TK-BUDGET
- ksA-3 -> W1
- ksA-7 -> W2
- KS-K24 -> W2
- BML-5 -> W2
- OB21 -> W4
- SK-2 -> W4
- SK-4 -> W4
- LIB-CEIL -> LIB-COMES
- TOK-10 -> LIB-GRAPH-POWER
- G-B9 -> LIB-EVAL
- A5-08 -> LIB-EVAL
- A6-10 -> LIB-EVAL
- A5-04 -> LIB-EVAL
- B-SERIAL -> PR-P0A
- B-P0A -> PR-P0A
- OB22 -> PR-OWNERWAIT
- SK-5 -> PR-OWNERWAIT
- T5 -> PR-OWNERWAIT
- REV-B4 -> PR-VERIFYBUDGET
- TOK-11 -> PR-VERIFYBUDGET
- OB7 -> PR-VERIFYBUDGET
- BML-3 -> PR-SEVERITY
- OB13 -> PR-SEVERITY
- BML-2 -> PR-SCRIPTTEST
- OB24 -> PR-SCRIPTTEST
- REV-B6 -> PR-BRIEFFACTS
- BML-7 -> PR-BRIEFFACTS
- B-PLANOFFMAIN -> PR-BRIEFFACTS
- REV-B10 -> PR-DOCDRIFT
- KS-R5 -> PR-DOCDRIFT
- ksA-13 -> PR-DOCDRIFT
- G-B13 -> PR-DOCDRIFT
- BML-9 -> PR-DOCDRIFT
- REV-B15 -> PR-DOCDRIFT
- REV-B9 -> PR-FALSEGREEN
- B-INSTALLER -> PR-FALSEGREEN
- OB16 -> PR-FIELDEVIDENCE
- OB17 -> PR-FIELDEVIDENCE
- REV-B16 -> PR-FIELDEVIDENCE
- SK-7 -> PR-FIELDEVIDENCE
- OB3 -> MC-ENVSKEW
- OB20 -> MC-ENVSKEW
- SK-10s PG16/17 part -> MC-ENVSKEW
- OB2 -> MC-TOOLS
- REV-B13 -> MC-TOOLS
- OB8 -> MC-GATETIME
- B-BACKEND-GATE -> MC-GATETIME
- B-NATIVECOMPILE -> MC-NATIVE
- SK-6 -> MC-NATIVE
- OB9 -> MC-SHAREDDB
- B-SHAREDDB -> MC-SHAREDDB
- OB19 -> PR-SCREENTEST
- SK-11 -> PR-SCREENTEST
- B-ACCESS -> MC-ACCESS
- B-UNREAD -> MC-ACCESS
- OB11 -> MC-ACCESS
- The knowledge-store records are grouped by mechanism -> the
- B1 -> B07
- loop B1 -> B07
- B2 -> B04
- loop B2 -> B04
- R1 -> B01
- loop R1 -> B01
- B3 -> B3-LOOP
- loop B3 -> B3-LOOP

Harness v2 loop ids: loop R1 (the fix spiral) -> B01; loop B1 (check capacity) -> B07; loop B2 (the serial gate) -> B04; loop B3 (the limit stop) -> B3-LOOP; loop R2 -> R2; loop R4 -> R4; loop R3 (the library compounds) and loop B4 (staleness) -> LIB-FUNNEL and LIB-S10; loop B5 (lanes at the knee) -> PR-CONFLICTS.
