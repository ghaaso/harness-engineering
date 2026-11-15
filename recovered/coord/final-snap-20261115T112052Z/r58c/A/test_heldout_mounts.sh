#!/bin/sh
# Agent A, r58c, ruling 94 (b): host check of train/heldout.sh's mounts (DRY=1 only: it prints the docker command and
# exits; no container, no docker run). For the held-out run (kge-H1), the probe (kge-H1P) and the rehearsal (kge-H1R,
# ARM E4): the -v flags in the command equal `node r58c/A/mounts.js flags <container> [ARM]` (one source,
# r58c/A/mounts-A.json), equal as a set the literal flags of the before bytes (r58c/A/pre/heldout_r93.sh: the mounts
# did not change, only where they come from), and no source is the repository or the whole build facts cache.
# The card checks kge-H1c / kge-H1Pc / kge-H1Rc must have no mount at all. C42 (round 9): kge-H1R mounts three files of
# r58c/A (rehearsal.py, inject_case.py, inject_kinds.py) in place of r58c/A whole; never r58c/A or r58c/A/logs.
# usage (Git Bash): sh r58c/A/test_heldout_mounts.sh   -> RESULT PASS|FAIL heldout-mounts
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
cd "$WB" || exit 2
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
for f in train/heldout.sh r58c/A/pre/heldout_r93.sh r58c/A/mounts-A.json r58c/A/mounts.js; do echo "sha256 $(sha256sum $f | cut -c1-64) $f"; done
vs() { grep -o ' -v [^ ]*' | sed 's/^ -v //' | sort; }
dry() { case $1 in kge-H1) DRY=1 sh $2 ;; kge-H1P) PROBE=1 DRY=1 sh $2 ;; kge-H1R) REHEARSAL=E4 DRY=1 sh $2 ;; esac; }
ok=1
for c in kge-H1 kge-H1P kge-H1R; do
  arm=; [ $c = kge-H1R ] && arm=E4
  now=$(dry $c train/heldout.sh | vs); file=$(node r58c/A/mounts.js flags $c $arm | tr ' ' '\n' | grep -v '^-v$' | grep . | sort)
  old=$(dry $c r58c/A/pre/heldout_r93.sh | vs)
  if [ $c = kge-H1R ]; then  # C42 (round 9): kge-H1R's r58c/A row is narrowed to the three files the rehearsal runs
    LW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
    old=$( { echo "$old" | grep -v "^$LW/r58c/A:/w/r58c/A:ro\$"; for f in rehearsal.py inject_case.py inject_kinds.py; do echo "$LW/r58c/A/$f:/w/r58c/A/$f:ro"; done; } | sort)
    whole=$(echo "$now" | grep -c -e "^$LW/r58c/A:" -e "^$LW/r58c/A/logs")
    pre=$(node -e 'const j=require(process.argv[1]);console.log(j["kge-H1R"].allow.filter(e=>/\/r58c\/A$/.test(e.src)).length)' "$WB/r58c/A/pre-r104/mounts-A.json")
    echo "kge-H1R: r58c/A whole or its logs mounted: $whole; fail before: the pre-r104 mounts-A.json (434f1793) had $pre row(s) of r58c/A whole"
    [ "$whole" = 0 ] && [ "$pre" = 1 ] || ok=0
  fi
  n=$(echo "$now" | grep -c .)
  bad=$(echo "$now" | grep -i -e "^C:/Users/User/Documents/projects/EMS_workshop1" -e "^$GB/facts/cache:" | head -1)
  cf=$(node r58c/A/mounts.js flags ${c}c | grep -c .)
  echo "$c: $n mounts; equal to mounts.js: $([ "$now" = "$file" ] && echo yes || echo NO); equal to the before bytes: $([ "$now" = "$old" ] && echo yes || echo NO); repo or whole cache: ${bad:-none}; card check ${c}c mounts: $cf"
  [ "$now" = "$file" ] && [ "$now" = "$old" ] && [ -z "$bad" ] && [ "$n" -gt 0 ] && [ "$cf" = 0 ] || ok=0
done
[ $ok = 1 ] && echo "RESULT PASS heldout-mounts" || echo "RESULT FAIL heldout-mounts"
[ $ok = 1 ]
