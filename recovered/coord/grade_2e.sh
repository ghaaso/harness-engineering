#!/bin/sh
# Coordinator's driver for the formal 2e gradings (grader test mode). It takes the lane lock, moves old test returns
# aside, grades the late-50 TEST tuning hand-off, compares its ranks with the lane's test report to 1e-9, moves the
# late-50 returns to the grader's side, then grades the pick8 tuning and held-out TEST hand-offs, and frees the lock.
# It stops at the first failure. Run it with ONE redirect for all output (no appends in loops on this machine).
LANE=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
LW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
G=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/sealed/grader/embeddings
H_L50=4241265506a3b83dd858c4439e513ba05dcc762333e415bc88397e1da0b825ae
H_TUNE=7bca40b08659fb407e60001dcb0c31ab4ecad64a5fd71f17e94b63dd646225ca
H_HO=eb179ca21c878cd0789573807817991ae0c5678408b67d86d87c08a668d1c206
F_REC=9e6be7a73f014ab8ae79c626602fa9fe5ed1e2e4b758aed0296c06b5f42ec762
N1=${1:-ktest-G93}; N2=${2:-ktest-G94}; N3=${3:-ktest-G95}
stamp=$(date -u +%Y%m%dT%H%M%SZ)
say() { echo "$(date -u +%FT%TZ) $*"; }
die() { say "STOP: $*"; exit 1; }
hof() { sha256sum "$LANE/$1/HANDOFF.json" | cut -c1-64; }
[ "$(hof r58c/handoff-test/tune-late50)" = "$H_L50" ] || die "the late-50 hand-off is not $H_L50"
[ "$(hof r58c/handoff-test/tune)" = "$H_TUNE" ] || die "the pick8 tuning hand-off is not $H_TUNE"
[ "$(hof r58c/handoff-test/heldout)" = "$H_HO" ] || die "the pick8 held-out hand-off is not $H_HO"
[ "$(sha256sum $LANE/r58c/A/out/ho_rec/item27.json | cut -c1-64)" = "$F_REC" ] || die "the TEST record is not $F_REC"
[ "$(sha256sum $G/HASHES.txt | cut -c1-64)" = "ea50bfbdd43c896953316f3987556b836a61256357c7d0dcb3330f23620e94bc" ] || die "the grader's file list changed"
for n in $N1 $N2 $N3; do [ -e "$G/logs/$n.log" ] && die "the grader log $n.log exists already"; done
[ -z "$(docker ps --format '{{.Names}}' | grep -E '^(ktest|kge)-')" ] || die "a ktest or kge container runs"
mkdir "$LANE/r58c/ktest.lock" 2>/dev/null || die "the lane lock is held"
trap 'rm -f "$LANE/orchestrator/grader-running.txt"; rmdir "$LANE/r58c/ktest.lock" 2>/dev/null; echo "$(date -u +%FT%TZ) lock freed"' EXIT
echo "the coordinator holds r58c/ktest.lock for the 2e gradings since $(date -u +%FT%TZ) ($N1 $N2 $N3)" > "$LANE/orchestrator/grader-running.txt"
say "lock taken; grader-running.txt written"
if [ -d "$LANE/grader-returns/test" ] && [ -n "$(ls -A "$LANE/grader-returns/test")" ]; then
  mv "$LANE/grader-returns/test" "$LANE/grader-returns/test.old-$stamp" || die "could not move the old test returns aside"
  say "old test returns moved to grader-returns/test.old-$stamp: $(ls "$LANE/grader-returns/test.old-$stamp" | tr '\n' ' ')"
fi
mkdir -p "$LANE/grader-returns/test"
grade() {  # grade <name> <lane-relative hand-off folder> <mode> <hash> [freeze]
  cd "$G" || die "no grader folder"
  say "grading $1: $3 on $2"
  if [ -n "$5" ]; then sh run.sh "$1" "$LW/$2" python grade.py "$3" --handoff /handoff --handoff-sha256 "$4" --freeze-sha256 "$5"
  else sh run.sh "$1" "$LW/$2" python grade.py "$3" --handoff /handoff --handoff-sha256 "$4"; fi
  last=$(tail -n 1 "$G/logs/$1.log" 2>/dev/null | tr -d '\r')
  say "$1: last line of its log: $last"
  [ "$last" = "exit 0" ] || die "$1 did not end with exit 0"
}
ret() { for f in "$@"; do [ -s "$LANE/grader-returns/test/$f" ] || die "the return $f is missing"; say "return $f sha256 $(sha256sum "$LANE/grader-returns/test/$f" | cut -c1-64)"; done; }
# 1 the late-50 TEST tuning hand-off, and the coordinator's 1e-9 check against the lane's test report
grade "$N1" r58c/handoff-test/tune-late50 tune-test "$H_L50"
ret tune-rank.json tune-item24.json
say "tune_rank_check (late 50): the grader's ranks against train/report/test.json (sha256 $(sha256sum $LANE/train/report/test.json | cut -c1-64))"
node "$LANE/orchestrator/tune_rank_check.js" "$LANE/r58c/handoff-test/tune-late50/HANDOFF.json" "$LANE/grader-returns/test/tune-rank.json" "$LANE/train/report/test.json"; trc=$?
say "tune_rank_check exit $trc"
mkdir -p "$G/coordinator/late50-rehearsal-$stamp"
mv "$LANE/grader-returns/test/tune-rank.json" "$G/coordinator/late50-rehearsal-$stamp/tune-rank.late50.json" && mv "$LANE/grader-returns/test/tune-item24.json" "$G/coordinator/late50-rehearsal-$stamp/tune-item24.late50.json" || die "could not move the late-50 returns to the grader's side"
say "late-50 returns moved to the grader's side: coordinator/late50-rehearsal-$stamp ($(ls "$G/coordinator/late50-rehearsal-$stamp" | tr '\n' ' '))"
[ "$trc" = 0 ] || die "tune_rank_check found a difference (exit $trc)"
[ -z "$(ls -A "$LANE/grader-returns/test")" ] || die "grader-returns/test is not empty after the move"
# 2 the pick8 TEST tuning hand-off
grade "$N2" r58c/handoff-test/tune tune-test "$H_TUNE"
ret tune-rank.json tune-item24.json
# 3 the pick8 TEST held-out hand-off
grade "$N3" r58c/handoff-test/heldout heldout-test "$H_HO" "$F_REC"
ret heldout.json
say "DONE: three gradings ended with exit 0; grader-returns/test holds: $(ls "$LANE/grader-returns/test" | tr '\n' ' ')"
exit 0
