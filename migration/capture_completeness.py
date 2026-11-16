"""Repair reviewed pre-snapshot omissions without changing original projects."""
import hashlib,json,shutil,subprocess,datetime,re
from pathlib import Path

AUDIT=Path(__file__).resolve().parent
DEST=AUDIT.parent/'harness-engineering'
EMS=AUDIT.parent/'EMS_workshop1'
selection=json.loads((AUDIT/'completeness-selection.json').read_text())
for row in json.loads((AUDIT/'capture-race-files.json').read_text()):
 selection.append({'source':row['source'],'destination':row['path'],'reason':'One held-out unit completed during initial file enumeration; recover its recorded data to match the already archived progress log'})
for rel in ['.github','ops/selfhost/smoke']:
 for p in (EMS/rel).rglob('*'):
  if p.is_file():selection.append({'source':str(p),'destination':'case-studies/fixflow/'+p.relative_to(EMS).as_posix(),'reason':'FixFlow custom context/gate implementation and its case-study wiring; archived, not activated'})
for rel in ['docs/RUNBOOK-BACKUPS.md','.claude/launch.json']:
 selection.append({'source':str(EMS/rel),'destination':'case-studies/fixflow/'+rel,'reason':'Case-study gate/rehearsal context'})
selection += [
 {'source':str(EMS/'.claude/worktrees/rv203-probe/backend/tests/test_scratch_rv203_phone.py'),'destination':'case-studies/fixflow/reviewer-prototypes/rv203-probe/backend/tests/test_scratch_rv203_phone.py','reason':'Previously untracked reviewer reproductions, original base 89235c91'},
 {'source':r'C:/Users/User/AppData/Local/Temp/claude/b55654707a896589/f765569e-2b59-4dab-aaa3-2a487f806776/scratchpad/p8a-base/backend/tests/test_event_payload_free_text_integration.py','destination':'case-studies/fixflow/reviewer-prototypes/p8a-base/backend/tests/test_event_payload_free_text_integration.py','reason':'Previously untracked integration-guard prototype, original base 7bf9f495'},
 {'git_ref':'223d6b36','git_path':'scripts/check-claude-md.mjs','destination':'case-studies/fixflow/historical/223d6b36/scripts/check-claude-md.mjs','reason':'Distinct earlier agent-context checker omitted from the history path filter'},
]
for rel in ['ops/selfhost/smoke/compose-rules.mjs','ops/selfhost/smoke/docker-compose.smoke.yml','ops/selfhost/smoke/runbook-commands.sh']:
 selection.append({'git_ref':'main','git_path':rel,'destination':'case-studies/fixflow/variants/main/'+rel,'reason':'Distinct merged-main version of the FixFlow gate/rehearsal helper'})

secret=re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-ant-[A-Za-z0-9_-]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')
rows=[]
for item in selection:
 record={'path':item['destination'],'reason':item['reason']}
 if 'source' in item:
  p=Path(item['source']);data=p.read_bytes();record['source']=str(p);record['source_mtime_utc']=datetime.datetime.fromtimestamp(p.stat().st_mtime,datetime.timezone.utc).isoformat()
 else:
  oid=subprocess.check_output(['git','-C',str(EMS),'rev-parse',item['git_ref']]).decode().strip()
  data=subprocess.check_output(['git','-C',str(EMS),'show',oid+':'+item['git_path']]);record.update(source_commit=oid,source_path=item['git_path'])
 if secret.search(data):raise RuntimeError('Credential review needed for '+record['path'])
 out=(DEST/record['path']).resolve()
 if not out.is_relative_to(DEST.resolve()):raise RuntimeError('Unsafe destination')
 if out.exists() and out.read_bytes()!=data:raise RuntimeError('Would replace existing distinct source '+record['path'])
 out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
 record.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),storage='git');rows.append(record)
manifest=DEST/'migration/completeness-additions.json'
manifest.write_text(json.dumps({'audit_date':'2026-11-16','files':rows},indent=2)+'\n',encoding='utf-8')
shutil.copy2(AUDIT/'completeness-exclusions.json',DEST/'migration/completeness-exclusions.json')
shutil.copy2(__file__,DEST/'migration/capture_completeness.py')
paths=AUDIT/'completeness-additions.nul';paths.write_bytes(b'\0'.join(r['path'].encode() for r in rows)+b'\0')
print(json.dumps({'files':len(rows),'bytes':sum(r['bytes'] for r in rows),'manifest':str(manifest)},indent=2))
