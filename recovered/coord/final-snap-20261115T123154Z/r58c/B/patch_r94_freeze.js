// agent B, round r58c, end-order-changes-2 changes 1 and 8: the freeze list takes the tune staging manifest and holds
// r58c/A/*.py, r58c/A/*.sh, r58c/B/eor/*, the mounts files and every file under train/stageB/parts/; freeze_check
// also compares the set of part files with the list. Run once from LANE: node r58c/B/patch_r94_freeze.js
const fs = require('fs');
function patch(p, pairs) { let s = fs.readFileSync(p, 'utf8'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(p + ': no match: ' + a.slice(0, 70)); s = s.replace(a, () => b); } fs.writeFileSync(p, s); console.log('patched', p); }
patch('r58c/B/freeze_list.sh', [
  ['# usage: sh freeze_list.sh <STAGING MANIFEST> <GRAPHS MANIFEST>  > orchestrator/freeze-list.txt\n#   both manifests are step 2f\'s, lane-relative; exit 2 when either is missing,',
   '# usage: sh freeze_list.sh <STAGING MANIFEST> <GRAPHS MANIFEST> <TUNE STAGING MANIFEST>  > orchestrator/freeze-list.txt.part\n#   (then mv to orchestrator/freeze-list.txt only on exit 0). The three manifests are step 2f\'s, lane-relative (the\n#   held-out staging, the held-out graphs, and the tuning staging of ruling 94(b)); exit 2 when one is missing,'],
  ['[ $# -eq 2 ] || { echo "usage: sh freeze_list.sh <STAGING MANIFEST> <GRAPHS MANIFEST>" >&2; exit 2; }',
   '[ $# -eq 3 ] || { echo "usage: sh freeze_list.sh <STAGING MANIFEST> <GRAPHS MANIFEST> <TUNE STAGING MANIFEST>" >&2; exit 2; }'],
  ['for m in "$1" "$2"; do', 'for m in "$1" "$2" "$3"; do'],
  ['  ls train/r58/tests/*.py r58c/tests/*.py fixes/tests/test_select_report.py parallel/tests/test_assemble_checks.sh r58c/B/tests/* r58c/B/*.sh\n  echo "$1"; echo "$2"',
   '  ls train/r58/tests/*.py r58c/tests/*.py fixes/tests/test_select_report.py parallel/tests/test_assemble_checks.sh r58c/B/tests/* r58c/B/*.sh\n' +
   '  # end-order-changes-2 changes 1 and 8 (commands:F5, F6, rulings:F8): agent A\'s scripts and tests (precheck_handoff.py runs\n' +
   '  # after the freeze), the end_of_run test, both mount lists and their reader, and every stage-B part file\n' +
   '  ls r58c/A/*.py r58c/A/*.sh\n  find r58c/B/eor -maxdepth 1 -type f\n  echo r58c/B/mounts.js r58c/B/mounts-B.json r58c/A/mounts-A.json | tr \' \' \'\n\'\n' +
   '  find train/stageB/parts -type f ! -name \'*.part\'\n  echo "$1"; echo "$2"; echo "$3"'],
]);
patch('r58c/B/freeze_check.sh', [
  ['# block 3 (`# images`) through `docker image inspect`. Any difference prints it and exits 1; no list exits 2.',
   '# block 3 (`# images`) through `docker image inspect`; when block 1 lists files under train/stageB/parts/, the set of part\n# files now on disk (find, *.part excluded) must equal the listed set (a part added or removed after the freeze is a\n# difference; end-order-changes-2 change 8). Any difference prints it and exits 1; no list exits 2.'],
  ['n=$(awk', 'listed=$(awk \'/^# outside$/{exit} {print $2}\' "$LIST" | grep \'^train/stageB/parts/\' | sort)\nif [ -n "$listed" ]; then\n  have=$(find train/stageB/parts -type f ! -name \'*.part\' 2>/dev/null | sort)\n  d=$( { echo "$listed" | sed \'s/^/L /\'; echo "$have" | grep . | sed \'s/^/H /\'; } | awk \'{c[$2]=c[$2] $1} END {for (k in c) if (c[k] == "L") print "gone: " k; else if (c[k] == "H") print "new: " k}\' | sort | head -5)\n  [ -z "$d" ] || { echo "train/stageB/parts differs from the freeze list: $d" | tr \'\n\' \' \'; echo; rc=1; }\nfi\nn=$(awk'],
]);
