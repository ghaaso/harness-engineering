#!/bin/bash
# Re-audit 3, check 1: throw-away copy of the harness under /tmp/fake (container filesystem); runs
# r2/locktest2.js (unchanged, output to r3/) and r3/locktest3_extra.js. The real results/ is untouched.
set -e
rm -rf /tmp/fake && mkdir -p /tmp/fake/results/heldout
cp -r /build/arms /tmp/fake/arms
cp -r /build/results/frozen /tmp/fake/results/frozen
cp -r /build/tasks /tmp/fake/tasks
export GT_FACTS_CACHE=/build/facts/cache GT_STORE=/tmp/fstore GT_SRCSTORE=/tmp/fstore/src GT_TMP=/tmp/gt
mkdir -p /tmp/gt /tmp/fstore
echo "real heldout before:"; find /build/results/heldout | sort
node /build/audit/preflight/r2/locktest2.js /tmp/fake /build/results/frozen/PLAN.json /build/audit/preflight/r3/locktest2_r3.json
node /build/audit/preflight/r3/locktest3_extra.js /tmp/fake /build/audit/preflight/r3/locktest3_extra.json
echo "real heldout after:"; find /build/results/heldout | sort
