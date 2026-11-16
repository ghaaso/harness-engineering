const fs=require('fs');const {L,D,j}=require('./p.js');
const R=fs.readFileSync(D+'/RESULT.md','utf8').split('\n');
const T=j(L+'/train/report/tune.json'), H=j(L+'/grader-returns/heldout.json'), I24=j(L+'/grader-returns/tune-item24.json');
const AL=j(L+'/train/report/answer_level/answer_level.json'), I22=j(L+'/train/report/item22.json'), I27=j(L+'/train/heldout/item27.json');
const HO=j(L+'/train/heldout/HANDOFF.json'), LA=j(L+'/train/leak_audit/leak_audit.json'), RJ=j(D+'/result.json'), TR=j(L+'/grader-returns/tune-rank.json');
let n=0, bad=[];
const s3=x=>(x>=0&&!Object.is(x,-0)?'+':'')+x.toFixed(3);
const u3=x=>x.toFixed(3);
const ex1=x=>x.toExponential(1).replace(/e([+-])(\d)$/,'e$10$2');
function ci(c){return `${s3(c.diff)} [${s3(c.lo)}, ${s3(c.hi)}]`;}
function eq(line,label,got,exp){n++; if(String(got).trim()!==String(exp).trim()) bad.push({line,label,got,exp});}
const cells=l=>R[l-1].split('|').slice(1,-1).map(s=>s.trim());
const C=T.contrasts.late50, CP=T.contrasts.late50_pilot_shared, V=T.verdicts.late50, Hm=T.holm.late50;
const arms=['E1','E2','E3','E4','E5','PLACEBO'];
// Table 1
arms.forEach((a,i)=>{const l=11+i, c=cells(l);
 eq(l,a+' fused pool',c[1],ci(C.pool[a+'_fused'].vs_RRF['P@10']));
 eq(l,a+' primary word',c[2],V[a].primary);
 if(a!=='PLACEBO'){const h=Hm.pool.fused['P@10'][a]; eq(l,a+' holm',c[3],`[${s3(h.lo)}, ${s3(h.hi)}] at ${h.level.toFixed(4)}`);} else eq(l,'placebo holm',c[3],'n/a (not an embedding arm)');
 eq(l,a+' alone pool',c[4],ci(C.pool[a+'_alone'].vs_RRF['P@10']));
 eq(l,a+' alone word (stored, minus inserted phrase)',c[5].replace(' (no evidence either way at this size)',''),V[a].alone_pool);
 eq(l,a+' fused unres',c[6],ci(C.unrestricted[a+'_fused'].vs_RRF['P@10']));
 eq(l,a+' fused unres word',c[7],V[a].fused_unrestricted);
 eq(l,a+' builder',c[8],ci(C.pool[a+'_fused_builder'].vs_RRF['P@10']));
 eq(l,a+' pilot',c[9],ci(CP.pool[a+'_fused'].vs_RRF['P@10']));
});
{const hc=T.harness_check, f=hc.placebo_fixed_w_late50_pool_P10_vs_RRF;
 eq(20,'harness',R[19],`Placebo (harness check, ruling 54; harness_check.ok = ${hc.ok?'True':'False'}): primary word "${hc.placebo_primary_late50}"; fixed-w pool P@10 minus RRF: w0.25 ${ci(f['w0.25'])}, w0.5 ${ci(f['w0.5'])}, w1 ${ci(f.w1)}.`);}
const M=['P@10','R@10','R@20','MRR'];
arms.forEach((a,i)=>{const l=26+i,c=cells(l);let k=1;
 for(const sc of ['pool','unrestricted'])for(const m of M){eq(l,a+' '+sc+' '+m,c[k++],u3(T.arms.late50[sc][a+'_alone'].seed_mean[m])+' / '+u3(T.arms.late50[sc][a+'_fused'].seed_mean[m]));}});
