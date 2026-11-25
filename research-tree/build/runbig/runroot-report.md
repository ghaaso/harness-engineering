# Run root set-up (node 3)

Root: C:/Users/User/Documents/projects/research-runs/pilot-2026-11/ (plan/ kept as it was; it is in the first commit).
Created: run/, wt/, completeness/model/result.json, tcb/ (git archive of research-tree/tcb at build de7ea70e from hb), .claude/settings.json (tier hook, ensure-tier-hook.sh --force, exit 0), git init. First commit d5b7612.
Pin: de7ea70ea4ea5684eeab59c62baaf5ac31b37d1a.

Model file: {"result":"pass","sha":"a1a46e4e239f33407a224bfa52e5f2ebc474aee6", plus source and pin notes}. The sha is hb's commit holding the slice-2 verdict and FX-W6 reruns (research-tree/model/results-build). Caveat: S2.4's VERDICT.md first line is SEND BACK (FX-W6); fx-w6 reruns and reports/fx-w6.md say the age-cap check then holds. "pass" is as the plan says.

Check: `node tcb/gate.mjs check --root <root> --ce 1 --dry-run` stops at exit 2 no-coordinator (needs run/coord.json, tasks.json), before the model step. So gate's model read was run directly: lib.readJson gives result pass, sha string, i.e. model=pass. Tier hook present: tcb/tier-hook.mjs, tier-routes.json, .claude/settings.json.
