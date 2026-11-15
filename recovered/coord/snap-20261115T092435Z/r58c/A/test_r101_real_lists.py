"""Agent A, round 9 (the coordinator's items 1, 3 and 4: C3 / ruling 101(b), rulings 101(a) and 102, LA-5). One ktest-a<N>
container (EMB_ROOT=/w; the lane read-only as r58c/A/ktest.sh mounts it, git at /repo, the build's facts cache, tasks list
and arms/common at /build). Nothing under train/stageB, train/heldout, train/selectB or train/report is opened as a table:
the parts and the plan are agent B's full-size stand-in (r58c/B/out/timing/asm: 2,385 tune parts and the frozen plan copy)
and agent A's round-8 held-out parts stand-in (r58c/A/out/r10stand/heldout_parts: 210 parts, 3 x 418 rows).
  clean   train/leak_audit.py main() in REAL mode (no --test) under END-ORDER 9.1's options on the REAL mount lists
          r58c/A/mounts-A.json and r58c/B/mounts-B.json, both kge-B1 captures (ruling 101(e)) and one synthetic docker
          inspect record per listed container made from its own list ({ARM} = E4; ktest-r10, --self, included), a
          synthetic held-out staging at /w/heldout_inputs (this container's own file system; names only: an empty facts
          folder and one tree per held-out parent of the plan, one blob). Must give ok: true. Timed (wall s, ru_maxrss,
          the container's memory.peak): the new leak-audit time.
  r101b   the rows of the containers the audit does not judge (9.1 to 9.4, test containers) are listed by name and not
          walked; the repository rows of ktest-r6, r7 and r10 are among them; fail before: the round-9-start audit
          (r58c/A/pre-r101/leak_audit.py, 6a2bf7f4) gives ok: false on the same inputs, its repository rows 'unreadable'.
  planted (each a copy of the lists and records with one change; every one must fail; each runs main()'s mount parts,
          audit_mounts + ruling94 + ruling102 on the same --mounts, since main() whole takes about 100 s a case (ktest-a53);
          quick_clean_ok shows those parts pass the clean inputs with main()'s rows less the launcher scripts' own):
          sealed_judged (a sealed/ source on kge-H1's list and record), reference_judged (a *reference*.jsonl on
          kge-H1P's), outside94 (a kge-H1P record mount not on its list), unreadable_judged (the repository on ktest-r1's
          list and record: a judged row with no host map), sealed_later (a sealed/ source on ktest-r10's list and
          record: not judged, failed by its name), sealed_test (a test container's record mounting sealed/),
          missing_record (no ktest-r4 record);
          ruling 102: export/ whole on ktest-r4, export/graphs whole on ktest-r9, a held-out parent's export/graphs/<P>
          on ktest-r4, a late-50 tuning parent's on ktest-r9, an export/graphs0/<P> folder on ktest-r8 (each on the list
          AND the record, so ruling 94 alone passes them); fail before: the round-9-start audit has no such check.
  test    B's marking (READY-mounts-r101): a pick8 TEST record of ktest-r4 under a mounts-test folder is judged as a
          test (listed, not failed, its rows not walked) and never stands in for the real ktest-r4 record (fail before:
          the round-9-start audit counted it); a TEST mounts file ("_test": "pick8") given to a real audit is refused.
  la5     ruling 92's run lines with the cap actually used: runs_by_cap holds '-m 4g --memory-swap 4g' (the guard log's
          start lines read cap 2560m, then cap 4g; orchestrator/start-guard-r98.sh sets CAP=4g) and the text says so;
          fail before: the round-9-start audit's run lines show only the 2560m default.
usage (ktest item): script:r58c/A/test_r101_real_lists.py"""
import os, sys, json, time, shutil, copy, resource, tempfile
sys.path.insert(0, '/w/train/r58/tests')
from r58common import *
import leak_audit as la
show_hashes('train/leak_audit.py', 'r58c/A/pre-r101/leak_audit.py', 'r58c/A/mounts-A.json', 'r58c/B/mounts-B.json', 'train/heldout.sh',
            'orchestrator/guard-stageB.sh', 'orchestrator/guard-stageB-r92.sh', 'orchestrator/start-guard-r98.sh', 'r58c/A/test_r101_real_lists.py')
