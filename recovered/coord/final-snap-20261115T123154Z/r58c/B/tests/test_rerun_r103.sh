#!/bin/sh
# Host test (stubs only, no container) of ruling 103(a) in r58c/B/rerun_check.sh (END-ORDER step 2c, change C18):
# a container reading above 3.5 GB is logged and reported after the check and is NOT a stop at any level (not at
# 3.9 GB either); the 10 GB card line, the time limit and three memgate low samples still stop it (exit 4).
# The launcher runs in a copy of the lane (r58c/B/rr103test/<case>/; a guard refuses a copy whose W=/WB=/WD= lines do
# not name it) against the fake docker (r58c/B/tests/fake_docker.sh, behind a wrapper that answers `docker stats`
# with $RT_STATS), a stub nvidia-smi ($RT_CARD MiB) and a stub memgate.sh (low answers per case).
#   after bytes: stats 3.95GiB -> exit 0, no docker stop, OVER-3.5GB logged, the REPORT line after "ended", and
#     over-3.5gb.txt written; card 11000 MiB -> exit 4 with a docker stop; RR_LIMIT=0 -> exit 4 (hard limit);
#     memgate low every sample -> exit 4 (three low samples); stats 100MiB -> exit 0 and no REPORT line.
#   before bytes (r58c/B/pre-r103/rerun_check.sh): stats 3.95GiB -> exit 4 with a docker stop (fail-before).
# usage: sh r58c/B/tests/test_rerun_r103.sh   (log: r58c/B/logs/test_rerun_r103.log)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
RT=$WB/r58c/B/rr103test; rm -rf "$RT"; mkdir -p "$RT/bin" $WB/r58c/B/logs
LOG=$WB/r58c/B/logs/test_rerun_r103.log; : > "$LOG"
cp $WB/r58c/B/tests/fake_docker.sh "$RT/bin/fake_docker.sh"
printf '#!/bin/sh\n[ "$1" = stats ] && { echo "${RT_STATS:-10MiB} / 4GiB"; exit 0; }\nexec sh %s/bin/fake_docker.sh "$@"\n' "$RT" > "$RT/bin/docker"
printf '#!/bin/sh\n/usr/bin/sleep 0.2\n' > "$RT/bin/sleep"
printf '#!/bin/sh\necho "Filesystem 1G-blocks Used Available Use%% Mounted"\necho "C: 500G 100G 400G 20%% /c"\n' > "$RT/bin/df"
printf '#!/bin/sh\necho ${RT_CARD:-100}\n' > "$RT/bin/nvidia-smi"
chmod +x "$RT/bin/"*
export PATH="$RT/bin:$PATH" DOCKER_HOST=tcp://127.0.0.1:9 RG_RACER=0
export RG_CPU_ID=sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711
export RG_GPU_ID=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7
[ "$(command -v docker)" = "$RT/bin/docker" ] || { echo "the fake docker is not first on PATH: $(command -v docker)" | tee -a "$LOG"; exit 3; }
fails=0; n=0
check() { n=$((n+1)); if [ "$2" = "$3" ]; then echo "PASS $1" | tee -a "$LOG"; else fails=$((fails+1)); echo "FAIL $1: got [$2] want [$3]" | tee -a "$LOG"; fi; }
echo "sha256 $(sha256sum $WB/r58c/B/rerun_check.sh | cut -c1-64) r58c/B/rerun_check.sh (after); $(sha256sum $WB/r58c/B/pre-r103/rerun_check.sh | cut -c1-64) r58c/B/pre-r103/rerun_check.sh (before)" | tee -a "$LOG"
mk() { # mk <case> <rerun_check.sh to copy> <low exit code: 0 = every sample low, 1 = never>
  d=$RT/$1; mkdir -p $d/r58c/B $d/orchestrator $d/state
  printf '#!/bin/sh\ncase "$1" in sample) echo "8000000 1000000" ;; low) exit %s ;; esac\nexit 0\n' "$3" > $d/orchestrator/memgate.sh
  DW=$(cd $d && pwd -W 2>/dev/null || cygpath -m $d)
  MSYS_NO_PATHCONV=1 node -e 'const fs=require("fs");const [src,dst,wb,ww,db,dw]=process.argv.slice(1);let s=fs.readFileSync(src,"utf8");s=s.split(ww).join(dw).split(wb).join(db);fs.writeFileSync(dst,s)' \
    "$(cygpath -m "$2")" "$(cygpath -m "$d/r58c/B/rerun_check.sh")" "$WB" "$WW" "$d" "$DW"
  grep -E "^(W|WB|WD)=" $d/r58c/B/rerun_check.sh | while IFS== read -r k v; do
    [ "$v" = "$d" ] || [ "$v" = "$DW" ] || { echo "GUARD: $d rerun_check.sh line $k=$v does not name the copy" | tee -a "$LOG"; exit 1; }
  done || exit 3
  cp $WB/r58c/B/race_gate.sh $WB/r58c/B/mounts.js $d/r58c/B/
  mkdir -p $d/r58c/B/rerun-out
  printf '{"kge-R1": {"step": "2c", "allow": [{"src": "%s/orchestrator", "dst": "/w/orchestrator", "mode": "ro"}, {"src": "%s/r58c/B/rerun-out", "dst": "/w/rerun-out", "mode": "rw"}]}}\n' "$DW" "$DW" > $d/r58c/B/mounts-B.json
}
go() { # go <case>: prints the exit code (124 = still running at the 120 s timeout)
  export RG_STATE=$RT/$1/state
  ( timeout 120 sh $RT/$1/r58c/B/rerun_check.sh > $RT/$1/out.txt 2>&1 ); echo $?
}
stops() { s_=$(grep -c '^docker stop' $RT/$1/state/calls.log 2>/dev/null); echo "${s_:-0}"; }
has() { grep -q "$2" $RT/$1/out.txt && echo yes || echo no; }
after_ended() { awk '/ ended rc=/{e=1} e&&/REPORT \(ruling 103\(a\)\)/{print "yes"; exit}' $RT/$1/out.txt | grep -q yes && echo yes || echo no; }
o35() { ls $RT/$1/r58c/B/rerun-out/*/over-3.5gb.txt >/dev/null 2>&1 && echo file || echo nofile; }

mk a-395 $WB/r58c/B/rerun_check.sh 1; rc=$(RT_STATS=3.95GiB go a-395)
check "after, the container at 3.95 GiB: exit 0, no docker stop" "rc$rc stops$(stops a-395)" "rc0 stops0"
check "after: OVER-3.5GB logged, the REPORT line comes after 'ended', over-3.5gb.txt written" "$(has a-395 'OVER-3.5GB: the container at 3.95GiB') $(after_ended a-395) $(o35 a-395)" "yes yes file"
check "after: no STOP line" "$(has a-395 'STOP:')" no
mk b-card $WB/r58c/B/rerun_check.sh 1; rc=$(RT_STATS=3.95GiB RT_CARD=11000 go b-card)
check "after, the card at 11000 MiB: exit 4 with a docker stop, the reason logged" "rc$rc stops$(stops b-card) $(has b-card 'STOP: the card at 11000 MiB')" "rc4 stops1 yes"
mk c-limit $WB/r58c/B/rerun_check.sh 1; rc=$(RR_LIMIT=0 go c-limit)
check "after, RR_LIMIT=0: exit 4 with a docker stop at the hard limit" "rc$rc stops$(stops c-limit) $(has c-limit 'STOP: the hard limit of 0 s')" "rc4 stops1 yes"
mk d-low $WB/r58c/B/rerun_check.sh 0; rc=$(go d-low)
# the fake container ends after three listings, so it is at most three loop passes: the third low sample stops it first
check "after, memgate low every sample: exit 4 at three low samples" "rc$rc $(has d-low 'STOP: three memgate low samples')" "rc4 yes"
mk e-low100 $WB/r58c/B/rerun_check.sh 1; rc=$(RT_STATS=100MiB go e-low100)
check "after, the container at 100 MiB: exit 0, no REPORT line, no over-3.5gb.txt, the peak logged" "rc$rc $(has e-low100 'REPORT (ruling 103') $(o35 e-low100) $(has e-low100 'container peak 100MiB (100 MiB')" "rc0 no nofile yes"
mk z-before $WB/r58c/B/pre-r103/rerun_check.sh 1; rc=$(RT_STATS=3.95GiB go z-before)
check "before (fail-before): pre-r103 stops at 3.95 GiB (exit 4, a docker stop)" "rc$rc stops$(stops z-before) $(has z-before 'STOP: the container at 3.95GiB')" "rc4 stops1 yes"
echo "RESULT $( [ $fails -eq 0 ] && echo PASS || echo FAIL ) rerun-r103 ($n checks)" | tee -a "$LOG"
[ $fails -eq 0 ]
