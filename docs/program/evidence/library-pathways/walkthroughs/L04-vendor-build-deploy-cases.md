# L04: failures whose cause is outside the repository

Facts only. Four cases. Repos: FixFlow = C:/Users/User/Documents/projects/EMS_workshop1; Clinic = C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop.

Limit that applies to all FixFlow cases: the original fixing sessions (June to August 2026) are not in the transcripts I could scan. Evidence of how the error text reached the session is therefore only what the commit messages say. Verify time per attempt is not recorded anywhere for the FixFlow cases.

## Case 1. EAS build 15 fails with a generic Gradle error (two causes, and the Sentry plugin returns)

**What happened.** On 10 June 2026 `expo install` added the Sentry Expo config plugin to app.json. On EAS it wires a Sentry gradle step that needs an org, project and auth token that did not exist. The build errored in the "Run gradlew" phase. The plugin was removed (a6f9048). On 26 June EAS build 15 failed with `EAS_BUILD_UNKNOWN_GRADLE_ERROR`. This time there were two causes: the plugin had re-entered main via PR #59 (build 14 had been cut from a side branch that removed it), and Dependabot had bumped three Expo native modules to far-future SDK versions (expo-asset ~56.0.17, expo-crypto ~56.0.4, expo-location ~56.0.17) on an SDK 52 app. CI passed both because the mobile job runs `expo export`, a JS bundle only. Fix 6928828 restored the versions and removed the plugin. It also made Dependabot ignore the whole Expo/RN native family.

**When.** 2026-06-10 and 2026-06-26.
**Who.** Both commits authored as Tempest-Zero. Trailers: a6f9048 "Claude Fable 5", 6928828 "Claude Opus 4.8".
**How evidence arrived.** Only the commit text: "EAS build 15 failed with EAS_BUILD_UNKNOWN_GRADLE_ERROR". The log paste itself is not in the record I found.
**Verify time.** Not recorded. An EAS build is a cloud build; CLAUDE.md says "A real Android compile is currently not gated anywhere."

**Exact evidence.**
- a6f9048 subject: "fix(mobile): drop the Sentry expo config plugin - it failed the EAS gradle build". Body: "the build ERRORED in the Run gradlew phase".
- 6928828 subject: "fix(mobile): restore SDK-52 native versions + drop Sentry gradle plugin (build was failing)". Body: "Two root causes, both introduced after the last successful build (14, cut from a side branch)".
- CLAUDE.md "Build & deploy traps": "Never add the Sentry Expo config plugin to `app.json` - it breaks the gradle build. Also uncaught by `expo export`."

**Sources.** FixFlow git: a6f9048, 6928828, .github/dependabot.yml, CLAUDE.md. `git log -S'@sentry/react-native' -- technician-app/app.json` gives 60c026d (2026-06-10) then 6928828.