LANE = os.environ.get('LEAK_LANE_HOST')
BUILD = LANE.rsplit('/', 2)[0] + '/build'
REPO_HOST = 'C:/Users/User/Documents/projects/EMS_workshop1'
T = tempfile.mkdtemp(prefix='r101_')
MA, MB = '/w/r58c/A/mounts-A.json', '/w/r58c/B/mounts-B.json'
B1S = [p for p in ('/w/orchestrator/kge-B1-inspect-20261114T190928Z.json', '/w/orchestrator/kge-B1-inspect-20261115T073116Z.json') if os.path.exists(p)]
PLAN = '/w/r58c/B/out/timing/asm/train/stageB/plan.json'; plan = json.load(open(PLAN))
PARTS = 'tune=/w/r58c/B/out/timing/asm/train/stageB/parts,heldout=/w/r58c/A/out/r10stand/heldout_parts'
# the synthetic held-out staging (names only), as test_leak_audit makes it
HS = '/w/heldout_inputs'
assert not os.path.exists(HS), 'a held-out staging is present at %s; this test makes its own' % HS
for P in plan['heldout']['assignment']: os.makedirs(os.path.join(HS, 'facts', P))
os.makedirs(os.path.join(HS, 'common', 'srcstore', 'trees')); os.makedirs(os.path.join(HS, 'common', 'srcstore', 'blobs'))
for P in plan['heldout']['assignment']: json.dump({'a.py': 'cd' * 20}, open(os.path.join(HS, 'common', 'srcstore', 'trees', P + '.json'), 'w'))
open(os.path.join(HS, 'common', 'srcstore', 'blobs', 'cd' * 20 + '.txt'), 'w').write('x\n')


def build(name, edit=None, post=None):
    """A copy of both lists and one record per listed container under T/<name>; edit(A, B, recs) changes them."""
    d = os.path.join(T, name); os.makedirs(os.path.join(d, 'records'))
    A, Bm = json.load(open(MA)), json.load(open(MB))
    recs = {c: [(e['src'].replace('{ARM}', 'E4'), e['dst'].replace('{ARM}', 'E4'), e['mode']) for e in v['allow']] for j in (A, Bm) for c, v in j.items()}
    if edit: edit(A, Bm, recs)
    os.makedirs(os.path.join(d, 'a')); os.makedirs(os.path.join(d, 'b'))
    json.dump(A, open(os.path.join(d, 'a', 'mounts-A.json'), 'w'), indent=1); json.dump(Bm, open(os.path.join(d, 'b', 'mounts-B.json'), 'w'), indent=1)
    for c, ms in recs.items():
        json.dump([dict(Name='/' + c, Mounts=[dict(Type='bind', Source=s, Destination=t, RW=(m == 'rw')) for s, t, m in ms])],
                  open(os.path.join(d, 'records', c + '.json'), 'w'))
    EXTRA[d] = post(d) if post else []  # more --mounts entries (a mounts-test folder, a TEST mounts file)
    return d


EXTRA = {}


def args(d, name):
    return ['--repo', '/repo', '--facts', '/build/facts/cache', '--heldout-tasks', '/build/tasks/tasks.jsonl', '--lane-host', LANE,
            '--host-map', BUILD + '=/build', '--scripts', '/w/orchestrator/guard-stageB.sh,/w/orchestrator/guard-stageB-r92.sh,/w/train/heldout.sh',
            '--mounts', ','.join(B1S + [os.path.join(d, 'records'), os.path.join(d, 'a', 'mounts-A.json'), os.path.join(d, 'b', 'mounts-B.json')] + EXTRA.get(d, [])),
            '--self', 'ktest-r10', '--parts', PARTS, '--plan', PLAN,
            '--out-md', os.path.join(T, name + '.md'), '--out-json', os.path.join(T, name + '.json')]


_GITS = {}
def memo_git(mod):
    orig = la.Git
    mod.Git = lambda repo: _GITS.setdefault(repo, orig(repo))
memo_git(la)
_W = {}
def memo(mod, name):
    orig = getattr(mod, name)
    def run(*a, **k):
        key = (name, a, tuple(sorted(k.items())))
        if key not in _W: _W[key] = orig(*a, **k)
        return type(_W[key])(_W[key])
    setattr(mod, name, run)
memo(la, 'walk_files'); memo(la, 'sha_folders')
D0 = build('clean')
print('inputs: %d kge-B1 capture(s), %d records, plan %s, parts %s' % (len(B1S), len(os.listdir(os.path.join(D0, 'records'))), PLAN, PARTS), flush=True)
t0 = time.time(); rc = exits(la.main, args(D0, 'clean')); wall = time.time() - t0
peak_rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0
cg = la_cg = None
for p_ in ('/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory/memory.max_usage_in_bytes'):
    try: cg = round(int(open(p_).read()) / 1048576.0, 1); break
    except Exception: pass
