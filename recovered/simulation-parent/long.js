const L=require(process.cwd()+'/limitations.json'),C=require(process.cwd()+'/cases.json');
const sentenceOf = s => s.replace(/<[^>]*>/g, ' ').replace(/\{\{[^}]+\}\}/g, 'X').replace(/&[a-z]+;/g, ' ');
function sentences(s) { return sentenceOf(s).split(/(?<=[.!?])\s+(?=[A-Z'‘“(0-9X])/).map(x => x.trim()).filter(Boolean); }
const wc = s => s.split(/\s+/).filter(t => /[A-Za-z0-9]/.test(t)).length;
const T=[];
L.items.forEach(it=>{T.push([it.id+'.title',it.title]);T.push([it.id+'.what',it.what]);if(it.not_shown)T.push([it.id+'.not_shown',it.not_shown]);
 (it.real.examples||[]).forEach((x,i)=>Object.keys(x).forEach(k=>{if(typeof x[k]==='string'&&!['case','family'].includes(k))T.push([it.id+'.ex'+i+'.'+k,x[k]])}));
 it.contradicted.forEach((c,i)=>T.push([it.id+'.contra'+i,c.reason]));});
L.works.forEach(w=>{T.push(['works '+w.case+'.text',w.text]);if(w.caveat)T.push(['works '+w.case+'.caveat',w.caveat]);});
C.cases.forEach(c=>{['title','story','entry','worked'].forEach(k=>c[k]&&T.push([c.id+'.'+k,c[k]]));c.steps.forEach(s=>T.push([c.id+'.s'+s.step,s.note]));});
let n=0,long=[];T.forEach(([w,s])=>sentences(s).forEach(x=>{n++;const k=wc(x);if(k>20)long.push([w,k,x]);}));
console.log('sentences',n,'long',long.length);
if(process.argv[2]!=='q')long.forEach(l=>console.log(l[0]+' ('+l[1]+'): '+l[2]));
