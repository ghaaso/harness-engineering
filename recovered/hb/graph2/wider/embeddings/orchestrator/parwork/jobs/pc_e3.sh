JOBTAG=pc_e3; . /w/pw/jobs/memlog.inc
python pw.py pc_e3  --loop --stopfile /w/pw/ctl/stop_pc E3:c11:bab61a000a0d E3:c11:7b3a74528189 > logs/pc_e3.log 2>&1; echo "rc=$?" >> logs/pc_e3.rc
kill $MEMLOG
