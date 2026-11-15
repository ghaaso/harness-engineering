"""Capture explicitly referenced scratch research without altering its sources."""
import collections, hashlib, json, os, re, shutil, zipfile, fnmatch, datetime, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

AUDIT=Path(__file__).resolve().parent
DEST=AUDIT.parent/'harness-engineering'
TEMP=Path(r'C:/Users/User/AppData/Local/Temp/claude')
SETS={
 'hb':TEMP/'192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb',
 'compile':TEMP/'19c00a033739b7a2/423aac92-9218-409f-aa40-f95c9fbfe131/scratchpad/compile',
 'library':TEMP/'192654871f6b1294/0bf1c4f3-76dc-4144-995c-2af5a213db41/scratchpad/lib',
 'simulation':TEMP/'192654871f6b1294/c43afbf6-198f-44b7-9c89-fb1b583ea234/scratchpad/sim',
 'tokens':TEMP/'b6c3202ba5123743/05fc6dc4-8dea-4418-8b3c-6244e4758c7b/scratchpad/tokens',
}
PRIMARY=SETS['hb'].parent
for extra in ['coord','eval','g2c','gfy','lane-sel-iface','lm','refute','st','usecases','v1audit','va']:
 SETS[extra]=PRIMARY/extra
ROOT_FILES=['co_count.js','derive.js','derive2.js','derive3.js','fix-k0-result.py','ks.md','secM.cur.txt','secM.js.txt','tok.js']
SKIP_DIRS={'node_modules','__pycache__','.git','.venv','venv','wheels','stale','site-packages'}
SKIP_PREFIXES=[
 'hb/graph2/engines-windows-unused/ext/',
 'hb/graph2/wider/graphify/image/src/',
 'hb/graph2/wider/feas/graphify-src-read/',
 'hb/graph2/wider/feas/cache/',
 'g2c/export/backend/','g2c/hermetic/technician-app/','gfy/src/',
]
SKIP_FILES={
 'hb/fill/verify/method/again.json','hb/fill/verify/method/calls.json','hb/fill/verify/method/items.json',
 'hb/fill/verify/remeasure/p1.json','hb/fill/verify/remeasure/windows.ndjson','hb/graph/searches.jsonl',
 'simulation/errors.jsonl',
 'library/refute/r8-errors.jsonl','library/refute/R3-errors.jsonl',
 'usecases/out/steps.jsonl','usecases/out/episodes.jsonl','usecases/out/episodes-labelled.jsonl','usecases/out/episodes-qf.jsonl',
 'hb/graph2/graph-v2-work/lookups/out/instances.jsonl','hb/graph2/graph-v2-work/lookups/out/instances-v.jsonl',
}
SKIP_GLOBS=['usecases/out/dump-*.txt','library/refute/calls-*.jsonl','library/refute/*-r5.jsonl','library/refute/*failsamples*','library/dives/cl.jsonl','library/dives/ff.jsonl']
SOURCE_SUFFIXES={'.py','.js','.cjs','.mjs','.sh','.ps1','.md','.css','.html','.sql','.baml','.toml','.yaml','.yml','.lock'}
SECRET=re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-ant-[A-Za-z0-9_-]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')

def digest(data): return hashlib.sha256(data).hexdigest()

