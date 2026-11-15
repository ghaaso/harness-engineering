JOBTAG=pc_e2; . /w/pw/jobs/memlog.inc
python pw.py pc_e2  --loop --stopfile /w/pw/ctl/stop_pc E2:c11:bab61a000a0d E2:c11:7b3a74528189 > logs/pc_e2.log 2>&1; echo "rc=$?" >> logs/pc_e2.rc
kill $MEMLOG
