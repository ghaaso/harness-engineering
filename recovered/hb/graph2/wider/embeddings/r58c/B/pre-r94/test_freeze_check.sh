#!/bin/sh
# Host test (Git Bash, no container, no python) of r58c/B/freeze_check.sh, the refusals of r58c/B/freeze_list.sh and
# r58c/B/lane_step.sh that happen before any container. Builds its files under r58c/B/out/fc/ only (no real table,
# nothing under train/ or export/ is read or written). Fail-before: a mutant copy of freeze_check.sh that skips the
# # images block must fail case 4.
# usage: sh test_freeze_check.sh        Prints RESULT PASS|FAIL test_freeze_check.
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
B=$W/r58c/B; O=$B/out/fc; rm -rf $O; mkdir -p $O; FAIL=0
echo "sha256 $(sha256sum $B/freeze_check.sh | cut -d' ' -f1) r58c/B/freeze_check.sh"
echo "sha256 $(sha256sum $B/freeze_list.sh | cut -d' ' -f1) r58c/B/freeze_list.sh"
echo "sha256 $(sha256sum $B/lane_step.sh | cut -d' ' -f1) r58c/B/lane_step.sh"
echo "sha256 $(sha256sum $0 | cut -d' ' -f1) r58c/B/tests/test_freeze_check.sh"
ok() { if [ "$2" = yes ]; then echo "PASS $1"; else echo "FAIL $1 $3"; FAIL=1; fi; }
echo one > $O/a.txt; echo two > $O/b.txt; echo out > $O/outside.txt
CPU=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 | tr -d '\r'); GPU=$(docker image inspect -f '{{.Id}}' graphtest-kge-gpu:1 | tr -d '\r')
mk() { (cd $W && sha256sum r58c/B/out/fc/a.txt r58c/B/out/fc/b.txt | sed 's/ \*/  /'; echo "# outside"; sha256sum "$O/outside.txt" | sed 's/ \*/  /'
        echo "# images"; echo "$CPU  graphtest-kge:1"; echo "${1:-$GPU}  graphtest-kge-gpu:1") > $O/list.txt; }
run() { out=$(sh ${FC:-$B/freeze_check.sh} $O/list.txt 2>&1); rc=$?; }
mk; run; [ $rc -eq 0 ] && [ -z "$out" ] && r=yes || r=no; ok "1 an intact list: nothing printed, exit 0" $r "rc $rc out $out"
echo changed >> $O/b.txt; run; [ $rc -eq 1 ] && r=yes || r=no; ok "2 a changed lane file: exit 1" $r "rc $rc"
echo two > $O/b.txt; echo x >> $O/outside.txt; run; [ $rc -eq 1 ] && r=yes || r=no; ok "3 a changed outside file: exit 1" $r "rc $rc"
echo out > $O/outside.txt; mk sha256:0000000000000000000000000000000000000000000000000000000000000000; run
[ $rc -eq 1 ] && echo "$out" | grep -q 'graphtest-kge-gpu:1: image' && r=yes || r=no; ok "4 a wrong image ID: exit 1" $r "rc $rc out $out"
sed 's/^awk .\/\^# images\$\/{b=3;next} b==3. "\$LIST" | while/true | while/' $B/freeze_check.sh > $O/mutant_freeze_check.sh
FC=$O/mutant_freeze_check.sh run; [ $rc -eq 0 ] && r=yes || r=no; ok "4-fail-before the mutant that skips # images passes the wrong ID (case 4 fails on it)" $r "mutant rc $rc"
mk; run; [ $rc -eq 0 ] && r=yes || r=no; ok "5 the list restored: exit 0" $r "rc $rc"
sh $B/freeze_check.sh $O/none.txt >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "6 no list: exit 2" $r
sh $B/freeze_list.sh >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "7 freeze_list without the manifests: exit 2" $r
sh $B/freeze_list.sh r58c/B/out/fc/nothere.txt r58c/B/out/fc/a.txt >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "8 freeze_list with a missing manifest: exit 2" $r
for c in "ktest-b9|train/x|true" "ktest-r9|train/stageB|true" "ktest-r9|train/stageB/tables|true" "ktest-r9|export|true" "ktest-r9|train/../x|true" "ktest-r9|/abs|true"; do
  n=${c%%|*}; rest=${c#*|}; d=${rest%%|*}
  sh $B/lane_step.sh "$n" "$d" "true" >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "9 lane_step refuses $n with writable $d: exit 2" $r
done
sh $B/lane_step.sh ktest-r9 "" >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "10 lane_step without a command: exit 2" $r
docker ps -a --format '{{.Names}}' | grep -q '^ktest-r9$' && r=no || r=yes; ok "11 no container was started" $r
[ $FAIL -eq 0 ] && echo "RESULT PASS test_freeze_check" || echo "RESULT FAIL test_freeze_check"
exit $FAIL
