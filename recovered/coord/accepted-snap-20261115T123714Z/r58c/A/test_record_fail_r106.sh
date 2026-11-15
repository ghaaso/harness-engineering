#!/bin/sh
# Agent A, C54 (end-order-changes-5 10a0e2e3, ruling 106(d)): host test of train/heldout.sh with a stub docker whose
# `inspect` fails. No container, no real docker call. The launcher's helpers (running() .. card_ok, before the line
# 'say "launch requested') and its launch tail (from 'if ! card_ok; then' to the end) are cut out into a scratch lane
# with a stub memgate (never low) and sleep 30 cut to 0; NAME, IMG, CMD, RC, LOG and WB are set as the launcher sets them.
# The stub docker: run -d starts the named container (the main one "runs" for LIVE ps polls, then writes rc 0 to $RC
# and ends; MODE=fast: it has ended before anything else, rc 8); inspect fails as FAIL says (card: the card check's,
# main: the main container's, main2: the main container's first two tries); stop ends it; wait answers 0.
#   card <N>  FAIL=card  -> current: card_ok fails, exit 7, the card check removed, NO main container started
#                           before (r58c/A/pre-r106/heldout.sh): the main container started (fail before)
#   main <N>  FAIL=main  -> current: 3 tries, the running container stopped at once, exit 3 "rerun to resume", no
#                           "finished" line; before: it ran to its end, "finished ... rc=0", then exit 3 (fail before)
#   for each of kge-H1, kge-H1P (PROBE=1) and kge-H1R (REHEARSAL=E4)
#   fast      MODE=fast FAIL=main (kge-H1): the container ended by itself before its record -> reported as now (exit 3,
#             "the leak audit will fail on it", no stop), current and before alike
#   retry     FAIL=main2 (kge-H1): current: the third try saves the record and the run ends rc 0, exit 0; before: exit 3
#   ok        no failure (kge-H1): exit 0, a record of the card check and of the container, current and before
# Scratch r58c/A/out/trf, removed at the end.  usage (Git Bash): sh r58c/A/test_record_fail_r106.sh -> RESULT PASS|FAIL record-fail
WB0=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
cd "$WB0" || exit 2
A=$WB0/r58c/A; T=$A/out/trf; rm -rf $T; mkdir -p $T/bin
NEW=train/heldout.sh; OLD=r58c/A/pre-r106/heldout.sh
for f in $NEW $OLD r58c/A/test_record_fail_r106.sh; do echo "sha256 $(sha256sum $f | cut -c1-64) $f"; done
cat > $T/bin/docker <<'EOF'
#!/bin/sh
c=$TL; echo "$*" >> $c/calls
case "$1" in
  run) n=$(echo "$*" | grep -o -- '--name [^ ]*' | cut -d' ' -f2); echo "$n" >> $c/started
       case $n in *c) ;; *) if [ "$MODE" = fast ]; then echo 8 > "$RCF"; else echo "$n 0" > $c/live; fi ;; esac ;;
  ps) if [ -f $c/live ]; then set -- $(cat $c/live); k=$(($2+1))
        if [ $k -le ${LIVE:-4} ]; then echo "$1 $k" > $c/live; echo "$1"; else rm -f $c/live; echo 0 > "$RCF"; fi; fi ;;
  inspect) k=$(( $(cat $c/tries.$2 2>/dev/null || echo 0) + 1 )); echo $k > $c/tries.$2
       case "$FAIL:$2" in card:*c) exit 1 ;; main:*c) ;; main:*) exit 1 ;; main2:*c) ;; main2:*) [ $k -le 2 ] && exit 1 ;; esac
       echo "[{\"Name\": \"/$2\", \"Mounts\": []}]" ;;
  stop) rm -f $c/live; echo "stopped $2" >> $c/started ;;
  wait) echo 0 ;;
esac
exit 0
EOF
chmod +x $T/bin/docker
# run <launcher> <case dir> <NAME> env... -> prints the exit code; the lane is left at $T/<case dir>
run() {
  src=$1; L=$T/$2; N=$3; shift 3; mkdir -p $L/orchestrator
  printf '#!/bin/sh\nexit 1\n' > $L/orchestrator/memgate.sh
  { echo 'say() { mkdir -p "$WB/heldout-launch"; echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }'
    sed -n '/^running() {/,/^say "launch requested/p' $src | sed '$d'
    sed -n '/^if ! card_ok; then/,$p' $src | sed 's/sleep 30/sleep 0/g'; } > $L/run.sh
  case $N in kge-H1) R=$L/train/heldout/heldout.rc ;; kge-H1P) R=$L/train/probe/probe.rc ;; kge-H1R) R=$L/r58c/rehearsal/E4/heldout.rc ;; esac
  mkdir -p $(dirname $R)
  (cd $L && env "$@" TL=$L RCF=$R WB=$L NAME=$N IMG=sha256:fake CFLAGS= RC=$R LOG=$L/launch.log H1_CAP=4g \
     CMD="docker run -d --rm --name $N sha256:fake" PATH="$T/bin:$PATH" sh run.sh > $L/out 2>&1); echo $?; }
