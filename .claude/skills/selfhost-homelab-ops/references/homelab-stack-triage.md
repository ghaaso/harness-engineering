<!-- Trimmed from https://github.com/bolens/agent-skills @ e7c49bfa5b71c3bf3ebf97f090aab78842b0e63d skills/homelab-stack-triage/SKILL.md (MIT): kept sections intro, "Resolve ownership", "Trace the service path" (steps 1-5 and the two paragraphs after them; dropped the three paragraphs routing to unfetched skills), "Mutations", "Report"; dropped the frontmatter. Upstream carries no "verified against version X" note. Links to sensitive-info-audit, migration and the sibling skills are not vendored except: example-validation -> references/example-validation.md, backup-restore-verification -> references/backup-restore-verification.md. In FixFlow every mutation on the production host is [owner] (SKILL.md "Where upstream disagrees"). -->
# Homelab stack triage

Establish the real request path and failure boundary before changing a running service. Default to read-only inspection. A request to diagnose does not authorize restarts, recreation, image pulls, migrations, volume changes, pruning, or deployment.

## Resolve ownership

Read repository guidance and locate the canonical Compose or stack file, environment-file contract, preparation script, shared-network documentation, reverse-proxy route, persistent-data mounts, health checks, and declared dependencies. Respect repository prohibitions on reading ignored runtime configuration before collecting evidence. Never print secret values. Use [sensitive-info-audit](../sensitive-info-audit/SKILL.md) on permitted, sanitized artifacts before sharing an incident bundle. A scanner does not grant permission to read excluded files.

Treat generated catalogs and topology diagrams as navigation aids, not runtime truth. Confirm live Compose labels, working directory, project name, image identity, and configuration files. Preserve unrelated containers and stacks.

## Trace the service path

Work from the user-visible symptom inward:

1. Confirm the exact URL, client path, failure time, and whether the problem is local, proxied, or remote.
2. Inspect permitted container state, health, restart count, and exit/OOM metadata using selected fields. Read bounded logs only when their source is permitted and output can be sanitized before display. Avoid unrestricted `docker inspect`, environment dumps, and raw resolved Compose output. If live configuration cannot be read, validate tracked examples and mark runtime configuration unverified.
3. Test each hop separately: client/DNS/TLS, reverse proxy, Docker network, target port, application health endpoint, dependency, and persistent mount.
4. Correlate failures by timestamp. A noisy log line or unhealthy dependency is not causal without a matching path or time.
5. Classify the boundary as host resource, mount/storage, Docker daemon, image/configuration, network/DNS, proxy/TLS, application, or dependency.

For permitted Compose checks, use [example-validation guidance](../homelab-stack-maintenance/references/example-validation.md) to distinguish public examples from live configuration and suppress value-bearing output. Inspect commands behind health checks and diagnostic helpers before running them. A validation helper may create a container, pull an image, mount private files, or reload monitoring. Do not execute those effects under diagnosis-only authority.

Prefer service-local probes and existing health checks. Avoid broad log dumps. Redact URLs containing credentials, authorization headers, cookies, tokens, private addresses when publication would expose topology, and environment values.

[...]

## Mutations

Before an authorized mutation, record the current generation, selected container metadata, permitted sanitized logs, configuration source identity, relevant mount/network roles, and image digest. Inspect resolved configuration only if permitted and keep value-bearing content out of shared output. Do not capture prohibited files as a rollback bundle. State the expected effect and rollback.

Treat preparation as a mutation when it creates files, synchronizes environment files, or creates networks, volumes, or directories. Never create a missing bind directory until the expected remote filesystem and mount source are verified. A local directory is not proof that storage is mounted.

Choose the narrowest action that matches the proven boundary. A restart tests transient state; recreation applies configuration; pulling changes software; migration changes data. Do not collapse them into one command. Never use `down -v`, prune, delete application data, or replace a database without explicit authorization and recovery proof.

For dependency or schema transitions, use [migration](../migration/SKILL.md). Before touching persistent data, use [backup-restore-verification](../backup-restore-verification/SKILL.md). After the action, replay the same path hop by hop and check restart counts and fresh logs.

## Report

Report the affected stack and service, observed path, failure boundary, decisive evidence, actions taken or proposed, rollback, and post-action verification. Separate confirmed cause from remaining hypotheses.
