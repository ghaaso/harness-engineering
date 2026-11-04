<!-- Trimmed from https://github.com/railwayapp/railway-skills @ 526e95524e964ed326689cbac4464d97a58ab81c plugins/railway/skills/use-railway/references/deploy.md (MIT): kept sections "Verify before reporting — `--detach` only means QUEUED" (L15-32), "Deployment history and logs" (L100-110), "Validated against" (L222-225); every deploy/redeploy/down/delete section dropped (FixFlow: production actions are [owner]; see SKILL.md "Where upstream disagrees"). Copyright (c) 2026 Railway Corporation; licence in ../LICENSE-railwayapp-railway-skills. -->
# Deploy (trimmed: read-only deployment status and history)

FixFlow note (added 2026-11-04, not upstream text): an agent never runs `railway up`, nor any
`railway` command against the production account; the commands below are run by the **owner**
([owner], production CLI) and the agent tabulates the pasted JSON using the status vocabulary
here. "Poll" / "retry" advice below is upstream's; in FixFlow a re-run of `railway up --ci` is a
double deploy (docs/HANDOFF-2026-07-28-open-work.md:64-66).

### Verify before reporting — `--detach` only means QUEUED

A detached `up` confirms upload, not a successful deployment. Capture the deployment ID from the upload (`--detach --json` includes `deploymentId` for an authenticated deployment). Poll for that deployment's terminal state; do not mistake a concurrent newer deployment for the one just submitted:

```bash
railway deployment list --service <service> --environment <environment> --json    # newest first; check .status
railway deployment list --project <project> --environment <environment> --service <service> --json
```

Poll with the same project, environment, and service scope used for `railway up`. If the deploy used URL-derived IDs or `--project`, do not rely on the directory's linked context.

- `QUEUED` / `INITIALIZING` / `WAITING` / `BUILDING` / `DEPLOYING` → still in progress. Keep polling (every 10-15s); tell the user "build in progress" if you report interim status.
- `NEEDS_APPROVAL` → waiting for manual approval. Report that approval is required; do not keep polling as if the deployment is still building.
- `SUCCESS` → now it's deployed; report it.
- `FAILED` / `CRASHED` → do not report success. Pull scoped logs (`railway logs --service <service> --json --lines 100`) and triage per [operate.md](operate.md).
- `SLEEPING` / `SKIPPED` / `REMOVED` / `REMOVING` / unknown → do not report success. Report the exact state and inspect status/logs to decide the next action.

Observe `SUCCESS` for the submitted deployment before claiming success. Exit 0 can mean upload returned early or watch patterns skipped the build. A timeout, ended stream, or transport error without a deployment verdict leaves the outcome unknown; poll the existing deployment before deciding whether a retry is necessary.

## Deployment history and logs

```bash
railway deployment list --service <service> --environment <environment> --limit 20 --json
railway deployment list --project <project> --environment <environment> --service <service> --limit 20 --json
railway logs --service <service> --lines 200 --json              # runtime logs
railway logs --service <service> --build --lines 200 --json      # build logs
railway logs --latest --lines 200 --json                         # latest deployment
```

In an interactive terminal, `railway logs` streams indefinitely when no bounding flags are given. Always use `--lines`, `--since`, or `--until` to get a bounded fetch for agent workflows.

## Validated against

- Docs: [up.md](https://docs.railway.com/cli/up), [deploying.md](https://docs.railway.com/cli/deploying), [deployment.md](https://docs.railway.com/cli/deployment), [redeploy.md](https://docs.railway.com/cli/redeploy), [service.md](https://docs.railway.com/cli/service), [down.md](https://docs.railway.com/cli/down), [railpack.md](https://docs.railway.com/builds/railpack), [monorepo.md](https://docs.railway.com/deployments/monorepo)
- CLI source: [up.rs](https://github.com/railwayapp/cli/blob/v5.49.1/src/commands/up.rs), [deployment.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/deployment.rs), [down.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/down.rs), [redeploy.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/redeploy.rs), [restart.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/restart.rs), [service.rs](https://github.com/railwayapp/cli/blob/v5.23.3/src/commands/service.rs)
