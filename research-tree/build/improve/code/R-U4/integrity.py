"""R-U4 check: every file under U4's outputs (/out, mounted read-only) opens whole. npz: every array read; npy: size
matches its header; csv.gz: full decompress, header = the table columns, every row has that many fields; json: parses;
jsonl: every line parses. Prints BAD lines and a summary. usage: python integrity.py"""
import glob, gzip, json, os, sys, zipfile
import numpy as np

ROOT = '/out'
bad, n = [], 0
COLS = None
for dp, dn, fn in os.walk(ROOT):
    for f in sorted(fn):
        p = os.path.join(dp, f); n += 1
        try:
            if f.endswith('.npz'):
                with zipfile.ZipFile(p) as z:
                    t = z.testzip()
                    assert t is None, 'crc fail ' + str(t)
                z = np.load(p)
                for k in z.files:
                    a = z[k]
                    if a.dtype.kind == 'f' and k not in ('LAST_CO_DAYS', 'CAND_AGE_DAYS', 'CAND_LAST_DAYS'):
                        pass
            elif f.endswith('.npy'):
                a = np.load(p, mmap_mode='r')
                with open(p, 'rb') as fh:
                    v = np.lib.format.read_magic(fh); sh, fo, dt = np.lib.format._read_array_header(fh, v); off = fh.tell()
                want = off + int(np.prod(sh)) * np.dtype(dt).itemsize
                assert os.path.getsize(p) == want, 'size %d != %d' % (os.path.getsize(p), want)
                b = np.asarray(a)
                if b.dtype.kind == 'f' and f.endswith('.ease.npy'):
                    assert np.isfinite(b).all(), 'non-finite EASE'
            elif f.endswith('.csv.gz'):
                with gzip.open(p, 'rt') as fh:
                    head = fh.readline().rstrip('\n').split(',')
                    if COLS is None:
                        COLS = head
                    assert head == COLS, 'header differs'
                    m = len(head); rows = 0
                    for line in fh:
                        rows += 1
                        if line.count(',') != m - 1:
                            raise AssertionError('row %d has %d fields' % (rows, line.count(',') + 1))
                    assert rows > 0, 'no rows'
            elif f.endswith('.json'):
                json.load(open(p))
            elif f.endswith('.jsonl'):
                for i, l in enumerate(open(p, encoding='utf-8')):
                    if l.strip():
                        json.loads(l)
        except Exception as e:
            bad.append((p, repr(e)[:200])); print('BAD', p, repr(e)[:200], flush=True)
print('files', n, 'bad', len(bad))
print('table columns', COLS)
