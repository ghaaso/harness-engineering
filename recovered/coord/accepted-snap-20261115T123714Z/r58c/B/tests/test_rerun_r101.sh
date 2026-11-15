#!/bin/sh
# Host test (stubs only, no container) of round 8's two changes to r58c/B/rerun_check.sh (END-ORDER step 2c):
#   C16: it takes r58c/ktest.lock before anything else and frees it on exit; while the lock is held it waits (never
#        treats the lock as stale) and starts nothing;
#   ruling 100: kge-R1 runs under -m 4g --memory-swap 4g (ruling 79's start rule unchanged: three samples, 6 GB free,
#        commit under 38 GB).
# The launcher runs in a copy of the lane (r58c/B/rr101test/<case>/; only the lane path differs, a guard refuses a copy
# whose W=/WB=/WD= lines do not name it) against the fake docker (r58c/B/tests/fake_docker.sh) and a stub memgate.sh.
#   after bytes: lock free -> exit 0, "took r58c/ktest.lock" logged, the docker run line has -m 4g --memory-swap 4g, the
#     lock is freed after; lock held -> still waiting after 20 s (timeout), no docker run, the lock left as it was.
#   before bytes (r58c/B/pre-r101/rerun_check.sh): with the lock held it starts kge-R1 anyway (a docker run), and its
#     run line has -m 2560m (fail before, both points).
# usage: sh r58c/B/tests/test_rerun_r101.sh   (log: r58c/B/logs/test_rerun_r101.log)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
RT=$WB/r58c/B/rr101test; rm -rf "$RT"; mkdir -p "$RT/bin" $WB/r58c/B/logs
LOG=$WB/r58c/B/logs/test_rerun_r101.log; : > "$LOG"
cp $WB/r58c/B/tests/fake_docker.sh "$RT/bin/docker"
printf '#!/bin/sh\n/usr/bin/sleep 0.2\n' > "$RT/bin/sleep"   # every wait of the launcher shortened (a held lock still spins slowly)
printf '#!/bin/sh\necho "Filesystem 1G-blocks Used Available Use%% Mounted"\necho "C: 500G 100G 400G 20%% /c"\n' > "$RT/bin/df"
printf '#!/bin/sh\necho 100\n' > "$RT/bin/nvidia-smi"
chmod +x "$RT/bin/"*
export PATH="$RT/bin:$PATH" DOCKER_HOST=tcp://127.0.0.1:9 RG_RACER=0
export RG_CPU_ID=sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711
export RG_GPU_ID=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7
[ "$(command -v docker)" = "$RT/bin/docker" ] || { echo "the fake docker is not first on PATH: $(command -v docker)" | tee -a "$LOG"; exit 3; }
fails=0; n=0
check() { n=$((n+1)); if [ "$2" = "$3" ]; then echo "PASS $1" | tee -a "$LOG"; else fails=$((fails+1)); echo "FAIL $1: got [$2] want [$3]" | tee -a "$LOG"; fi; }
echo "sha256 $(sha256sum $WB/r58c/B/rerun_check.sh | cut -c1-64) r58c/B/rerun_check.sh (after); $(sha256sum $WB/r58c/B/pre-r101/rerun_check.sh | cut -c1-64) r58c/B/pre-r101/rerun_check.sh (before)" | tee -a "$LOG"
mk() { # mk <case> <rerun_check.sh to copy>
  d=$RT/$1; mkdir -p $d/r58c/B $d/orchestrator $d/state
  printf '#!/bin/sh\ncase "$1" in sample) echo "8000000 1000000" ;; low) exit 1 ;; esac\nexit 0\n' > $d/orchestrator/memgate.sh
  DW=$(cd $d && pwd -W 2>/dev/null || cygpath -m $d)
  MSYS_NO_PATHCONV=1 node -e 'const fs=require("fs");const [src,dst,wb,ww,db,dw]=process.argv.slice(1);let s=fs.readFileSync(src,"utf8");s=s.split(ww).join(dw).split(wb).join(db);fs.writeFileSync(dst,s)' \
    "$(cygpath -m "$2")" "$(cygpath -m "$d/r58c/B/rerun_check.sh")" "$WB" "$WW" "$d" "$DW"
  grep -E "^(W|WB|WD)=" $d/r58c/B/rerun_check.sh | while IFS== read -r k v; do
    [ "$v" = "$d" ] || [ "$v" = "$DW" ] || { echo "GUARD: $d rerun_check.sh line $k=$v does not name the copy" | tee -a "$LOG"; exit 1; }
  done || exit 3
  cp $WB/r58c/B/race_gate.sh $WB/r58c/B/mounts.js $d/r58c/B/
  printf '{"kge-R1": {"step": "2c", "allow": [{"src": "%s/orchestrator", "dst": "/w/orchestrator", "mode": "ro"}, {"src": "%s/r58c/B/rerun-out", "dst": "/w/rerun-out", "mode": "rw"}]}}\n' "$DW" "$DW" > $d/r58c/B/mounts-B.json
}
go() { # go <case> <seconds>: prints the exit code (124 = still running at the timeout)
  c=$1; export RG_STATE=$RT/$c/state
  ( timeout $2 sh $RT/$c/r58c/B/rerun_check.sh > $RT/$c/out.txt 2>&1 ); echo $?
}
runs() { r_=$(grep -c '^EVENT run' $RT/$1/state/calls.log 2>/dev/null); echo "${r_:-0}"; }
runline() { grep '^docker run' $RT/$1/state/calls.log 2>/dev/null | head -1; }
cap() { case "$(runline $1)" in *" -m 4g --memory-swap 4g "*) echo 4g ;; *" -m 2560m --memory-swap 2560m "*) echo 2560m ;; "") echo none ;; *) echo other ;; esac; }
lockd() { [ -d $RT/$1/r58c/ktest.lock ] && echo held || echo free; }

