#!/bin/sh
# Coordinator's driver for ONE real grading (END-ORDER step 5: tune; step 8: heldout). It checks the hand-off's hash
# and the grader's frozen file list, takes the lane lock, runs the grader once, and frees the lock.
# usage: sh grade_real.sh tune    <ktest-G name> <HANDOFF.json sha256>
#        sh grade_real.sh heldout <ktest-G name> <HANDOFF.json sha256> <item27 record sha256>
# Run it with ONE redirect for all output. It never opens a reference; the grader's per-task work stays in its folder.
# A REAL held-out grading can be started once: the grader writes its STARTED marker before its format checks, so this
# driver refuses to run when a held-out return or the marker already exists.
LANE=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
LW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
G=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/sealed/grader/embeddings
GRADER_FILES=ea50bfbdd43c896953316f3987556b836a61256357c7d0dcb3330f23620e94bc
MODE=$1; NAME=$2; H=$3; F=$4
say() { echo "$(date -u +%FT%TZ) $*"; }
die() { say "STOP: $*"; exit 1; }
case "$MODE" in
  tune) HO=train/report/answer_level/handoff; RETS="tune-rank.json tune-item24.json"; [ -z "$F" ] || die "tune takes no record hash" ;;
  heldout) HO=train/heldout; RETS="heldout.json"; echo "$F" | grep -Eq '^[0-9a-f]{64}$' || die "heldout needs the item27 record's sha256" ;;
  *) die "usage: grade_real.sh tune|heldout <ktest-G name> <HANDOFF sha256> [<record sha256>]" ;;
esac
echo "$H" | grep -Eq '^[0-9a-f]{64}$' || die "the hand-off hash is not 64 hex"
case "$NAME" in ktest-G[0-9]*) ;; *) die "the name must be ktest-G<N>" ;; esac
[ -e "$G/logs/$NAME.log" ] && die "the grader log $NAME.log exists already"
[ "$(sha256sum "$LANE/$HO/HANDOFF.json" 2>/dev/null | cut -c1-64)" = "$H" ] || die "$HO/HANDOFF.json is not $H"
[ "$(sha256sum "$G/HASHES.txt" | cut -c1-64)" = "$GRADER_FILES" ] || die "the grader's file list is not the frozen one"
if [ "$MODE" = heldout ]; then
  [ "$(sha256sum "$LANE/train/heldout/item27.json" | cut -c1-64)" = "$F" ] || die "train/heldout/item27.json is not $F"
  [ -e "$LANE/grader-returns/heldout.json" ] && die "a held-out return exists already"
  [ -e "$G/work/heldout/STARTED.json" ] && die "the grader's held-out marker exists already (a held-out grading was started before)"
fi
for r in $RETS; do [ -e "$LANE/grader-returns/$r" ] && die "the return $r exists already"; done
[ -z "$(docker ps --format '{{.Names}}' | grep -E '^(ktest|kge)-')" ] || die "a ktest or kge container runs"
mkdir "$LANE/r58c/ktest.lock" 2>/dev/null || die "the lane lock is held"
trap 'rm -f "$LANE/orchestrator/grader-running.txt"; rmdir "$LANE/r58c/ktest.lock" 2>/dev/null; echo "$(date -u +%FT%TZ) lock freed"' EXIT
echo "the coordinator holds r58c/ktest.lock for the real $MODE grading since $(date -u +%FT%TZ) ($NAME)" > "$LANE/orchestrator/grader-running.txt"
say "lock taken; grading $NAME: real $MODE on $HO (hand-off $H${F:+, record $F})"
cd "$G" || die "no grader folder"
if [ "$MODE" = heldout ]; then sh run.sh "$NAME" "$LW/$HO" python grade.py heldout --handoff /handoff --handoff-sha256 "$H" --freeze-sha256 "$F"
else sh run.sh "$NAME" "$LW/$HO" python grade.py tune --handoff /handoff --handoff-sha256 "$H"; fi
last=$(tail -n 1 "$G/logs/$NAME.log" 2>/dev/null | tr -d '\r')
say "$NAME: last line of its log: $last"
[ "$last" = "exit 0" ] || die "$NAME did not end with exit 0"
for r in $RETS; do [ -s "$LANE/grader-returns/$r" ] || die "the return $r is missing"; say "return $r sha256 $(sha256sum "$LANE/grader-returns/$r" | cut -c1-64)"; done
say "DONE: real $MODE grading ended with exit 0"
exit 0
