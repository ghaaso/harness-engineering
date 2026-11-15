const fs=require('fs'),path=require('path');
const lib='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/library-pathways';
const E=require(path.join(lib,'engine.js'));
const map=JSON.parse(fs.readFileSync(path.join(lib,'map.json'),'utf8'));
const table=JSON.parse(fs.readFileSync(path.join(lib,'params.json'),'utf8'));
const lims=JSON.parse(fs.readFileSync(path.join(lib,'limitations.json'),'utf8'));
const rows=E.tableRows(table);
const best=E.paramsFromTable(table,'best');
const good=id=>rows[id].good_end==='high'?rows[id].high:rows[id].low;
const libIds=Object.keys(rows).filter(id=>rows[id].side==='library');
const fav=Object.assign({},best);libIds.forEach(id=>fav[id]=good(id));
function at(p){const tp=E.timePath(map,p);const last=tp.periods[tp.periods.length-1];return {cl:last.ratios.cost_vs_ladder,wl:last.ratios.wrong_vs_ladder,ct:last.ratios.cost_vs_top,wt:last.ratios.wrong_vs_top,lc:last.library.cost,lw:last.library.wrong,dc:tp.cheap_ladder.cost,dw:tp.cheap_ladder.wrong,tc:tp.top_first.cost,tw:tp.top_first.wrong,fe:last.library.measures.fw_right,outs:last.library.outcomes||null};}
const f=(v,d=3)=>v==null?'-':Number(v).toFixed(d);
function show(label,p){const x=at(p);console.log(label.padEnd(44),'| lib',f(x.lc,1),f(x.lw*100,1)+'%','| ladder',f(x.dc,1),f(x.dw*100,1)+'%','| strong',f(x.tc,1),f(x.tw*100,1)+'%','| ratios c/l',f(x.cl,2),'w/l',f(x.wl,2),'c/s',f(x.ct,2),'w/s',f(x.wt,2));return x;}
console.log('limitations acting only through other-side unknowns:');
['LIM-32','LIM-34','LIM-39','LIM-41','LIM-42','LIM-43','LIM-45','LIM-47'].forEach(id=>{const l=lims.items.find(x=>x.id===id);console.log(id,'s'+l.main_step,(l.params||[]).join(','),'|',l.title,'| cases',JSON.stringify(l.real&&l.real.cases));});
const others=Object.keys(rows).filter(id=>rows[id].side!=='library');
console.log('other-side named by any limitation:');const named={};lims.items.forEach(l=>(l.params||[]).forEach(id=>{if(others.includes(id))(named[id]=named[id]||[]).push(l.id);}));Object.keys(named).forEach(k=>console.log(' ',k,named[k].length,named[k].join(' ')));
const GATE={g_tests_visible:'high',g_tests_latent:'high',g_review:'high',s_review:'high'};
const LADDER={rho_retry:'high',o_opus:'high',o_fable:'high',c_handoff:'low'};
function move(base,set){const p=Object.assign({},base);Object.keys(set).forEach(id=>p[id]=rows[id][set[id]]);return p;}
console.log('');
show('best',best);show('best + gate good',move(best,GATE));show('best + ladder good',move(best,LADDER));show('best + gate + ladder good',move(move(best,GATE),LADDER));
show('library favourable',fav);show('library favourable + gate good',move(fav,GATE));show('library favourable + ladder good',move(fav,LADDER));show('library favourable + gate + ladder good',move(move(fav,GATE),LADDER));
console.log('\none gate unknown at a time, at library-favourable:');
Object.keys(Object.assign({},GATE,LADDER,{l_found:'high',n_cheap:'low',need_visible:'low',need_latent:'low',p_visible:'high',m_opus:'low'})).forEach(id=>{const end={l_found:'high',n_cheap:'low',need_visible:'low',need_latent:'low',p_visible:'high',m_opus:'low'}[id]||GATE[id]||LADDER[id];show(id+' -> '+end,move(fav,{[id]:end}));});
console.log('\nworld unknowns at best library:');
[['p_visible','high'],['p_visible','low'],['need_visible','high'],['need_latent','high'],['need_visible','low'],['need_latent','low']].forEach(([id,e])=>show(id+' -> '+e,move(best,{[id]:e})));
