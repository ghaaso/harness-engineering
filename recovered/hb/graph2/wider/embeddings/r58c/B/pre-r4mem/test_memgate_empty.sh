#!/bin/sh
# Host test (stubs only, no container) of the MEMGATE_EMPTY refusal (coordinator, END-ORDER review of 1cdcb6e7, item 1):
# r58c/B/ktest.sh, lane_step.sh and rerun_check.sh take ONE memgate sample before `memgate.sh wait` and stop with exit 9
# when it is empty, one field, or not numbers, instead of waiting. Each launcher runs in a copy of the lane
# (r58c/B/memtest/<case>/; only the lane path differs, and a guard refuses any copy whose W=/WB=/WD= lines do not name
# the copy) against the fake docker (r58c/B/tests/fake_docker.sh first on PATH, DOCKER_HOST closed) and a stub
# memgate.sh that prints $MG_SAMPLE for `sample`, returns at once for `wait`, and logs every call.
#   after bytes: exit 9, MEMGATE_EMPTY in the output, exactly one `sample` call, no `wait`, no `docker run`, the copy's
#     lock freed; a good sample ("8000000 1000000") still starts (no regression).
#   before bytes (r58c/B/pre-memgate/): an empty sample does not stop them: they call `memgate.sh wait` (fail before).
# end_of_run.sh's exit 14 is tested in r58c/B/eor/test_end_of_run.sh (case M, a stub powershell on PATH).
# usage: sh r58c/B/tests/test_memgate_empty.sh   (log: r58c/B/logs/test_memgate_empty.log)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
RT=$WB/r58c/B/memtest; rm -rf "$RT"; mkdir -p "$RT/bin" $WB/r58c/B/logs
LOG=$WB/r58c/B/logs/test_memgate_empty.log; : > "$LOG"
cp $WB/r58c/B/tests/fake_docker.sh "$RT/bin/docker"
printf '#!/bin/sh\nexit 0\n' > "$RT/bin/sleep"
printf '#!/bin/sh\necho "Filesystem 1G-blocks Used Available Use%% Mounted"\necho "C: 500G 100G 400G 20%% /c"\n' > "$RT/bin/df"
printf '#!/bin/sh\necho 100\n' > "$RT/bin/nvidia-smi"
chmod +x "$RT/bin/"*
export PATH="$RT/bin:$PATH" DOCKER_HOST=tcp://127.0.0.1:9 RG_RACER=0
export RG_CPU_ID=sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711
export RG_GPU_ID=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7
[ "$(command -v docker)" = "$RT/bin/docker" ] || { echo "the fake docker is not first on PATH: $(command -v docker)" | tee -a "$LOG"; exit 3; }
fails=0; n=0
check() { n=$((n+1)); if [ "$2" = "$3" ]; then echo "PASS $1" | tee -a "$LOG"; else fails=$((fails+1)); echo "FAIL $1: got [$2] want [$3]" | tee -a "$LOG"; fi; }
echo "sha256 $(sha256sum $WB/r58c/B/race_gate.sh | cut -c1-64) r58c/B/race_gate.sh" | tee -a "$LOG"
for f in ktest.sh lane_step.sh rerun_check.sh; do echo "sha256 $(sha256sum $WB/r58c/B/$f | cut -c1-64) r58c/B/$f (after); $(sha256sum $WB/r58c/B/pre-memgate/$f | cut -c1-64) r58c/B/pre-memgate/$f (before)" | tee -a "$LOG"; done
mk() { # mk <case> <src dir>: a lane copy with the stub memgate.sh
  d=$RT/$1; mkdir -p $d/r58c/B $d/orchestrator $d/state
  printf '#!/bin/sh\necho "$1" >> "%s/memgate.calls"\ncase "$1" in sample) [ -n "$MG_SAMPLE" ] && echo "$MG_SAMPLE" ;; low) exit 1 ;; *) exit 0 ;; esac\nexit 0\n' "$d" > $d/orchestrator/memgate.sh
  DW=$(cd $d && pwd -W 2>/dev/null || cygpath -m $d)
  for f in ktest.sh lane_step.sh rerun_check.sh; do
    MSYS_NO_PATHCONV=1 node -e 'const fs=require("fs");const [src,dst,wb,ww,db,dw]=process.argv.slice(1);let s=fs.readFileSync(src,"utf8");s=s.split(ww).join(dw).split(wb).join(db);fs.writeFileSync(dst,s)' \
      "$(cygpath -m "$2/$f")" "$(cygpath -m "$d/r58c/B/$f")" "$WB" "$WW" "$d" "$DW"
    grep -E "^(W|WB|WD)=" $d/r58c/B/$f | while IFS== read -r k v; do
      [ "$v" = "$d" ] || [ "$v" = "$DW" ] || { echo "GUARD: $d/r58c/B/$f line $k=$v does not name the copy" | tee -a "$LOG"; exit 1; }
    done || exit 3
  done
  cp $2/race_gate.sh $d/r58c/B/race_gate.sh
  cp $WB/r58c/B/mounts.js $d/r58c/B/mounts.js  # ruling 94: the copy's launchers read the copy's own mounts file
  printf '{"ktest-r99": {"step": "test", "allow": [{"src": "%s/r58c", "dst": "/w/r58c", "mode": "ro"}]},\n "kge-R1": {"step": "test", "allow": [{"src": "%s/orchestrator", "dst": "/w/orchestrator", "mode": "ro"}, {"src": "%s/r58c/B/rerun-out", "dst": "/w/rerun-out", "mode": "rw"}]}}\n' "$DW" "$DW" "$DW" > $d/r58c/B/mounts-B.json
}
go() { # go <case> <script> <sample>: prints the exit code
  c=$1; s=$2; export MG_SAMPLE="$3" RG_STATE=$RT/$c/state
  case $s in
    ktest.sh) ( sh $RT/$c/r58c/B/$s ktest-b99 /w/r58c/B/tests/none.sh > $RT/$c/out.txt 2>&1 ); echo $? ;;
    lane_step.sh) case $c in *-before) set -- ktest-r99 x "echo hi" ;; *) set -- ktest-r99 "echo hi" ;; esac  # ruling 94: two arguments after
      ( sh $RT/$c/r58c/B/$s "$@" > $RT/$c/out.txt 2>&1 ); echo $? ;;
    *) ( sh $RT/$c/r58c/B/$s > $RT/$c/out.txt 2>&1 ); echo $? ;;
  esac
}
calls() { tr '\n' ',' < $RT/$1/memgate.calls 2>/dev/null | sed 's/,$//'; }
runs() { r_=$(grep -c '^EVENT run' $RT/$1/state/calls.log 2>/dev/null); echo "${r_:-0}"; }  # grep -c prints 0 and exits 1 on no match
for s in ktest.sh lane_step.sh rerun_check.sh; do
  b=${s%.sh}; i=0
  for smp in "" "123" "abc 12" "12 3x"; do
    i=$((i+1)); c=$b-after-$i; mk $c $WB/r58c/B
    rc=$(go $c $s "$smp")
    check "$s after, sample [$smp]: exit 9 MEMGATE_EMPTY, one sample, no wait, no docker run" \
      "rc$rc $(grep -c MEMGATE_EMPTY $RT/$c/out.txt) [$(calls $c)] runs$(runs $c)" "rc9 1 [sample] runs0"
  done
  [ $s = rerun_check.sh ] || check "$s after: the copy's lock is freed on exit 9" "$(ls -d $RT/$b-after-1/r58c/ktest.lock 2>/dev/null | wc -l | tr -d ' ')" "0"
  c=$b-after-good; mk $c $WB/r58c/B; rc=$(go $c $s "8000000 1000000")
  check "$s after, a good sample: it starts (no regression)" "rc$rc runs$(runs $c)" "rc0 runs1"
  c=$b-before; mk $c $WB/r58c/B/pre-memgate; rc=$(go $c $s "")
  check "$s before (fail-before): an empty sample does not stop it; it calls memgate.sh wait" "$(calls $c | tr ',' '\n' | grep -c '^wait$')" "1"
