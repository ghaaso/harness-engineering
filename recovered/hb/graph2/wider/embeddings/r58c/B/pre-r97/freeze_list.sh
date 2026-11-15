#!/bin/sh
# END-ORDER step 3: print the code-freeze list (host, Git Bash; not hashed itself until listed). Four blocks:
#   1. `<sha256>  <path relative to the lane>` for every file a later step reads (no comment line in this block);
#   1b. `# test output`, then `<sha256>  <path relative to the lane>` for every file under train/report/ and
#      train/selectB-test/ at the freeze (*.part excluded): the test outputs there (report.py --test, selectB.py --test),
#      so it is plain which files there are test output (the coordinator, round 3); freeze_check checks them as block 1;
#   2. `# outside`, then `<sha256>  <absolute path>` for the files outside the lane;
#   3. `# images`, then `<image ID>  <tag>` for the CPU and the GPU image.
# usage: sh freeze_list.sh <STAGING MANIFEST> <GRAPHS MANIFEST> <TUNE STAGING MANIFEST>  > orchestrator/freeze-list.txt.part
#   (then mv to orchestrator/freeze-list.txt only on exit 0). The three manifests are step 2f's, lane-relative (the
#   held-out staging, the held-out graphs, and the tuning staging of ruling 94(b)); exit 2 when one is missing, 3 when an image ID is not the
#   expected one, 4 when a listed file is missing. The check is r58c/B/freeze_check.sh (prints nothing, exit 0).
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
PROTO=C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/protocol-addendum-8.md
CPU_ID=sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711
GPU_ID=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7
[ $# -eq 3 ] || { echo "usage: sh freeze_list.sh <STAGING MANIFEST> <GRAPHS MANIFEST> <TUNE STAGING MANIFEST>" >&2; exit 2; }
cd "$W" || exit 2
for m in "$1" "$2" "$3"; do [ -s "$m" ] || { echo "freeze_list: manifest $m missing or empty (step 2f)" >&2; exit 2; }; done
c=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 2>/dev/null | tr -d '\r'); g=$(docker image inspect -f '{{.Id}}' graphtest-kge-gpu:1 2>/dev/null | tr -d '\r')
[ "$c" = "$CPU_ID" ] && [ "$g" = "$GPU_ID" ] || { echo "freeze_list: image IDs $c / $g are not $CPU_ID / $GPU_ID" >&2; exit 3; }
# selected stage-A configs (train/stageA/top3.json): their meta.json and reps.pt
SEL=$(node -e "const t=require('./train/stageA/top3.json');for(const a of Object.keys(t).sort())for(const c of t[a].top3)for(const f of ['meta.json','reps.pt'])console.log('train/stageA/'+a+'/'+c.config_id+'/'+f)")
{
  ls train/*.py train/*.js train/*.sh 2>/dev/null
  echo train/HANDOFF-FORMAT.md train/stageA_configs.json train/stageB/plan.json train/stageA/top3.json train/stageA/refs.json | tr ' ' '\n'
  echo "$SEL"
  ls eval/evalcore.py eval/tune_tasks.jsonl eval/comparators/* export/*.py export/*.jsonl
  for f in assemble_checks.py end_of_run.sh guard-prelaunch.js guard-stageB.sh guard-stageB-r92.sh memgate.sh END-ORDER.md grader-interface-v2.md rerun_unit.py rerun_compare.py; do echo orchestrator/$f; done
  ls train/stageB/tables/*
  echo r58c/write_audit_claims.py r58c/B/rerun/rerun_check.py | tr ' ' '\n'
  ls train/r58/tests/*.py r58c/tests/*.py fixes/tests/test_select_report.py parallel/tests/test_assemble_checks.sh r58c/B/tests/* r58c/B/*.sh
  # end-order-changes-2 changes 1 and 8 (commands:F5, F6, rulings:F8): agent A's scripts and tests (precheck_handoff.py runs
  # after the freeze), the end_of_run test, both mount lists and their reader, and every stage-B part file
  ls r58c/A/*.py r58c/A/*.sh
  find r58c/B/eor -maxdepth 1 -type f
  echo r58c/B/mounts.js r58c/B/mounts-B.json r58c/A/mounts-A.json | tr ' ' '\n'
  find train/stageB/parts -type f ! -name '*.part'
  echo "$1"; echo "$2"; echo "$3"
} | tr -d '\r' | grep -v '^$' | sort -u > /tmp/freeze-files.$$
miss=$(while read -r f; do [ -f "$f" ] || echo "$f"; done < /tmp/freeze-files.$$)
[ -z "$miss" ] || { echo "freeze_list: listed files missing: $miss" >&2; rm -f /tmp/freeze-files.$$; exit 4; }
tr '\n' '\0' < /tmp/freeze-files.$$ | xargs -0 sha256sum | sed 's/ \*/  /'
rm -f /tmp/freeze-files.$$
echo "# test output"
for d in train/report train/selectB-test; do [ -d "$d" ] && find "$d" -type f ! -name '*.part'; done | tr -d '\r' | sort | while read -r f; do sha256sum "$f" | sed 's/ \*/  /'; done
echo "# outside"
for f in "$GB/results/frozen/relational/95e990307da3b42b.json" "$GB/tasks/tasks.jsonl" "$GB"/arms/common/*.js "$PROTO"; do
  [ -f "$f" ] || { echo "freeze_list: outside file $f missing" >&2; exit 4; }
  sha256sum "$f" | sed 's/ \*/  /'
done
echo "# images"
echo "$CPU_ID  graphtest-kge:1"
echo "$GPU_ID  graphtest-kge-gpu:1"
