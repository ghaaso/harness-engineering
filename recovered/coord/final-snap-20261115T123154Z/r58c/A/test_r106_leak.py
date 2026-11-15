"""Agent A, C53 (end-order-changes-5 10a0e2e3, finding A1 of orchestrator/delta-check-result.json): train/leak_audit.py's
record naming after C36. Synthetic mount file and records in a temp folder (no real list, no real record, nothing under
build/sealed/); ruling94() is called directly with test=True.
  c53_text      R94_CARD_SAVED and the ruling-94 text say the NEWEST record is <name>.json and an older one is moved to
                <name>.<UTC>.json (or <name>.<UTC>-<k>.json); fail before: the pre-r106 bytes say "a later launch" gets
                the stamped name (the reverse of C36).
  c53_order     every record is judged whatever its name: a mount in the stamped (older) record of kge-H1c fails as in
                the plain (newest) one, on both bytes (the code never read the records by age; recorded, not a change).
  c53_name_k    planted: a record without a Name, saved as kge-H1c.<UTC>-1.json (save_record's name for a stamped name
                already taken) and showing a mount -> current: named kge-H1c and failed by C24; fail before: read as the
                container "kge-H1c.<UTC>-1", which no list names and R94_REAL does not match, so it passed unjudged.
  c53_name_ctl  control: the same record as kge-H1c.<UTC>.json is named kge-H1c on both bytes.
usage (ktest item): script:r58c/A/test_r106_leak.py"""
import os, sys, json, shutil, tempfile
sys.path.insert(0, '/w/train/r58/tests')
from r58common import *
import leak_audit as la
show_hashes('train/leak_audit.py', 'r58c/A/pre-r106/leak_audit.py', 'r58c/A/test_r106_leak.py')
PRE = load_module('leak_audit_pre106', '/w/r58c/A/pre-r106/leak_audit.py')
T = tempfile.mkdtemp(prefix='r106_')
STAMP = '20261115T102851Z'


def case(name, records):
    """A mount file listing kge-H1c (step 7, empty list) and the given records {file name: record}; -> (allows, inspects)."""
    d = os.path.join(T, name); os.makedirs(os.path.join(d, 'records'))
    a = os.path.join(d, 'mounts-A.json'); json.dump({'kge-H1c': {'step': '7', 'allow': []}}, open(a, 'w'))
    for f, r in records.items(): json.dump(r, open(os.path.join(d, 'records', f), 'w'))
    return [a], [os.path.join(d, 'records', f) for f in sorted(records)]


def rec(mounts, named=True):
    x = dict(Mounts=[dict(Type='bind', Source=s, Destination=t, RW=False) for s, t in mounts])
    if named: x['Name'] = '/kge-H1c'
    return [x]


def c24(m, allows, inspects):
    r = m.ruling94(allows, inspects, True)
    return [p for p in r['problems'] if 'C24' in p], r


CLEAN = rec([])
# c53_text
_, r = c24(la, *case('text', {'kge-H1c.json': CLEAN}))
_, rp = c24(PRE, *case('text_pre', {'kge-H1c.json': CLEAN}))
check('c53_text', la.R94_CARD_SAVED.startswith('r58c/mounts/<name>.json (the newest; an older record of the same name is moved to r58c/mounts/<name>.<UTC>.json')
      and 'a later launch' not in la.R94_CARD_SAVED and la.R94_CARD_SAVED in r['text'] and r['ok'],
      'current:', la.R94_CARD_SAVED)
check('c53_text_fail_before', 'a later launch r58c/mounts/<name>.<UTC>.json' in PRE.R94_CARD_SAVED and PRE.R94_CARD_SAVED in rp['text'],
      'before:', PRE.R94_CARD_SAVED)
# c53_order: the older (stamped) record is judged like the newest
MNT = rec([('/x/leak', '/leak')])
for tag, m in (('current', la), ('before', PRE)):
    p_old, _ = c24(m, *case('order_' + tag, {'kge-H1c.json': CLEAN, 'kge-H1c.%s.json' % STAMP: MNT}))
    p_new, _ = c24(m, *case('order2_' + tag, {'kge-H1c.json': MNT, 'kge-H1c.%s.json' % STAMP: CLEAN}))
    check('c53_order_%s' % tag, len(p_old) == 1 and ('kge-H1c.%s.json' % STAMP) in p_old[0] and len(p_new) == 1 and '(kge-H1c.json,' in p_new[0],
          'a mount in the older record:', p_old, '| in the newest:', p_new)
# c53_name_k (planted) and its control
K = 'kge-H1c.%s-1.json' % STAMP; P0 = 'kge-H1c.%s.json' % STAMP
NL = rec([('/x/leak', '/leak')], named=False)
pk, rk = c24(la, *case('name_k', {'kge-H1c.json': CLEAN, K: NL}))
check('c53_name_k', la.record_name(NL, '/r/' + K) == 'kge-H1c' and len(pk) == 1 and K in pk[0] and not rk['ok'], 'current:', pk)
pk0, rk0 = c24(PRE, *case('name_k_pre', {'kge-H1c.json': CLEAN, K: NL}))
check('c53_name_k_fail_before', PRE.record_name(NL, '/r/' + K) == 'kge-H1c.%s-1' % STAMP and pk0 == [] and rk0['ok'],
      'before: named %r, problems %s, ok %s (the record passed unjudged)' % (PRE.record_name(NL, '/r/' + K), rk0['problems'], rk0['ok']))
for tag, m in (('current', la), ('before', PRE)):
    pc, _ = c24(m, *case('ctl_' + tag, {'kge-H1c.json': CLEAN, P0: NL}))
    check('c53_name_ctl_%s' % tag, m.record_name(NL, '/r/' + P0) == 'kge-H1c' and len(pc) == 1, pc)
shutil.rmtree(T, ignore_errors=True)
sys.exit(0 if finish('r106-leak') else 1)