R = json.load(open(os.path.join(T, 'clean.json')))
print('R101TIME ' + json.dumps(dict(wall_s=round(wall, 1), peak_rss_mb=round(peak_rss, 1), cgroup_peak_mb=cg, rc=rc, mount_rows=len(R['mounts']),
                                    judged=sum(m.get('judged', True) for m in R['mounts']), c4=R['c4_parts']['task_rows'])), flush=True)
fails = lambda r: (r['failures'], r['coverage']['problems'], r['ruling78']['problems'] if not r['ruling78']['ok'] else [],
                   [] if r['ruling89']['ok'] else 'ruling89', [] if r['kge_reads_no_task_file']['ok'] else 'kge_reads', [] if r['code_evidence']['ok'] else 'code_evidence')
check('clean_ok', R['ok'] is True and rc == 0 and R['c4_parts']['task_rows'] == 18714, 'ok', R['ok'], '; problems', json.dumps(fails(R))[:900])
unj = [m for m in R['mounts'] if not m.get('judged', True)]
repo_rows = [m for m in R['mounts'] if la.norm(m['host']).startswith(la.norm(REPO_HOST))]
check('r101b_listed_not_walked', unj and all(m['n_files'] == 0 and m['cls'] in ('listed', 'tune_truth') for m in unj) and repo_rows
      and all(not m.get('judged', True) and m['ok'] for m in repo_rows),
      len(unj), 'rows listed by name, not walked; repository rows', sorted({m['source'] for m in repo_rows}))
# ---- fail before: the round-9-start audit on the same inputs
P = load_module('leak_audit_pre_r101', '/w/r58c/A/pre-r101/leak_audit.py'); P.HERE = la.HERE; memo_git(P)
memo(P, 'walk_files'); memo(P, 'sha_folders')
RP = P.main(args(D0, 'clean_pre'))
pre_unread = [f['mount'] for f in RP['failures'] if f['mount']['cls'] == 'unreadable']
check('r101b_pre_failed_the_real_lists', RP['ok'] is False and any(la.norm(f['host']).startswith(la.norm(REPO_HOST)) for f in pre_unread),
      'fail before: ok', RP['ok'], '; unreadable rows', len(pre_unread), [f['source'] for f in pre_unread][:6])
# ---- planted leaks
GS, RF = BUILD + '/sealed/refs', LANE + '/eval/x_reference.jsonl'
late, _ = la.late50_parents(plan); held = sorted(plan['heldout']['assignment'])
def add(c, src, dst, mode='ro', rec=True, lst=True):
    def f(A, Bm, recs):
        j = A if c in A else Bm
        if lst: j[c]['allow'].append(dict(src=src, dst=dst, mode=mode))
        if rec: recs[c].append((src, dst, mode))
    return f
def drop_rec(c):
    def f(A, Bm, recs): recs.pop(c)
    return f
