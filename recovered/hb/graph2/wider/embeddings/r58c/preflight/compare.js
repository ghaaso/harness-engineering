// Ruling 68 comparison of the two runs of each setting in rec.jsonl.
const fs=require('fs'); const R={};
for (const l of fs.readFileSync(process.argv[2],'utf8').split('\n')) { if(!l.trim()) continue; const r=JSON.parse(l); R[r.tag||r.spec]=r; }
for (const k of Object.keys(R)) { const r=R[k]; console.log(k, r.status, 'epochs', r.epochs, 'det', r.det_flag, r.cublas_ws, 'peak', r.peak_rss_mb, r.cuda_peak_reserved_mb||'', r.error||''); }
let ok=true;
for (const c of ['c13','c16']) { const a=R[c+'_a'], b=R[c+'_b'];
  if(!a||!b||a.status!=='done'||b.status!=='done'){ console.log(c,'INCOMPLETE'); ok=false; continue; }
  const keys=new Set([...Object.keys(a.reps_tensors),...Object.keys(b.reps_tensors)]); let td=[];
  for (const t of keys) if (JSON.stringify(a.reps_tensors[t])!==JSON.stringify(b.reps_tensors[t])) td.push(t);
  const chk={losses:a.losses_sha256===b.losses_sha256, tensors:td.length===0, n_tensors:keys.size,
    pool:a.tables_sha256.pool===b.tables_sha256.pool, unrestricted:a.tables_sha256.unrestricted===b.tables_sha256.unrestricted,
    counts:a.counts_sha256===b.counts_sha256};
  const same=chk.losses&&chk.tensors&&chk.pool&&chk.unrestricted&&chk.counts; ok=ok&&same;
  console.log(c, same?'IDENTICAL':'DIFFER', JSON.stringify(chk), td.slice(0,5).join(' '), 'losses', a.losses_sha256.slice(0,12), b.losses_sha256.slice(0,12), 'reps', a.reps_sha256.slice(0,12), b.reps_sha256.slice(0,12));
}
console.log('RESULT', ok?'PASS':'FAIL');
