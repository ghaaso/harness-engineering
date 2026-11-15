#!/bin/sh
# Inside kge-T1 (one card container, alone on the card once the host writes /w/parallel/eq/go):
#  (ii) ruling 69: deterministic E4 c12, c13, c16, seed 1, twice each, in two processes in opposite order (the
#       coordinator's M1 pattern), on the smallest TRAINED tune checkpoint 8b506c0dac14 (the smallest, 2fa68134d22d, has
#       no co_changed fact: stageB.py writes empty parts there and trains nothing; it is recorded as such);
#  (iv) plumbing test of rerun_compare.py on a test unit (c12_r1's part as a finished unit), then a tampered copy;
#  (iii) assemble_checks.py plumbing test in the card image (copies of real parts).
E=/w/parallel/eq; R=/w/parallel/test/rc-card
while [ ! -f $E/go ]; do sleep 2; done
echo "go $(date -u +%FT%TZ)" >> $E/rcs
C=8b506c0dac14
python -c "import torch; print('torch', torch.__version__, 'cuda', torch.cuda.is_available(), torch.cuda.get_device_name(0))" >> $E/rcs 2>&1
python /w/orchestrator/rerun_unit.py --out $E/units --rec $E/eq.jsonl --det E4/c12/s1/$C=c12_r1 E4/c13/s1/$C=c13_r1 E4/c16/s1/$C=c16_r1 \
  E4/c12/s1/2fa68134d22d=c12_smallest_untrained > $E/p1.log 2>&1; echo "p1 $? $(date -u +%FT%TZ)" >> $E/rcs
python /w/orchestrator/rerun_unit.py --out $E/units --rec $E/eq.jsonl --det E4/c16/s1/$C=c16_r2 E4/c13/s1/$C=c13_r2 E4/c12/s1/$C=c12_r2 \
  > $E/p2.log 2>&1; echo "p2 $? $(date -u +%FT%TZ)" >> $E/rcs
# (iv) plumbing: a test tree holding c12_r1's part as a finished stage-B unit (runner "rerun_unit.py det=1")
rm -rf $R; mkdir -p $R/tree/stageB/parts/E4/c12/s1
FULL=$(python -c "import json; p=json.load(open('/w/train/stageB/plan.json')); print([c for c in p['checkpoints'] if c.startswith('$C')][0])")
cp -r $E/units/c12_r1 $R/tree/stageB/parts/E4/c12/s1/$FULL
echo "{\"step\": \"stageB\", \"unit\": \"E4/c12/s1/$C\", \"status\": \"done\"}" > $R/tree/progress-test.jsonl
python /w/orchestrator/rerun_compare.py run --tree $R/tree --out $R/out --ledger $R/ledger.jsonl > $R/run1.log 2>&1; echo "rc_run1 $?" >> $E/rcs
python /w/orchestrator/rerun_compare.py run --tree $R/tree --out $R/out2 --ledger $R/ledger.jsonl > $R/run2.log 2>&1; echo "rc_run2_ledger $?" >> $E/rcs
cp -r $R/tree/stageB/parts/E4/c12/s1/$FULL $R/tampered
python - $R/tampered <<'EOF'
import gzip, json, sys
d = sys.argv[1]; p = d + '/pool.tsv.gz'; s = gzip.open(p).read().decode().split('\n')
rows = [i for i, l in enumerate(s) if i > 0 and l.strip()]
if rows:
    r = s[rows[0]].split('\t'); r[2] = repr(float(r[2]) * (1 + 1e-6)); s[rows[0]] = '\t'.join(r)
    gzip.open(p, 'wb').write('\n'.join(s).encode()); print('tampered one pool score')
else:
    c = json.load(open(d + '/counts.json')); c['tampered'] = 1; json.dump(c, open(d + '/counts.json', 'w')); print('tampered counts')
EOF
python /w/orchestrator/rerun_compare.py compare --part $R/tampered --rec $R/out/rerun.jsonl --tag rr000_E4_c12_s1_$C --out $R/cmp > $R/cmp.log 2>&1; echo "rc_tamper $?" >> $E/rcs
# (iii) in the card image
ACT=/w/parallel/test/ac-card PY=python sh /w/parallel/tests/test_assemble_checks.sh /w > $E/ac-card.log 2>&1; echo "ac $?" >> $E/rcs
echo "end $(date -u +%FT%TZ)" >> $E/rcs
