#!/bin/sh
# Host test of orchestrator/guard-stageAB.sh and guard-prelaunch-ab.js (ruling 69). No container: `docker` and
# `powershell` are fakes on PATH (the pattern of fixes/tests/test_guard_host.sh); the lane is a throwaway folder
# under parallel/test/guardAB/. usage: sh parallel/tests/test_guard_stageAB.sh   -> one line per check, RESULT PASS|FAIL
L=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
T=$L/parallel/test/guardAB
rm -rf "$T"; mkdir -p "$T/bin" "$T/fake" "$T/lane/train/stageB/parts" "$T/lane/orchestrator" "$T/lane/gpu"
cp "$L/orchestrator/memgate.sh" "$T/lane/orchestrator/"
FAIL=0; N=0
check() { N=$((N+1)); if [ "$2" = "$3" ]; then echo "ok   $1: $2"; else echo "FAIL $1: got '$2' want '$3'"; FAIL=1; fi; }

# ---- fake docker: a running set in $FK/ps; every call logged to $FK/calls; stops to $FK/stops
cat > "$T/bin/docker" <<'EOF'
#!/bin/sh
FK=$FAKE_DIR
echo "$*" >> "$FK/calls"
last() { for a in "$@"; do :; done; echo "$a"; }
case "$1" in
  ps) if [ "$2" = "-a" ]; then cat "$FK/ps" "$FK/ps_a" 2>/dev/null; else cat "$FK/ps" 2>/dev/null; fi ;;
  stop) n=$(last "$@"); echo "stop $n $3" >> "$FK/stops"; grep -vx "$n" "$FK/ps" > "$FK/ps.tmp"; mv "$FK/ps.tmp" "$FK/ps" ;;
  rm) echo "rm $2" >> "$FK/removed" ;;
  image) cat "$FK/image_id" 2>/dev/null ;;
  inspect) cat "$FK/inspect_$(last "$@")" 2>/dev/null ;;
  info) exit 0 ;;
  run) n=; d=0; prev=; for a in "$@"; do [ "$prev" = "--name" ] && n=$a; [ "$a" = "-d" ] && d=1; prev=$a; done
       if [ $d = 1 ]; then rc=$(cat "$FK/run_rc" 2>/dev/null || echo 0); [ "$rc" = 0 ] && echo "$n" >> "$FK/ps"; echo "$*" >> "$FK/launches"; exit $rc
       else exit $(cat "$FK/card_rc" 2>/dev/null || echo 0); fi ;;
esac
exit 0
EOF
printf '#!/bin/sh\ncat "$FAKE_DIR/mem"; printf "\\r\\n"\n' > "$T/bin/powershell"
chmod +x "$T/bin/docker" "$T/bin/powershell"
export FAKE_DIR=$T/fake
TB=$(echo "$T" | sed "s|^C:|/c|"); PATH="$TB/bin:$PATH"; export PATH
FK=$T/fake; : > "$FK/ps"; echo "sha256:feedface" > "$FK/image_id"; echo 0 > "$FK/card_rc"; echo 0 > "$FK/run_rc"
mem() { printf '%s %s' "$1" "$2" > "$FK/mem"; }
G=1048576   # KB per GB
mem $((8*G)) $((30*G))

# ---- the lane: a plan with one config per arm and two checkpoints -> 6 units per arm
C1=aaaaaaaaaaaa1111111111111111111111111111; C2=bbbbbbbbbbbb2222222222222222222222222222
echo "{\"configs\": {\"E1\": [{\"config_id\": \"c04\"}], \"E5\": [{\"config_id\": \"c03\"}], \"E2\": [{\"config_id\": \"c11\"}], \"E3\": [{\"config_id\": \"c11\"}], \"E4\": [{\"config_id\": \"c12\"}]}, \"checkpoints\": [\"$C1\", \"$C2\"]}" > "$T/lane/train/stageB/plan.json"
: > "$T/lane/train/progress.jsonl"

