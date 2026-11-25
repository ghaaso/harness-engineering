"""Tuning-split table for READY.md: P@10 and recall@10 per arm, per repository and pooled, each against the best untrained
arm on the same commits (the card run's choice per repository; paired bootstrap over commits, 10,000 resamples, as the
card run). Untrained arms and B3 are scored from the tuning tables; B2 from its frozen choice (rank/B2/choice.json).
usage: tune_report.py [--tag B2]   -> /out/tune-report.json and a markdown table on stdout"""
import glob, json, os, sys
import numpy as np
import pandas as pd
import d4lib as L
import evaluate as E
import u4lib as U

CH = json.load(open('/cardout/choices.json'))
tag = sys.argv[sys.argv.index('--tag') + 1] if '--tag' in sys.argv else 'B2'


def table_arms(repo, arms):
    out = {a: {} for a in arms}
    for f in sorted(glob.glob(os.path.join(U.U4, 'tables', repo, 'tune', '*.csv.gz'))):
        df = pd.read_csv(f)
        for a in arms:
            out[a].update(U.per_commit_table(df['commit'].values, df['task'].values, df[a].values, df['tie'].values, df['label'].values))
    return out


def summary(res, base):
    rows = {}
    bu = res[base]
    for n, v in res.items():
        common = sorted(set(v) & set(bu))
        d = [v[c][0] - bu[c][0] for c in common]
        m, lo, hi = L.bootstrap(d)
        rows[n] = dict(p10=float(np.mean([v[c][0] for c in common])), r10=float(np.mean([v[c][1] for c in common])), n_commits=len(common),
                       vs_best_untrained=dict(diff=m, lo=lo, hi=hi))
    return rows


def main():
    rk = json.load(open(os.path.join(U.U4, 'rank', tag, 'choice.json'))) if os.path.exists(os.path.join(U.U4, 'rank', tag, 'choice.json')) else {}
    arms = list(E.UNTRAINED) + ['EASE', 'CONTENT_COS', 'PPR']
    out = {'repos': {}, 'pooled': {}}
    pooled = {}
    for r in L.REPOS:
        res = table_arms(r, arms)
        res['B3_EASE'] = res.pop('EASE')
        if r in rk:
            res['B2_LAMBDAMART'] = {int(t): tuple(v) for t, v in rk[r]['tune']['per_commit'].items()}
        base = CH['best_untrained'][r]
        out['repos'][r] = dict(best_untrained=base, arms=summary(res, base))
        for n, v in res.items():
            pooled.setdefault(n, {}).update({(r, t): x for t, x in v.items()})
        pooled.setdefault('BEST_UNTRAINED', {}).update({(r, t): x for t, x in res[base].items()})
    out['pooled'] = summary(pooled, 'BEST_UNTRAINED')
    json.dump(out, open(os.path.join(U.U4, 'tune-report.json'), 'w'), indent=1)
    show = ['BEST_UNTRAINED', 'PC', 'INV365', 'DEC90', 'TEXT', 'RRF', 'PPR', 'CONTENT_COS', 'B3_EASE', 'B2_LAMBDAMART']
    print('| arm | ' + ' | '.join(L.REPOS) + ' | pooled |')
    print('|---|' + '---|' * (len(L.REPOS) + 1))
    for n in show:
        cells = []
        for r in L.REPOS + ['pooled']:
            t = out['pooled'] if r == 'pooled' else out['repos'][r]['arms']
            key = n if (n != 'BEST_UNTRAINED' or r == 'pooled') else out['repos'][r]['best_untrained']
            if key not in t:
                cells.append('-'); continue
            x = t[key]; d = x['vs_best_untrained']
            cells.append('%.3f / %.3f (%+.3f [%+.3f, %+.3f])' % (x['p10'], x['r10'], d['diff'], d['lo'], d['hi']))
        print('| %s | %s |' % (n, ' | '.join(cells)))


if __name__ == '__main__':
    main()
