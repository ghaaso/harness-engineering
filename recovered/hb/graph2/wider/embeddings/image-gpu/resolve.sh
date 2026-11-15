#!/bin/sh
# Resolve phase (network ON). Writes /out/report.json and /out/resolved.tsv (no download of wheels).
set -eu
python3 -m venv /tmp/resolver
/tmp/resolver/bin/pip install --disable-pip-version-check --no-cache-dir --upgrade pip
/tmp/resolver/bin/pip install --disable-pip-version-check --no-cache-dir --dry-run --ignore-installed --only-binary=:all: \
  --report /out/report.json -c /out/constraints.txt \
  --index-url https://download.pytorch.org/whl/cu132 --extra-index-url https://pypi.org/simple \
  "torch==2.15.0+cu132" > /out/resolve.log 2>&1 || { cat /out/resolve.log; exit 1; }
tail -5 /out/resolve.log
/tmp/resolver/bin/python - <<'PY'
import json,urllib.request
r=json.load(open('/out/report.json'))
rows=[]
for i in r['install']:
    m=i['metadata']; d=i['download_info']; u=d['url']
    fn=u.split('/')[-1].split('#')[0]
    from urllib.parse import unquote
    fn=unquote(fn)
    req=urllib.request.Request(u,method='HEAD')
    n=urllib.request.urlopen(req).headers.get('Content-Length')
    rows.append('\t'.join([m['name'].lower().replace('_','-'),m['version'],fn,str(n),d['archive_info']['hashes']['sha256'],u]))
open('/out/resolved.tsv','w').write('\n'.join(rows)+'\n')
print('\n'.join(rows))
PY
