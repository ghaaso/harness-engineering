JOBTAG=pa_e1; . /w/pw/jobs/memlog.inc
python pw.py pa_e1  --loop --stopfile /w/pw/ctl/stop_pa E1:c15:bab61a000a0d E1:c15:7b3a74528189 > logs/pa_e1.log 2>&1; echo "rc=$?" >> logs/pa_e1.rc
kill $MEMLOG
