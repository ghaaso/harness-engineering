"""Agent A, round r58c, rulings 96(a), 97(e): the ktest stand-in of the injected-kinds case, to size it for the card window
(CPU, 2 cores, the ktest cap). One argument: <variants>-<arms> (e.g. big-E1,E2 or noco-E5; no colon: it names the log file) or all (both variants,
E1-E5). Runs r58c/A/inject_case.py with --out /w/r58c/A/out/inject_standin/<tag>, 2 epochs and 5 tasks.
ktest item form: script:r58c/A/inject_standin.py@big-E1"""
import os, sys
sys.path.insert(0, '/w/r58c/A')
import inject_case
a = sys.argv[1] if len(sys.argv) > 1 else 'all'
var, arms = ('big,noco', 'E1,E2,E3,E4,E5') if a == 'all' else a.split('-')
tag = a.replace(',', '').replace('-', '_')
sys.exit(inject_case.main(['--out', '/w/r58c/A/out/inject_standin/' + tag, '--variants', var, '--arms', arms]))
