# L04 walk: failures whose cause is outside the repository

Pathway family: cloud builds, hosting, the database host, phone behaviour, a vendor's silent change, the host machine.

Five cases, five different outside causes:

| Case | Outside cause | Project |
|---|---|---|
| C1 | EAS cloud Gradle build; a dependency bot | FixFlow |
| C2 | EAS schema validation of `eas.json` | FixFlow |
| C3 | A floating base-image tag, built by Railway | FixFlow |
| C4 | Hyper-V NAT on the owner's PC after a reboot | Clinic |
| C5 (added) | Railway's edge answering 404 for a dead service, met by the phones' 4xx rule | FixFlow |

C1 to C4 come from the reader and were checked against their sources. C5 was added because the family names hosting and phone behaviour and no reader case covered them.

The design read against is `KNOWLEDGE-STORE-DESIGN-2026-11.md` v1.3.1 (cited as "KS L<line>") and its fact sheet F1. Where the design has a mechanism for a step, the step is counted as working. No fixes are proposed anywhere in this file.

Status words: works, strains, breaks, not_specified, not_reached.

---

## 0. What the sources changed in the case cards

- **C1.** The card says the plugin "re-entered main via #59". Git says it never left. 60c026d added `"@sentry/react-native"` to app.json plugins (2026-06-10 11:43 +0500). PR #59 merged at 11:50 (b4f0766). The fix a6f9048 (16:04) exists only on `origin/feat/mobile-outbox-v2`; `git merge-base --is-ancestor a6f9048 origin/main` returns no. Main carried the plugin from 06-10 to 06-26. The design already records this (KS L797, KS-C12).
- **C1.** The three Dependabot PRs (#82, #85, #88) were merged by the owner in GitHub on 2026-06-16 (990e5c1, ad14d4f, 82b2731; committer "GitHub"). No session was involved. The first Dependabot config (4c55d8e, 2026-06-15, Opus 4.8 trailer) ignored only `- dependency-name: expo` with `update-types: [version-update:semver-major]`, so expo-asset, expo-crypto and expo-location majors came through as their own PRs.
- **C2.** The commit that introduced the empty value (140428c, Fable 5 trailer) is the same commit that wrote the Sentry-plugin rule into CLAUDE.md. The C1 lesson was in that window while the C2 defect was written.
- **C3.** The `bookworm-pgdg` line was written the day before it failed: afb7065 (2026-06-15, Opus 4.8) says "server is PG 17; bookworm ships 15". The Dockerfile was not built before the first real run of the deploy workflow. From general knowledge, not checked here (no web): Debian 13 "trixie" became stable in August 2025 and `python:3.12-slim` follows Debian stable, so the tag had probably moved months before the line was written. The case reads less as "the vendor changed silently" and more as "the writer's picture of the vendor was out of date".
- **C4.** Both lockouts were met and solved by Sonnet 5.5 main sessions (model counts in the two transcripts: da4e55ea… 615 Sonnet / 95 Fable calls on 11-04; 2d86c828… Sonnet only). The first fix (db6c8fa) generalised from two observed subnets (172.28.x, then 172.21.x) to "The Default Switch gets a new /20 inside 172.16.0.0/12 at every boot of the PC". That sentence was stated as fact. It reached the next session through the task record (staging-rig task.md:35, read at 2026-11-05T15:52:38Z in 2d86c828…jsonl:50) and was built into bb0aa58's required `MANAGEMENT_SOURCE`. On 2026-11-09 the switch picked 192.168.96.0/20.
- **C5 (added).** 60c026d (Fable 5) made 400/403/404/409/422 definitive in the jobs outbox. c27bb39 (2026-07-03, Opus 4.8) carried that rule into the punch, presence and ping queues: "pings are droppable by design, so a definitive-4xx batch is DROPPED". Production later answered with Railway's edge 404 (memory note project-fixflow-ship-plan.md: "both Railway URLs return Railway's own 404 since ~2026-08"). O-03-design.md:3 and :7: "Phones were online and the API answered Railway's edge 404 with no FastAPI detail." / "Pings: dropped. Every batch was marked done on the 404, so nothing from the outage survives." First agent sight: e24f17dc…jsonl:177, 2026-10-31T16:24:52Z, `{"status":"error","code":404,"message":"Application not found"}`.

---

## C1. EAS build 15: a generic Gradle error, two causes

**What happened (verified).** On 06-10 `expo install` added the Sentry config plugin; the EAS build errored in "Run gradlew". The fix a6f9048 was pushed to the PR branch after the merge and never reached main. On 06-16 the owner merged three Dependabot bumps to SDK-56 versions; CI stayed green. On 06-26 build 15 failed with `EAS_BUILD_UNKNOWN_GRADLE_ERROR`. 6928828 (Opus 4.8) found "Two root causes, both introduced after the last successful build (14, cut from a side branch)".

**Entry as the solver could have written it (a6f9048, 06-10).**
> Trap. Symptom: EAS Android build errors in "Run gradlew" after `expo install @sentry/react-native` added the package to app.json `plugins`. Cause: the config plugin adds a Sentry Gradle upload step that needs an auth token, org and project; none are configured. Fix: remove `@sentry/react-native` from app.json plugins. The SDK still autolinks; runtime init stays DSN-gated and inert until EXPO_PUBLIC_SENTRY_DSN is set. Re-add the plugin only after a Sentry project and auth token exist. CI cannot see this: it runs `expo export` (JS only). Check: config_key `app.json#/expo/plugins` contains the string; precondition: no auth token on the EAS project.

**The later moment.** 2026-06-26. A session with the Opus 4.8 trailer is told build 15 failed. In its window: the failure (how much of the log is unknown; the commit quotes only the code) and the repository. CLAUDE.md has no Sentry rule yet (that came 07-18). It solved the case by comparing with build 14, which was cut from the branch that held the stranded fix. No transcript of June exists on this PC (transcripts start 2026-10-06).

**What a lookup would have returned.** Keyed on `EAS_BUILD_UNKNOWN_GRADLE_ERROR` alone: ex8 as a candidate only, because the template is ambiguous (KS L256, L278). Keyed on the sentry-cli or upload-task line, if the paste held it: ex8 as a lead; verify finds the plugin present on main and returns applies. Nothing for the Dependabot cause. An entry from b7a5b98 (06-03, "EAS build failed at 'Bundle JavaScript' with 'expo-asset cannot be found'") would share the token "expo-asset", but its probe tests that expo-asset is listed, not its version.

| Step | Status | Note |
|---|---|---|
| 1 Task and window | strains | The decisive fact, that build 14 came from a side branch, is in no window unless the owner says it. The solve came from that differential, not from the error text. |
| 2 Trigger | works | KS L444: "before retrying a failed build or deploy" and before escalating. Both apply. |
| 3 Query | strains | The query is the EAS log, which reaches a session only when the owner pastes it (KS L515). The paste is not in the record. Whether it held the sentry line decides step 4. |
| 4 Match | strains | ex8 as candidate or lead. Nothing for the SDK-56 bumps; the b7a5b98 entry's probe tests presence, not version. |
| 5 Delivery | works | One card in the calling window, at most 2,000 characters (KS L432). |
| 6 Use | works | Removing one string from app.json plugins. Nothing to adapt. |
| 7 Check | breaks | verify proves the plugin is present, not that it is the whole cause (KS L518). The real check is the next EAS build, which would fail again on the three SDK-56 versions. CI is green throughout. |
| 8 Ladder | strains | The second failure escalates with only a lookup id (KS L444). Opus needs a new pasted log and the build-14 comparison; neither travels in the brief. |
| 9 Capture | works | 6928828 meets the write rule (burned build). The Dependabot cause is a `dep_version` pin, lead-capable (KS L272). The template is flagged ambiguous: two causes recorded (KS L256). |
| 10 Afterlife | works | The phase-close scan re-runs every validated probe at origin/main and labels a stranded fix "fix not on main" (KS L797, F13; KS-3 must fire at every main tip b4f0766..ded44c8). Caveat: the auth-token precondition is an EAS-side secret and never probeable (KS L358). |

**What it would have saved.** The phase-close scan would very likely have shown "fix not on main" at every phase close from 06-10 to 06-26 and removed the plugin cause before build 15. Build 15 would still have failed on the Dependabot cause. One failed build either way; one cause fewer to find. Without the scan, a hit on ex8 fixes one cause and burns a second build.

---

## C2. An empty value in eas.json fails every EAS build

**What happened (verified).** 140428c (07-18, Fable 5) added `"EXPO_PUBLIC_SENTRY_DSN": ""` to the preview and production profiles ("empty = off") and, in the same commit, wrote the Sentry-plugin rule into CLAUDE.md. Every `eas build` then failed schema validation. 79a8dd4 (07-20, Fable 5) removed the keys. a31924a (08-03, Opus 5) set a real DSN and cited both traps.

**Entry as the solver could have written it (79a8dd4, 07-20).**
> Trap. Symptom: every `eas build` fails schema validation before it starts: an env value is "not allowed to be empty". Cause: `technician-app/eas.json` build profiles carry `"EXPO_PUBLIC_SENTRY_DSN": ""` (PR #143, meant as "empty = off"). EAS rejects empty env values. CI cannot see it: `expo export` does not read eas.json. Fix: remove the keys; unset already means off through the `?? ""` gate in `src/lib/sentry.ts`. To enable Sentry, add the key with a real DSN. Check: json_predicate, any `build.*.env` value equal to the empty string. Controls: 140428c present, 79a8dd4 absent.

**The later moment.** 2026-08-03, a31924a, Opus 5 trailer. Task: set a real DSN on the preview and production profiles. In the window: CLAUDE.md with both Sentry rules. The session wrote "never an empty string - eas.json rejects an empty env value and EVERY `eas build` fails" and validated the DSN with "a synthetic capture_message ... accepted by project 4511846063013968".

**What a lookup would have returned.** No failure, so no failure trigger. The `--diff` arm at the first commit sees a changed `config_key` on `eas.json#/build/*/env` and prints an ex7 warning plus its card (KS L447). Correct, cheap, and the same thing CLAUDE.md already said.

| Step | Status | Note |
|---|---|---|
| 1 Task and window | strains | At the defect (07-18) the task was a feature, "wire the DSN, empty = off", run by Fable 5. Nothing in it looked like a problem. The same-feature Sentry trap was in the window and did not cover this one. A cheap model gets the same task and the same blind spot. |
| 2 Trigger | works | At 07-20 the failed build triggers. At 08-03 the `--diff` arm runs at the first commit (KS L447). At 07-18 nothing could fire: no entry existed for a first-time vendor rule. |
| 3 Query | works | The EAS message names the key and the rule and is short to paste. At 08-03 the query is the diff, no paste. |
| 4 Match | works | At 07-20, ex8 is the only Sentry entry; the OOV rule turns such ties into a miss (KS L304). At 08-03, ex7 matches on the eas.json env config_key. |
| 5 Delivery | works | One warning line and one card in the session's window. |
| 6 Use | works | Trivial: the value must be non-empty. |
| 7 Check | strains | At 07-18 the gate (CI `expo export` plus review) cannot see eas.json validity, and the strong model wrote the defect: a cheap output equal to Fable's is equally broken. At 08-03 the session went past any store check with a live Sentry capture. |
| 8 Ladder | not_reached | The error explains itself; no escalation in the record. |
| 9 Capture | works | ex7 is the design's model lead-capable entry: the data value is the cause; json_predicate; control pair 140428c PRESENT, 79a8dd4 ABSENT (KS L594). |
| 10 Afterlife | works | At 08-03 the warning fires and is right. It adds nothing measurable over CLAUDE.md, which already carried the rule into every window. |

**What it would have saved.** Nothing beyond CLAUDE.md in this record. The defect itself could not have been stopped by any store: it was the first time.

---

## C3. The base image moved to trixie; the backend image build broke

**What happened (verified).** afb7065 (06-15, Opus 4.8) added a PGDG apt line hardcoded to `bookworm-pgdg`. The first real run of the manual Railway deploy workflow (#89) failed: `postgresql-client-17` could not be installed on a trixie base. Prod stayed on the old version. 9c561b0 (06-16, Opus 4.8) derived the codename from `$VERSION_CODENAME`: "CI doesn't build this Dockerfile, so the authoritative check is the re-triggered Railway deploy."

**Entry as the solver could have written it (9c561b0, 06-16).**
> Trap. Symptom: Railway image build fails; `postgresql-client-17` cannot be installed; the backend deploy errors; prod stays on the old version. Cause: backend/Dockerfile hardcodes the `bookworm-pgdg` apt line, but `python:3.12-slim` follows Debian stable, now trixie. Fix: build the line from the image's `$VERSION_CODENAME`. Verified: PGDG serves `trixie-pgdg` with `postgresql-client-17`. CI does not build this Dockerfile; the authoritative check is a re-triggered Railway deploy. Check: regex_in_span, a literal codename before `-pgdg` in backend/Dockerfile. Precondition: the base image's codename (floating tag).

**The later moment.** None in the record. The lesson rode in the Dockerfile comment ("a hardcoded codename breaks the build whenever the base image rolls forward"). Ship-program agents read that comment while auditing deploy on 2026-10-31 (e24f17dc…jsonl:159 at 16:23:04Z, and several workflow subagents that evening and on 11-01).

**What a lookup would have returned.** At the failure: a miss (first time). Later, a failure lookup on an apt error would give at most a candidate capped at `inconclusive(precondition_unprobed)`, because the base image's codename cannot be read without Docker and the network (KS L278, L520).

| Step | Status | Note |
|---|---|---|
| 1 Task and window | strains | 06-16: the deploy workflow's first run fails. In the window: the failure and the Dockerfile. The writer's belief, "bookworm ships 15", is the same picture a cheap model brings from training. |
| 2 Trigger | works | "Before retrying a failed deploy" fires (KS L444). |
| 3 Query | strains | The apt error sits in the Railway build log. The session may reach the Actions log through `gh`; the Railway build log needs a paste (KS L515). |
| 4 Match | works | First time: the store is empty for this; a miss is the right answer. |
| 5 Delivery | not_reached | Nothing delivered on a miss. |
| 6 Use | not_reached | Nothing to adapt. |
| 7 Check | breaks | No local check exists: the authoritative check is a Railway deploy. The strong model's own output (afb7065) was the defect, so "equal to the strong model" is not success here. |
| 8 Ladder | strains | Miss, claim, escalate with the lookup id only (KS L444). The receiving Opus must fetch the build log again. |
| 9 Capture | strains | Meets the write rule (burned deploy). The probe finds a literal codename, but whether it is wrong depends on the floating tag: precondition unprobed, verdict capped. "Won't break again on the next base-image roll-forward" is a stored prediction about a vendor. |
| 10 Afterlife | strains | No recurrence. A floating tag moves with no local trace (KS L358), so the store cannot re-check the entry. After the VPS move the premise "match Supabase's server major" changes owner. The file comment carried the lesson to every later reader at no cost. |

**What it would have saved.** Nothing in the record. The comment in the file did the carrying.

---

## C4. Clinic: a PC reboot moved the Hyper-V NAT and locked ssh out of the staging VM

**What happened (verified, transcripts).**
- First lockout, 2026-11-04 (da4e55ea…jsonl). The PC rebooted at 15:18 local. At 10:21:30Z the session found the VM unreachable, wrote `rig.sh start`, and waited 5 min 16 s for "ERROR: ssh to 172.21.244.137 did not come up" (10:27:21Z). It found the ufw rule at 10:27:31Z and wrote the /12 generalisation at 10:27:38Z. Window: about 608k cached tokens per call.
- The generalisation went into task.md:35 as one of "four facts worth keeping", was read by the next slice session on 11-05, and became the required `MANAGEMENT_SOURCE='172.16.0.0/12'` in bb0aa58.
- Second lockout, 2026-11-09 (2d86c828…jsonl). Details in "The later moment".

**Entry as the solver could have written it (db6c8fa, 11-04).** (The solver was Sonnet, so under the design a fresh Opus subagent records it, KS L476.)
> Trap (staging rig). Symptom: after a PC reboot the VM is off; `rig.sh start` brings it up at a new address, then "ERROR: ssh to <ip> did not come up". Cause: the Hyper-V Default Switch gets a new /20 inside 172.16.0.0/12 at every boot of the PC; provision.sh's ufw rule allowed ssh only from the /20 seen at provision time. Fix: the rule names 172.16.0.0/12. After a reboot: `rig.sh start`, `rig.sh provision HEAD`, `rig.sh expose` (UAC prompts). Check: provision.sh derives the ssh subnet from `ip addr`. Controls: before and after db6c8fa.

**The later moment.** 2026-11-09, 12:05 to 12:17 UTC. Sonnet 5.5, the S11 slice lead, resumed after a usage-limit stop, reading about 750k cached tokens per call (`cr 754174` at 12:11:26Z). It was running closing-round drills. The VM was off after a reboot. `rig.sh start` waited 5 min 23 s and printed "ERROR: ssh to 192.168.108.19 did not come up" (12:11:20Z). In its window: provision.sh with `MANAGEMENT_SOURCE='172.16.0.0/12'` and its comment. It ran ipconfig (Default Switch at 192.168.96.1) and thought at 12:12:32Z: "The firewall seems to only allow SSH from 172.16.0.0/12, so the new 192.168.96.0/20 subnet is locked out." Fix committed at 12:12:54Z (855acaa). VM rebuilt, provisioned and seeded by 12:17:44Z.

**What a lookup would have returned.** Keyed on the error line with `ctx` "rig.sh start": the 11-04 entry by exact template. The line is the rig's generic `wait_ssh` failure, so it fires for any reason ssh is not up; the template is ambiguous and the entry a candidate. verify runs the entry's probe (subnet derived from `ip addr`), finds the old fix in place, and returns not_applies. KS L314 then proposes a `not_when` built from the query handles the entry lacks, here the 192.168 values.

| Step | Status | Note |
|---|---|---|
| 1 Task and window | works | The window held the task (drills), the rig scripts and the provision.sh comment with the half-right range. |
| 2 Trigger | works | `rig.sh start` failed: "before retrying a failed deploy" fires (KS L444). |
| 3 Query | works | Local command output; no paste needed. |
| 4 Match | breaks | Returns the 11-04 entry, which is half-right: "a new /20 inside 172.16.0.0/12". The error line also fits any other reason ssh is down (ambiguous template, KS L256). |
| 5 Delivery | works | The card lands in the main window. The session's own compaction summary at 14:05:31Z kept the subnet fact. |
| 6 Use | not_reached | The entry's fix is already applied; nothing to adapt. |
| 7 Check | breaks | The probe tests for the old defect, finds the old fix and returns not_applies. KS L314 then proposes a `not_when` from 192.168: the store learns "not this entry" for a recurrence of this entry's own cause. |
| 8 Ladder | not_reached | Sonnet solved it in two turns without help (12:11:26Z to 12:12:32Z). |
| 9 Capture | breaks | The 11-04 entry passes the write gate: its control pair flips. Nothing can test the generalisation from two samples (172.28.x, 172.21.x). It is stored as fact. |
| 10 Afterlife | breaks | The half-right fact spread: task.md:35, then bb0aa58's required setting, then the 11-09 lockout. Repair needs an Opus actor and a different Opus approver (KS L350) for a two-turn Sonnet fix. Cross-project use is not specified; on a real host "both private blocks" is wrong. |

**What it would have saved.** Nothing. The cost was the 5-minute ssh wait and a 4.7-minute VM rebuild; the reasoning was two turns. A lookup plus verify adds 2 to 3 turns (KS L476) at about 755k cached tokens each, which is more than the diagnosis, and it returns a wrong "does not apply".

---

## C5 (added). Railway's edge 404 met the phones' 4xx rule

**What happened (verified).** See section 0. The order of events:
- (A) 06-10: the rule "a 404 is definitive" is written for the jobs outbox, after a Railway mid-deploy 502 had cost a cash payment under v1 (60c026d body).
- (B) 07-03: c27bb39 reuses the rule for punches, presence and pings. That is the library's fetch, adapt and apply, done by hand. The commit opens with a defect: "The punch/presence/ping syncs treated EVERY error as retryable".
- (C) From about 2026-08: Railway's edge answers 404 for the gone service. Phones park punches, drop every ping batch and record no travel. No session runs.
- (D) 2026-10-31: a Fable 5.1 orchestrator probing production for the ship program sees "Application not found" (e24f17dc…jsonl:177, 16:24:52Z). Workflow agents reconstruct what the phones did (O-03-design.md) and redesign the rule as origin-aware classification (SHIP-PLAN :389). Behind Cloudflare the premise moves to vendor settings: O-08-design.md:62, "tunnel catch-all http_status:503 not 404 ... a challenge returns 403, a definitive park".

**Entry as the solver could have written it (60c026d, 06-10).**
> Defect. Symptom: a queued write that synced into a non-network error was deleted; a cash payment syncing into a 502 during a Railway mid-deploy was lost. Fix: a typed ApiError carries the status. 401 pauses the queue until re-login. 400/403/404/409/422 are definitive: the item moves to a visible failed list with Retry/Discard and is never auto-deleted. 5xx, 429 and timeouts retry. Rule: bias every ambiguity toward keeping the record. Check: Jest cases per status in outboxSync.

**The later moments.** At B, a session extending the sync queues; CLAUDE.md's outbox contract is in its window. At C, no window exists. At D, a top-tier session is planning a ship program; the 404 shows up in a health probe.

**What a lookup would have returned.** At B, the `--diff` arm warns on the outbox contract (stored as an invariant / do-not-apply entry) through its identifiers on the changed lines, and shows the card. The session copies it, adapting "definitive" to "drop" for pings. At C, nothing: no session. At D, the only text is Railway's "Application not found", which shares no words with any entry: a miss (KS L522).

| Step | Status | Note |
|---|---|---|
| 1 Task and window | strains | At B the task is a real defect in the new queues, and the outbox contract is in the window. The premise "a 404 comes from our server" is in no window. |
| 2 Trigger | breaks | At C phones park and drop for weeks while no session runs. No trigger exists for a failure that never reaches a window. First agent sight came on 10-31, during unrelated planning. |
| 3 Query | not_reached | Nothing to query during the outage. At D the only text is vendor text with no overlap (KS L522). |
| 4 Match | works | At B the `--diff` arm surfaces the outbox contract by its identifiers. It is the right entry for the task as posed. |
| 5 Delivery | works | The card sits in the window of the session doing B. |
| 6 Use | works | Adapting to pings ("droppable, so drop") is exactly what Opus 4.8 did in c27bb39: equal output. |
| 7 Check | breaks | Tests mock `ApiError(404)`; nothing can test who answers a 404. The equal output carried the same exposure. The defect appeared only when Railway's edge answered. |
| 8 Ladder | not_reached | No visible failure until 10-31; then the top tier ran the program directly. |
| 9 Capture | strains | At D the replacement entry comes from a multi-agent workflow. Its own premise is vendor configuration (Cloudflare catch-all 503, challenges off) that lives in a dashboard, outside git and outside any footprint. |
| 10 Afterlife | breaks | The vendor change left no local event, so the entry stayed validated (KS L340, L358). Reuse spread its premise to queues where a 4xx means drop. Pings from the whole outage are gone. After the move, the revised premise depends on Cloudflare settings no probe reads. |

**What it would have saved.** Nothing. At B the library's role is the copy itself.

---

## Breaks, clearest first

1. **A vendor change leaves no event, so a wrong entry stays verified** (step 10; C3, C4, C5; new). Invalidation fires only on local events: a changed blob, dependency or recipe. Railway's edge answering 404, Hyper-V picking 192.168, a floating base-image tag: none changes a file. KS L358: "a silent server-side change has no local trace." In C5 the wrong entry was the most-reused rule in the mobile app.
2. **CI green, vendor red: the real check is outside** (step 7; all five cases; on the list as 22 and 23). Every case passed the local gate and failed at the vendor: an EAS build, EAS schema validation, a Railway image build, a VM behind Hyper-V NAT, phones in the field. The true check is a cloud build, a deploy, a rebuild behind a UAC prompt, or field data. 6928828: "It passed CI because the mobile job runs `expo export`". 9c561b0: "CI doesn't build this Dockerfile".
3. **The strong model wrote the defect** (step 7; C1, C2, C3; new). The design's target is output equal to the strong model's. Fable 5 committed the plugin (60c026d) and the empty DSN (140428c). Opus 4.8 hardcoded bookworm (afb7065) and wrote a Dependabot rule that let expo-* majors through (4c55d8e). A cheap model that matches them matches the defect. No rung of the ladder holds the vendor's current state.
4. **A check built on the old fix rules out the recurrence** (step 7; C4; new). The 11-04 probe tests for the old defect. On 11-09 the old fix is present, so verify says not_applies, though the cause is the same. KS L314 then proposes a `not_when` from the query's 192.168 values: the store learns that the entry does not cover its own recurrence.
5. **A half-right generalisation passes the write gate and spreads** (step 9; C4, C5; on the list as 8 and 29). The control pair cannot test a generalisation. C4: two subnets became "a new /20 inside 172.16.0.0/12 at every boot", stated as fact and built into the next slice's required setting. C5: "a 404 is definitive" assumed our server answers and was reused into pings as "drop".
6. **The symptom stays with the vendor; the query depends on a paste** (step 3; C1, C2, C5; new). KS L515: "Their symptoms reach an agent only when the owner pastes the build or deploy log". Build 15's paste is not in the record; only the generic code survives. In C5 the symptom lived on technicians' phones and reached no log.
7. **No session exists where the cause enters or the failure happens** (step 2; C1, C5; on the list as 23). The Dependabot bumps entered through three PRs the owner merged in GitHub, with no session. The C5 outage ran for weeks in the field. The lookup fires only when a later, unrelated session trips over the result: ten days later in C1, about two months later in C5.
8. **One correct hit ends the search when there are two causes** (step 7; C1; on the list as 6). A hit on ex8 verifies as applies because the plugin is present. The Dependabot cause has no entry, and the next EAS build fails again. KS L518: "a latent co-present cause ... passes the gate, gets 'fixed', and the problem persists."
9. **The lookup costs more than the diagnosis** (steps 2 and 4; C4, C2; on the list as 10). On 11-09 Sonnet diagnosed the lockout in two turns at about 755k cached tokens each. Lookup plus verify adds 2 to 3 turns in the same window (KS L476) and returns not_applies. In C2 the vendor message names the key and the rule.
10. **Repairing the entry costs more than the fix** (step 10; C4; on the list as 33). Recording a Sonnet solve needs a fresh Opus subagent (above 63k prompt tokens, KS L476). Revising needs an Opus actor and a different Opus approver (KS L350). The fix was one line in rig.sh plus a validation loop.
11. **A rig fix is a hole on a real host** (step 10; C4; on the list as 34). "Both private blocks" is right for a NAT switch on the owner's PC. On a real host the same setting must be one management address: provision.sh says "there is no default on a real host" and gives "e.g. 203.0.113.7/32". The design is bound to FixFlow and silent on other projects (F1 §9).

## Listed items these cases did not show, or showed weaker

- **3, similar is not the same.** For the generic EAS code, the design's cause-multiplicity flag and cause-specific template rule (KS L256, L278) keep `EAS_BUILD_UNKNOWN_GRADLE_ERROR` from making a lead. The OOV rule turns an ex7/ex8 tie into a miss (KS L304).
- **21, a wrong entry anchors the cheap model.** C4, 11-09: the half-right "172.16.0.0/12" was in Sonnet's window and did not anchor it. The concrete range against ipconfig's 192.168.96.1 gave the diagnosis in one turn. A concrete wrong value was easy to refute.
- **17, compaction drops a fetched entry.** C4: the compaction summary at 2026-11-09T14:05:31Z kept "Hyper-V Default Switch changes subnet at PC reboot (172.28.x → 192.168.96.0/20)". It was the session's own fact, not a fetched card.
- **19, a stored "no" is read as "never".** It happened in the prose incumbent, not the store. 6928828: "re-add the plugin only once a Sentry project + auth token exist". CLAUDE.md: "Never add the Sentry Expo config plugin". a31924a followed "never" with a live Sentry project. No harm yet: the auth token still did not exist, and the design's ex8 keeps that precondition (KS L278).
- **31, parallel branches.** C1's stranded fix (only on feat/mobile-outbox-v2) is caught by the state-based phase-close scan (KS L797, F13).
- **24, hard problems pay every rung.** In this family the reasoning was cheap: C4 was two Sonnet turns, and C2's error named its cause. The cost was the outside round trip (an EAS build, a Railway deploy, a 5-minute ssh wait, a VM rebuild), and no rung changes that.

## What works

- C1: the state-based phase-close scan would have shown "fix not on main" from 06-10 to 06-26, very likely removing the plugin cause before build 15. That saves one of the two causes; build 15 still fails on the Dependabot bumps.
- C1 to C4: the trigger "before retrying a failed build or deploy" fires at the right moment in every case where a session saw the failure.
- C2: ex7 is a clean lead-capable entry (the data value is the cause; control pair 140428c / 79a8dd4). At 08-03 the `--diff` arm would warn on the eas.json env change for 0.2 to 0.3 s plus one turn. Correct, but redundant with CLAUDE.md.
- C1: 6928828's Dependabot cause makes a clean `dep_version` entry, and the two-cause template is flagged ambiguous.
- C4: the query needs no paste; the rig's own error line is local output.
- Where the store adds nothing, the incumbent worked: the C3 Dockerfile comment reached later readers, and CLAUDE.md carried C2's rule into the 08-03 window.

## Summary

Five cases, five different outside causes: an EAS cloud Gradle build (C1), EAS schema validation (C2), a floating base image built by Railway (C3), Hyper-V NAT on the owner's PC in the clinic project (C4), and Railway's edge 404 meeting the phones' 4xx rule (C5, added).

The design's phase-close scan would have caught C1's stranded fix, and its ambiguity rules handle the generic EAS error. The family breaks the design mainly at the check and the afterlife:
- The true check is a cloud build, a deploy, a VM rebuild or field data.
- Vendor changes leave no event, so wrong entries stay verified.
- A check built on the old fix rules out a recurrence of the same cause.
- In three cases the strong model wrote the defect, so "equal output" copies it.

Reasoning was cheap in this family. The cost was the outside round trip, which a lookup does not shorten.
