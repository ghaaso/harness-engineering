"""Check research links and preservation; hash selected committed source bytes.

This does not run a live model or validate semantic compression quality.
"""
from pathlib import Path
import hashlib
import json
import re
import subprocess

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
OLD = ROOT / 'output/corpus-map-justification/10-context-admission-research'
TASK = ROOT / 'docs/tasks/context-admission-research'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    errors = []
    baseline = json.loads((OLD / 'baseline-preservation.json').read_text(encoding='utf-8'))
    for entry in baseline['files']:
        path = ROOT / entry['path']
        if not path.is_file() or digest(path.read_bytes()) != entry['sha256']:
            errors.append({'check': 'original-preservation', 'path': entry['path']})

    links = 0
    markdown = list(BASE.glob('*.md')) + list(TASK.glob('*.md'))
    for path in markdown:
        body = path.read_text(encoding='utf-8-sig')
        if sum(line.startswith('```') for line in body.splitlines()) % 2:
            errors.append({'check': 'code-fence', 'path': str(path.relative_to(ROOT))})
        for match in re.finditer(r'\[[^\]]*\]\(([^\n)]+)\)', body):
            target = match.group(1).strip().strip('<>')
            if target.startswith(('https://', 'http://', '#', 'codex://')):
                continue
            target = target.split('#', 1)[0]
            if target:
                links += 1
                if not (path.parent / target).exists():
                    errors.append({'check': 'local-link', 'path': str(path.relative_to(ROOT)), 'target': target})

    repositories = {
        'claude-code-infinite': {
            'repository': 'crizCraig/claude-code-infinite',
            'commit': '6aaf6d59262bd6806ab73fba6a9ab9e69a5df57d',
            'files': ['README.md', 'package.json', 'src/proxy.ts', 'src/memtree.ts',
                      'src/memtree-tools.ts', 'src/request-sizing.ts', 'src/cli-main.ts',
                      'src/cli-args.ts', 'src/claude-env.ts', 'test/memtree-history.test.mjs',
                      'test/route-identity.test.mjs', 'test/route-safety.test.mjs',
                      'test/route-cache.test.mjs', 'test/request-sizing.test.mjs',
                      'test/proxy-window.test.mjs', 'test/proxy-sizing.test.mjs'],
        },
        'yesmem': {
            'repository': 'carsteneu/yesmem',
            'commit': '25d8ce444ff570e105afcaded1929404d3ca344d',
            'files': ['README.md', 'Features.md', 'SYSTEM.md', 'docs/features/proxy.md',
                      'docs/BENCHMARK.md', 'config.example.yaml', 'internal/proxy/proxy.go',
                      'internal/proxy/proxy_stub.go', 'internal/proxy/stubify.go',
                      'internal/proxy/reexpand.go', 'internal/proxy/sawtooth.go'],
        },
    }
    sources = []
    for directory, spec in repositories.items():
        clone = ROOT / 'tmp/context-system-correction' / directory
        head = subprocess.check_output(['git', '-C', str(clone), 'rev-parse', 'HEAD'], text=True).strip()
        if head != spec['commit']:
            errors.append({'check': 'source-pin', 'repository': spec['repository'], 'actual': head})
        for name in spec['files']:
            raw = subprocess.check_output(['git', '-C', str(clone), 'show', f"{spec['commit']}:{name}"])
            sources.append({'repository': spec['repository'], 'commit': spec['commit'],
                            'path': name, 'sha256': digest(raw)})

    attachment = OLD / 'submitted-proposal.txt'
    expected = 'b168899748aafe4fcc2bdf08f45e2d6447b519d391a8b2f162951c98bf312275'
    if digest(attachment.read_bytes()) != expected:
        errors.append({'check': 'attachment-preservation'})
    result = {
        'date': '2026-10-09', 'passed': not errors, 'errors': errors,
        'original_files_checked': len(baseline['files']), 'local_links_checked': links,
        'selected_committed_source_files_hashed': len(sources), 'sources': sources,
        'npm_release': {'name': 'claude-code-infinite', 'version': '1.0.14',
                        'gitHead': repositories['claude-code-infinite']['commit'],
                        'tarball_sha1_independent_agent_check': '57ab0652eacc3aa09ec88cd992abc8a47358ea54'},
        'focused_mock_tests': {
            'repository': 'crizCraig/claude-code-infinite', 'passed': 89,
            'failed': 0, 'skipped': 0, 'duration_ms': 5383.9327,
            'command': 'node --test test/memtree-history.test.mjs test/route-identity.test.mjs '
                       'test/route-safety.test.mjs test/route-cache.test.mjs '
                       'test/request-sizing.test.mjs test/proxy-window.test.mjs '
                       'test/proxy-sizing.test.mjs',
            'scope': 'Local mocked routing/sizing/history validation; no live semantic quality test',
        },
        'bounded_consistency_review': 'A separate agent reviewed current report/index; no substantive changes requested',
        'not_performed': ['installation', 'Claude settings changes', 'memory-service account setup',
                          'project-history upload', 'paid/live provider trial', 'Ultracode quality trial'],
    }
    (BASE / 'verification.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k not in ('sources', 'focused_mock_tests', 'npm_release')}, indent=2))
    return int(bool(errors))

if __name__ == '__main__':
    raise SystemExit(main())
