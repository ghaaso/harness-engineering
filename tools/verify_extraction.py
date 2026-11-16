"""Check byte integrity of extracted source, evidence, and browsable recovery code."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
from restore_artifacts import safe_target

ROOT = Path(__file__).resolve().parents[1]

def check(row):
    path = safe_target(ROOT, row['path'])
    if not path.is_file():
        return row['path'] + ': missing'
    data = path.read_bytes()
    if len(data) != row['bytes'] or hashlib.sha256(data).hexdigest() != row['sha256']:
        return row['path'] + ': changed'
    return None

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--include-restored-data', action='store_true')
    args = parser.parse_args()
    rows = json.loads((ROOT / 'migration/source-manifest.json').read_text(encoding='utf-8'))
    rows += json.loads((ROOT / 'migration/clinic-manifest.json').read_text(encoding='utf-8'))['files']
    additions = ROOT / 'migration/completeness-additions.json'
    if additions.exists():
        rows += json.loads(additions.read_text(encoding='utf-8'))['files']
    recovered = [json.loads(x) for x in (ROOT / 'migration/recovery-manifest.jsonl').read_text(encoding='utf-8').splitlines()]
    rows += [r for r in recovered if r['storage'] == 'git' or args.include_restored_data]
    with ThreadPoolExecutor(max_workers=8) as pool:
        failures = [x for x in pool.map(check, rows) if x]
    print(json.dumps({'checked_files': len(rows), 'failures': failures}, indent=2))
    raise SystemExit(bool(failures))

if __name__ == '__main__':
    main()
