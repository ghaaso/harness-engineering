#!/bin/bash
# Grader re-freeze after pre-flight fix round 1 (protocol addendum 4 sections A and B; same 13 records
# and 4 question-code records as freeze.sh, with the current code and deps hashes). The old records move
# to results/frozen/_replaced/. Run inside graphtest:1 through sealed/grader/dkf.sh:
#   bash sealed/grader/dkf.sh "bash /build/tmp/grader/freeze2.sh"
# Each command stops the script on failure (set -e).
set -e
cd /build
R="pre-flight fix round 1 (2026-11-13): arms/common changed (tqtarget.js added; facts.js, source.js, harness.js, run.js changed) and the four tq.js use the shared target parser, so code and deps hashes changed; same configuration and role, addendum 4 items 4 and 5; no held-out run yet"
f() { echo "== freeze $*"; node arms/common/run.js freeze "$@" --refreeze --reason "$R"; }
f --arm relational --config 95e990307da3b42b --role primary
f --arm ladybug    --config 95e990307da3b42b --role primary
f --arm duckpgq    --config 95e990307da3b42b --role primary
f --arm search     --config e70177e5807f0252 --role primary
f --arm floor-dir  --config 714a474060653c1f --role primary
f --arm floor-co   --config c4d2f0a60a3d199c --role primary
f --arm relational --config 6b70cc1222745385 --role s1
f --arm ladybug    --config 6b70cc1222745385 --role s1
f --arm duckpgq    --config 6b70cc1222745385 --role s1
f --arm ladybug    --config f233ae069bdba0ce --role s2
f --arm search     --config 950c029615d337c1 --role s2
f --arm reference  --config 95e990307da3b42b --role crosscheck
f --arm reference  --config 6b70cc1222745385 --role crosscheck
for a in relational ladybug duckpgq search; do echo "== freeze-tq $a"; node arms/common/run.js freeze-tq --arm $a --refreeze --reason "$R"; done
echo "== done"
