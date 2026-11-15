"""Verify or restore content-addressed private-release research data.

Python standard library only. Download the assets with the gh command in README.
No archived experiment is executed. Existing differing files are never overwritten.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def digest_file(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def safe_target(root, name):
    rel = PurePosixPath(name)
    if rel.is_absolute() or '..' in rel.parts or '\\' in name or ':' in name:
        raise ValueError('Unsafe manifest path: ' + name)
    dest = (root / name).resolve()
    if not dest.is_relative_to(root.resolve()):
        raise ValueError('Path escapes destination: ' + name)
    return dest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--assets', required=True, type=Path)
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--destination', type=Path, default=ROOT,
                        help='Optional separate directory for restored data')
    parser.add_argument('--path-prefix', default='',
                        help='Restore only paths with this prefix; still verify every asset')
    args = parser.parse_args()
    assets = json.loads((ROOT / 'migration/release-assets.json').read_text(encoding='utf-8'))
    rows = [json.loads(x) for x in (ROOT / 'migration/recovery-manifest.jsonl').read_text(encoding='utf-8').splitlines()]
    wanted = collections.defaultdict(lambda: collections.defaultdict(list))
    for row in rows:
        safe_target(args.destination, row['path'])
        if row['storage'] == 'release':
            wanted[row['asset']][row['sha256']].append(row)
    objects = files = restored = 0
    for asset in assets:
        path = args.assets / asset['name']
        if path.stat().st_size != asset['bytes'] or digest_file(path) != asset['sha256']:
            raise ValueError('Archive integrity mismatch: ' + asset['name'])
        with zipfile.ZipFile(path) as z:
            expected = {'objects/' + h for h in wanted[asset['name']]}
            if set(z.namelist()) != expected or len(z.namelist()) != len(expected):
                raise ValueError('Archive object inventory mismatch: ' + asset['name'])
            for h, refs in wanted[asset['name']].items():
                data = z.read('objects/' + h)
                if hashlib.sha256(data).hexdigest() != h or any(len(data) != r['bytes'] for r in refs):
                    raise ValueError('Object integrity mismatch: ' + h)
                objects += 1
                files += len(refs)
                if not args.verify_only:
                    for row in refs:
                        if not row['path'].startswith(args.path_prefix):
                            continue
                        target = safe_target(args.destination, row['path'])
                        if target.exists():
                            if not target.is_file() or digest_file(target) != h:
                                raise FileExistsError('Refusing to replace differing file: ' + str(target))
                        else:
                            target.parent.mkdir(parents=True, exist_ok=True)
                            target.write_bytes(data)
                            restored += 1
        print('Verified', asset['name'], flush=True)
    print(json.dumps({'verified_objects': objects, 'covered_files': files, 'restored_files': restored}, indent=2))

if __name__ == '__main__':
    main()
