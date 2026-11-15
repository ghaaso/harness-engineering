#!/bin/bash
# Re-audit 2: (1) the 7 probe questions (not held-out) through the four arms' tq(); (2) every lock_check
# command of results/frozen/PLAN.json on the REAL tree (lock-check reads no task or question and writes
# nothing); results/heldout is listed before and after to show it stayed empty.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt LB_PRIORS_DIR=/store/lbpriors
mkdir -p /tmp/gt; cd /build
R=/build/audit/preflight/r2
node $R/probe_run.js /build/tmp/lock/preflight1/probe_questions.jsonl $R/probe_run.json 2>&1 | tail -9
echo "heldout before: $(find results/heldout -type f | wc -l) files"
node -e "const p=require('/build/results/frozen/PLAN.json');for(const r of [...p.runs,...p.question_runs])console.log(r.n+'\t'+r.lock_check)" > /tmp/lc.txt
ok=0; bad=0
while IFS=$'\t' read -r n cmd; do
  last=$(bash -c "$cmd" 2>&1 | tail -1)
  if [ "$last" = "allowed" ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "NOT ALLOWED $n: $last"; fi
done < /tmp/lc.txt
echo "real-tree lock-check: allowed $ok, not allowed $bad"
echo "heldout after: $(find results/heldout -type f | wc -l) files"
