#!/usr/bin/env bash
# Web and mobile checks at one exported parent, with node_modules COPIED from the live tree (no install).
F=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/feas
P=$1
D=$F/exp/$P
L=$F/logs/$P
mkdir -p $L
WF=$(cygpath -w "$F")
WD=$(cygpath -w "$D")
[ -e "$D/node_modules" ] || powershell -NoProfile -Command "New-Item -ItemType Junction -Path '$WD\\node_modules' -Target '$WF\\env\\web\\node_modules' | Out-Null"
[ -e "$D/technician-app/node_modules" ] || powershell -NoProfile -Command "New-Item -ItemType Junction -Path '$WD\\technician-app\\node_modules' -Target '$WF\\env\\mobile\\node_modules' | Out-Null"
run() { local name=$1; shift; local t0=$(date +%s); timeout 900 "$@" > $L/$name.log 2>&1; local rc=$?; echo "JS[$name] EXIT=$rc SECS=$(( $(date +%s) - t0 ))" >> $L/js-summary.txt; echo "JS[$name] EXIT=$rc SECS=$(( $(date +%s) - t0 ))"; }
cd $D
export CI=true
NODE_OPTIONS="--experimental-require-module --disable-warning=ExperimentalWarning" run web-test node node_modules/vitest/vitest.mjs run
run web-lint node node_modules/eslint/bin/eslint.js .
run web-build node node_modules/vite/bin/vite.js build --outDir $F/cache/dist-$P --emptyOutDir
cd $D/technician-app
run mobile-tsc node node_modules/typescript/bin/tsc --noEmit
run mobile-jest node node_modules/jest/bin/jest.js --ci --cacheDirectory $F/cache/jest-$P