['RRF','PPR','CO','DIR','RANDOM'].forEach((a,i)=>{const l=32+i,c=cells(l);let k=1;
 for(const sc of ['pool','unrestricted'])for(const m of M){eq(l,a+' '+sc+' '+m,c[k++],u3(T.comparators.late50[sc][a][m]));}});
{let cnt=0,mx=0;const cmpv=(x,y)=>{cnt++;mx=Math.max(mx,Math.abs(x-y));};
 for(const lab of Object.keys(TR.rank)){for(const sc of ['pool','unrestricted'])for(const m of M){const g=TR.rank[lab][sc][m];let t;
  let mm=lab.match(/^(.*)_(alone|fused)_(mean|s(\d))$/);
  if(mm){const a=T.arms.late50[sc][mm[1]+'_'+mm[2]]; t= mm[3]==='mean'?a.seed_mean[m]:a.per_seed[mm[4]][m];} else t=T.comparators.late50[sc][lab][m];
  cmpv(g,t);}}
 console.log('rank check recomputed cells',cnt,'max',mx,'labels',Object.keys(TR.rank).length);
 const m=R[37].match(/(\d+) cells.*largest difference ([0-9.e+-]+)\)/); eq(38,'rank cells',m[1],String(cnt)); eq(38,'rank maxdiff',m[2],ex1(mx));}
arms.forEach((a,i)=>{const l=42+i;const ps=C.pool[a+'_fused'].per_seed_P10_vs_RRF;
 eq(l,a+' seeds',R[l-1],`- ${a}: s1 ${ci(ps['1'])}; s2 ${ci(ps['2'])}; s3 ${ci(ps['3'])}`);});
eq(51,'tasks/commits/variants',(R[50].match(/(\d+) tasks, (\d+) commits, (\d+) ranked lists/)||[]).slice(1).join(','),[AL.tasks,AL.commits,AL.variants].join(','));
eq(51,'options',(R[50].match(/primary options (\S+): (\w+) form, (\w+) granularity, pad (\w+); ([\d,]+) tokens/)||[]).slice(1).join(','),[AL.options.record,AL.options.form,AL.options.granularity,AL.options.pad,AL.budget_tokens.toLocaleString('en-US')].join(','));
const ab=(lab)=>{const x=AL.absent_tasks[lab];return x.pool+'/'+x.unrestricted;};
arms.forEach((a,i)=>{const l=59+i,c=cells(l);const g=I24.labels, f=AL.lane_file_recall.labels;
 eq(l,a+' i24',c[1],u3(g[a+'_alone_mean'].mean.primary)+' / '+u3(g[a+'_fused_mean'].mean.primary));
 eq(l,a+' i24 vs',c[2],ci(g[a+'_alone_mean'].vs_RRF.primary)+' / '+ci(g[a+'_fused_mean'].vs_RRF.primary));
 eq(l,a+' fr',c[3],u3(f[a+'_alone_mean'].mean.primary)+' / '+u3(f[a+'_fused_mean'].mean.primary));
 eq(l,a+' fr vs',c[4],ci(f[a+'_alone_mean'].vs_RRF.primary)+' / '+ci(f[a+'_fused_mean'].vs_RRF.primary));
 eq(l,a+' absent',c[5],['alone','fused'].map(v=>[1,2,3].map(s=>ab(a+'_'+v+'_s'+s)).join(', ')).join(' ; '));});