# ---- source the guard as a library on the throwaway lane
export GUARD_LIB=1 GUARD_WD=$T/lane GUARD_WB=$TB/lane TICK=0 SPACING=0 STOP_T=20
. "$L/orchestrator/guard-stageAB.sh"
HELP="node $L/orchestrator/guard-prelaunch-ab.js"
free_gb() { cat "$FK/df"; }; echo 25 > "$FK/df"
resolve_image
sb_kb() { echo 100; }
logger_start() { :; }; logger_stop() { :; }
t() { tick >/dev/null 2>&1; RC=$?; }
reset() { : > "$FK/stops"; : > "$FK/launches"; : > "$FK/calls"; }
accept() { echo '{"runners": []}' > "$T/lane/orchestrator/equality-accepted.json"; }
unaccept() { rm -f "$T/lane/orchestrator/equality-accepted.json"; }
launches_of() { grep -c -- "--name $1 " "$FK/launches" | tr -d ' '; }

# 1. A's start threshold and launch order (accepted, nothing running)
accept; reset
t; t; check "B launches after three start samples, not two" "$(launches_of kge-B1)" "0"
t; check "B launched at the third sample" "$(launches_of kge-B1)" "1"
check "B's command has no E4 while A is allowed" "$(grep -c 'detrun.py run E4' "$FK/launches")" "0"
check "B's runner says containers=2" "$(grep -c 'STAGEB_RUNNER=guard-stageAB.sh kge-B1 procs=1 containers=2 image=sha256:feedface' "$FK/launches")" "1"
mem $((5*G + G*9/10)) $((30*G)); t; t; t; t; check "A not started at 5.9 GB free" "$(launches_of kge-A1)" "0"
mem $((6*G + G/2)) $((38*G + G/2)); t; t; t; t; check "A not started at commit 38.5 GB" "$(launches_of kge-A1)" "0"
mem $((6*G + G/2)) $((37*G)); t; t; check "A not started after two good samples" "$(launches_of kge-A1)" "0"
mem '' ''; t; mem $((6*G + G/2)) $((37*G)); t; t; check "an unreadable sample resets A's count" "$(launches_of kge-A1)" "0"
t; check "A started at the third good sample (6.5 GB, 37 GB)" "$(launches_of kge-A1)" "1"
la=$(grep -- '--name kge-A1 ' "$FK/launches")
check "A runs detrun.py run E4" "$(echo "$la" | grep -c 'python detrun.py run E4; }; echo \$? > /w/train/stageB/guard-A.rc')" "1"
check "A writes its own progress file" "$(echo "$la" | grep -c 'STAGEB_PROGRESS=/w/train/progress-A.jsonl')" "1"
check "A's runner string" "$(echo "$la" | grep -c 'STAGEB_RUNNER=guard-stageAB.sh kge-A1 procs=1 containers=2 image=sha256:feedface')" "1"
check "both launches: --pull never and the image id" "$(grep -c -- '--pull never .*sha256:feedface sh -c' "$FK/launches")" "2"
check "card checks named per container" "$(grep -c -- '--pull never --name kge-B1c --gpus all' "$FK/calls")$(grep -c -- '--pull never --name kge-A1c --gpus all' "$FK/calls")" "11"

# 2. the sibling is not foreign
reset; mem $((8*G)) $((30*G)); t; t; t; t
check "sibling not foreign: no stop with kge-A1 and kge-B1 both up" "$(wc -l < "$FK/stops" | tr -d ' ')" "0"

