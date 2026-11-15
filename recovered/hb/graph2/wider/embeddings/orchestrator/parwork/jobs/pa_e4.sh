JOBTAG=pa_e4; . /w/pw/jobs/memlog.inc
python pw.py pa_e4 --det --loop --stopfile /w/pw/ctl/stop_pa E4:c12:bab61a000a0d E4:c12:7b3a74528189 > logs/pa_e4.log 2>&1; echo "rc=$?" >> logs/pa_e4.rc
kill $MEMLOG
