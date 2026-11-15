#!/bin/sh
# Agent A, C50 (end-order-changes-4 f3736b71): host check of train/heldout.sh's memory cap H1_CAP. DRY=1 only (it prints
# the docker command and exits; no container, no docker run). For kge-H1, kge-H1P and kge-H1R (ARM E4):
#   d   H1_CAP unset -> exit 0, the command has -m 4g --memory-swap 4g
#   e   H1_CAP empty -> as unset (4g)
#   six H1_CAP=6g    -> exit 0, the command has -m 6g --memory-swap 6g and no 4g cap
#   five H1_CAP=5g   -> exit 0, -m 5g --memory-swap 5g
#   bad H1_CAP=8g, 4G, 4096m, "4g -v x:/y" -> exit 8, nothing on stdout, nothing appended to the launch log
#   log the launch log's start line (cut out of the launcher, run with LOG in a scratch folder) shows "cap 6g (-m 6g
#       --memory-swap 6g)"
# Fail before (r58c/A/pre-r105/heldout.sh): H1_CAP=6g still gives -m 4g, a refused value gives exit 0, the start line
# names no cap.
# usage (Git Bash): sh r58c/A/test_h1cap_r105.sh   -> RESULT PASS|FAIL h1cap
WB0=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
cd "$WB0" || exit 2
T=$WB0/r58c/A/out/th1cap; rm -rf $T; mkdir -p $T
for f in train/heldout.sh r58c/A/pre-r105/heldout.sh r58c/A/test_h1cap_r105.sh; do echo "sha256 $(sha256sum $f | cut -c1-64) $f"; done
logsum() { cat heldout-launch/*.log 2>/dev/null | sha256sum | cut -c1-64; }
# dry <launcher> <container> <cap or -unset> -> "rc|cap seen|other caps" on stdout
dry() {
  case $2 in kge-H1) set -- "$1" "$2" "$3" "" "" ;; kge-H1P) set -- "$1" "$2" "$3" 1 "" ;; kge-H1R) set -- "$1" "$2" "$3" "" E4 ;; esac
  if [ "$3" = -unset ]; then out=$(env -u H1_CAP PROBE=$4 REHEARSAL=$5 DRY=1 sh "$1" 2>$T/err); rc=$?
  else out=$(H1_CAP="$3" PROBE=$4 REHEARSAL=$5 DRY=1 sh "$1" 2>$T/err); rc=$?; fi
  m=$(echo "$out" | grep -o ' -m [^ ]* --memory-swap [^ ]* ' | head -1 | sed 's/^ //; s/ $//')
  echo "$rc|$m|$(echo "$out" | grep -c .)"
}
ok=1; before=1
check() { if [ "$2" = "$3" ]; then echo "  ok   $1: $2"; else echo "  FAIL $1: got [$2], want [$3]"; ok=0; fi; }
L0=$(logsum)
for c in kge-H1 kge-H1P kge-H1R; do
  echo "$c (current bytes):"
  check "d unset" "$(dry train/heldout.sh $c -unset)" "0|-m 4g --memory-swap 4g|1"
  check "e empty" "$(dry train/heldout.sh $c '')" "0|-m 4g --memory-swap 4g|1"
  check "six 6g" "$(dry train/heldout.sh $c 6g)" "0|-m 6g --memory-swap 6g|1"
  check "five 5g" "$(dry train/heldout.sh $c 5g)" "0|-m 5g --memory-swap 5g|1"
  for v in 8g 4G 4096m '4g -v x:/y' 3g; do
    check "bad $v" "$(dry train/heldout.sh $c "$v")" "8||0"
    grep -q "refusing: H1_CAP=" $T/err || { echo "  FAIL bad $v: no refusal text on stderr"; ok=0; }
  done
  # fail before: the before bytes ignore H1_CAP
  b6=$(dry r58c/A/pre-r105/heldout.sh $c 6g); bb=$(dry r58c/A/pre-r105/heldout.sh $c 8g)
  echo "  before bytes: H1_CAP=6g -> [$b6], H1_CAP=8g -> [$bb]"
  [ "$b6" = "0|-m 4g --memory-swap 4g|1" ] && [ "${bb%%|*}" = 0 ] || before=0
done
check "launch log unchanged by the DRY runs" "$(logsum)" "$L0"
# the start line: cut out of each launcher and run with a scratch LOG
start() { grep '^say "start \$NAME' "$1" > $T/start.sh
  { echo 'say() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }'; cat $T/start.sh; } > $T/run.sh
  rm -f $T/l.log; LOG=$T/l.log NAME=kge-H1 IMG=sha256:x H1_CAP=6g CMD='docker run ...' sh $T/run.sh; sed 's/^[^ ]* //' $T/l.log; }
s_now=$(start train/heldout.sh); s_old=$(start r58c/A/pre-r105/heldout.sh)
echo "start line, current bytes: $s_now"; echo "start line, before bytes:  $s_old"
check "log start line shows the cap" "$(echo "$s_now" | grep -c 'cap 6g (-m 6g --memory-swap 6g)')" "1"
echo "$s_old" | grep -q 'cap 6g' && before=0
rm -rf $T
[ $before = 1 ] && echo "fail before: the pre-r105 bytes ignore H1_CAP (6g gives -m 4g, 8g is not refused) and the start line names no cap" || { echo "UNEXPECTED: the before bytes did not fail"; ok=0; }
[ $ok = 1 ] && echo "RESULT PASS h1cap" || echo "RESULT FAIL h1cap"
[ $ok = 1 ]
