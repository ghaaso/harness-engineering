#!/bin/bash
# Re-audit 2, check 1: build a throw-away copy of the harness (arms/, results/frozen/, tasks/) under
# /tmp/fake on the container filesystem and run locktest2.js against it. The real results/ is untouched.
set -e
rm -rf /tmp/fake && mkdir -p /tmp/fake/results/heldout
cp -r /build/arms /tmp/fake/arms
cp -r /build/results/frozen /tmp/fake/results/frozen
cp -r /build/tasks /tmp/fake/tasks
export GT_FACTS_CACHE=/build/facts/cache GT_STORE=/tmp/fstore GT_SRCSTORE=/tmp/fstore/src GT_TMP=/tmp/gt
mkdir -p /tmp/gt /tmp/fstore
node /build/audit/preflight/r2/locktest2.js /tmp/fake /build/results/frozen/PLAN.json /build/audit/preflight/r2/locktest2.json
echo "heldout dir of the real build:"; ls -la /build/results/heldout
