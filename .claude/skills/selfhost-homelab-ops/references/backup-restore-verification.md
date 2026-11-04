<!-- Trimmed from https://github.com/bolens/agent-skills @ e7c49bfa5b71c3bf3ebf97f090aab78842b0e63d skills/backup-restore-verification/SKILL.md (MIT): kept sections "Backup and restore verification" intro, "Build the recovery contract", "Evidence ladder" (minus the line routing to unfetched skills), "Result"; dropped the frontmatter. Upstream carries no "verified against version X" note. Backticked skill names (sensitive-info-audit, homelab-stack-triage) are bolens skills; only homelab-stack-triage is vendored here (references/homelab-stack-triage.md). The drill link below resolves to references/service-recovery-drill.md in this folder. -->
# Backup and restore verification

Prove recoverability, not merely job success. Default to read-only inspection plus restores into a fresh temporary destination. Never restore over live data, rotate keys, prune snapshots, change retention, or repair a repository without explicit authorization.

## Build the recovery contract

Identify the protected system, backup owner, source paths, exclusions, schedule, repository/backend, encryption and credential dependency, retention policy, monitoring signal, recovery point objective, recovery time objective, and documented restore procedure. Distinguish:

- configuration copies or Git history;
- filesystem snapshots;
- deduplicated backup repositories such as Restic or Borg;
- database dumps and application-native exports;
- raw application-data copies, which may be only crash-consistent.

Do not expose repository credentials, passwords, encryption keys, bucket names, private topology, or recovered personal data. Use `sensitive-info-audit` before sharing evidence.

## Evidence ladder

Collect the smallest sufficient proof:

1. Confirm the scheduler and last completed run from its authoritative log or repository metadata.
2. Compare expected sources and exclusions with what the job actually mounts or reads.
3. Run the backup tool's read-only repository integrity and snapshot/listing checks when available.
4. Select a representative recent snapshot and restore a bounded sample into a newly created temporary directory with sufficient space.
5. Verify expected files, hashes where meaningful, readability, permissions, ownership metadata, symlink targets, and application-native validation for the sample.
6. Remove the temporary drill only after recording evidence, and say whether removal is recoverable. Do not retain sensitive restored data as a report artifact.

A successful restore command is not enough if the restored data cannot be parsed, opened, or used. For databases, prefer a dump validation or isolated disposable restore using the repository's documented engine/version. Do not attach a recovered database to a live application.

[...]

For an application or stack recovery drill, read [isolated service recovery](references/service-recovery-drill.md). Verify isolation before startup, restore compatible dependencies, and prove a representative application operation. File restoration and healthy containers alone do not establish service recovery.

## Result

Report coverage, newest usable recovery point, integrity result, restore sample, validation performed, observed recovery time, gaps against the recovery contract, and any destructive or credential-dependent checks not performed. Classify the result as recoverable, partially proven, failed, or blocked by unavailable evidence.
