#!/bin/sh
# Host test of the start race (round r58c, after the 2026-11-14 reset): r58c/B/ktest.sh, lane_step.sh and
# rerun_check.sh, on their before bytes (r58c/B/pre-race/) and their after bytes, each run in a copy of the lane
# (r58c/B/racetest/<case>/; the copies differ from the originals only in the lane path) against a FAKE docker
# (r58c/B/tests/fake_docker.sh first on PATH; DOCKER_HOST points at a closed port so a stray real call fails), with
# fake sleep, df, nvidia-smi and memgate.sh. No container starts; a guard refuses any copy whose W=/WB=/WD= lines do
# not name the copy, so the real r58c/ktest.lock and memgate.sh are never reached.
#   race: a twin ktest-G40 is listed from the launcher's first `docker run` (both passed the pre-check together).
#     after bytes: the first container is removed before its release and never waited for; the second start is
#     released and runs. before bytes: the first container runs (wait/done) beside the twin -> the check fails.
#   alone: no twin: after bytes start once, release once, run once (no regression).
# usage: sh r58c/B/tests/test_race_gate.sh   (log: r58c/B/logs/test_race_gate.log)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
RT=$WB/r58c/B/racetest; rm -rf "$RT"; mkdir -p "$RT/bin" $WB/r58c/B/logs
LOG=$WB/r58c/B/logs/test_race_gate.log; : > "$LOG"
cp $WB/r58c/B/tests/fake_docker.sh "$RT/bin/docker"
printf '#!/bin/sh\nexit 0\n' > "$RT/bin/sleep"
printf '#!/bin/sh\necho "Filesystem 1G-blocks Used Available Use%% Mounted"\necho "C: 500G 100G 400G 20%% /c"\n' > "$RT/bin/df"
printf '#!/bin/sh\necho 100\n' > "$RT/bin/nvidia-smi"
chmod +x "$RT/bin/"*
export PATH="$RT/bin:$PATH" DOCKER_HOST=tcp://127.0.0.1:9
export RG_CPU_ID=sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711
export RG_GPU_ID=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7
[ "$(command -v docker)" = "$RT/bin/docker" ] || { echo "the fake docker is not first on PATH: $(command -v docker)" | tee -a "$LOG"; exit 3; }
fails=0; n=0
check() { n=$((n+1)); if [ "$2" = "$3" ]; then echo "PASS $1" | tee -a "$LOG"; else fails=$((fails+1)); echo "FAIL $1: got [$2] want [$3]" | tee -a "$LOG"; fi; }
echo "sha256 $(sha256sum $WB/r58c/B/race_gate.sh | cut -c1-64) r58c/B/race_gate.sh" | tee -a "$LOG"
for f in ktest.sh lane_step.sh rerun_check.sh; do echo "sha256 $(sha256sum $WB/r58c/B/$f | cut -c1-64) r58c/B/$f (after); $(sha256sum $WB/r58c/B/pre-race/$f | cut -c1-64) r58c/B/pre-race/$f (before)" | tee -a "$LOG"; done
# lane copy: <case>/r58c/B/<script> and race_gate.sh, <case>/orchestrator/memgate.sh (fake), paths rewritten
mk() { # mk <case> <src dir>
  d=$RT/$1; mkdir -p $d/r58c/B $d/orchestrator $d/state
  printf '#!/bin/sh\ncase "$1" in sample) echo 8000000 1000000 ;; low) exit 1 ;; *) exit 0 ;; esac\n' > $d/orchestrator/memgate.sh
  DW=$(cd $d && pwd -W 2>/dev/null || cygpath -m $d)
  for f in ktest.sh lane_step.sh rerun_check.sh; do
    MSYS_NO_PATHCONV=1 node -e 'const fs=require("fs");const [src,dst,wb,ww,db,dw]=process.argv.slice(1);let s=fs.readFileSync(src,"utf8");s=s.split(ww).join(dw).split(wb).join(db);fs.writeFileSync(dst,s)' \
      "$(cygpath -m "$2/$f")" "$(cygpath -m "$d/r58c/B/$f")" "$WB" "$WW" "$d" "$DW"
  done
  cp $WB/r58c/B/race_gate.sh $d/r58c/B/race_gate.sh
  # guard (after a rewrite bug once let a copy take the REAL r58c/ktest.lock): every W=/WB=/WD= line of every copy
  # must name the copy itself, else nothing runs
  for f in ktest.sh lane_step.sh rerun_check.sh; do
    grep -E "^(W|WB|WD)=" $d/r58c/B/$f | while IFS== read -r k v; do
      [ "$v" = "$d" ] || [ "$v" = "$DW" ] || { echo "GUARD: $d/r58c/B/$f line $k=$v does not name the copy" | tee -a "$LOG"; exit 1; }
    done || exit 3
  done
}
go() { # go <case> <script> <racer 0|1> [args]: runs the copy, prints its exit code
  c=$1; s=$2; export RG_RACER=$3; shift 3; export RG_STATE=$RT/$c/state
  ( sh $RT/$c/r58c/B/$s "$@" > $RT/$c/out.txt 2>&1 ); echo $?
}
ev() { grep '^EVENT' $RT/$1/state/calls.log | sed 's/^EVENT //' | tr '\n' ',' ; }
for s in ktest.sh lane_step.sh rerun_check.sh; do
  case $s in
    ktest.sh) A="ktest-b99 /w/r58c/B/tests/none.sh" ;;
    lane_step.sh) A='ktest-r99 x' ;;
    rerun_check.sh) A="" ;;
  esac
  b=${s%.sh}
  for k in after before; do src=$WB/r58c/B; [ $k = before ] && src=$WB/r58c/B/pre-race; mk $b-$k-race $src; mk $b-$k-alone $src; done
  if [ $s = lane_step.sh ]; then
    rc=$(go $b-after-race $s 1 ktest-r99 x "echo hi"); e=$(ev $b-after-race)
  elif [ $s = ktest.sh ]; then rc=$(go $b-after-race $s 1 ktest-b99 /w/r58c/B/tests/none.sh); e=$(ev $b-after-race)
  else rc=$(go $b-after-race $s 1); e=$(ev $b-after-race); fi
  echo "$s after race: rc $rc events $e" >> "$LOG"
  ok=$(echo "$e" | awk -v RS=, '/^run 1 gated 1/{r1=1} /^(wait|done|release) 1$/{bad=1} /^rm 1$/{if(!r2)rm1=1} /^run 2 gated 1/{r2=1} /^release 2$/{if(r2&&!w2)rel2=1} /^(wait|done) 2$/{if(rel2)w2=1} END{print (r1&&rm1&&r2&&rel2&&w2&&!bad)?"safe":"unsafe"}')
  check "$s after: the twin seen after the start, the first container removed unreleased, the retry released and run" "$ok rc$rc" "safe rc0"
  if [ $s = lane_step.sh ]; then rc=$(go $b-before-race $s 1 ktest-r99 x "echo hi")
  elif [ $s = ktest.sh ]; then rc=$(go $b-before-race $s 1 ktest-b99 /w/r58c/B/tests/none.sh)
  else rc=$(go $b-before-race $s 1); fi
  e=$(ev $b-before-race); echo "$s before race: rc $rc events $e" >> "$LOG"
  ran1=$(echo "$e" | tr ',' '\n' | grep -cE '^(wait|done) 1$')
  check "$s before (fail-before): the first container ran beside the twin" "$ran1" "1"
  if [ $s = lane_step.sh ]; then rc=$(go $b-after-alone $s 0 ktest-r99 x "echo hi")
  elif [ $s = ktest.sh ]; then rc=$(go $b-after-alone $s 0 ktest-b99 /w/r58c/B/tests/none.sh)
  else rc=$(go $b-after-alone $s 0); fi
  e=$(ev $b-after-alone); echo "$s after alone: rc $rc events $e" >> "$LOG"
  check "$s after, no twin: one start, released, run" "rc$rc $(echo "$e" | sed 's/,$//')" "rc0 run 1 gated 1 racer_listed 0,release 1,$( [ $s = rerun_check.sh ] && echo 'done 1' || echo 'wait 1')$( [ $s != rerun_check.sh ] && echo ',rm 1')"
  check "$s after: the command passed to docker run waits for /tmp/go" "$(grep -c '^docker run .*until \[ -f /tmp/go \]' $RT/$b-after-alone/state/calls.log)" "1"
done
check "no stray real docker call (DOCKER_HOST closed; the fake logged every call)" "$(grep -l 'error during connect\|Cannot connect' $RT/*/out.txt 2>/dev/null | wc -l | tr -d ' ')" "0"
if [ $fails -eq 0 ]; then echo "RESULT PASS race-gate ($n checks)" | tee -a "$LOG"; rm -rf "$RT"; else echo "RESULT FAIL race-gate ($fails of $n)" | tee -a "$LOG"; exit 1; fi
