"""R-U1 check 1 (side branches): per block, the history commits its signals read (ct < block start) that are not
ancestors of the block's snapshot (made before the start on a branch merged into main later); for each of them, the
latest committer time in its own ancestry (a value at or after the block start would mean the commit carries content
from at or after the start: a leak through committer-time order). No truth is read.
usage: python offsnap.py fixflow,clinic,zulip"""
import subprocess, sys
sys.path.insert(0, '/code')
import u1lib as L


def git(repo, *a):
    return subprocess.run(['git', '-C', f'/src/{repo}', *a], capture_output=True, check=True).stdout.decode()


for repo in sys.argv[1].split(','):
    sp, qs = L.load_split(repo)
    hist = sorted(L.rdjsonl(f'/out/{repo}/history.jsonl.gz'), key=lambda c: c['ct'])
    for b in sp['blocks']:
        anc = set(git(repo, 'rev-list', b['snapshot']).split())
        pre = [c for c in hist if c['ct'] < b['t_block']]
        off = [c for c in pre if c['h'] not in anc]
        late = []
        for c in off:
            amax = max(int(x) for x in git(repo, 'rev-list', '--format=%ct', '--no-commit-header', c['h']).split())
            if amax >= b['t_block']:
                late.append(c['h'][:10])
        print(repo, b['id'], 'history read', len(pre), 'not ancestors of the snapshot', len(off),
              f'({len(off) / max(len(pre), 1):.1%})', 'of them with ancestry at or after the block start', len(late), late[:5], flush=True)
