#!/bin/sh
# runs leak_check over every cache folder (no symbol text check), one JSON line each
C=../../facts/cache
for d in $C/*/; do s=$(basename $d); [ ${#s} -eq 40 ] || continue; NOSYM=1 node leak_check.js $d $s | node -e 'let t="";process.stdin.on("data",d=>t+=d).on("end",()=>{const r=JSON.parse(t);console.log(JSON.stringify({sha:process.argv[1].slice(0,10),np:r.node_paths_not_at_P.length,ev:r.edge_evidence_not_at_P.length,na:r.commits_not_ancestor,fut:r.commits_after_P,cc:r.cochange_commit_refs_not_ancestor,prl:r.commit_pr_labels,prf:r.commit_pr_labels_known_only_after_P,drop:r.commits_with_dropped_label,dropfiles:r.dropped_commits_files_listed,dl:r.dropped_labels.map(x=>x.split(":")[0]).filter((v,i,a)=>a.indexOf(v)==i),tp:r.meta_task_prs}))})' $s; done