# 3. A-first stop
reset; mem $((5*G)) $((30*G)); t; t; t; check "free 5 GB: A kept (above A's 4 GB line)" "$(wc -l < "$FK/stops" | tr -d ' ')" "0"
mem $((3*G + G/2)) $((30*G)); t; t; check "A kept after two samples at 3.5 GB" "$(wc -l < "$FK/stops" | tr -d ' ')" "0"
t; check "A stopped at the third sample at 3.5 GB free; B kept" "$(cat "$FK/stops" | awk '{print $2}' | tr '\n' ' ')" "kge-A1 "
mem $((8*G)) $((30*G)); reset; t; t; t; t; check "A relaunched after three good samples" "$(launches_of kge-A1)" "1"
reset; mem $((8*G)) $((42*G)); t; t; t; check "commit 42 GB: A stopped, B kept (B's line is 43)" "$(cat "$FK/stops" | awk '{print $2}' | tr '\n' ' ')" "kge-A1 "
echo kge-A1 >> "$FK/ps"; A_AT=$(donen_of E4); A_LOW=0; B_LOW=0; reset
mem $((2*G)) $((30*G)); t; t; t; check "B's line (free 2 GB): A then B in the same check" "$(cat "$FK/stops" | awk '{print $2}' | tr '\n' ' ')" "kge-A1 kge-B1 "

# 4. a foreign kge-* stops both, A first; nothing launches while it runs
mem $((8*G)) $((30*G)); reset; t; t; t; t; t; t; t; t
check "both up again" "$(sort "$FK/ps" | tr '\n' ' ')" "kge-A1 kge-B1 "
reset; echo kge-T1 >> "$FK/ps"; t; check "foreign seen once: nothing stopped" "$(wc -l < "$FK/stops" | tr -d ' ')" "0"
t; check "foreign seen twice: A then B stopped" "$(cat "$FK/stops" | awk '{print $2}' | tr '\n' ' ')" "kge-A1 kge-B1 "
t; t; t; t; check "no launch while kge-T1 runs" "$(wc -l < "$FK/launches" | tr -d ' ')" "0"
grep -vx kge-T1 "$FK/ps" > "$FK/ps.tmp"; mv "$FK/ps.tmp" "$FK/ps"; t; t; t
check "B relaunched after kge-T1 left" "$(launches_of kge-B1)$(launches_of kge-A1)" "10"
t; t; t; check "then A" "$(launches_of kge-A1)" "1"

# 5. repair scoped to the launching container's own file and model types
mk() {  # mk <arm> <cid> <checkpoint> good|bad
  d=$T/lane/train/stageB/parts/$1/$2/s1/$3; mkdir -p "$d"
  printf 'task_id\tcandidate\tscore\nT1\ta.py\t0.5\n' | gzip -c > "$d/pool.tsv.gz"; cp "$d/pool.tsv.gz" "$d/unrestricted.tsv.gz"
  echo '{"T1": {}}' > "$d/counts.json"; echo '{"plan_hash": "x"}' > "$d/meta.json"
  [ "$4" = bad ] && head -c 40 /dev/zero > "$d/counts.json"
}
mk E1 c04 $C1 good; mk E1 c04 $C2 bad; mk E4 c12 $C1 good; mk E4 c12 $C2 bad
c1=$(echo $C1 | cut -c1-12); c2=$(echo $C2 | cut -c1-12)
{ echo "{\"step\": \"stageA\", \"unit\": \"E4/c12\", \"status\": \"done\"}"
  echo "{\"step\": \"stageB\", \"unit\": \"E1/c04/s1/$c1\", \"status\": \"done\"}"; echo "{\"step\": \"stageB\", \"unit\": \"E1/c04/s1/$c2\", \"status\": \"done\"}"
  printf '{"step": "stageB", "unit": "E1/c04/s2/ddd\000\000\n'; } > "$T/lane/train/progress.jsonl"
{ echo "{\"step\": \"stageB\", \"unit\": \"E4/c12/s1/$c1\", \"status\": \"done\"}"; echo "{\"step\": \"stageB\", \"unit\": \"E4/c12/s1/$c2\", \"status\": \"done\"}"
  printf '{"torn'; } > "$T/lane/train/progress-A.jsonl"