def test_rec(A, Bm, recs): recs['ktest-a99'] = [(GS, '/s', 'ro')]
PL = {
    'sealed_judged': (add('kge-H1', GS, '/s'), lambda r: any(f['mount']['cls'] == 'heldout_truth' for f in r['failures'])),
    'reference_judged': (add('kge-H1P', RF, '/w/r.jsonl'), lambda r: any(f['mount']['cls'] == 'heldout_truth' and 'reference' in f['mount']['host'] for f in r['failures'])),
    'outside94': (add('kge-H1P', LANE + '/fixes', '/w/fixes', lst=False), lambda r: any('kge-H1P' in p and 'outside its step' in p for p in r['ruling94']['problems'])),
    'unreadable_judged': (add('ktest-r1', REPO_HOST, '/repo'), lambda r: any(f['mount']['cls'] == 'unreadable' and 'ktest-r1' in f['mount']['source'] for f in r['failures'])),
    'sealed_later': (add('ktest-r10', GS, '/s'), lambda r: any(f['mount']['cls'] == 'heldout_truth' and 'ktest-r10' in f['mount']['source'] for f in r['failures'])),
    'sealed_test': (test_rec, lambda r: any(f['mount']['cls'] == 'heldout_truth' and 'ktest-a99' in f['mount']['source'] for f in r['failures'])),
    'missing_record': (drop_rec('ktest-r4'), lambda r: any('ktest-r4' in p and 'no saved docker inspect record' in p for p in r['ruling94']['problems'])),
    'r102_export_whole_r4': (add('ktest-r4', LANE + '/export', '/w/export'), lambda r: any('ktest-r4' in p and 'export mounted whole' in p for p in r['ruling102']['problems'])),
    'r102_graphs_whole_r9': (add('ktest-r9', LANE + '/export/graphs', '/w/export/graphs'), lambda r: any('ktest-r9' in p and 'export/graphs mounted whole' in p for p in r['ruling102']['problems'])),
    'r102_heldout_parent_r4': (add('ktest-r4', LANE + '/export/graphs/' + held[0], '/w/export/graphs/' + held[0]),
                               lambda r: any('ktest-r4' in p and held[0] in p for p in r['ruling102']['problems'])),
    'r102_tune_parent_r9': (add('ktest-r9', LANE + '/export/graphs/' + late[0], '/w/export/graphs/' + late[0]),
                            lambda r: any('ktest-r9' in p and late[0] in p for p in r['ruling102']['problems'])),
    'r102_graphs0_r8': (add('ktest-r8', LANE + '/export/graphs0/' + late[0], '/w/export/graphs0/' + late[0]),
                        lambda r: any('ktest-r8' in p and 'not a parent folder' in p for p in r['ruling102']['problems'])),
}
# ktest-a53 (round 9): main() once per planted case took about 100 s each (the parts and git checks, not the mounts) and
# ran over the 580 s cap; the planted cases now call the mount parts of main() directly (audit_mounts, ruling94,
# ruling102 on the same --mounts, in the same order and with the same arguments), main() itself only for clean.
HM = [(BUILD, '/build')]
def quick(d, mod=None, test=False, mounts=True):  # mounts=False: ruling94 and ruling102 only (no walk of a planted export row)
    mod = mod or la; a_ = args(d, 'x'); allows, inspects = mod.split_mounts([p for p in a_[a_.index('--mounts') + 1].split(',') if p])
    rows, bad = mod.audit_mounts([], inspects, LANE, HM, allows) if mounts else ([], [])
    r94 = mod.ruling94(allows, inspects, test, 'ktest-r10')
    r102 = mod.ruling102(allows, inspects, plan, LANE, test=test) if hasattr(mod, 'ruling102') else None
    fl = [dict(mount={k: m[k] for k in ('source', 'host', 'dest', 'cls')}) for m in rows if not m['ok']]
    return dict(ok=not fl and not bad and r94['ok'] and (r102 is None or r102['ok']), failures=fl, inspect_bad=bad, mounts=rows, ruling94=r94,
                ruling102=r102 or dict(ok=True, problems=[], rows=[]), has102=r102 is not None)
script_row = lambda m: m['source'].split(':')[0].endswith('.sh') and m['source'].rsplit(':', 1)[-1].isdigit()
q0 = quick(D0)
check('quick_clean_ok', q0['ok'] is True and len(q0['mounts']) == sum(1 for m in R['mounts'] if not script_row(m)),
      'the mount parts alone on the clean inputs: ok', q0['ok'], 'rows', len(q0['mounts']), 'of main\'s', len(R['mounts']), '(main adds the launcher scripts\' rows)')
pre102 = {}
for name, (edit, bit) in sorted(PL.items()):
    d = build(name, edit); r = quick(d, mounts=not name.startswith('r102_'))
    check('planted_' + name, r['ok'] is False and bit(r), 'ok', r['ok'], '; failures', [f['mount']['source'] + ':' + f['mount']['cls'] for f in r['failures']][:3],
          '; ruling 94/102', (r['ruling94']['problems'] + r['ruling102']['problems'])[:2])
    if name.startswith('r102_'):
        rp = quick(d, P, mounts=False); pre102[name] = (not rp['has102'] and rp['ruling94']['ok'], [f['mount']['source'] for f in rp['failures'] if 'ktest-r' in f['mount']['source']])
check('r102_pre_had_no_check', all(v[0] for v in pre102.values()), 'fail before: the round-9-start audit has no ruling102 and its ruling 94 passes each planted row (on the list AND the record); its failures on them:',
      {k: v[1][:2] for k, v in pre102.items()})
# ---- LA-5: ruling 92 with the cap actually used
g = R['ruling92']; gp = RP['ruling92']
cap4 = [x for r_ in g['guards'] for x in (r_.get('runs_by_cap') or {}).get('4g', [])]
check('la5_caps_used', any('-m 4g --memory-swap 4g' in x for x in cap4) and 'cap 4g' in g['text'] and 'CAP=4g' in g['text']
      and any(s['cap'] == '4g' for s in g['starts']) and g['ok'], 'caps', [(s['time'], s['cap']) for s in g['starts']][-3:], '; text', g['text'][-260:])