done
# ktest.sh's three-sample loop (change 3) must keep the inner script's arguments (ktest-b32, 2026-11-14T23:48Z: the
# before bytes r58c/B/pre-argfix/ktest.sh ran role_report.sh with the sample's two numbers instead of p2)
for k in after before; do
  src=$WB/r58c/B; [ $k = before ] && src=$WB/r58c/B/pre-argfix
  c=ktest-args-$k; mk $c $src; export MG_SAMPLE="8000000 1000000" RG_STATE=$RT/$c/state
  ( sh $RT/$c/r58c/B/ktest.sh ktest-b99 /w/r58c/B/tests/none.sh p2 x > $RT/$c/out.txt 2>&1 )
  tail_=$(grep '^docker run' $RT/$c/state/calls.log | head -1 | awk '{print $(NF-2), $(NF-1), $NF}')
  if [ $k = after ]; then check "ktest.sh after: docker run passes the inner script's arguments (p2 x)" "$tail_" "/w/r58c/B/tests/none.sh p2 x"
  else check "ktest.sh before (fail-before): the sample's numbers replaced the arguments" "$tail_" "/w/r58c/B/tests/none.sh 8000000 1000000"; fi
done
# KT_TRAIN_RW (round 3, note 11 (a)): only selectB-test and report become writable train mounts, only when named;
# anything else is exit 2 before any docker call (before bytes r58c/B/pre-ktrw/ktest.sh: no writable train mount at all)
rwl() { grep '^docker run' $RT/$1/state/calls.log 2>/dev/null | head -1 | tr ' ' '
' | grep -c "^[^ ]*:/w/train/$2$"; }
for k in after before; do
  src=$WB/r58c/B; [ $k = before ] && src=$WB/r58c/B/pre-ktrw
  c=ktest-rw-$k; mk $c $src; export MG_SAMPLE="8000000 1000000" RG_STATE=$RT/$c/state
  ( KT_TRAIN_RW="selectB-test report" sh $RT/$c/r58c/B/ktest.sh ktest-b99 /w/r58c/B/tests/none.sh > $RT/$c/out.txt 2>&1 )
  if [ $k = after ]; then check "ktest.sh after: KT_TRAIN_RW mounts train/selectB-test and train/report writable" "$(rwl $c selectB-test) $(rwl $c report)" "1 1"
  else check "ktest.sh before (fail-before): no writable train/selectB-test or train/report mount" "$(rwl $c selectB-test) $(rwl $c report)" "0 0"; fi
done
c=ktest-rw-none; mk $c $WB/r58c/B; export MG_SAMPLE="8000000 1000000" RG_STATE=$RT/$c/state
( sh $RT/$c/r58c/B/ktest.sh ktest-b99 /w/r58c/B/tests/none.sh > $RT/$c/out.txt 2>&1 )
check "ktest.sh after: without KT_TRAIN_RW no train folder is writable" "$(rwl $c selectB-test) $(rwl $c report) $(grep '^docker run' $RT/$c/state/calls.log | head -1 | grep -c ':/w/train:ro ')" "0 0 1"
c=ktest-rw-bad; mk $c $WB/r58c/B; export MG_SAMPLE="8000000 1000000" RG_STATE=$RT/$c/state
( KT_TRAIN_RW="report stageB" sh $RT/$c/r58c/B/ktest.sh ktest-b99 /w/r58c/B/tests/none.sh > $RT/$c/out.txt 2>&1 ); rc_=$?
check "ktest.sh after: KT_TRAIN_RW=stageB is refused (exit 2), no docker run, no lock left" "rc$rc_ runs$(runs $c) $(ls -d $RT/$c/r58c/ktest.lock 2>/dev/null | wc -l | tr -d ' ')" "rc2 runs0 0"
check "no stray real docker call" "$(grep -l 'error during connect\|Cannot connect' $RT/*/out.txt 2>/dev/null | wc -l | tr -d ' ')" "0"
if [ $fails -eq 0 ]; then echo "RESULT PASS memgate-empty ($n checks)" | tee -a "$LOG"; rm -rf "$RT"; else echo "RESULT FAIL memgate-empty ($fails of $n)" | tee -a "$LOG"; exit 1; fi
