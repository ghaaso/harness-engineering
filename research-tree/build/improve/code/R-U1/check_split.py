"""R-U1 check 1 and 2 (split): re-derive U1's tuning split, training blocks, snapshots and history from git with code
written here (only the card's prep.py rules are imported), and compare with U1's split outputs under /out.
Held-out truth: the card's queries.jsonl is parsed with the truth field dropped at parse; it is never kept or used.
usage: python check_split.py fixflow,clinic,zulip"""
import gzip, json, subprocess, sys, hashlib
sys.path.insert(0, '/d2')
import prep  # the card's rules: read_log, candidates, clean_message, indexable, split_point

fails = []


def bad(msg):
    fails.append(msg)
    print('FAIL', msg, flush=True)


def git(repo, *a):
    return subprocess.run(['git', '-c', 'core.quotepath=off', '-C', repo, *a], capture_output=True, check=True).stdout.decode('utf-8', 'replace')


def rdjsonl(p):
    op = gzip.open if p.endswith('.gz') else open
    with op(p, 'rt', encoding='utf-8') as f:
        return [json.loads(l) for l in f if l.strip()]


def snapshot_tree(repo, h):
    """indexable paths up to 150 KB at commit h, with blob ids; binary filter applied by reading the blobs."""
    out = {}
    for line in git(repo, 'ls-tree', '-r', '-l', h).splitlines():
        meta, path = line.split('\t', 1)
        mode, typ, blob, size = meta.split()
        if typ == 'blob' and prep.indexable(path) and size != '-' and int(size) <= 150_000:
            out[path] = blob
    proc = subprocess.run(['git', '-C', repo, 'cat-file', '--batch'], input=''.join(b + '\n' for b in set(out.values())).encode(), capture_output=True, check=True).stdout
    binary, i = set(), 0
    while i < len(proc):
        j = proc.index(b'\n', i)
        hdr = proc[i:j].split()
        n = int(hdr[2])
        data = proc[j + 1:j + 1 + n]
        if b'\x00' in data[:2000]:
            binary.add(hdr[0].decode())
        i = j + 1 + n + 1
    return {p: b for p, b in out.items() if b not in binary}


