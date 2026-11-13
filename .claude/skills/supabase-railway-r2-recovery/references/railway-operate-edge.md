<!-- Trimmed from https://github.com/railwayapp/railway-skills @ 526e95524e964ed326689cbac4464d97a58ab81c plugins/railway/skills/use-railway/references/operate.md (MIT): kept sections "Health snapshot" (L5-28), "HTTP logs" (L67-78), "Networking failures" (L221-236), "Validated against" (L292-296); "Recovery" (redeploy / variable set), metrics, SSH, database inspection, CDN/WAF changes dropped. Copyright (c) 2026 Railway Corporation; licence in ../LICENSE-railwayapp-railway-skills. -->
# Operate (trimmed: read-only health, HTTP logs, domain status)

FixFlow note (added 2026-11-04, not upstream text): every `railway` command here is run by the
**owner** against the production account ([owner], production CLI); the agent tabulates the
pasted JSON. None of these sections documents the edge body `"Application not found"`; see
SKILL.md "Edge-404 semantics" for what is known and what is only observed.

## Health snapshot

Start broad, then narrow:

```bash
railway status --json                                    # linked context
railway status --project <project> --environment <env> --json
railway service list --json                              # services in current environment
railway deployment list --limit 10 --json                # recent deployments
railway deployment list --project <project> --environment <env> --service <service> --limit 10 --json
```

Use explicit `--project`, `--environment`, and `--service` when the user provided a URL or when the current directory may be linked to a different project.

Deployment statuses include `SUCCESS`, `QUEUED`, `INITIALIZING`, `WAITING`, `BUILDING`, `DEPLOYING`, `NEEDS_APPROVAL`, `FAILED`, `CRASHED`, `SLEEPING`, `SKIPPED`, `REMOVING`, and `REMOVED`.

For projects with buckets, include bucket status:

```bash
railway bucket list --json                                       # buckets in current environment
railway bucket info --bucket <name> --json                       # storage size, object count, region
```

If everything looks healthy, return a summary and stop. If something is degraded or failing, continue to log inspection.

### HTTP logs

Use HTTP logs when a service responds with errors, latency spikes, or routing problems:

```bash
railway logs --service <service> --http --status ">=400" --lines 100 --json
railway logs --service <service> --http --method POST --path /api/users --lines 100 --json
railway logs --service <service> --http --request-id <request-id> --lines 20 --json
railway logs --service <service> --http --filter "@totalDuration:>=1000" --lines 100 --json
```

HTTP filter fields include `@method`, `@path`, `@host`, `@requestId`, `@srcIp`, `@edgeRegion`, `@httpStatus`, `@totalDuration`, `@responseTime`, `@txBytes`, and `@rxBytes`.

### Networking failures

Domain returns errors, or service-to-service calls fail:

```bash
railway domain list --service <service> --json
railway domain status <domain> --service <service> --json
railway private-network status --service <service> --json
railway tcp-proxy list --service <service> --json
railway outbound-network status --service <service> --json
railway logs --service <service> --http --status ">=400" --lines 100 --json
railway logs --service <service> --network --status dropped --lines 100 --json
```

Check: target port matches what the service listens on, domain status is healthy, private domain variable references are correct, TCP proxy status is active, and outbound networking changes have been followed by the required redeploy.

## Validated against

- Docs: [status.md](https://docs.railway.com/cli/status), [service.md](https://docs.railway.com/cli/service), [logs.md](https://docs.railway.com/cli/logs), [metrics.md](https://docs.railway.com/cli/metrics), [ssh.md](https://docs.railway.com/cli/ssh), [cdn.md](https://docs.railway.com/cli/cdn), [waf.md](https://docs.railway.com/cli/waf), [observability/logs.md](https://docs.railway.com/observability/logs), [observability/metrics.md](https://docs.railway.com/observability/metrics), [observability/tracing.md](https://docs.railway.com/observability/tracing)
- CLI source: [status.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/status.rs), [service.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/service.rs), [logs.rs](https://github.com/railwayapp/cli/blob/v5.49.1/src/commands/logs.rs), [metrics.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/metrics.rs), [ssh/mod.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/ssh/mod.rs), [deployment.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/deployment.rs), [redeploy.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/redeploy.rs), [cdn.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/cdn.rs), [waf.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/waf.rs)
- Authentication and CI recovery (v5.49.1): [client.rs](https://github.com/railwayapp/cli/blob/v5.49.1/src/client.rs), [up.rs](https://github.com/railwayapp/cli/blob/v5.49.1/src/commands/up.rs)
