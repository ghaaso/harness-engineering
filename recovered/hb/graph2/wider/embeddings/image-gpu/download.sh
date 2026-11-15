#!/bin/sh
# Download phase (network ON). Skips a file whose size and sha256 already match the resolved list.
set -eu
python3 - <<'PY'
import hashlib,os,urllib.request
os.makedirs('/out/wheels',exist_ok=True)
for line in open('/out/download.tsv'):
    name,ver,fn,size,sha,url=line.rstrip('\n').split('\t')
    p='/out/wheels/'+fn
    def ok():
        if not os.path.exists(p) or os.path.getsize(p)!=int(size): return False
        h=hashlib.sha256()
        with open(p,'rb') as f:
            for b in iter(lambda:f.read(1<<20),b''): h.update(b)
        return h.hexdigest()==sha
    if ok(): print('have',fn); continue
    print('get',fn,size,flush=True)
    urllib.request.urlretrieve(url,p)
    print('  ->','ok' if ok() else 'MISMATCH',flush=True)
PY
