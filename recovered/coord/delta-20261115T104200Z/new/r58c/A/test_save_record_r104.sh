#!/bin/sh
# Agent A, round 9 (C36 / S1, end-order-changes-4): host check of train/heldout.sh's save_record. No container: the
# function is cut out of the launcher (from "save_record() {" to its closing "fi; }") into a scratch script with a fake
# `docker inspect` that prints record number n, and called three times for one name in a scratch r58c/mounts.
# Current bytes: r58c/mounts/kge-H1.json holds the NEWEST record (3) and the two older ones (1, 2) are kept under
# kge-H1.<UTC>[-k].json, the convention of lane_step.sh line 116. Before bytes (r58c/A/pre-r104/heldout.sh): kge-H1.json
# kept the FIRST record and the later ones were stamped (fail before).
# usage (Git Bash): sh r58c/A/test_save_record_r104.sh   -> RESULT PASS|FAIL save-record
WB0=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
A=$WB0/r58c/A; T=$A/out/tsr; rm -rf $T; mkdir -p $T/bin
for f in $WB0/train/heldout.sh $A/pre-r104/heldout.sh $A/test_save_record_r104.sh; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#$WB0/}"; done
cat > $T/bin/docker <<'EOF'
#!/bin/sh
n=$(cat "$TT/n" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "$TT/n"
[ "$1" = inspect ] && echo "[{\"Name\": \"/$2\", \"record\": $n, \"Mounts\": []}]"
EOF
chmod +x $T/bin/docker
one() {  # $1 launcher -> the record numbers: newest file first, then the stamped ones in name order
  L=$T/l; rm -rf $L; mkdir -p $L/r58c; rm -f $T/n
  sed -n '/^save_record() {/,/fi; }$/p' "$1" > $T/fn.sh
  { echo 'say() { echo "$*" >> "$LOG"; }'; cat $T/fn.sh; echo 'save_record kge-H1; save_record kge-H1; save_record kge-H1'; } > $T/run.sh
  WB=$L LOG=$T/log TT=$T PATH="$T/bin:$PATH" sh $T/run.sh
  main=$(sed -n 's/.*"record": \([0-9]*\).*/\1/p' $L/r58c/mounts/kge-H1.json 2>/dev/null)
  old=$(for f in $(ls $L/r58c/mounts | grep '^kge-H1[.][0-9]' | sort); do sed -n 's/.*"record": \([0-9]*\).*/\1/p' $L/r58c/mounts/$f; done | tr '\n' ' ')
  echo "main=$main stamped=[$old] files=$(ls $L/r58c/mounts | tr '\n' ' ')"
}
ok=1
new=$(one $WB0/train/heldout.sh); echo "current bytes: $new"
case "$new" in "main=3 stamped=[1 2 ] "*) echo "  pass after: kge-H1.json is the newest record; the older two are kept, stamped" ;; *) ok=0; echo "  FAILED" ;; esac
[ $(echo "$new" | grep -o 'kge-H1[.][^ ]*json' | wc -l) = 3 ] || { ok=0; echo "  FAILED: not three files"; }
old=$(one $A/pre-r104/heldout.sh); echo "before bytes: $old"
case "$old" in "main=1 "*) echo "  fail before: kge-H1.json kept the FIRST record, the later ones were stamped (two in one second overwrite each other)" ;; *) ok=0; echo "  UNEXPECTED" ;; esac
rm -rf $T
[ $ok = 1 ] && echo "RESULT PASS save-record" || echo "RESULT FAIL save-record"
[ $ok = 1 ]
