const fs=require('fs'),cp=require('child_process');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const R='C:/Users/User/Documents/projects/EMS_workshop1';
const git=(a)=>cp.execFileSync('git',['-C',R,...a],{encoding:'utf8',maxBuffer:1<<28});
const truth=fs.readFileSync('heldout_truth2.jsonl','utf8').trim().split('\n').map(JSON.parse);
const out=[];let a=0,b=0,c=0,d=0;
for(const p of new Set(truth.map(t=>t.parent))){const h=new Set(fs.readFileSync(`${L}/export/graphs/${p}/ancestors.txt`,'utf8').split('\n').map(s=>s.trim()).filter(Boolean));
 const np=git(['rev-list','--parents','-n1',p]).trim().split(' ').length-1;
 const nm=new Set(git(['rev-list','--no-merges',p]).split('\n').filter(Boolean));
 const eq=[...nm].every(x=>h.has(x))&&h.size===nm.size;
 if(h.has(p)){a++; if(np>1)c++;} else {b++; if(np>1)d++;}
 out.push(p.slice(0,8)+' np'+np+' inHist'+h.has(p)+' hist'+h.size+' noMergeAnc'+nm.size+' equal'+eq);}
const s=`parent in own hist ${a} (of which merges ${c}); not ${b} (of which merges ${d})\n`+out.join('\n');fs.writeFileSync('anc2.out',s);console.log(s.split('\n').slice(0,12).join('\n'));console.log('all equal to non-merge ancestry:',out.every(l=>l.endsWith('equaltrue')));