check "the stage-A E4 line is not a stage-B E4 line" "$($HELP armlines "$T/lane/train" progress.jsonl E4)" "0"
B0=$(sha256sum < "$T/lane/train/progress.jsonl")
docker stop kge-A1 >/dev/null; A_SELF=test; reset; t; t; t; t
check "A relaunched (repair ran before it)" "$(launches_of kge-A1)" "1"
check "A's repair: A's torn line moved" "$(wc -l < "$T/lane/train/progress-A.jsonl.torn" | tr -d ' ')" "1"
check "A's repair: A's file ends in a newline" "$(tail -c 1 "$T/lane/train/progress-A.jsonl" | od -An -c | tr -d ' ')" '\n'
check "A's repair: E4 bad unit quarantined" "$(ls "$T"/lane/train/stageB/quarantine/*/E4/c12/s1 2>/dev/null)" "$C2"
check "A's repair: B's file untouched (torn line kept)" "$(sha256sum < "$T/lane/train/progress.jsonl")" "$B0"
check "A's repair: no progress.jsonl.torn" "$(ls "$T/lane/train/progress.jsonl.torn" 2>/dev/null)" ""
check "A's repair: B's bad E1 unit not quarantined" "$(ls "$T/lane/train/stageB/parts/E1/c04/s1" | sort | tr '\n' ' ')" "$C1 $C2 "
A0=$(sha256sum < "$T/lane/train/progress-A.jsonl"); B_ARMS_NEXT=E1,E5,E2,E3
repair B >/dev/null 2>&1
check "B's repair: B's torn line moved" "$(wc -l < "$T/lane/train/progress.jsonl.torn" | tr -d ' ')" "1"
check "B's repair: E1 bad unit quarantined" "$(ls "$T"/lane/train/stageB/quarantine/*/E1/c04/s1 2>/dev/null)" "$C2"
check "B's repair: A's file untouched" "$(sha256sum < "$T/lane/train/progress-A.jsonl")" "$A0"
check "B's repair: A's good E4 unit kept" "$(ls "$T/lane/train/stageB/parts/E4/c12/s1")" "$C1"

# 6. who holds E4
check "left E4 counts the quarantined unit as left" "$(left_of E4)" "5"
unaccept; if a_allowed; then r=yes; else r=no; fi; check "A not allowed without equality-accepted.json" "$r" "no"
echo 'not json' > "$T/lane/orchestrator/equality-accepted.json"; if a_allowed; then r=yes; else r=no; fi; check "A not allowed on a non-JSON record" "$r" "no"
accept; if a_allowed; then r=yes; else r=no; fi; check "A allowed with the record" "$r" "yes"
reset; unaccept; t; check "A running is stopped once the record is gone" "$(cat "$FK/stops" | awk '{print $2}')" "kge-A1"
docker stop kge-B1 >/dev/null; B_SELF=test; reset; t; t; t; t
lb=$(grep -- '--name kge-B1 ' "$FK/launches")
check "without the record B runs E4 last, deterministic" "$(echo "$lb" | grep -c 'python stageB.py run --plan E1 E5 E2 E3 && python detrun.py run E4')" "1"
check "and its runner says containers=1" "$(echo "$lb" | grep -c 'containers=1')" "1"
t; t; t; t; check "A never launched meanwhile" "$(launches_of kge-A1)" "0"
accept; echo "{\"step\": \"stageB\", \"unit\": \"E4/c12/s1/$c1\", \"status\": \"failed\"}" > "$T/lane/train/pB.tmp"
cp "$T/lane/train/progress.jsonl" "$T/lane/train/pB.bak"; cat "$T/lane/train/pB.tmp" >> "$T/lane/train/progress.jsonl"
if a_allowed; then r=yes; else r=no; fi; check "A not allowed once B's file has an E4 line" "$r" "no"
mv "$T/lane/train/pB.bak" "$T/lane/train/progress.jsonl"; rm -f "$T/lane/train/pB.tmp"
touch "$T/lane/orchestrator/A-retired"; if a_allowed; then r=yes; else r=no; fi; check "A not allowed when retired" "$r" "no"; rm -f "$T/lane/orchestrator/A-retired"

