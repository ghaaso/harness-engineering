JOBTAG=m1b; . /w/pw/jobs/memlog.inc
S5=E5:c11:bab61a000a0d; L5=E5:c11:7b3a74528189
python pw.py m1b_nondet3 $S5 > logs/m1b_nondet3.log 2>&1; echo "nondet3 rc=$?" >> logs/m1b.rc
python pw.py m1b_nondet4 $S5 > logs/m1b_nondet4.log 2>&1; echo "nondet4 rc=$?" >> logs/m1b.rc
python pw.py m1b_det1 --det $S5 $L5 > logs/m1b_det1.log 2>&1; echo "det1 rc=$?" >> logs/m1b.rc
python pw.py m1b_det2 --det $L5 $S5 > logs/m1b_det2.log 2>&1; echo "det2 rc=$?" >> logs/m1b.rc
kill $MEMLOG