['RRF','PPR','CO','DIR'].forEach((a,i)=>{const l=65+i,c=cells(l);const g=I24.labels, f=AL.lane_file_recall.labels;
 eq(l,a+' i24',c[1],u3(g[a].mean.primary)); eq(l,a+' fr',c[3],u3(f[a].mean.primary));
 if(a!=='RRF'){eq(l,a+' i24 vs',c[2],ci(g[a].vs_RRF.primary)); eq(l,a+' fr vs',c[4],ci(f[a].vs_RRF.primary));}
 eq(l,a+' absent',c[5],ab(a));});
{const s=I22.stage_a; eq(72,'stageA',R[71],`Stage-A held-out triples (${s.held_out.queries} queries at ${s.held_out.sha.slice(0,8)}): PPR MRR ${u3(s.PPR.mrr_all_entities)}, CO MRR ${u3(s.CO.mrr_all_entities)} (all entities).`);}
['E1','E2','E3','E4','E5'].forEach((a,i)=>{const l=76+i,c=cells(l);
 eq(l,a+' stageA',c[1],I22.stage_a.arms[a].map(x=>`${x.config_id} ${u3(x.mrr_all_entities)} (${u3(x.loss_ratio_as_run)} / ${u3(x.loss_ratio_to_selection_epoch)})`).join('; '));
 const b=I22.stage_b_loss_ratio[a]; eq(l,a+' stageB',c[2],Object.keys(b).sort().map(k=>`${k} ${u3(b[k].median)} (${b[k].units})`).join('; '));
 const p=I22.check_predict_target[a]; let exp;
 if(a==='E5') exp='per specialist: '+Object.keys(p.specialists).sort().map(k=>{const q=p.specialists[k];return `${k} ${q.full_order_identical}/${q.queries} identical`;}).join(', ');
 else exp=`${p.config_id}: ${p.full_order_identical}/${p.queries} orders identical, max abs diff ${ex1(p.max_abs_score_diff)}`+(a==='E4'?' (fresh model, ruling 74)':'');
 eq(l,a+' predict',c[3],exp);});
['E1','E2','E3','E4','E5'].forEach((a,i)=>{const l=86+i;const k=T.counts[a].late50_block_choices.pool, o=k.occurrences;
 const g=(re)=>{const m=R[l-1].match(re);return m?m.slice(1).join(','):'NOMATCH';};
 eq(l,a+' seeds equal/recomputed',g(/seeds equal: (\w+); recomputed: (\w+)/),[k.same_across_seeds?'True':'False',k.recompute_matches_counts?'True':'False'].join(','));
 eq(l,a+' tasks',g(/\): (\d+) tasks/),String(o.tasks));
 eq(l,a+' unscored seed',g(/; (\d+) with an unscored seed \((\d+) candidate occurrences, (\d+) distinct candidates, (\d+) distinct/),[o.tasks_with_unscored_seed||0,o.cands_of_unscored_seeds||0,(k.distinct.cands_of_unscored_seeds||0),(k.distinct_checkpoint_entities.cands_of_unscored_seeds||0)].join(','));
 eq(l,a+' scored',g(/scored seeds: (\d+) of (\d+) candidate occurrences unscored \((\d+) distinct, (\d+) \(checkpoint, path\) pairs\), absent at C (\d+), not in a routed specialist (\d+); tasks on a checkpoint without co_changed (\d+); folded (\d+)/),
   [o.scored_seed_cands_unscored,o.scored_seed_cands,(k.distinct.not_in_routed_specialists||0)+(k.distinct.absent_at_C||0),(k.distinct_checkpoint_entities.not_in_routed_specialists||0)+(k.distinct_checkpoint_entities.absent_at_C||0),o.scored_seed_cands_unscored_absent_at_C,o.scored_seed_cands_unscored_not_in_routed_specialists,o.tasks_on_checkpoint_without_co_changed||0,o.cands_folded+o.seeds_folded].join(','));});
{const c=I27.chosen; eq(94,'item27',R[93],`Frozen before any held-out unit (${I27.frozen_at.slice(0,19)}): ${c.arm} ${c.config_id}, w ${c.w}, ${c.epochs} epochs, s ${I27.s}, device ${I27.device}; all-65 figure ${c.figure_all65.toFixed(4)}; tie group ${I27.tie_group_4dp.join(', ')}.`);}
const hv=['E1_alone_s1','E1_alone_s2','E1_alone_s3','E1_alone_mean','E1_fused_s1','E1_fused_s2','E1_fused_s3','E1_fused_mean','RRF','PPR','CO','DIR'];
hv.forEach((v,i)=>{const l=101+i,c=cells(l);eq(l,v+' label',c[0],v);let k=1;
 for(const sc of ['pool','unrestricted'])for(const m of M) eq(l,v+' '+sc+' '+m,c[k++],u3(H.rank[v][sc][m]));
 eq(l,v+' answer',c[k++],u3(H.answer_level[v]));
 let a; if(v.endsWith('_mean')){const b=v.replace('_mean','');a=[1,2,3].map(s=>{const x=HO.absent_tasks[b+'_s'+s];return x.pool+'/'+x.unrestricted;}).join(', ');} else {const x=HO.absent_tasks[v];a=x.pool+'/'+x.unrestricted;}
 eq(l,v+' absent',c[k++],a);});
