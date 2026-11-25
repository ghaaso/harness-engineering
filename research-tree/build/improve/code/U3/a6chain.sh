#!/bin/bash
# A6 in one card admission (inside the container): route check, a resume test with a hard kill, then the encoding with route a.
# Route a is the authors' own modeling code (the reference); route b (native Qwen2 made bidirectional) is only compared (check).
export U3_TOKBUDGET=${U3_TOKBUDGET:-8192}
cd /code
[ -f /out/a6/route-check.json ] || python -B a6.py check || exit $?   # 2026-11-25 (coordinator 8): pass exit 76 on to run.sh, which reruns alone
if [ ! -f /out/a6/resume-test.done ] && [ ! -f /out/a6/vec_fixflow.npz ]; then
  echo "== resume test: kill the encoding of fixflow after 260 s (checkpoint every 20 s), then restart"
  U3_SAVE_EVERY=20 timeout -s KILL 260 python -B a6.py embed --route a --repos fixflow
  echo "== killed (exit $?); partial files:"; ls -la /out/a6 | grep part_
  touch /out/a6/resume-test.done
fi
python -B a6.py embed --route a
