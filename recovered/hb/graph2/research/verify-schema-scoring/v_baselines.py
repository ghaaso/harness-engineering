"""Independent re-implementation of the scoring lane's task pool and DIR / CO baselines.
Also: a 'structural-ish' check of how much of the ground truth is test files, and an
'oracle-of-the-construct' check (how much of the reference set is ever co-changed with the seed).
Read-only against the repo. Zero model tokens.
"""
import subprocess, collections, statistics, math, json, re, sys, random

REPO = 'C:/Users/User/Documents/projects/EMS_workshop1'
def git(*a):
    return subprocess.run(['git', '-C', REPO, *a], capture_output=True, text=True, encoding='utf-8', errors='replace', check=True).stdout

CODE = ('.py', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs')
def kind(p):
    l = p.lower(); n = l.rsplit('/', 1)[-1]
    if not l.endswith(CODE): return None
    if '/alembic/versions/' in l: return 'migration'
    if '/tests/' in l or '/__tests__/' in l or n.startswith('test_') or '.test.' in n or '.spec.' in n or n == 'conftest.py' or n.startswith(('vitest.setup', 'jest.setup')): return 'test'
    if not (p.startswith(('backend/', 'technician-app/', 'src/')) or p == 'ops-server.mjs'): return None
    return 'code'
def rt(p):
    return 'b' if p.startswith('backend/') else 'm' if p.startswith('technician-app/') else 'w' if (p.startswith('src/') or p == 'ops-server.mjs') else None

commits = [l.split('|', 3) for l in git('log', 'main', '--no-merges', '--format=%H|%P|%aI|%s').splitlines()]
files_of = {}
cur = None
for line in git('log', '--all', '--no-merges', '--format=@@@%H', '--name-only').splitlines():
    if line.startswith('@@@'): cur = line[3:]; files_of[cur] = []
    elif line.strip() and cur: files_of[cur].append(line.strip())
pr_of = {}
for line in git('log', 'main', '--first-parent', '--format=%H %P').splitlines():
    h, *ps = line.split()
    if len(ps) > 1:
        for c in git('rev-list', ps[1], '^' + ps[0]).split(): pr_of[c] = h
    else: pr_of[h] = h

added_tot = ex_tot = 0
tasks = []
for h, p, d, s in commits:
    ps = p.split()
    if not ps: continue
    ex, ad = [], []
    for l in git('diff', '--name-status', '-M', ps[0], h).splitlines():
        parts = l.split('\t'); st = parts[0]
        f = parts[1]
        if kind(f) is None: continue
        (ad if st.startswith('A') else (None if st.startswith('D') else ex)).append(f) if not st.startswith('D') else None
    added_tot += len(ad); ex_tot += len(ex)
    if 2 <= len(ex) <= 30:
        tasks.append(dict(h=h, parent=ps[0], date=d[:10], fix=bool(re.match(r'^\s*fix', s, re.I)), ex=ex, cross=len({rt(f) for f in ex if rt(f)}) >= 2))
print('commit-level ctm existing', ex_tot, 'added', added_tot, 'added share', round(added_tot / (ex_tot + added_tot), 3))
print('usable commits', len(tasks), 'before 07-01', sum(t['date'] < '2026-07-01' for t in tasks), 'fix', sum(t['fix'] for t in tasks), 'cross', sum(t['cross'] for t in tasks), 'seed-target pairs', sum(len(t['ex']) for t in tasks))

def dir_rank(seed, uni):
    sd = seed.rsplit('/', 1)[0] if '/' in seed else ''
    def key(f):
        # shared path prefix length (more = closer), then same depth, then name
        a, b = seed.split('/')[:-1], f.split('/')[:-1]
        k = 0
        while k < min(len(a), len(b)) and a[k] == b[k]: k += 1
        return (-k, abs(len(b) - len(a)), f)
    return sorted((f for f in uni if f != seed), key=key)

rows = []
for t in tasks:
    uni = [f for f in git('ls-tree', '-r', '--name-only', t['parent']).splitlines() if kind(f)]
    us = set(uni)
    ex = [f for f in t['ex'] if f in us]
    if len(ex) < 2: continue
    anc = [c for c in git('rev-list', '--no-merges', t['parent']).split() if c in files_of]
    my = pr_of.get(t['h'])
    H = {'CO': [files_of[c] for c in anc], 'COxPR': [files_of[c] for c in anc if pr_of.get(c) != my]}
    per = collections.defaultdict(list)
    for seed in ex:
        ref = set(ex) - {seed}
        d = dir_rank(seed, uni); dpos = {f: i for i, f in enumerate(d)}
        per['DIR@10'].append(len(set(d[:10]) & ref) / len(ref))
        for name, hist in H.items():
            cnt = collections.Counter()
            for fs in hist:
                if seed in fs and len(fs) <= 50:
                    for f in fs:
                        if f != seed and f in us: cnt[f] += 1
            r = sorted(cnt, key=lambda f: (-cnt[f], dpos.get(f, 1e9))) + [f for f in d if f not in cnt]
            per[name + '@10'].append(len(set(r[:10]) & ref) / len(ref))
            if name == 'COxPR':
                per['ever_cochanged_xPR'].append(len(set(cnt) & ref) / len(ref))
        per['ref_test_share'].append(sum(kind(f) == 'test' for f in ref) / len(ref))
        per['ref_same_dir_share'].append(sum(f.rsplit('/', 1)[0] == seed.rsplit('/', 1)[0] for f in ref) / len(ref))
    rows.append(dict(date=t['date'], fix=t['fix'], cross=t['cross'], n=len(ex), **{k: statistics.mean(v) for k, v in per.items()}))

def summ(rs, lab):
    o = {'label': lab, 'n': len(rs)}
    for k in ('DIR@10', 'CO@10', 'COxPR@10', 'ever_cochanged_xPR', 'ref_test_share', 'ref_same_dir_share'):
        o[k] = round(statistics.mean(r[k] for r in rs), 3)
    dif = [r['COxPR@10'] - r['DIR@10'] for r in rs]
    o['diff COxPR-DIR mean'] = round(statistics.mean(dif), 3); o['sd'] = round(statistics.stdev(dif), 3)
    lk = [r['CO@10'] - r['COxPR@10'] for r in rs]
    o['CO-COxPR'] = round(statistics.mean(lk), 3)
    return o
for lab, rs in [('all', rows), ('tune<07-01', [r for r in rows if r['date'] < '2026-07-01']), ('held-out', [r for r in rows if r['date'] >= '2026-07-01']), ('cross', [r for r in rows if r['cross']]), ('fix', [r for r in rows if r['fix']])]:
    print(json.dumps(summ(rs, lab)))
# minimum detectable difference, paired, alpha .05 two-sided, power .8
for sd in (0.15, 0.263, 0.29):
    for n in (75, 140):
        print('MDE sd', sd, 'n', n, round((1.96 + 0.8416) * sd / math.sqrt(n), 3))
