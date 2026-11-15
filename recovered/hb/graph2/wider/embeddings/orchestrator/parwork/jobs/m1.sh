JOBTAG=m1; . /w/pw/jobs/memlog.inc
S1=E1:c15:bab61a000a0d; L1=E1:c15:7b3a74528189; S3=E3:c11:bab61a000a0d; L3=E3:c11:7b3a74528189
S5=E5:c11:bab61a000a0d; L5=E5:c11:7b3a74528189; S2=E2:c11:bab61a000a0d; L2=E2:c11:7b3a74528189
S4=E4:c12:bab61a000a0d; L4=E4:c12:7b3a74528189
python pw.py m1_pass1 $S1 $L1 $S3 $L3 $S5 $L5 $S2 $L2 $S4 $L4 > logs/m1_pass1.log 2>&1; echo "pass1 rc=$?" >> logs/m1.rc
python pw.py m1_pass2 $L4 $S4 $L2 $S2 $L5 $S5 $L3 $S3 $L1 $S1 > logs/m1_pass2.log 2>&1; echo "pass2 rc=$?" >> logs/m1.rc
python pw.py m1_det1 --det $S4 $L4 > logs/m1_det1.log 2>&1; echo "det1 rc=$?" >> logs/m1.rc
python pw.py m1_det2 --det $L4 $S4 > logs/m1_det2.log 2>&1; echo "det2 rc=$?" >> logs/m1.rc
kill $MEMLOG