said() { grep -c -- "$2" $T/$1/launch.log 2>/dev/null; }
started() { tr '\n' ',' < $T/$1/started 2>/dev/null; }
ok=1; before=1
want() { if [ "$2" = "$3" ]; then echo "  ok   $1: $2"; else echo "  FAIL $1: got [$2], want [$3]"; ok=0; fi; }
fb() { if [ "$2" = "$3" ]; then echo "  fail before, $1: $2"; else echo "  UNEXPECTED before, $1: got [$2], want [$3]"; before=0; fi; }
for N in kge-H1 kge-H1P kge-H1R; do
  case $N in kge-H1) E=X=1 ;; kge-H1P) E=PROBE=1 ;; kge-H1R) E=REHEARSAL=E4 ;; esac
  echo "$N:"
  r=$(run $NEW card-$N $N $E FAIL=card)
  want "card, current" "exit $r; started ${N}c only: $(started card-$N); tries $(cat $T/card-$N/tries.${N}c); 'nothing is launched' x$(said card-$N 'nothing is launched'); refusal x$(said card-$N 'refusing: the card is not available'); card removed x$(grep -c "^rm -f ${N}c" $T/card-$N/calls)" \
       "exit 7; started ${N}c only: ${N}c,; tries 3; 'nothing is launched' x1; refusal x1; card removed x2"
  r=$(run $OLD card0-$N $N $E FAIL=card)
  fb "card" "exit $r; started $(started card0-$N)" "exit 0; started ${N}c,$N,"
  r=$(run $NEW main-$N $N $E FAIL=main)
  want "main, current" "exit $r; tries $(cat $T/main-$N/tries.$N); stopped x$(grep -c "^stopped $N" $T/main-$N/started); 'rerun to resume' x$(said main-$N 'mount record could not be saved (ruling 106(d)); rerun to resume'); finished x$(said main-$N "finished $N"); rc file $(ls $T/main-$N/train/heldout/heldout.rc $T/main-$N/train/probe/probe.rc $T/main-$N/r58c/rehearsal/E4/heldout.rc 2>/dev/null | wc -l)" \
       "exit 3; tries 3; stopped x1; 'rerun to resume' x1; finished x0; rc file 0"
  r=$(run $OLD main0-$N $N $E FAIL=main)
  fb "main" "exit $r; stopped x$(grep -c "^stopped" $T/main0-$N/started); finished rc=0 x$(said main0-$N "finished $N rc=0"); 'leak audit will fail' x$(said main0-$N 'the leak audit will fail on it')" \
     "exit 3; stopped x0; finished rc=0 x1; 'leak audit will fail' x1"
done
echo "kge-H1, the other cases:"
for b in NEW OLD; do eval src=\$$b
  r=$(run $src fast-$b kge-H1 X=1 MODE=fast FAIL=main)
  want "fast ($b)" "exit $r; stopped x$(grep -c '^stopped' $T/fast-$b/started); finished rc=8 x$(said fast-$b 'finished kge-H1 rc=8'); 'leak audit will fail' x$(said fast-$b 'the leak audit will fail on it')" \
       "exit 3; stopped x0; finished rc=8 x1; 'leak audit will fail' x1"
  r=$(run $src ok-$b kge-H1 X=1)
  want "ok ($b)" "exit $r; records $(ls $T/ok-$b/r58c/mounts | tr '\n' ' ')" "exit 0; records kge-H1.json kge-H1c.json "
done
r=$(run $NEW retry kge-H1 X=1 FAIL=main2)
want "retry, current" "exit $r; tries $(cat $T/retry/tries.kge-H1); record $(ls $T/retry/r58c/mounts/kge-H1.json 2>/dev/null | wc -l); finished rc=0 x$(said retry 'finished kge-H1 rc=0')" "exit 0; tries 3; record 1; finished rc=0 x1"
r=$(run $OLD retry0 kge-H1 X=1 FAIL=main2)
fb "retry" "exit $r; tries $(cat $T/retry0/tries.kge-H1); record $(ls $T/retry0/r58c/mounts/kge-H1.json 2>/dev/null | wc -l)" "exit 3; tries 1; record 0"
for i in 1 2 3 4 5 6; do rm -rf $T 2>/dev/null && break; sleep 2; done
[ $before = 1 ] && echo "fail before: the pre-r106 bytes launch after a card check with no record, run a container with no record to its end, and try once" || { echo "UNEXPECTED: the before bytes did not fail as expected"; ok=0; }
[ $ok = 1 ] && echo "RESULT PASS record-fail" || echo "RESULT FAIL record-fail"
[ $ok = 1 ]
