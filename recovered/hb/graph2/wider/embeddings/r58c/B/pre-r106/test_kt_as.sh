#!/bin/sh
# Host test (fake docker, no container) of r58c/B/ktest.sh's KT_AS mode (round 8, C8): KT_AS=ktest-r<N> starts the test
# container with EXACTLY ktest-r<N>'s list from mounts-B.json (r58c/B/mounts.js flags), every row read-only, and no
# other mount, and passes the .py inner file as python -c (base64), so a dry r58_guard sees what the real step sees.
# ktest.sh runs in a copy of the lane (r58c/B/ktas-test/<case>/; only the lane path differs; a guard refuses a copy whose
# W=/WB= lines do not name it) with a stub memgate.sh; the copy's mounts-B.json gives ktest-r1 two read-only rows and one
# writable row.
#   after: the run line holds exactly the three rows, each :ro (the writable one forced read-only), no /w/r58c/B/out,
#     no /w/export, no /repo, no /gt or /build mount, and `python -c` with the file's base64; the log and inspect files are
#     written; KT_AS with a .sh inner file, KT_AS naming no entry, and KT_AS with KT_TRAIN_RW are refused (exit 2, no run).
#   before (fail-before, r58c/B/pre-r101/ktest.sh): KT_AS is ignored: the run line mounts /w/r58c/B/out writable and
#     /w/export, as for any test.
#   C26 (round 8): the inspect record is taken BEFORE the release (its docker inspect call comes before the release in
#     the fake docker's call log); fail-before r58c/B/pre-r104/ktest.sh takes it after the container ended.
#   C21/C48 (ruling 103(d)): with ktest-r1's writable source missing, KT_AS creates nothing and leaves the row out;
#     fail-before r58c/B/pre-r104/ktest.sh with r58c/B/pre-r103/mounts.js creates train/selectB (how it was made at 08:13Z).
# usage: sh r58c/B/tests/test_kt_as.sh   (log: r58c/B/logs/test_kt_as.log)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
RT=$WB/r58c/B/ktas-test; rm -rf "$RT"; mkdir -p "$RT/bin" $WB/r58c/B/logs
LOG=$WB/r58c/B/logs/test_kt_as.log; : > "$LOG"
cp $WB/r58c/B/tests/fake_docker.sh "$RT/bin/docker"
printf '#!/bin/sh\nexit 0\n' > "$RT/bin/sleep"
chmod +x "$RT/bin/"*
export PATH="$RT/bin:$PATH" DOCKER_HOST=tcp://127.0.0.1:9 RG_RACER=0
export RG_CPU_ID=sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711
[ "$(command -v docker)" = "$RT/bin/docker" ] || { echo "the fake docker is not first on PATH: $(command -v docker)" | tee -a "$LOG"; exit 3; }
fails=0; n=0
check() { n=$((n+1)); if [ "$2" = "$3" ]; then echo "PASS $1" | tee -a "$LOG"; else fails=$((fails+1)); echo "FAIL $1: got [$2] want [$3]" | tee -a "$LOG"; fi; }
echo "sha256 $(sha256sum $WB/r58c/B/ktest.sh | cut -c1-64) r58c/B/ktest.sh (after); $(sha256sum $WB/r58c/B/pre-r101/ktest.sh | cut -c1-64) r58c/B/pre-r101/ktest.sh (before); $(sha256sum $WB/r58c/B/tests/dry_guard.py | cut -c1-64) r58c/B/tests/dry_guard.py" | tee -a "$LOG"
mk() { # mk <case> <ktest.sh to copy>
  d=$RT/$1; mkdir -p $d/r58c/B/tests $d/orchestrator $d/state $d/train $d/eval
  printf '#!/bin/sh\ncase "$1" in sample) echo "8000000 1000000" ;; esac\nexit 0\n' > $d/orchestrator/memgate.sh
  DW=$(cd $d && pwd -W 2>/dev/null || cygpath -m $d)
  MSYS_NO_PATHCONV=1 node -e 'const fs=require("fs");const [src,dst,wb,ww,db,dw]=process.argv.slice(1);let s=fs.readFileSync(src,"utf8");s=s.split(ww).join(dw).split(wb).join(db);fs.writeFileSync(dst,s)' \
    "$(cygpath -m "$2")" "$(cygpath -m "$d/r58c/B/ktest.sh")" "$WB" "$WW" "$d" "$DW"
  grep -E "^(W|WB)=" $d/r58c/B/ktest.sh | while IFS== read -r k v; do
    [ "$v" = "$d" ] || [ "$v" = "$DW" ] || { echo "GUARD: $d ktest.sh line $k=$v does not name the copy" | tee -a "$LOG"; exit 1; }
  done || exit 3
  cp $WB/r58c/B/race_gate.sh $WB/r58c/B/mounts.js $d/r58c/B/; cp $WB/r58c/B/tests/dry_guard.py $d/r58c/B/tests/; echo 'echo x' > $d/r58c/B/tests/x.sh
  mkdir -p $d/train/selectB
  printf '{"ktest-r1": {"step": "4", "allow": [{"src": "%s/train", "dst": "/w/train", "mode": "ro"}, {"src": "%s/eval", "dst": "/w/eval", "mode": "ro"}, {"src": "%s/train/selectB", "dst": "/w/train/selectB", "mode": "rw"}]}}\n' "$DW" "$DW" "$DW" > $d/r58c/B/mounts-B.json
}
go() { # go <case> <KT_AS> <inner> [KT_TRAIN_RW]: prints the exit code
  c=$1; export RG_STATE=$RT/$c/state
  ( KT_AS=$2 KT_TRAIN_RW=$4 sh $RT/$c/r58c/B/ktest.sh ktest-b99 "$3" > $RT/$c/out.txt 2>&1 ); echo $?
}
runline() { grep '^docker run' $RT/$1/state/calls.log 2>/dev/null | head -1; }
vs() { runline $1 | tr ' ' '\n' | awk 'p{print; p=0} $0=="-v"{p=1}' | sed "s#^$2/##" | tr '\n' ' '; }
mk a $WB/r58c/B/ktest.sh; DA=$(cd $RT/a && pwd -W); rc=$(go a ktest-r1 /w/r58c/B/tests/dry_guard.py)
check "after: KT_AS=ktest-r1 starts (exit 0)" "$rc" 0
check "after: exactly ktest-r1's three rows, each read-only (the writable row forced :ro), nothing else" "$(vs a $DA)" "train:/w/train:ro eval:/w/eval:ro train/selectB:/w/train/selectB:ro "
B64=$(base64 -w0 $RT/a/r58c/B/tests/dry_guard.py); case "$(runline a)" in *"python -c"*"$B64"*) v=yes ;; *) v=no ;; esac
check "after: the inner .py goes in as python -c with its base64" $v yes
case "$(runline a)" in *"/w/r58c/B/out"*|*":/w/export"*|*":/repo"*|*":/gt/"*|*":/build/"*) v=extra ;; *) v=none ;; esac; check "after: no other mount (out, export, repo, gt, build)" $v none
[ -f $RT/a/r58c/B/out/logs/ktest-b99-as-ktest-r1.log ] && [ -f $RT/a/r58c/B/out/logs/ktest-b99-as-ktest-r1.inspect.json ] && v=yes || v=no
check "after: the container's log and inspect record are saved under r58c/B/out/logs/" $v yes
mk b $WB/r58c/B/ktest.sh; rc=$(go b ktest-r1 /w/r58c/B/tests/x.sh); check "after: KT_AS with a .sh inner file is refused (exit 2, no run)" "$rc $(runline b | wc -c | tr -d ' ')" "2 0"
mk c $WB/r58c/B/ktest.sh; rc=$(go c ktest-r7 /w/r58c/B/tests/dry_guard.py); check "after: KT_AS naming no entry is refused (exit 2, no run)" "$rc $(runline c | wc -c | tr -d ' ')" "2 0"
mk e $WB/r58c/B/ktest.sh; rc=$(go e ktest-r1 /w/r58c/B/tests/dry_guard.py report); check "after: KT_AS with KT_TRAIN_RW is refused (exit 2, no run)" "$rc $(runline e | wc -c | tr -d ' ')" "2 0"
mk z $WB/r58c/B/pre-r101/ktest.sh; DZ=$(cd $RT/z && pwd -W); rc=$(go z ktest-r1 /w/r58c/B/tests/x.sh)
case "$(runline z)" in *"$DZ/r58c/B/out:/w/r58c/B/out "*) o=rw ;; *) o=no ;; esac; case "$(runline z)" in *":/w/export:ro"*) e=yes ;; *) e=no ;; esac
check "before (fail-before): pre-r101 ignores KT_AS: r58c/B/out writable and export mounted" "$rc $o $e" "0 rw yes"
order() { # order <case>: "before" when the docker inspect of the container comes before its release in the call log
  awk '/^docker inspect ktest-b99$/{if(!i)i=NR} /^EVENT release/{if(!r)r=NR} END{print (i&&r&&i<r)?"before":(i&&r?"after":"none")}' $RT/$1/state/calls.log; }
