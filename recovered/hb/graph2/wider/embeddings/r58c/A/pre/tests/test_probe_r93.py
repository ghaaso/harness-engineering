"""Ruling 79 probe (heldout.py probe), on the CPU in a 1.5 GB test container: the synthetic graph takes the entity,
relation and triple counts (and the per-relation counts) of the largest held-out graph from its sizes.json ONLY
(export/graphs0/<C>/sizes.json; no held-out graph file is read), and the entity kinds, code flags and areas from the
largest tune graph. Checks: the largest held-out checkpoint is 2c7f91e1 (5,458 entities, 36 relations, 17,391 triples);
at --scale 1 the synthetic graph has exactly those counts (E1, first selected setting, 1 epoch); at --scale 25 E1 and
E4 (deterministic, det True) train one setting each; every setting's peak RSS is recorded; a peak above the flag is
listed and exits 4 (--flag-mb 1, test only); the real probe takes no option (exit 2). The card run, 3 epochs and all
15 settings is the coordinator's step (PROBE=1 sh heldout.sh), not run here (no card test). Fail before: the previous
heldout.py had no probe (exit != 0)."""
import os, sys, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hotest import *
show_hashes('train/heldout.py', 'train/heldout.sh', 'r58b/pre2/heldout.py', 'r58c/A/pre/heldout.py')
H = fresh(os.path.join(OUTR, 'probe_test'))
PREPY = prebin(H)
plan = json.load(open(FPLAN))


def prun(out, *extra, script=None):
    cmd = [sys.executable, script or os.path.join(TRAIN, 'heldout.py'), 'probe', '--test', '--plan', FPLAN, '--out', out] + list(extra)
    e = dict(env0); e['PYTHONPATH'] = TRAIN
    p = subprocess.run(cmd, cwd=TRAIN, capture_output=True, text=True, env=e, timeout=500)
    txt = p.stdout + p.stderr
    print('--- probe exit %d:' % p.returncode, flush=True)
    for l in txt.strip().splitlines()[-5:]: print('   ', l[:300], flush=True)
    res = json.load(open(os.path.join(out, 'probe.json'))) if os.path.exists(os.path.join(out, 'probe.json')) else None
    return p.returncode, txt, res


sizes = {C: json.load(open(os.path.join(ROOT, 'export', 'graphs0', C, 'sizes.json'))) for C in plan['heldout']['checkpoints']}
big = max(sizes, key=lambda C: (sizes[C]['triples'], C))
rc, txt, r = prun(os.path.join(H, 'full'), '--arms', 'E1', '--configs-per-arm', '1', '--scale', '1', '--test-epochs', '1')
sy = (r or {}).get('synthetic', {})
check('r79_largest_heldout_counts', r and r['largest_heldout']['sha'] == big == '2c7f91e18293bec2bd186d29936b5d10407f40f2'
      and (r['largest_heldout']['entities'], r['largest_heldout']['relations'], r['largest_heldout']['triples']) == (5458, 36, 17391),
      json.dumps((r or {}).get('largest_heldout')))
check('r79_synthetic_has_those_counts', rc == 0 and (sy.get('entities'), sy.get('relations'), sy.get('triples')) == (5458, 36, 17391)
      and sy.get('triples_by_relation') == sizes[big]['triples_by_relation'] and not os.path.exists(os.path.join(H, 'full', 'g0')),
      'exit', rc, 'synthetic', sy.get('entities'), sy.get('relations'), sy.get('triples'), '; graph folder removed after the probe')
check('r79_peak_recorded', rc == 0 and len(r['settings']) == 1 and r['settings'][0]['rc'] == 0 and r['settings'][0]['peak_rss_mb'] > 100
      and r['over_3_5gb'] == [] and r['flag_mb'] == 3584.0, json.dumps([{k: s.get(k) for k in ('arm', 'config_id', 'peak_rss_mb', 'train_wall_s')} for s in r['settings']]))
rc, txt, r = prun(os.path.join(H, 'small'), '--arms', 'E1,E4', '--configs-per-arm', '1', '--scale', '25', '--test-epochs', '1')
st = {s['arm']: s for s in (r or {}).get('settings', [])}
check('r79_e1_e4_small', rc == 0 and set(st) == {'E1', 'E4'} and st['E4'].get('det') is True and st['E1'].get('det') is False
      and all(s['peak_rss_mb'] > 0 for s in st.values()) and r['synthetic']['entities'] == 5458 // 25,
      json.dumps({a: (s.get('config_id'), s.get('peak_rss_mb'), s.get('det')) for a, s in st.items()}))
