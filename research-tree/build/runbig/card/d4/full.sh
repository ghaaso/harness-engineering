#!/bin/bash
# The full D4 run, after the refuter's verdict. Every step restartable (existing outputs are skipped).
# Order: tuning for all repositories and both graph forms -> evaluate.py tune (fixes decay, form, fusion weight)
# -> held-out for the chosen form only -> evaluate.py test. Logs in CR/logs/d4-full-*.log.
cd "$(dirname "$0")"
CR=C:/Users/User/Documents/projects/card-run-2026-11
LOG=$CR/logs/d4-full
# 2. tuning. FixFlow first, both forms; the pre-test rule (triples chosen if complex alone on FixFlow beats pairs by 0.01)
# decides whether the clinic and zulip get the triple form at all.
step() { # repo form
  r=$1; f=$2
  [ -f $CR/d4/out/kge/select-$r-$f.json ] && grep -q _chosen $CR/d4/out/kge/select-$r-$f.json || ./dgpu.sh kge_run.py select $r $f
  ./dgpu.sh kge_run.py run $r $f tune
  ./burl_all.sh $r $f tune 60 8 8
}
{
step fixflow pairs; step fixflow triples
rm -f $CR/d4/out/triples-decision.json; ./dpy.sh evaluate.py tune fixflow
FORMS="pairs"; grep -q '"triples_chosen": true' $CR/d4/out/triples-decision.json && FORMS="pairs triples"
for r in clinic zulip; do for f in $FORMS; do step $r $f; done; done
./dpy.sh evaluate.py tune
} > $LOG-tune.log 2>&1
# 3. held-out, with the form chosen on tuning
FORM=$(node -e "console.log(require('$CR/d4/out/choices.json').form)")
for r in fixflow clinic zulip; do
  ./dgpu.sh kge_run.py run $r $FORM test
  ./burl_all.sh $r $FORM test 60 8 8
done > $LOG-test.log 2>&1
./dpy.sh evaluate.py test >> $LOG-test.log 2>&1
