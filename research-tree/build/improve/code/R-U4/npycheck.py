"""R-U4 check: every .npy under /out has the byte size its header states and loads; EASE matrices are finite.
usage: python npycheck.py"""
import os
import numpy as np
bad = n = 0
for dp, dn, fn in os.walk('/out'):
    for f in sorted(fn):
        if not f.endswith('.npy'):
            continue
        p = os.path.join(dp, f); n += 1
        try:
            with open(p, 'rb') as fh:
                v = np.lib.format.read_magic(fh)
                sh, fo, dt = (np.lib.format.read_array_header_1_0 if v == (1, 0) else np.lib.format.read_array_header_2_0)(fh)
                off = fh.tell()
            want = off + int(np.prod(sh)) * np.dtype(dt).itemsize
            assert os.path.getsize(p) == want, 'size %d != %d' % (os.path.getsize(p), want)
            a = np.load(p)
            if f.endswith('.ease.npy'):
                assert np.isfinite(a).all(), 'non-finite EASE'
        except Exception as e:
            bad += 1; print('BAD', p, repr(e)[:200], flush=True)
print('npy files', n, 'bad', bad)
