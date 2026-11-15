#!/bin/sh
# Host test of test_memgate_empty.sh's scratch cleanup (round 8, the coordinator's order after ktest-b99's run: the test
# must exit 0 after a PASS even when its scratch folder r58c/B/memtest cannot be removed). A stub `rm`, first on PATH,
# refuses only a path whose last component is memtest or memtest.<stamp> (a held folder), and passes every other call
# to the real rm.
#   before (fail-before, r58c/B/pre-r101/test_memgate_empty.sh): every check passes, yet it exits 1 (its last command is
#     the failing rm -rf).
#   after (r58c/B/tests/test_memgate_empty.sh), run next with the folder of the first run still there: it cannot clear
#     the leftover, uses a fresh r58c/B/memtest.<UTC> folder, logs both folders as left in place, prints RESULT PASS and
#     exits 0.
# Afterwards the real rm removes the leftovers. usage: sh r58c/B/tests/test_memgate_cleanup.sh (log r58c/B/logs/test_memgate_cleanup.log)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
S=$WB/r58c/B/mgclean; rm -rf "$S"; mkdir -p "$S/bin" $WB/r58c/B/logs
LOG=$WB/r58c/B/logs/test_memgate_cleanup.log; : > "$LOG"
RRM=$(command -v rm)
cat > "$S/bin/rm" <<EOF
#!/bin/sh
for a in "\$@"; do case "\$a" in */r58c/B/memtest|*/r58c/B/memtest.*) echo "stub rm: \$a is held" >&2; exit 1 ;; esac; done
exec $RRM "\$@"
EOF
chmod +x "$S/bin/rm"
fails=0; n=0
check() { n=$((n+1)); if [ "$2" = "$3" ]; then echo "PASS $1" | tee -a "$LOG"; else fails=$((fails+1)); echo "FAIL $1: got [$2] want [$3]" | tee -a "$LOG"; fi; }
echo "sha256 $(sha256sum $WB/r58c/B/tests/test_memgate_empty.sh | cut -c1-64) r58c/B/tests/test_memgate_empty.sh (after); $(sha256sum $WB/r58c/B/pre-r101/test_memgate_empty.sh | cut -c1-64) r58c/B/pre-r101/test_memgate_empty.sh (before)" | tee -a "$LOG"
ML=$WB/r58c/B/logs/test_memgate_empty.log
( PATH="$S/bin:$PATH" sh $WB/r58c/B/pre-r101/test_memgate_empty.sh > $S/before.out 2>&1 ); rb=$?
check "before (fail-before): all checks pass but the held folder makes it exit 1" "$rb $(grep -c '^RESULT PASS memgate-empty' $ML) $([ -d $WB/r58c/B/memtest ] && echo held)" "1 1 held"
( PATH="$S/bin:$PATH" sh $WB/r58c/B/tests/test_memgate_empty.sh > $S/after.out 2>&1 ); ra=$?
check "after: RESULT PASS and exit 0 with the folder held" "$ra $(grep -c '^RESULT PASS memgate-empty' $ML)" "0 1"
check "after: the leftover of the first run and its own fresh folder are both named as left in place" "$(grep -c '^cleanup: r58c/B/memtest[.0-9TZ]* could not be removed' $ML) $(grep -c '^scratch r58c/B/memtest\.[0-9]*T[0-9]*Z$' $ML)" "2 1"
for d in $WB/r58c/B/memtest $WB/r58c/B/memtest.*; do [ -e "$d" ] && $RRM -rf "$d"; done
$RRM -rf "$S"
echo "RESULT $( [ $fails -eq 0 ] && echo PASS || echo FAIL ) memgate-cleanup ($n checks)" | tee -a "$LOG"
[ $fails -eq 0 ]