for(const [l,v] of [[114,'E1_fused_mean'],[115,'E1_alone_mean']]){const x=H.vs_RRF[v];
 eq(l,v+' vs',R[l-1].replace(/^.*description only\): /,''),`pool P@10 ${ci(x['pool_P@10'])}; unrestricted P@10 ${ci(x['unrestricted_P@10'])}; answer level ${ci(x.answer_level)}.`);}
{const lc=H.literal_check; eq(116,'literal',(R[115].match(/(\d+) tasks, task commit in the checkpoint's history (\d+), parent mismatch (\d+)/)||[]).slice(1).join(','),[lc.tasks,lc.task_commit_in_checkpoint_history,lc.parent_mismatch].join(','));
 const cr=require('crypto'); const sha=cr.createHash('sha256').update(fs.readFileSync(L+'/train/heldout/item27.json')).digest('hex'); eq(116,'freeze sha in heldout.json',H.freeze_sha256,sha);
 const sh2=cr.createHash('sha256').update(fs.readFileSync(L+'/train/heldout/HANDOFF.json')).digest('hex'); eq(116,'handoff sha in heldout.json',H.handoff_sha256,sh2); eq(116,'arm',H.arm,'E1');
 eq(97,'commits/tasks',(R[96].match(/(\d+) commits, (\d+) tasks/)||[]).slice(1).join(','),[H.commits,H.tasks].join(','));}
eq(120,'lag',R[119],`- Stride s = ${T.lag.stride}; lag (ruling 52) over late-50 tasks {'0': ${T.lag.late50_tasks['0']}}, over all tune tasks {'0': ${T.lag.all_tune_tasks['0']}}.`);
{const m=R[120].match(/Leak audit \(ruling 60\): (\w+); checkpoints and tasks per split (\{.*?\]\}); failures (\d+); container mounts listed (\d+)/);
 eq(121,'leak ok',m[1],LA.ok?'PASS':'FAIL'); eq(121,'splits',m[2],JSON.stringify({tune:[LA.splits.tune.checkpoints,LA.splits.tune.tasks],heldout:[LA.splits.heldout.checkpoints,LA.splits.heldout.tasks]}).replace(/,"/g,', "').replace(/":/g,'": ').replace(/,(\d)/g,', $1'));
 eq(121,'failures',m[3],String(LA.failures.length)); eq(121,'mounts',m[4],String(LA.mounts.length));
 eq(121,'r92 text',R[120].replace(/^.*?Ruling 92:/,'Ruling 92:').replace(/ \(leak_audit\.json ruling92\.text; check ok = True\)$/,''),LA.ruling92.text||RJ.leak_audit.ruling92.text);}
{const a=I22.stage_a.arms.E2; eq(125,'n3',(R[124].match(/: (c11 .*)\.$/)||[])[1],a.map(x=>`${x.config_id} ${x.cfg.n3_weight} / 3 = ${(+(x.cfg.n3_weight/3).toPrecision(4))}`).join('; '));}
{const r=RJ.route.pool; eq(145,'median pool',(R[144].match(/late 50 (\d+) \((\d+) tasks\), held-out ([\d.]+) \((\d+) tasks\)/)||[]).slice(1).join(','),[r.late50.median,r.late50.tasks,r.heldout.median.toFixed(1),r.heldout.tasks].join(','));}
console.log('compared',n,'mismatches',bad.length); for(const b of bad) console.log(JSON.stringify(b));
