"""Capture one bounded update; preserve old release assets and prior Git snapshot."""
import datetime,fnmatch,hashlib,json,os,shutil,zipfile
from concurrent.futures import ThreadPoolExecutor
import recover as R

root=R.DEST
rows=[json.loads(x) for x in (root/'migration/recovery-manifest.jsonl').read_text().splitlines()]
old={x['path']:x for x in rows};current=dict(old)
oldassets=json.loads((root/'migration/release-assets.json').read_text())
objects={x['sha256']:x['asset'] for x in rows if x['storage']=='release'}
tasks=[];excluded=[];began=datetime.datetime.now(datetime.timezone.utc).isoformat()
for label,source in R.SETS.items():
 for base,dirs,names in os.walk(source):
  for d in list(dirs):
   rel=label+'/'+(R.Path(base)/d).relative_to(source).as_posix()
   if d in R.SKIP_DIRS or d.endswith('.part') or any((rel+'/').startswith(p) for p in R.SKIP_PREFIXES):dirs.remove(d)
  for n in names:
   p=R.Path(base)/n;rel=label+'/'+p.relative_to(source).as_posix()
   if rel in R.SKIP_FILES or any(fnmatch.fnmatchcase(rel,g) for g in R.SKIP_GLOBS) or p.suffix in {'.pyc','.whl','.key','.pem','.lock.tmp','.part'} or n=='.env' or n.startswith('.env.') or n=='ktest.lock':continue
   prior=old.get('recovered/'+rel)
   try:stat=p.stat()
   except FileNotFoundError:excluded.append({'path':rel,'reason':'Transient file disappeared during enumeration'});continue
   if prior and prior.get('source_mtime_ns')==stat.st_mtime_ns and prior['bytes']==stat.st_size:continue
   tasks.append((label,source,p,rel))
for n in R.ROOT_FILES:
 p=R.PRIMARY/n
 if p.is_file():tasks.append(('primary-root',R.PRIMARY,p,n))
print('Delta candidates',len(tasks),flush=True)
changed=[];newobjects={}
def safe_capture(task):
 try:return R.capture(task)
 except FileNotFoundError:return None,task[2]
with ThreadPoolExecutor(max_workers=8) as pool:
 for row,p in pool.map(safe_capture,tasks):
  if row is None:excluded.append({'path':str(p),'reason':'Transient file disappeared while capturing'});continue
  prior=old.get(row['path'])
  if prior and row['sha256']==prior['sha256']:continue
  changed.append({'path':row['path'],'previous_sha256':prior['sha256'] if prior else None,'sha256':row['sha256']})
  current[row['path']]=row
  h=row['sha256']
  if row['storage']=='release':
   if h in objects:row['asset']=objects[h]
   else:newobjects[h]=(R.AUDIT/'objects'/h[:2]/h,row['bytes'])
print('Changed or added',len(changed),'new unique data bytes',sum(n for p,n in newobjects.values()),flush=True)
assets=[];bucket=[];size=0;buckets=[]
for h,(p,n) in sorted(newobjects.items()):
 if bucket and size+n>750_000_000:buckets.append(bucket);bucket=[];size=0
 bucket.append((h,p,n));size+=n
if bucket:buckets.append(bucket)
for i,bucket in enumerate(buckets,1):
 name=f'recovery-update-20261115-{i:02}.zip';p=R.AUDIT/'release-assets'/name
 with zipfile.ZipFile(p,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1) as z:
  for h,obj,n in bucket:
   data=obj.read_bytes()
   if R.digest(data)!=h:raise RuntimeError('Changed immutable object')
   z.writestr('objects/'+h,data);objects[h]=name
 assets.append({'name':name,'bytes':p.stat().st_size,'sha256':R.digest(p.read_bytes()),'objects':len(bucket)})
for row in current.values():
 if row['storage']=='release':row['asset']=objects[row['sha256']]
# Keep superseded object paths as historical variants, so every original asset
# remains exactly verifiable and the previous state can be inspected after restore.
superseded=[]
for change in changed:
 before=old.get(change['path'])
 if before and before['storage']=='release':
  hist=dict(before);hist['path']='recovered/snapshots/20261115T1125/'+before['path'].removeprefix('recovered/')
  hist['historical_of']=before['path'];current[hist['path']]=hist;superseded.append(hist['path'])
(root/'migration/recovery-manifest.jsonl').write_text(''.join(json.dumps(r,separators=(',',':'))+'\n' for r in sorted(current.values(),key=lambda r:r['path'])),encoding='utf-8')
(root/'migration/release-assets.json').write_text(json.dumps(oldassets+assets,indent=2)+'\n',encoding='utf-8')
report={'capture_started_utc':began,'capture_finished_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'changes':changed,'preserved_prior_data_versions':superseded,'transient_exclusions':excluded,'total_manifest_files':len(current),'git_files':sum(r['storage']=='git' for r in current.values()),'logical_bytes':sum(r['bytes'] for r in current.values()),'release_bytes':sum(a['bytes'] for a in oldassets+assets)}
(root/'migration/validation/update-capture.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
# Update EMS evidence if another session appended to the untracked research.
manifest=root/'migration/source-manifest.json';source_rows=json.loads(manifest.read_text());extra=[]
for row in source_rows:
 if row['source']!='EMS working tree':continue
 source=root.parent/'EMS_workshop1'/row['source_path'];data=source.read_bytes();h=R.digest(data)
 if h==row['sha256']:continue
 prior_path='migration/snapshots/initial/'+row['path'];prior=root/prior_path;prior.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/row['path'],prior)
 prev=dict(row);prev['path']=prior_path;prev['source']='EMS working tree, initial capture';extra.append(prev)
 (root/row['path']).write_bytes(data);row['sha256']=h;row['bytes']=len(data);row['updated_during_extraction']=True
source_rows+=extra;manifest.write_text(json.dumps(source_rows,indent=2)+'\n',encoding='utf-8')
shutil.copy2(__file__,root/'migration/capture_delta.py')
print(json.dumps({k:v for k,v in report.items() if k not in ['changes','preserved_prior_data_versions','transient_exclusions']},indent=2),flush=True)