check "C26 after: the inspect record is saved before the release" "$(order a)" before
grep -q 'saved before the release' $RT/a/out.txt && v=yes || v=no; check "C26 after: the save is logged with its sha256" $v yes
mk y $WB/r58c/B/pre-r104/ktest.sh; rc=$(go y ktest-r1 /w/r58c/B/tests/dry_guard.py)
check "C26 before (fail-before): pre-r104 takes the inspect after the release (the container is gone by then)" "$rc $(order y)" "0 after"
mk f $WB/r58c/B/ktest.sh; rm -rf $RT/f/train/selectB; DF=$(cd $RT/f && pwd -W); rc=$(go f ktest-r1 /w/r58c/B/tests/dry_guard.py)
[ -e $RT/f/train/selectB ] && v=created || v=absent
check "C21 after: KT_AS with ktest-r1's writable source missing creates nothing and leaves the row out (exit 0)" "$rc $v $(vs f $DF)" "0 absent train:/w/train:ro eval:/w/eval:ro "
grep -q 'left out (source missing, nothing created).*train/selectB -> /w/train/selectB (rw)' $RT/f/out.txt && v=yes || v=no; check "C21 after: the row left out is named" $v yes
mk x $WB/r58c/B/pre-r104/ktest.sh; cp $WB/r58c/B/pre-r103/mounts.js $RT/x/r58c/B/mounts.js; rm -rf $RT/x/train/selectB; rc=$(go x ktest-r1 /w/r58c/B/tests/dry_guard.py)
[ -d $RT/x/train/selectB ] && v=created || v=absent
check "C21 before (fail-before): pre-r104 ktest.sh with pre-r103 mounts.js creates train/selectB for a test container" "$rc $v" "0 created"
echo "RESULT $( [ $fails -eq 0 ] && echo PASS || echo FAIL ) kt-as ($n checks)" | tee -a "$LOG"
[ $fails -eq 0 ]