rc, txt, r = prun(os.path.join(H, 'flag'), '--arms', 'E1', '--configs-per-arm', '1', '--scale', '25', '--test-epochs', '1', '--flag-mb', '1')
check('r79_flag_above_limit_exits_4', rc == 4 and r and len(r['over_3_5gb']) == 2 and 'report to the coordinator' in txt, 'exit', rc)
os.environ.update(KGE_DEVICE='cpu', KGE_IMAGE_ID=IMG)
import heldout
_saved = {k: os.environ.pop(k) for k in heldout.REAL_ENV_REFUSED if k in os.environ}  # MF-6: the real parse refuses them
check('r79_real_probe_takes_no_option', exits(heldout.parse, ['probe', '--plan', FPLAN]) == 2 and heldout.parse(['probe'])['out'].replace(os.sep, '/').endswith('train/probe'),
      'real probe writes train/probe/probe.json only')
os.environ.update(_saved)
p = subprocess.run([sys.executable, PREPY, 'probe'], cwd=TRAIN, capture_output=True, text=True, env=dict(env0, PYTHONPATH=TRAIN), timeout=300)
check('r79_pre_had_no_probe', p.returncode != 0, 'fail before: the previous heldout.py refused "probe" (exit %d)' % p.returncode)
# ---- round r58c (agent A), MF-7 / ruling 86a: container (cgroup memory.peak), process and card peaks; flags at
# 3.5 GB (container or process) and 10 GB (card reserved); one full-path process (train, score, assemble, rank, pack) at
# the highest-peak setting. CPU only here: the card figures are None and the card flag is exercised in process.
# Fail before: r58c/A/pre/heldout.py (round start).
rc, txt, r = prun(os.path.join(H, 'mf7'), '--arms', 'E1', '--configs-per-arm', '1', '--scale', '1', '--test-epochs', '1', '--full-tasks', '12')
s0 = (r or {}).get('settings', [{}])[0]; fp = (r or {}).get('full_path', {})
check('mf7_peaks_recorded', rc == 0 and all(k in s0 for k in ('peak_rss_mb', 'cgroup_peak_mb_after', 'peak_cuda_reserved_mb', 'card_total_mb'))
      and r['card_total_mb'] is None and r['over_card_10gb'] == [] and r['card_flag_mb'] == 10240.0 and r['flag_mb'] == 3584.0,
      json.dumps({k: s0.get(k) for k in ('peak_rss_mb', 'cgroup_peak_mb_after', 'peak_cuda_reserved_mb', 'card_total_mb')}))
check('mf7_full_path_probe', (rc == 0 and fp.get('rc') == 0 and fp.get('arm') == 'E1' and fp.get('tune_parent_facts') in plan['checkpoints']
       and set(fp.get('steps') or []) >= {'train', 'score', 'assemble', 'rank', 'pack'} and fp.get('peak_rss_mb', 0) > 100),
      'full path', json.dumps({k: fp.get(k) for k in ('rc', 'arm', 'config_id', 'steps', 'peak_rss_mb', 'cgroup_peak_mb_after', 'packed')}))
import heldout as _ho
rows = [dict(arm='E1', config_id='c01', rc=0, peak_rss_mb=900.0, cgroup_peak_mb_after=3700.0, peak_cuda_reserved_mb=2000.0),
        dict(arm='E4', config_id='c13', rc=0, peak_rss_mb=900.0, cgroup_peak_mb_after=1200.0, peak_cuda_reserved_mb=10500.0),
        dict(arm='E2', config_id='c07', rc=0, peak_rss_mb=900.0, cgroup_peak_mb_after=1200.0, peak_cuda_reserved_mb=3000.0)]
ov, cd = _ho.flag_rows(rows, 3584.0, 10240.0)
check('mf7_flags', [x[:2] for x in ov] == [('E1', 'c01')] and [x[:2] for x in cd] == [('E4', 'c13')], 'container flag', ov, 'card flag', cd)
rcf, txtf, rf = prun(os.path.join(H, 'mf7_flag'), '--arms', 'E1', '--configs-per-arm', '1', '--scale', '25', '--test-epochs', '1', '--full-tasks', '6', '--flag-mb', '1')
check('mf7_flag_exits_4', rcf == 4 and rf and len(rf['over_3_5gb']) == 2 and 'report to the coordinator' in txtf, 'exit', rcf,
      'flagged', (rf or {}).get('over_3_5gb'), '(the setting and the full path)')
PRE3PY = prebin3(H)
rcp, txtp, rp = prun(os.path.join(H, 'mf7_pre'), '--arms', 'E1', '--configs-per-arm', '1', '--scale', '25', '--test-epochs', '1', script=PRE3PY)
sp = (rp or {}).get('settings', [{}])[0]
check('mf7_pre_lacked_container_card_and_full_path', rcp == 0 and 'full_path' not in rp and 'over_card_10gb' not in rp
      and 'cgroup_peak_mb_after' not in sp and 'peak_cuda_reserved_mb' not in sp,
      'fail before: the round-start probe recorded', sorted(sp), 'and', sorted(k for k in (rp or {}) if k not in ('settings',))[:10])
ok = finish('heldout-probe')
sys.exit(0 if ok else 1)
