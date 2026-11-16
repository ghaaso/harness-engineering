const fs=require('fs'),cp=require('child_process');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const R='C:/Users/User/Documents/projects/EMS_workshop1';
const git=(a)=>cp.execFileSync('git',['-C',R,...a],{encoding:'utf8',maxBuffer:1<<28});
const out=[];
for(const p of ['1bb2276b4028f97fd9de6ba4d7069dfcb72c76b9','eddc5c6a216c','76061e00','f57288f1f9a1']){
 const full=git(['rev-parse',p]).trim();
 const h=new Set(fs.readFileSync(`${L}/export/graphs/${full}/ancestors.txt`,'utf8').split('\n').map(s=>s.trim()).filter(Boolean));
 const nm=git(['rev-list','--no-merges',full]).split('\n').filter(Boolean);
 const miss=nm.filter(x=>!h.has(x));
 out.push(full.slice(0,8)+' missing '+miss.length+': '+miss.map(m=>git(['log','-1','--format=%h %ad %s','--date=short',m]).trim()).join(' || '));
 const fp=git(['rev-list','--first-parent','--no-merges',full]).split('\n').filter(Boolean);
 out.push('  first-parent non-merge count '+fp.length+' all in hist '+fp.every(x=>h.has(x))+' ; hist size '+h.size+' ; hist ordered last line '+[...h].slice(-1)[0].slice(0,8));
}
fs.writeFileSync('anc3.out',out.join('\n'));console.log(out.join('\n'));
