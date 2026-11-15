#!/bin/sh
# Role selectB (ruling 83): every test that exercises train/selectB.py, on the current bytes. usage: in a ktest-b
# container, sh /w/r58c/B/tests/role_selectB.sh   (writes $BOUT/logs/role_selectB.log)
exec sh /w/r58c/B/tests/role.sh selectB train/selectB.py test_gate test_selection_freeze8 test_r64 test_select_report
