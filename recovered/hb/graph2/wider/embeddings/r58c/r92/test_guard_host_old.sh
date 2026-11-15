#!/bin/sh
# Host test of guard-stageB.sh, guard-prelaunch.js and memgate.sh (release-gate round, 2026-11-14). No container:
# `docker` and `powershell` are fakes on PATH; the lane is a throwaway folder under fixes/tests/out/host/.
# usage: sh fixes/tests/test_guard_host.sh            prints one line per check and RESULT PASS|FAIL
L=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
T=$L/r58c/r92/out-old
rm -rf "$T"; mkdir -p "$T/bin" "$T/lane/train/stageB/parts" "$T/lane/orchestrator" "$T/lane/gpu"
FAIL=0
check() { if [ "$2" = "$3" ]; then echo "ok   $1: $2"; else echo "FAIL $1: got '$2' want '$3'"; FAIL=1; fi; }

# ---- fake docker: behaviour from files in $T/fake, every call logged to $T/calls
cat > "$T/bin/docker" <<'EOF'
#!/bin/sh
F=$FAKE_DIR
echo "$*" >> "$F/calls"
case "$1" in
  ps) if [ "$2" = "-a" ]; then cat "$F/ps_a" 2>/dev/null; else cat "$F/ps" 2>/dev/null; fi ;;
  rm) echo "rm $2" >> "$F/removed" ;;
  image) cat "$F/image_id" 2>/dev/null ;;
  run) exit $(cat "$F/run_rc" 2>/dev/null || echo 0) ;;
esac
exit 0
EOF
chmod +x "$T/bin/docker"
mkdir -p "$T/fake"; export FAKE_DIR=$T/fake
TB=$(echo "$T" | sed "s|^C:|/c|"); PATH="$TB/bin:$PATH"; export PATH

# ---- source the guard as a library on the throwaway lane
export GUARD_LIB=1 GUARD_WD=$T/lane GUARD_WB=$T/lane
. "$L/orchestrator/guard-stageB.sh"
HELP="node $L/orchestrator/guard-prelaunch.js"

# operations-03: a stopped leftover kge-B1 is removed; a running one is not
printf 'kge-B1\n' > "$T/fake/ps_a"; : > "$T/fake/ps"; rm -f "$T/fake/removed"
rm_leftover; check "ops-03 stopped leftover removed" "$(cat "$T/fake/removed" 2>/dev/null)" "rm kge-B1"
printf 'kge-B1\n' > "$T/fake/ps"; rm -f "$T/fake/removed"
rm_leftover; check "ops-03 running one kept" "$(cat "$T/fake/removed" 2>/dev/null)" ""

# operations-07: image by ID, --pull never on both runs
echo "sha256:feedface" > "$T/fake/image_id"; resolve_image; check "ops-07 image id" "$IMGID" "sha256:feedface"
: > "$T/fake/calls"; echo 0 > "$T/fake/run_rc"; PROCS=1; launch >/dev/null 2>&1
c=$(grep '^run' "$T/fake/calls"); check "ops-07 launch uses --pull never and the id" \
  "$(echo "$c" | grep -c -- '--pull never .*sha256:feedface sh -c')" "1"

# device-06: the card check
: > "$T/fake/calls"; echo 3 > "$T/fake/run_rc"
if card_ok; then r=yes; else r=no; fi; check "dev-06 no card -> not ok" "$r" "no"
echo 0 > "$T/fake/run_rc"; if card_ok; then r=yes; else r=no; fi; check "dev-06 card -> ok" "$r" "yes"
check "dev-06 check runs --pull never --gpus all" "$(grep -c -- '--pull never --name kge-B1c --gpus all' "$T/fake/calls")" "2"

# operations-08: PROCS other than 1 needs the RUNLOG record
: > "$T/lane/train/RUNLOG.md"; PROCS=2; if procs_ok; then r=yes; else r=no; fi; check "ops-08 procs=2 refused" "$r" "no"
echo "ruling 66 equality accepted: procs=2" >> "$T/lane/train/RUNLOG.md"; if procs_ok; then r=yes; else r=no; fi
check "ops-08 procs=2 with record" "$r" "yes"; PROCS=1

# operations-02: torn lines, missing newline, bad unit folders
P=$T/lane/train/stageB/parts/E2/c01/s1
mk() {  # mk <checkpoint sha> good|zerocounts|badgz
  d=$P/$1; mkdir -p "$d"
  printf 'task_id\tcandidate\tscore\nT1\ta.py\t0.5\n' | gzip -c > "$d/pool.tsv.gz"; cp "$d/pool.tsv.gz" "$d/unrestricted.tsv.gz"
  echo '{"T1": {}}' > "$d/counts.json"; echo '{"plan_hash": "x"}' > "$d/meta.json"
  [ "$2" = zerocounts ] && head -c 40 /dev/zero > "$d/counts.json"
  [ "$2" = badgz ] && head -c 100 /dev/urandom > "$d/unrestricted.tsv.gz"
}
A=aaaaaaaaaaaa1111111111111111111111111111; B=bbbbbbbbbbbb2222222222222222222222222222; C=cccccccccccc3333333333333333333333333333
mk $A good; mk $B zerocounts; mk $C badgz
{ for x in $A $B $C; do echo "{\"step\": \"stageB\", \"unit\": \"E2/c01/s1/$(echo $x | cut -c1-12)\", \"status\": \"done\"}"; done
  printf '{"step": "stageB", "unit": "E2/c01/s1/ddd\000\000'; } > "$T/lane/train/progress.jsonl"   # torn, no newline
