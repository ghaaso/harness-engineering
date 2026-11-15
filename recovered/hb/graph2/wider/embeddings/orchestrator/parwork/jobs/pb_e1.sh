JOBTAG=pb_e1; . /w/pw/jobs/memlog.inc
python pw.py pb_e1  --loop --stopfile /w/pw/ctl/stop_pb E1:c15:bab61a000a0d E1:c15:7b3a74528189 > logs/pb_e1.log 2>&1; echo "rc=$?" >> logs/pb_e1.rc
kill $MEMLOG