# 7. drain: B up with E4 in its command and A now allowed -> stop B right after its next progress line
reset; t; check "drain started, B not stopped yet" "$(wc -l < "$FK/stops" | tr -d ' ')$( [ -n "$DRAIN_T0" ] && echo d)" "0d"
t; t; t; t; check "A not launched beside a B that holds E4" "$(launches_of kge-A1)" "0"
echo '{"step": "stageB", "unit": "E1/c04/s3/x", "status": "done"}' >> "$T/lane/train/progress.jsonl"
t; check "B stopped at the unit boundary with -t 2" "$(cat "$FK/stops")" "stop kge-B1 2"
t; t; t; t; lb=$(grep -- '--name kge-B1 ' "$FK/launches")
check "B relaunched without E4" "$(echo "$lb" | grep -c 'run --plan E1 E5 E2 E3; }')" "1"
t; t; t; check "then A launched" "$(launches_of kge-A1)" "1"
# adoption of an old-guard kge-B1 (command with E4)
echo '["sh","-c","mkdir -p /w/train/stageB; { python stageB.py run --plan E1 E5 E2 E3 && python detrun.py run E4; }; echo $? > /w/train/stageB/guard.rc"]' > "$FK/inspect_kge-B1"
echo kge-B1 > "$FK/ps"; reset; ps_names
mv "$FK/inspect_kge-B1" "$FK/inspect.keep"; adopt >/dev/null 2>&1; check "adopted B with an unreadable command counts as holding E4" "$B_ARMS" "E1,E5,E2,E3,E4"
echo '["sh","-c","mkdir -p /w/train/stageB; { python stageB.py run --plan E1 E5 E2 E3; }; echo $? > /w/train/stageB/guard.rc"]' > "$FK/inspect_kge-B1"
adopt >/dev/null 2>&1; check "adopted B without E4 in its command" "$B_ARMS" "E1,E5,E2,E3"
mv "$FK/inspect.keep" "$FK/inspect_kge-B1"; adopt >/dev/null 2>&1; check "adopted B holds E4" "$B_ARMS" "E1,E5,E2,E3,E4"
t; check "adopted B is drained, not stopped at once" "$(wc -l < "$FK/stops" | tr -d ' ')" "0"
DRAIN_MAX=0; t; check "drain timeout stops B (one unit redone)" "$(cat "$FK/stops")" "stop kge-B1 2"; DRAIN_MAX=600

# 8. disk (ruling 70) and a B-arm mismatch marker
t; t; t; t; t; t; t; t; reset; echo 9 > "$FK/df"; t
check "C: 9 GB while running: exit 4, A then B stopped" "$RC $(cat "$FK/stops" | awk '{print $2}' | tr '\n' ' ')" "4 kge-A1 kge-B1 "
echo 14 > "$FK/df"; reset; t; t; t; t; check "C: 14 GB: nothing launched" "$(wc -l < "$FK/launches" | tr -d ' ')" "0"
echo 15 > "$FK/df"; t; t; t; check "C: 15 GB: B launched" "$(launches_of kge-B1)" "1"
t; t; t; reset; touch "$TB/lane/orchestrator/sidebyside-stop-E1"; t
check "sidebyside-stop-E1 with E1 left: A stopped, B kept" "$(cat "$FK/stops" | awk '{print $2}' | tr '\n' ' ')" "kge-A1 "
t; t; t; t; check "and A not relaunched" "$(launches_of kge-A1)" "0"
rm -f "$TB/lane/orchestrator/sidebyside-stop-E1"
echo "RESULT $([ $FAIL = 0 ] && echo PASS || echo FAIL) test_guard_stageAB ($N checks)"