printf '{"step": "stageB", "unit": "E3/c02/s2/eeeeeeeeeeee", "status": "done"}\n{"torn' > "$T/lane/train/progress-B2.jsonl"
repair >/dev/null 2>&1
check "ops-02 torn lines moved" "$(cat "$T/lane/train/progress.jsonl.torn" "$T/lane/train/progress-B2.jsonl.torn" 2>/dev/null | wc -l | tr -d ' ')" "2"
check "ops-02 files end in a newline" "$(tail -c 1 "$T/lane/train/progress.jsonl" | od -An -c | tr -d ' ')$(tail -c 1 "$T/lane/train/progress-B2.jsonl" | od -An -c | tr -d ' ')" '\n\n'
check "ops-02 good unit kept" "$(ls "$P")" "$A"
check "ops-02 bad units quarantined" "$(ls "$T"/lane/train/stageB/quarantine/*/E2/c01/s1 | sort | tr '\n' ' ')" "$B $C "
check "ops-02 progress lines kept" "$(wc -l < "$T/lane/train/progress.jsonl" | tr -d ' ')" "3"
check "ops-02 done_n reads every progress file" "$(done_n)" "4"
# a quarantined unit still has its done line; it must count as left (stageB.py redoes it), or the guard would
# call stage B complete with it missing. plan: 2 arms x 1 config x 3 seeds x 3 checkpoints = 18; one has a part.
echo "{\"configs\": {\"E2\": [{\"config_id\": \"c01\"}], \"E3\": [{\"config_id\": \"c02\"}]}, \"checkpoints\": [\"$A\", \"$B\", \"$C\"]}" > "$T/lane/train/stageB/plan.json"
check "ops-02 quarantined units count as left" "$(left)" "17"
echo "{\"step\": \"stageB\", \"unit\": \"E2/c01/s1/$(echo $B | cut -c1-12)\", \"status\": \"done\"}" >> "$T/lane/train/progress-B2.jsonl"
check "ops-02 a redone unit moves done_n" "$(done_n)" "5"

# operations-10: consecutive RenameFailed failures at the end of a progress file
{ for i in $(seq 1 19); do echo '{"step": "stageB", "unit": "E1/c04/s1/x'$i'", "status": "failed", "error": "RenameFailed(...)"}'; done; } > "$T/lane/train/progress-B3.jsonl"
check "ops-10 19 in a row" "$(rename_fails)" "19"
echo '{"step": "stageB", "unit": "E1/c04/s1/y", "status": "failed", "error": "RenameFailed(...)"}' >> "$T/lane/train/progress-B3.jsonl"
check "ops-10 20 in a row" "$(rename_fails)" "20"
echo '{"step": "stageB", "unit": "E1/c04/s1/z", "status": "done"}' >> "$T/lane/train/progress-B3.jsonl"
check "ops-10 a done unit ends the run" "$(rename_fails)" "0"

# operations-06: memgate with a fake powershell
for case in empty:'' one:'123' text:'abc def' high:'9000000 30000000' lowfree:'1000 30000000'; do
  name=${case%%:*}; out=${case#*:}
  printf '#!/bin/sh\nprintf "%%s\\r\\n" "%s"\n' "$out" > "$T/bin/powershell"; chmod +x "$T/bin/powershell"
  for v in now pre; do
    m=$L/orchestrator/memgate.sh; [ $v = pre ] && m=$L/fixes/pre_m4/memgate.sh.snapshot
    if sh "$m" low; then r=low; else r=ok; fi; eval "r_$v=\$r"
  done
  case $name in high) want=ok ;; *) want=low ;; esac
  check "ops-06 memgate low on '$out' (before: $r_pre)" "$r_now" "$want"
done
# ruling 92: the disk lines and the value passed into the container
check "r92 MIN_FREE_GB" "$MIN_FREE_GB" "10"
check "r92 START_FREE_GB" "$START_FREE_GB" "15"
: > "$FAKE_DIR/calls"; IMGID=sha256:fake; launch >/dev/null 2>&1
check "r92 container env" "$(grep -o "STAGEB_MIN_FREE_GB=[0-9]*" "$FAKE_DIR/calls" | head -1)" "STAGEB_MIN_FREE_GB=10"
echo "RESULT $([ $FAIL = 0 ] && echo PASS || echo FAIL) test_guard_host"
