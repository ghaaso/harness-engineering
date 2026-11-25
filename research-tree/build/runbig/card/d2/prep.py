import subprocess, json, re, os, argparse

CODE_EXT = set('py js jsx ts tsx mjs cjs java kt go rs rb php c h cc cpp hpp cs swift sh html css scss hbs md rst txt yml yaml toml sql ini cfg'.split())
BAD_DIR = re.compile(r'(^|/)(locale|locales|node_modules|vendor|third|dist|build|\.git|var)/')
BAD_NAME = re.compile(r'(\.min\.|package-lock\.json|uv\.lock|yarn\.lock|\.map$|\.lock$)')
AUTO = re.compile(r'^(revert|merge|bump|translated|update translations|auto-?|dependabot|renovate|\[?bot)', re.I)
TRAILER = re.compile(r'^(co-authored-by|signed-off-by|change-id|fixes|closes|reviewed-by|cc|link|generated)\b.*$', re.I | re.M)


def indexable(path):
    name = path.rsplit('/', 1)[-1]
    ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
    return ext in CODE_EXT and not BAD_DIR.search(path) and not BAD_NAME.search(path)


def clean_message(msg, edited_paths):
    m = TRAILER.sub('', msg)
    m = re.sub(r'\(#\d+\)|#\d+', ' ', m)
    m = m[:1500]
    for p in sorted(edited_paths, key=len, reverse=True):
        for s in (p, p.rsplit('/', 1)[-1]):
            m = re.sub(re.escape(s), ' ', m, flags=re.I)
    # B2 (refuter, 2026-11-24): the file name without its extension, as a whole word, also names the file
    stems = {p.rsplit('/', 1)[-1].rsplit('.', 1)[0] for p in edited_paths}
    for s in sorted((s for s in stems if len(s) >= 3), key=len, reverse=True):
        m = re.sub(r'\b' + re.escape(s) + r'\b', ' ', m, flags=re.I)
    m = re.sub(r'[ \t]+', ' ', m)
    m = re.sub(r'\n{3,}', '\n\n', m).strip()
    return m[:1000]


def git(repo, *a, text=True):
    out = subprocess.run(['git', '-c', 'core.quotepath=off', '-C', repo, *a], capture_output=True, check=True).stdout
    return out.decode('utf-8', 'replace') if text else out


def read_blobs(repo, rev, paths):
    """one git cat-file --batch process for all paths"""
    proc = subprocess.Popen(['git', '-C', repo, 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    import threading
    payload = ''.join(f'{rev}:{p}\n' for p in paths).encode()
    threading.Thread(target=lambda: (proc.stdin.write(payload), proc.stdin.close()), daemon=True).start()
    for p in paths:
        hdr = proc.stdout.readline().split()
        if len(hdr) < 3 or hdr[1] != b'blob':
            continue
        n = int(hdr[2])
        data = proc.stdout.read(n)
        proc.stdout.read(1)
        yield p, data
    proc.wait()


def read_log(repo, ref='main'):
    raw = git(repo, 'log', '--no-merges', '--reverse', '--no-renames', '--name-status', '--format=%x1e%H%x1f%ct%x1f%B%x1f', ref)
    commits = []
    for rec in raw.split('\x1e')[1:]:
        h, ct, body, rest = rec.split('\x1f', 3)
        files = []
        for l in rest.strip().splitlines():
            if '\t' in l:
                st, p = l.split('\t', 1)
                files.append((st[0], p))
        commits.append(dict(h=h, ct=int(ct), msg=body.strip(), files=files))
    return commits


def candidates(commits):
    out = []
    for c in commits:
        subj = c['msg'].split('\n', 1)[0]
        if AUTO.match(subj) or len(c['files']) > 40:
            continue
        mod = [p for s, p in c['files'] if s == 'M' and indexable(p)]
        if not (1 <= len(mod) <= 15):
            continue
        q = clean_message(c['msg'], mod)
        if len(q.split()) < 5:
            continue
        out.append(dict(c, mod=mod))
    return out


def split_point(n, frac=0.4, hmax=250):
    return n - min(int(n * frac), hmax)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo'); ap.add_argument('--name'); ap.add_argument('--out')
    ap.add_argument('--ref', default='main')  # B1: the main line, never the checked-out branch
    ap.add_argument('--hmax', type=int, default=250)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    commits = read_log(a.repo, a.ref)
    cands = candidates(commits)
    k = split_point(len(cands), 0.4, a.hmax)
    t0 = cands[k]['ct']
    before = [c for c in commits if c['ct'] < t0]
    cutoff = before[-1]['h']
    paths = [p for p in git(a.repo, 'ls-tree', '-r', '--name-only', cutoff).splitlines() if indexable(p)]
    files = []
    for p, b in read_blobs(a.repo, cutoff, paths):
        if len(b) > 150_000 or b'\x00' in b[:2000]:
            continue
        files.append(dict(path=p, text=b.decode('utf-8', 'replace')))
    pset = {f['path'] for f in files}
    qs = []
    for c in cands[k:]:
        if c['ct'] < t0:
            continue
        truth = [p for p in c['mod'] if p in pset]
        if not truth:
            continue
        qs.append(dict(qid=f"{a.name}-{c['h'][:10]}", commit=c['h'], ct=c['ct'], query=clean_message(c['msg'], c['mod']), truth=truth))
    cooc = []
    for c in before:
        fs = sorted({p for s, p in c['files'] if s in 'MAD' and p in pset})
        if 1 < len(fs) <= 30:
            cooc.append(fs)
    with open(f'{a.out}/files.jsonl', 'w', encoding='utf-8') as f:
        for r in files:
            f.write(json.dumps(r) + '\n')
    with open(f'{a.out}/queries.jsonl', 'w', encoding='utf-8') as f:
        for r in qs:
            f.write(json.dumps(r) + '\n')
    json.dump(cooc, open(f'{a.out}/cooc.json', 'w'))
    json.dump(dict(name=a.name, ref=a.ref, commits=len(commits), candidates=len(cands), heldout_candidates=len(cands) - k, queries=len(qs),
                   files=len(files), cooc_commits=len(cooc), cutoff=cutoff, first_heldout_ct=t0), open(f'{a.out}/meta.json', 'w'), indent=1)
    print(open(f'{a.out}/meta.json').read())


if __name__ == '__main__':
    main()