**Later moment (the trap was hit twice, then respected).**
1. Within 16 days the same plugin came back (6928828 body: "it re-entered main via #59"). This is the first repeat.
2. 140428c (2026-07-18) wrote the rule into CLAUDE.md: "the Sentry Expo config plugin must never be added to app.json".
3. a31924a (2026-08-03, #176): "Two traps this deliberately respects, both documented in CLAUDE.md and both previously paid for ... the @sentry/react-native Expo config plugin stays OUT of app.json". So the knowledge was needed again and was applied.
4. Later meta use: the knowledge-store design cites the template as ambiguous ("EAS_BUILD_UNKNOWN_GRADLE_ERROR had two causes in build 15"). Transcript C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/e24f17dc-4aea-4914-a9d1-280a723d620e.jsonl, 2026-11-03T03:36:06Z.

## Case 2. An empty string in eas.json makes every build fail before it starts

**What happened.** PR #143 (140428c, 18 July 2026) added `"EXPO_PUBLIC_SENTRY_DSN": ""` to the preview and production profiles of eas.json ("empty = off"). EAS rejects an empty env value ("not allowed to be empty"), so every `eas build` failed schema validation. CI did not catch it because `expo export` does not read eas.json. Fix 79a8dd4 (20 July, PR #150) removed the keys. An unset variable already means "Sentry off" through the `?? ""` gate in sentry.ts. The author of both commits used a Claude trailer; the commit was made by the default git identity "Your Name".

**When.** 2026-07-18 introduced, 2026-07-20 fixed (about two days).
**Who.** Trailer "Claude Fable 5" on both 140428c and 79a8dd4.
**How evidence arrived.** Commit text only; the error string "not allowed to be empty" is quoted in the commit body, so some build output was seen. The log paste is not in the record found.
**Verify time.** Not recorded.

**Exact evidence.**
- 79a8dd4 subject: "fix(mobile): remove empty EXPO_PUBLIC_SENTRY_DSN - eas.json was invalid".
- Body: "EAS rejects an empty env value ("not allowed to be empty"), so every `eas build` failed schema validation before it started. CI never caught it because CI runs `expo export` (JS bundle only), which does not validate eas.json".
- CLAUDE.md: "Never put `EXPO_PUBLIC_SENTRY_DSN` in `eas.json` as an empty string."

**Sources.** FixFlow git: 140428c, 79a8dd4, 10be6cc (merge of #150), technician-app/eas.json, technician-app/.env.example, CLAUDE.md.

**Later moment.** a31924a (2026-08-03, #176) sets the real DSN and says: "never an empty string - eas.json rejects an empty env value and EVERY `eas build` fails (CI's `expo export` does not catch it)". It also says: "DSN validated before committing: a synthetic capture_message was accepted by project 4511846063013968". The lesson was applied 14 days later. The trap was also created by the same intent that the later commit completes (turn Sentry on in the phone app).

## Case 3. Base image rolled forward from Debian bookworm to trixie and broke the backend image build

**What happened.** The backend Dockerfile (added in #68, backup work, commit afb7065 of 2026-06-15) hardcoded the PostgreSQL apt repo as `bookworm-pgdg`. The base image `python:3.12-slim` had moved to Debian trixie. The bookworm repo could not satisfy `postgresql-client-17`, so the Railway image build failed and the deploy errored. Production stayed on the old version because a failed build never replaces it. The failure was found by the first real run of the new manual Railway deploy workflow (#89, 81276bb). The fix derives the codename from the image's `$VERSION_CODENAME`. Nothing in the repository changed between the working and failing state: only the upstream base image tag moved.

**When.** 2026-06-16 (fix 9c561b0), one day after the Dockerfile with the hardcoded codename.
**Who.** Trailer "Claude Opus 4.8"; author Tempest-Zero.
**How evidence arrived.** Commit text: "Verified live: PGDG serves a `trixie-pgdg` dist with `postgresql-client-17`." That implies a check against the vendor's repository by command. The build log paste is not in the record found.
**Verify time.** Not recorded. The body says "CI doesn't build this Dockerfile, so the authoritative check is the re-triggered Railway deploy."

**Exact evidence.**
- 9c561b0 subject: "fix(docker): derive Debian codename for the PGDG repo (backend deploy was failing)".
- Body: "`python:3.12-slim` has rolled forward to Debian **trixie**. On a trixie base the bookworm PGDG repo can't satisfy `postgresql-client-17`, so the image build failed".
- Present Dockerfile comment (quoted inside transcript e24f17dc, 2026-10-31T16:23:04Z): "python:3.12-slim tracks the current Debian stable (now trixie, was bookworm), so a hardcoded codename breaks the build whenever the base image rolls forward."

**Sources.** FixFlow git: 9c561b0, afb7065, 81276bb, 09c0856; file backend/Dockerfile.

**Later moment.** None found for a second base-image failure. The fix itself says it "won't break again on the next base-image roll-forward", so the knowledge was written as a code comment, not retrieved. This case is also distinct from the others in that CI is blind to it by construction.

## Case 4. Clinic: a PC reboot changed Hyper-V's NAT subnet and locked ssh out of the staging VM

**What happened.** The clinic build rehearses deployment on a Hyper-V Debian VM ("clinic-staging") behind the Default Switch NAT. The provisioning script opens ssh only from a management CIDR. After a PC reboot Hyper-V moved the Default Switch from the 172.28.x range to 192.168.96.0/20. The firewall rule (first the old /20, then `172.16.0.0/12`) no longer matched the PC. ssh to the VM timed out, port 443 too, and `rig.sh start` could not finish. The VM was reachable by ping only. It had to be recreated. The rule was widened to both private blocks.

**When.** First lockout and rule change 2026-11-04 to 2026-11-06 (db6c8fa, bb0aa58). Second, after another reboot, 2026-11-09 (855acaa).
**Who.** Clinic root session and S11 slice sessions. 855acaa trailer: "Claude Sonnet 5.5", author "Local workflow implementation".
**How evidence arrived.** Command results from the rig (ssh timeout, ping succeeds). The record calls it the "GT-06 lockout, met by the rig itself".
**Verify time.** Drill figures: fresh VM serving 109 s after VM up (provision plus deploy 101 s, seed 7 s) (staging-rig task.md:23). The VM re-creation path itself took no separately recorded time. The 3-of-3 first-boot hang of the cloud image needed one power cycle (task.md:35).

**Exact evidence.**
- docs/tasks/s11-operations/task.md:257: "After the PC was restarted the Hyper-V Default Switch moved from `172.28.x` to `192.168.96.0/20`. The firewall rule, `172.16.0.0/12`, no longer matched the PC, so ssh to the VM timed out ... the VM was unreachable without a console."
- Same line: "I attribute them to the network address of the VM changing and ssh connections resetting while the Default Switch settled; **this is a guess, not a finding**." (three drill runs failed with clean output and a non-zero exit, plus one `Connection reset by peer`; each passed on rerun).
- deploy/host/rig.sh:85: `MANAGEMENT_SOURCE='172.16.0.0/12,192.168.0.0/16'   # both private blocks Hyper-V's NAT picks from: it changed from the first to the second at a PC reboot and locked ssh out`.
- docs/tasks/staging-rig/task.md:35: "(4) a PC reboot switches the Default Switch to a new subnet, which locked the first SSH rule (the old /20) out, so the rule now names Hyper-V's private block `172.16.0.0/12`."
- task.md F-S11-8: "A VM or PC reboot changes Hyper-V's subnet: any runbook step that pins an address goes stale (rehearsal only)".
- Commit 855acaa subject: "S11 closing round: MANAGEMENT_SOURCE accepts several CIDRs; the rig names both private blocks Hyper-V's NAT picks from (it changed at a PC reboot and locked ssh out)".

**Sources.** Clinic git: db6c8fa (2026-11-04), bb0aa58 (2026-11-06), 855acaa (2026-11-09); files deploy/host/rig.sh, deploy/vm/provision.sh, docs/tasks/s11-operations/task.md:257, docs/tasks/staging-rig/task.md:35,54,101. Compile: FixFlow docs/program/evidence/harness-bottlenecks/sweep-cards.txt (card text "Docker Desktop and the database containers have to be started by hand ... changes subnet at every boot").

**Later moment.** Yes, inside the same project. The fix of 2026-11-04/06 (name 172.16.0.0/12) did not hold; the same lockout happened again on 2026-11-09 and the rule was widened (855acaa). Also staging-rig task.md:101 records the manual three-command sequence after every reboot: "`rig.sh start`, then `rig.sh provision HEAD`, then `rig.sh expose`". The compile (HARNESS-BOTTLENECKS B19) says none of this has run on a real host: "Nothing has run on a real host (B19)", so whether a real host has this class of cause is untested.

## What I searched
- FixFlow: CLAUDE.md "Build & deploy traps"; `git log --all` with grep for sentry, eas.json, railpack, railway, gradle, outage, timed out, crash-loop; commits 79a8dd4, 140428c, a31924a, a6f9048, 6928828, 9c561b0, c79bec7, 4b64a5d; docs/HANDOFF-2026-07-28-open-work.md section 2.1 and 2.2; docs/RUNBOOK-BACKUPS.md not read in depth.
- Clinic: deploy/ folder, git log of deploy/, S11 and staging-rig task files, harness-bottlenecks B19, sweep-cards.
- Transcripts under C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1 scanned for EAS_BUILD_UNKNOWN_GRADLE_ERROR, "not allowed to be empty", trixie: only later design sessions (0bf1c4f3..., e24f17dc...) mention them; they quote the facts, they do not hold the original fix sessions.

## Candidates not written up as cases (thin evidence)
- Root-deploy outage (RAILPACK detects Vite and rebuilds the API as the SPA): the only record is the sentence in CLAUDE.md and HANDOFF section 2.1 ("This has happened"). No commit, log or date found.
- `railway up --ci` always ends with `reqwest error / operation timed out`, never re-run: HANDOFF section 2.1 only. Cited as a "symptom that misleads" in the knowledge-store design (e24f17dc, 2026-11-03T03:36:16Z).
- Reverted migration 0045 (c79bec7, 2026-07-27): the cause is the deploy mechanism (start.sh runs all migrations at boot), partly inside the repo; kept out of the four.
