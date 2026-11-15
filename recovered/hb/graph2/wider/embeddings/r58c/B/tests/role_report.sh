#!/bin/sh
# Role report (ruling 83): every test that exercises train/report.py (and the writers that read its output), on the
# current bytes, in two ten-minute containers. usage: in a ktest-b container, sh /w/r58c/B/tests/role_report.sh p1|p2
# (writes $BOUT/logs/role_report.<part>.log); then on the host sh LANE/r58c/B/role_join.sh report train/report.py p1 p2
case $1 in
  p1) PART=p1 exec sh /w/r58c/B/tests/role.sh report train/report.py test_verdict test_counts test_b_units ;;
  p2) PART=p2 exec sh /w/r58c/B/tests/role.sh report train/report.py test_write_result test_write_audit_claims ;;
  *) echo "usage: role_report.sh p1|p2"; exit 2 ;;
esac