mk a-free $WB/r58c/B/rerun_check.sh; rc=$(go a-free 120)
check "after, lock free: exit 0, one docker run, the cap 4g, the lock freed after" "rc$rc runs$(runs a-free) $(cap a-free) $(lockd a-free)" "rc0 runs1 4g free"
grep -q 'took r58c/ktest.lock (C16)' $RT/a-free/out.txt && v=yes || v=no; check "after: taking the lock is logged" $v yes

mk b-held $WB/r58c/B/rerun_check.sh; mkdir $RT/b-held/r58c/ktest.lock; rc=$(go b-held 20)
check "after, lock held: still waiting at the timeout, no docker run, the lock left held" "rc$rc runs$(runs b-held) $(lockd b-held)" "rc124 runs0 held"
grep -q 'r58c/ktest.lock held; retry in 30 s' $RT/b-held/out.txt && v=yes || v=no; check "after: the wait is logged" $v yes
grep -q '^docker image' $RT/b-held/state/calls.log 2>/dev/null && v=yes || v=no
check "after, lock held: only the image check ran before the lock (no ps, no memgate, no run)" "$v $(grep -c '^docker ps' $RT/b-held/state/calls.log 2>/dev/null | tr -d ' ')" "yes 0"

mk z-before $WB/r58c/B/pre-r101/rerun_check.sh; mkdir $RT/z-before/r58c/ktest.lock; rc=$(go z-before 120)
check "before (fail-before): pre-r101 starts kge-R1 although the lock is held" "rc$rc runs$(runs z-before)" "rc0 runs1"
check "before (fail-before): pre-r101's cap is 2560m" "$(cap z-before)" 2560m
echo "RESULT $( [ $fails -eq 0 ] && echo PASS || echo FAIL ) rerun-r101 ($n checks)" | tee -a "$LOG"
[ $fails -eq 0 ]