def capture(task):
 label,root,p,rel=task
 for attempt in range(5):
  before=p.stat();data=p.read_bytes();after=p.stat()
  if (before.st_size,before.st_mtime_ns)==(after.st_size,after.st_mtime_ns):break
  time.sleep(0.1)
 else:raise RuntimeError('Cannot capture stable bytes: '+str(p))
 h=digest(data)
 if SECRET.search(data):raise RuntimeError('Credential review required: '+str(p))
 source=(p.suffix in SOURCE_SUFFIXES or p.name in {'Dockerfile','requirements.txt'} or p.name.endswith(('.js.txt','.py.txt','.sh.txt','.cjs.txt')))
 in_git=source and len(data)<2_000_000
 destrel='recovered/'+rel
 if in_git:
  out=DEST/destrel;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
 else:
  out=AUDIT/'objects'/h[:2]/h;out.parent.mkdir(parents=True,exist_ok=True)
  try:
   with out.open('xb') as stream:stream.write(data)
  except FileExistsError:pass
 return {'path':destrel,'source_set':label,'source_path':p.relative_to(root).as_posix(),'sha256':h,'bytes':len(data),'source_mtime_ns':after.st_mtime_ns,'captured_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'storage':'git' if in_git else 'release'},p

def run():
 rows=[];excluded=[];unique={};totals=collections.Counter();tasks=[]
 for label,root in SETS.items():
  if not root.is_dir():raise RuntimeError('Missing recovery root '+str(root))
  for base,dirs,files in os.walk(root):
   for d in list(dirs):
    rel=label+'/'+(Path(base)/d).relative_to(root).as_posix()
    if d in SKIP_DIRS or any((rel+'/').startswith(p) for p in SKIP_PREFIXES):
     dirs.remove(d);excluded.append({'path':rel+'/','reason':'Replaceable dependency, install cache, or upstream package copy'})
   for name in sorted(files):
    p=Path(base)/name;rel=label+'/'+p.relative_to(root).as_posix()
    if rel in SKIP_FILES or any(fnmatch.fnmatchcase(rel,g) for g in SKIP_GLOBS) or p.suffix in {'.pyc','.whl','.key','.pem'} or p.name=='.env' or p.name.startswith('.env.'):
     excluded.append({'path':rel,'reason':'Raw session working data or replaceable dependency/bytecode'});continue
    tasks.append((label,root,p,rel))
  print('enumerated',label,len(tasks),flush=True)
 for name in ROOT_FILES:
  p=PRIMARY/name
  if p.is_file():tasks.append(('primary-root',PRIMARY,p,name))
 with ThreadPoolExecutor(max_workers=8) as pool:
  for row,p in pool.map(capture,tasks):
   rows.append(row);h=row['sha256']
   if row['storage']=='release' and h not in unique:unique[h]=(AUDIT/'objects'/h[:2]/h,row['bytes'])
   totals['files']+=1;totals['bytes']+=row['bytes'];totals['git_files']+=int(row['storage']=='git')
   if totals['files']%5000==0:print('hashed',totals['files'],flush=True)
 print('captured',dict(totals),'unique release bytes',sum(n for p,n in unique.values()),flush=True)
 (AUDIT/'captured-rows.json').write_text(json.dumps(rows),encoding='utf-8')
 (DEST/'migration/recovery-sources.json').write_text(json.dumps({**{k:str(v) for k,v in SETS.items()},'primary-root':str(PRIMARY)},indent=2)+'\n',encoding='utf-8')
 (DEST/'migration/recovery-exclusions.json').write_text(json.dumps(excluded,indent=2)+'\n',encoding='utf-8')
 artifacts=AUDIT/'release-assets';artifacts.mkdir(exist_ok=True)
 index=[];buckets=[];bucket=[];size=0
 for h,(p,n) in sorted(unique.items()):
  if bucket and size+n>750_000_000:buckets.append(bucket);bucket=[];size=0
  bucket.append((h,p,n));size+=n
 if bucket:buckets.append(bucket)
 objparts={}
 for i,bucket in enumerate(buckets,1):
  path=artifacts/f'recovery-objects-{i:02}.zip'
  with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1,allowZip64=True) as z:
   for h,p,n in bucket:
    data=p.read_bytes()
    if digest(data)!=h:raise RuntimeError('Source changed after inventory: '+str(p))
    z.writestr('objects/'+h,data)
    objparts[h]=path.name
  index.append({'name':path.name,'bytes':path.stat().st_size,'sha256':digest(path.read_bytes()),'objects':len(bucket)})
  print('packaged',path.name,path.stat().st_size,flush=True)
 for row in rows:
  if row['storage']=='release':row['asset']=objparts[row['sha256']]
 (DEST/'migration/recovery-manifest.jsonl').write_text(''.join(json.dumps(r,separators=(',',':'))+'\n' for r in rows),encoding='utf-8')
 (DEST/'migration/release-assets.json').write_text(json.dumps(index,indent=2)+'\n',encoding='utf-8')
 totals['unique_release_objects']=len(unique);totals['unique_release_bytes']=sum(n for p,n in unique.values());totals['archive_bytes']=sum(x['bytes'] for x in index)
 (AUDIT/'recovery-summary.json').write_text(json.dumps(totals,indent=2))
 shutil.copy2(__file__,DEST/'migration/recover.py')
 print(json.dumps(totals,indent=2),flush=True)

if __name__=='__main__':run()
