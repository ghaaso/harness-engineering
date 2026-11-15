#!/bin/sh
# Host test of orchestrator/rerun-compare.sh with a fake docker (no container) and a stub memgate.sh in a throwaway
# lane (parallel/test/rrdrv/): the container's docker run flags, the wait for other kge-* containers before `go`,
# and the copy of a mismatch marker into orchestrator/ with exit 1.
L=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
T=$L/parallel/test/rrdrv; rm -rf "$T"; mkdir -p "$T/bin" "$T/fake" "$T/lane/orchestrator" "$T/lane/parallel/rerun"
TB=$(echo "$T" | sed "s|^C:|/c|")
FAIL=0; N=0
check() { N=$((N+1)); if [ "$2" = "$3" ]; then echo "ok   $1: $2"; else echo "FAIL $1: got '$2' want '$3'"; FAIL=1; fi; }
printf '#!/bin/sh\n[ "$1" = sample ] && echo "8000000 30000000"\nexit 0\n' > "$T/lane/orchestrator/memgate.sh"
cat > "$T/bin/docker" <<'EOF'
#!/bin/sh
FK=$FAKE_DIR; echo "$*" >> "$FK/calls"
case "$1" in
  image) echo sha256:feedface ;;
  ps) [ "$2" = -a ] && exit 0
      if [ -f "$FK/up" ]; then echo kge-T2; n=$(cat "$FK/bpolls" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "$FK/bpolls"; [ $n -le 3 ] && echo kge-B1; fi ;;
  run) touch "$FK/up" ;;
  wait) o=$(ls -d "$FAKE_LANE"/parallel/rerun/2* | tail -1)
        [ -f "$o/go" ] && echo go-seen > "$FK/go"
        mkdir -p "$o/markers"; echo '{"arm": "E1"}' > "$o/markers/sidebyside-stop-E1"; echo 1 > "$o/rc"; rm -f "$FK/up" ;;
  stop) rm -f "$FK/up" ;;
esac
exit 0
EOF
chmod +x "$T/bin/docker"; export FAKE_DIR=$T/fake FAKE_LANE=$TB/lane; PATH="$TB/bin:$PATH"; export PATH
RC_WD=$T/lane RC_WB=$TB/lane sh "$L/orchestrator/rerun-compare.sh" --arms E1 > "$T/out.txt" 2>&1; rc=$?
r=$(grep '^run' "$T/fake/calls")
check "exit 1 on a mismatch" "$rc" "1"
check "run: --pull never, image id, card, no network, 6 cpus, 2560m" "$(echo "$r" | grep -c -- '--pull never --name kge-T2 --gpus all --network none --cpus 6 -m 2560m .*sha256:feedface sh -c')" "1"
check "run: train, export, eval, orchestrator read only" "$(echo "$r" | grep -o -- '-v [^ ]*:ro' | wc -l | tr -d ' ')" "4"
check "run: only parallel/rerun writable" "$(echo "$r" | grep -o -- '-v [^ ]*' | grep -v ':ro$' | sed 's|.*/parallel/|parallel/|')" "parallel/rerun:/w/rr"
check "run: the extra arguments reach rerun_compare.py" "$(echo "$r" | grep -c -- '--ledger /w/rr/ledger.jsonl --arms E1')" "1"
check "go only after kge-B1 was gone" "$(cat "$T/fake/go" 2>/dev/null)/$(cat "$T/fake/bpolls")" "go-seen/$(cat "$T/fake/bpolls")"
check "go not before B left (>= 4 polls)" "$( [ "$(cat "$T/fake/bpolls")" -ge 4 ] && echo yes)" "yes"
check "marker copied into orchestrator/" "$(cat "$T/lane/orchestrator/sidebyside-stop-E1" 2>/dev/null)" '{"arm": "E1"}'
echo "RESULT $([ $FAIL = 0 ] && echo PASS || echo FAIL) test_rerun_driver ($N checks)"
