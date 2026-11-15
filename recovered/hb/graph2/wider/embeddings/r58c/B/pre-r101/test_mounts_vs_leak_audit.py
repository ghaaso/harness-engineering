"""Agent B, round r58c, ruling 94(d)/(e): r58c/B/mounts-B.json read by the leak audit's OWN reader.

train/leak_audit.py (agent A) checks every saved docker inspect record against its container's list (ruling94(),
load_allows(), r94_in_scope(), split_mounts()). This test loads that module by path, builds for every container of
r58c/B/mounts-B.json a fake docker inspect record whose Mounts are exactly its list (Source = the src the launcher
passes to `docker run -v`, Destination = dst, RW = mode rw; kge-R1's scratch at a concrete stamp under its writable
parent), and asks ruling94() for its verdict. No real table and no real record is read.
  after bytes (r58c/B/mounts-B.json): the file is a mount file for split_mounts/is_allow_file; no problem; no mount
    outside a list; the containers of the card window and steps 4 to 8 (r1, r2, r3, r4, r8, r9, kge-R1) are in scope,
    the later ones (r5, r6, r7, r10) are not; a planted extra mount on r1 is found (the reader bites).
  before bytes (r58c/B/pre-r94b/mounts-B.json: an "_about" string, steps like "4 selectB", kge-R1's <STAMP> token):
    the audit reads it as no mount file / out of scope / a mount outside the list (fail before).
Also printed, not judged: what the real run at step 9.1 would say when the containers of steps 9.2-9.4 have no record yet.
usage (in a ktest-b container): python /w/r58c/B/tests/test_mounts_vs_leak_audit.py
"""
import importlib.util, json, os, sys, tempfile
spec = importlib.util.spec_from_file_location('leak_audit', '/w/train/leak_audit.py')
LA = importlib.util.module_from_spec(spec); spec.loader.exec_module(LA)
OUT = os.environ.get('R58_OUT') or tempfile.mkdtemp(); os.makedirs(OUT, exist_ok=True)
AFTER, BEFORE = '/w/r58c/B/mounts-B.json', '/w/r58c/B/pre-r94b/mounts-B.json'
fails = []; n = [0]


def check(name, ok, got=''):
    n[0] += 1
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ': ' + str(got)), flush=True)
    if not ok: fails.append(name)


def records(path, sub, extra=None):
    """One fake inspect record per container of the mount file (skipping non-object values), in OUT/<sub>/."""
    d = os.path.join(OUT, sub); os.makedirs(d, exist_ok=True)
    M = json.load(open(path)); out = []
    for c, v in sorted(M.items()):
        if not isinstance(v, dict): continue
        ms = []
        for e in v['allow']:
            src = e['src'].replace('<STAMP>', '20261115T010203Z')  # the before bytes' token, as the launcher filled it
            ms.append({'Type': 'bind', 'Source': src, 'Destination': e['dst'], 'RW': e['mode'] == 'rw'})
        if extra and c in extra: ms.append(extra[c])
        p = os.path.join(d, c + '.json'); json.dump([{'Name': '/' + c, 'Mounts': ms}], open(p, 'w')); out.append(p)
    return out


for f in (AFTER, BEFORE): print('sha256 %s %s' % (LA.sha256_file(f), f[3:]), flush=True)
print('sha256 %s train/leak_audit.py' % LA.sha256_file('/w/train/leak_audit.py'), flush=True)

# after bytes
al, ins = LA.split_mounts([AFTER])
check('after: split_mounts reads r58c/B/mounts-B.json as a mount file', al == [AFTER] and ins == [], (al, ins))
r = LA.ruling94([AFTER], records(AFTER, 'after'), True)
check('after: ruling94 finds no problem on records equal to the lists', r['ok'] and not r['problems'], r['problems'][:3])
check('after: no record has a mount outside its list', all(not x['outside'] for x in r['records']), [(x['container'], x['outside']) for x in r['records'] if x['outside']])
scope = {x['container']: x['in_scope'] for x in r['records']}
want = {'ktest-r1': True, 'ktest-r2': True, 'ktest-r3': True, 'ktest-r4': True, 'ktest-r8': True, 'ktest-r9': True, 'kge-R1': True,
        'ktest-r5': False, 'ktest-r6': False, 'ktest-r7': False, 'ktest-r10': False, 'ktest-r11': False}  # r11: step 9.2a (ruling 97)
check('after: the card window and steps 4-8 are in scope, steps 9.x are not', scope == want, scope)
bad = {'Type': 'bind', 'Source': 'C:/Users/User/Documents/projects/EMS_workshop1', 'Destination': '/repo', 'RW': False}
r2 = LA.ruling94([AFTER], records(AFTER, 'planted', {'ktest-r1': bad}), True)
check('after: a planted repository mount on ktest-r1 is found (the reader bites)',
      not r2['ok'] and any('ktest-r1' in p and 'outside' in p for p in r2['problems']), r2['problems'][:2])

# before bytes (fail before)
bl, bins = LA.split_mounts([BEFORE])
check('before (fail-before): split_mounts does not read pre-r94b/mounts-B.json as a mount file (its "_about" string)',
      bl == [] and bins == [BEFORE], (bl, bins))
fake = os.path.join(OUT, 'before-as-allow.json')  # the "_about" key removed, so the remaining two defects show
json.dump({k: v for k, v in json.load(open(BEFORE)).items() if not k.startswith('_')}, open(fake, 'w'))
rb = LA.ruling94([fake], records(BEFORE, 'before'), True)
sb = {x['container']: x['in_scope'] for x in rb['records']}
check('before (fail-before): its steps ("4 selectB" ...) put r1-r4, r8, r9 and kge-R1 out of scope',
      not any(sb.get(c) for c in ('ktest-r1', 'ktest-r2', 'ktest-r3', 'ktest-r4', 'ktest-r8', 'ktest-r9', 'kge-R1')), sb)
o = [x['outside'] for x in rb['records'] if x['container'] == 'kge-R1']
check('before (fail-before): kge-R1\'s <STAMP> src never matches its real record', bool(o and o[0]), o)

# informational: the real run at 9.1, records only for the steps before it
pre91 = [p for p in records(AFTER, 'at91') if os.path.basename(p)[:-5] not in ('ktest-r5', 'ktest-r6', 'ktest-r7')]
r91 = LA.ruling94([AFTER], pre91, True, 'ktest-r10')
print('INFO at step 9.1 (records of r1-r4, r8, r9, kge-R1; --self ktest-r10): ok %s; %s' % (r91['ok'], r91['problems']), flush=True)

print('RESULT %s mounts-vs-leak-audit (%d checks%s)' % ('PASS' if not fails else 'FAIL', n[0], '' if not fails else ', failed: %s' % fails), flush=True)
sys.exit(1 if fails else 0)
