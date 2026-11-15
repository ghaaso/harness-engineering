"""Non-destructive, byte-preserving extraction of EMS harness records."""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

SOURCE = Path(r'C:/Users/User/Documents/projects/EMS_workshop1')
DEST = SOURCE.parent / 'harness-engineering'
AUDIT = Path(__file__).resolve().parent
PATHS = ['docs/program/', 'docs/ORCHESTRATION-DESIGN-2026-10.md', '.claude/skills/', '.claude/agents/', 'ops/lab/']
BRANCHES = [
    ('claude/harness-ideas-baml-57fde3', ['docs/program/HARNESS-IDEAS-BAML-2026-11.md', 'docs/program/evidence/harness-ideas/baml/']),
    ('claude/harness-ideas-horthy-2371b9', ['docs/program/HARNESS-IDEAS-HORTHY-2026-11.md', 'docs/program/evidence/harness-ideas/horthy/']),
    ('claude/knowledge-store-research-9c609c', ['docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md', 'docs/program/evidence/knowledge-store/']),
    ('main', ['ops/lab/rehearsal/']),
    ('claude/l3a-device-lab-0d5f13', ['ops/lab/device/']),
]

def git(*args, cwd=SOURCE):
    return subprocess.check_output(['git', '-C', str(cwd), *args])

def sha(data):
    return hashlib.sha256(data).hexdigest()

def files_under(root, rel):
    p = root / rel
    return sorted(f for f in p.rglob('*') if f.is_file()) if p.is_dir() else [p]

def main():
    if DEST.exists():
        raise SystemExit(f'Destination already exists: {DEST}')
    AUDIT.mkdir(exist_ok=True)
    (AUDIT/'source-status.before').write_bytes(git('status', '--porcelain=v1', '-uall'))
    (AUDIT/'source-refs.before').write_bytes(git('show-ref'))
    (AUDIT/'source-worktrees.txt').write_bytes(git('worktree', 'list', '--porcelain'))
    (AUDIT/'source-head.txt').write_bytes(git('rev-parse', 'HEAD'))
    subprocess.run(['git','-C',str(SOURCE),'bundle','create',str(AUDIT/'ems-all-refs.bundle'),'--all'],check=True)
    DEST.mkdir()
    git('init','-b','main',cwd=DEST)
    git('config','core.autocrlf','false',cwd=DEST)
    git('config','core.longpaths','true',cwd=DEST)
    export = AUDIT/'selected-history.fast-export'
    with export.open('wb') as stream:
        subprocess.run(['git','-C',str(SOURCE),'fast-export','--all',
            '--signed-tags=strip','--tag-of-filtered-object=drop','--reencode=yes',
            '--show-original-ids','--refspec=refs/heads/*:refs/heads/history/heads/*',
            '--refspec=refs/remotes/*:refs/heads/history/remotes/*',
            '--refspec=refs/tags/*:refs/tags/history/*',
            '--export-marks='+str(AUDIT/'original.marks'),'--',*PATHS],stdout=stream,check=True)
    with export.open('rb') as stream:
        subprocess.run(['git','-C',str(DEST),'fast-import','--quiet','--export-marks='+str(AUDIT/'extracted.marks')],stdin=stream,check=True)
    base = 'history/heads/docs/orchestration-design-2026-10'
    git('checkout','-B','main',base,cwd=DEST)
    manifest = []
    for rel in PATHS:
        for p in files_under(SOURCE,rel):
            if not p.is_file():
                continue
            name = p.relative_to(SOURCE).as_posix()
            data = p.read_bytes()
            target = DEST/name
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(data)
            manifest.append({'path':name,'source':'EMS working tree','source_path':name,'sha256':sha(data),'bytes':len(data)})
    for ref, paths in BRANCHES:
        oid = git('rev-parse',ref).decode().strip()
        names = git('ls-tree','-r','--name-only','-z',ref,'--',*paths).decode().strip('\0').split('\0')
        for name in filter(None,names):
            data = git('show',f'{oid}:{name}')
            target = DEST/name
            if target.exists() and target.read_bytes()!=data:
                raise RuntimeError('Unreviewed path collision: '+name)
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(data)
            manifest.append({'path':name,'source':'EMS Git object','source_ref':ref,'source_commit':oid,'source_path':name,'sha256':sha(data),'bytes':len(data)})
    # Keep the complete product context separate from the harness entry points.
    for name in ['README.md','CLAUDE.md','ARCHITECTURE.md','CONTRIBUTING.md','package.json','package-lock.json','docs/CODE-MAP.md','docs/RUNBOOK-SELFHOST.md','docker-compose.prod.yml']:
        data=(SOURCE/name).read_bytes()
        target=DEST/'case-studies/fixflow'/name
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(data)
        manifest.append({'path':target.relative_to(DEST).as_posix(),'source':'EMS working tree','source_path':name,'sha256':sha(data),'bytes':len(data)})
    (DEST/'migration').mkdir(exist_ok=True)
    (DEST/'migration/source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    original=dict(line.split() for line in (AUDIT/'original.marks').read_text().splitlines())
    imported=dict(line.split() for line in (AUDIT/'extracted.marks').read_text().splitlines())
    (DEST/'migration/commit-map.tsv').write_text('original_commit\textracted_commit\n'+''.join(original[k]+'\t'+imported[k]+'\n' for k in original if k in imported),encoding='utf-8')
    (DEST/'migration/source-refs.txt').write_bytes((AUDIT/'source-refs.before').read_bytes())
    shutil.copy2(__file__,DEST/'migration/extract.py')
    print(json.dumps({'files':len(manifest),'bytes':sum(m['bytes'] for m in manifest),'filtered_commits':len(original),'destination':str(DEST)},indent=2))

if __name__=='__main__':
    main()
