cd "$(dirname "$0")"
ls /c/Users/User/.claude/projects | while read d; do node scan.mjs "$d"; done
echo ALLDONE
