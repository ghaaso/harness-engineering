# Verified local workflow commands

Implementation date: 1 October 2026. Entry point: [coding_workflow.py](../../tools/coding_workflow.py). Environment and actual results are linked from [WF-01](../tasks/workflow-implementation/task.md); no application check command or remote CI is established.

Use an explicit Python 3.10+ interpreter from the complete project root. No external packages, credentials, paid model calls or network access are required. `--root` before the subcommand selects a complete copied project. Exit 0 means the scoped command succeeded; 2 means failed checks or invalid inputs. See the [operating guide](workflow-implementation.md) for PowerShell examples.

| Command after `tools/coding_workflow.py` | Scope and success criterion | Effects | Limits |
| --- | --- | --- | --- |
| `doctor` | Required entry/source/schema files present; actual interpreter is Python 3.10+. | Read-only; prints environment JSON. | Does not inspect installed application services, package pins, databases or full document meaning. |
| `verify [--output <new.json>]` | Root/docs/archive Markdown file links and code fences; docs/provenance JSON; two provenance PDF hashes; selected instruction-presence contracts; nonempty workflow behavior suite succeeds. | Runs local subprocess tests; disposable temporary fixtures and Python bytecode caches; optional new evidence JSON. | Does not check heading anchors, external URLs, output Markdown, all source archives, semantic contradictions, application T tests or agent compliance. |
| `checkpoint --task <task.md> --packet <context.md> --source <dependency> ... --output <new.json>` | Canonical task has status/next action; task, packet and at least one distinct relevant source exist; captures their byte hashes. | Creates new JSON evidence only under `docs/tasks/` or `output/coding-workflow/`; never overwrites. | Caller selects dependency completeness. Snapshot is a projection, not authority or completion. |
| `resume <checkpoint.json>` | Every declared task/packet/source still exists and has the captured hash. | Read-only. | Relevant changes require inspection/refresh/new checkpoint. Unchanged or unrelated bytes do not establish truth, acceptance or complete coverage. |
| `validate-run <record.json>` | Record matches the local schema's supported types/fields and implemented accounting/acceptance invariants. | Read-only. | Does not validate underlying evidence, external prices, reviewer independence, model telemetry or actual acceptance. This is a narrow validator for this fixed schema, not a general JSON Schema engine. |
| `pilot --output <new.json>` | Six synthetic fact oracles, deliberate missing-fact negatives, actual fresh-process deliveries and relevant-source freshness checks pass. | Local reader subprocesses, disposable fixtures, new evidence JSON. | No LLM calls, human productivity, independent review, clinic transactions or application benchmark. |

## Git foundations

Implemented in [WF-02](../tasks/workflow-rollout/task.md): local Git baseline, ignore policy and [pre-commit hook](../../tools/git-hooks/pre-commit). The hook consumes `WORKFLOW_PYTHON` or local `clinicWorkflow.python` as an actual interpreter path and invokes the same workflow `verify` command. Configure it per checkout; Git does not propagate local configuration or automatically install a hook on clone.

```powershell
git config --local core.hooksPath tools/git-hooks
git config --local clinicWorkflow.python 'C:/path/to/python.exe'
python tools/verify_git_foundations.py --git 'C:/path/to/git.exe' --output output/coding-workflow/new-run/git-checks.json
```

Choose real executable paths on that machine. [verify_git_foundations.py](../../tools/verify_git_foundations.py) requires a committed local HEAD and checks that commit in a disposable clone. It runs doctor/verify, compares all tracked checkout bytes to Git blobs, makes one valid synthetic commit, attempts broken-link/missing-or-invalid-interpreter commits, and verifies secret/cache/temporary exclusions plus retained source/example paths. It never contacts an external remote; the temporary clone's local origin is removed. Validated temporary scope is cleaned up; only a new evidence JSON remains in the selected project. This uses Git and Python on the same machine, not another maintainer/machine or a remote CI run.

The hook verifies the working tree, so unstaged defects can block a commit. It is local, bypassable with Git's ordinary mechanisms and not a staged-only semantic review. Remote CI remains conditional on a chosen provider/repository; none is selected or published here. Workflow evidence/source documents stay tracked; separately owned learning outputs and temporary trial copies remain ignored without deleting them.

Outputs are immutable by convention and exclusive-create behavior. Use a new name for each run; preserve failed results. The tool constrains supplied paths to the selected root and rejects output elsewhere. It is a maintainer utility within a trusted checkout, not a sandbox for hostile files/processes.

## Application checks

Since 3 November 2026 the application has its own check command, separate from the workflow `verify` above and not run by the pre-commit hook: `uv run --locked python scripts/check.py` (ruff lint and format, mypy strict, Django checks, migrations complete, PostgreSQL 17 role probe, pytest in two passes, a parallel one (pytest-xdist, 6 workers by default, one test database per worker) and a single-process one for the tests marked `serial`, proving every test ran exactly once, with skipped, xfailed or xpassed tests counted as failure; a full run takes about five minutes on the owner's PC; the test step takes a machine-wide file lock in the repository's common git directory, shared by all worktrees of the repository (at most two full test runs at a time on the machine and one per checkout, bounded wait of 45 minutes, `CLINIC_CHECK_NO_LOCK=1` to skip it and be told so in the summary; the pytest processes die with the check on Windows; a second slot only while 8 GiB of memory is available; with `CLINIC_CHECK_MODE=container` the same seven steps run in a Linux container on a verified copy of the working tree beside the database container, an optional mode, the native mode staying the gate) and uses at most 6 workers or half the logical processors); see the [development guide](../application/development-guide.md) and the [S00 record](../tasks/s00-baseline/task.md). Concurrency, authorization, restore/load checks and CI remain unimplemented. Add actual commands, effects, prerequisites and saved successful/failure evidence during the relevant S00-S12 work. Never substitute the local workflow suite for T01-T20, a restore test, a second-maintainer run or deployment approval.