def main():
    for repo in sys.argv[1].split(','):
        src = f'/src/{repo}'
        sp = json.load(open(f'/out/{repo}/split.json'))
        qs = rdjsonl(f'/out/{repo}/queries.jsonl')
        hist = rdjsonl(f'/out/{repo}/history.jsonl.gz')
        items = rdjsonl(f'/out/{repo}/items.jsonl.gz')
        commits = prep.read_log(src, 'main')
        byh = {c['h']: c for c in commits}
        cands = prep.candidates(commits)
        k = prep.split_point(len(cands), 0.4, 250)
        t0 = cands[k]['ct']
        meta = json.load(open(f'/cr/{repo}/meta.json'))
        if (t0, len(cands)) != (meta['first_heldout_ct'], meta['candidates']):
            bad(f'{repo}: held-out split differs from the card meta')
        # independent tuning split: the last min(int(30%),150) candidates with ct < t0, by ct
        pre = sorted([c for c in cands if c['ct'] < t0], key=lambda c: c['ct'])
        m = min(int(0.3 * len(pre)), 150)
        t_tune = pre[-m]['ct']
        if (sp['t0'], sp['t_tune'], sp['tune_size'], sp['pre_cutoff']) != (t0, t_tune, m, len(pre)):
            bad(f'{repo}: split header {sp["t0"], sp["t_tune"], sp["tune_size"], sp["pre_cutoff"]} vs mine {t0, t_tune, m, len(pre)}')
        tune_c = {c['h'] for c in pre if c['ct'] >= t_tune}
        pool = [c for c in pre if c['ct'] < t_tune]
        train_c = {c['h'] for c in pool[-1000:]}
        q_tune = {q['commit'] for q in qs if q['split'] == 'tune'}
        q_train = {q['commit'] for q in qs if q['split'] == 'train'}
        if not q_tune <= tune_c:
            bad(f'{repo}: tuning query outside the tuning candidates')
        if not q_train <= train_c:
            bad(f'{repo}: training query outside the training candidates')
        if q_tune & q_train:
            bad(f'{repo}: a commit is in tuning and training')
        if any(byh[h]['ct'] >= t_tune for h in q_train):
            bad(f'{repo}: a training commit at or after the tuning start')
        if any(not (t_tune <= byh[h]['ct'] < t0) for h in q_tune):
            bad(f'{repo}: a tuning commit outside [t_tune, t0)')
        # held-out queries equal the card's (truth dropped at parse)
        card = []
        for l in open(f'/cr/{repo}/queries.jsonl', encoding='utf-8'):
            r = json.loads(l); r.pop('truth', None); card.append((r['qid'], r['commit'], r['ct'], r['query']))
        mine = [(q['qid'], q['commit'], q['ct'], q['query']) for q in qs if q['split'] == 'heldout']
        if mine != card:
            bad(f'{repo}: held-out queries differ from the card run')
        if any(q['truth'] is not None for q in qs if q['split'] == 'heldout'):
            bad(f'{repo}: held-out truth stored')
        # history: exactly the main-line commits with ct < t0
        if sorted(c['h'] for c in hist) != sorted(c['h'] for c in commits if c['ct'] < t0):
            bad(f'{repo}: history is not the commits with ct < t0')
        # every block: snapshot = last commit (log order) with ct < block start; its ancestry entirely before the start;
        # its files = the indexable tree; every query of the block at or after the start; truth and text by the card's rules
        nchk = 0
        for b in sp['blocks']:
            tb = b['t_block']
            before = [c for c in commits if c['ct'] < tb]
            s = before[-1]['h']
            if b['snapshot'] != s:
                bad(f'{repo} {b["id"]}: snapshot {b["snapshot"]} vs mine {s}')
            amax = max(int(x) for x in git(src, 'rev-list', '--format=%ct', '--no-commit-header', s).split())
            if amax >= tb:
                bad(f'{repo} {b["id"]}: snapshot ancestry reaches {amax} >= block start {tb}')
            tree = snapshot_tree(src, s)
            got = {items[i]['path']: items[i]['blob'] for i in b['items']}
            if got != tree:
                bad(f'{repo} {b["id"]}: snapshot files differ: {len(set(got) ^ set(tree))} paths, blobs {sum(got.get(p) != tree.get(p) for p in tree)}')
            for i in b['items'][:200]:   # the text is the blob's bytes (where the bytes are valid UTF-8)
                raw = items[i]['text'].encode('utf-8')
                if hashlib.sha1(b'blob %d\x00' % len(raw) + raw).hexdigest() != items[i]['blob'] and '�' not in items[i]['text']:
                    bad(f'{repo} {b["id"]}: item text is not its blob: {items[i]["path"]}')
            bq = [q for q in qs if q['block'] == b['id']]
            for q in bq:
                c = byh[q['commit']]
                if c['ct'] < tb:
                    bad(f'{repo} {b["id"]}: query {q["qid"]} before its block start')
                if q['query'] != prep.clean_message(c['msg'], [p for st, p in c['files'] if st == 'M' and prep.indexable(p)]):
                    bad(f'{repo} {b["id"]}: query text differs from the card rule for {q["qid"]}')
                if b['split'] != 'heldout':
                    mod = [p for st, p in c['files'] if st == 'M' and prep.indexable(p)]
                    if q['truth'] != [p for p in mod if p in tree]:
                        bad(f'{repo} {b["id"]}: truth differs for {q["qid"]}')
                nchk += 1
            print(repo, b['id'], 'start', tb, 'snap', s[:10], 'ancestry max', amax, 'files', len(tree), 'queries', len(bq), flush=True)
        print(repo, 'checked queries', nchk, 'tune', len(q_tune), 'train', len(q_train), flush=True)
    print('FAILS', len(fails))


if __name__ == '__main__':
    main()