check('la5_pre_showed_the_default_only', not any('runs_by_cap' in r_ for r_ in gp['guards']) and 'cap 4g' not in gp['text']
      and all('-m 4g' not in x for r_ in gp['guards'] for x in r_['runs']), 'fail before: run lines', [x[x.find('-m '):x.find('-m ') + 30] for r_ in gp['guards'] for x in r_['runs']][:2])
# ---- ruling 102 with B's test marking (READY-mounts-r101): a TEST run keeps its step's name; its record is told apart by
# its folder (r58c/B/out/mounts-test/), a TEST mounts file by "_test": "pick8"
pick8 = [late[i] for i in range(0, 48, 6) if i < len(late)]
def graph_free(rows): return [e for e in rows if '/export/' not in e['src'] and not e['src'].endswith('/export')]
def pick8_rows(c):
    j = json.load(open(MB))[c]
    return graph_free(j['allow']) + [dict(src=LANE + '/export/graphs/' + P_, dst='/w/export/graphs/' + P_, mode='ro') for P_ in pick8 + ([held[0]] if c == 'ktest-r4' else [])]
def test_folder(d):
    f = os.path.join(d, 'out', 'mounts-test'); os.makedirs(f)
    json.dump([dict(Name='/ktest-r4', Mounts=[dict(Type='bind', Source=e['src'], Destination=e['dst'], RW=e['mode'] == 'rw') for e in pick8_rows('ktest-r4')])],
              open(os.path.join(f, 'ktest-r4-20261115T080000Z.json'), 'w'))
    return [f]
def test_file(d):
    j = {c: dict(json.load(open(MB))[c], allow=pick8_rows(c)) for c in ('ktest-r4', 'ktest-r8', 'ktest-r9')}; j['_test'] = 'pick8'
    p = os.path.join(d, 'test-pick8.json'); json.dump(j, open(p, 'w'), indent=1); return [p]
# (a) a pick8 TEST record of ktest-r4 (one held-out parent among its rows, refused if it were real) beside the real record: judged
# as a test, not failed; the audit stays ok
d = build('r102_testrec_ok', post=test_folder); r = quick(d)
tr = [x for x in r['ruling102']['rows'] if x['test'] and 'ktest-r4-2026' in x['where']]
check('r102_test_record_judged_as_test', r['ok'] is True and tr and tr[0]['parents'] == len(pick8) + 1 and tr[0]['problems'] and not r['ruling102']['problems']
      and all(not m['judged'] for m in r['mounts'] if m['source'].startswith('ktest-r4-2026')),
      'ok', r['ok'], '; test row', tr[:1], '; problems', r['ruling102']['problems'][:2])
# (b) the TEST record alone (the real ktest-r4 record missing): it does not stand in for the real one
d = build('r102_testrec_only', drop_rec('ktest-r4'), post=test_folder); r = quick(d, mounts=False)
check('r102_test_record_is_not_the_record', r['ok'] is False and any('ktest-r4' in p and 'no saved docker inspect record' in p for p in r['ruling94']['problems']),
      'ok', r['ok'], '; ruling 94', r['ruling94']['problems'][:2])
rp = quick(d, P, mounts=False)
check('r102_pre_took_the_test_record', not any('ktest-r4' in p and 'no saved docker inspect record' in p for p in rp['ruling94']['problems']),
      'fail before: the round-9-start audit counted the mounts-test record as ktest-r4\'s; its ruling 94 problems', rp['ruling94']['problems'][:2])
# (c) a TEST mounts file given to a real audit is refused
d = build('r102_testfile', post=test_file); r = quick(d, mounts=False)
check('r102_test_file_refused_real', r['ok'] is False and any('is a TEST mounts file' in p for p in r['ruling102']['problems'])
      and any(x['test'] and 'TEST, pick8' in x['where'] for x in r['ruling102']['rows']),
      'ok', r['ok'], '; ruling 102', [p for p in r['ruling102']['problems'] if 'TEST' in p][:1])
print(R['ruling102']['text'], flush=True)
shutil.rmtree(HS, ignore_errors=True); shutil.rmtree(T, ignore_errors=True)
ok = finish('r101-real-lists')
sys.exit(0 if ok else 1)
