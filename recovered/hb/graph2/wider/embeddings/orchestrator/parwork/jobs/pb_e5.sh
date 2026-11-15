JOBTAG=pb_e5; . /w/pw/jobs/memlog.inc
python pw.py pb_e5  --loop --stopfile /w/pw/ctl/stop_pb E5:c11:bab61a000a0d E5:c11:7b3a74528189 > logs/pb_e5.log 2>&1; echo "rc=$?" >> logs/pb_e5.rc
kill $MEMLOG
