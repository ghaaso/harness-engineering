const fs=require('fs'),path=require('path');
const lib='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/library-pathways';
const E=require(path.join(lib,'engine.js'));
const map=JSON.parse(fs.readFileSync(path.join(lib,'map.json'),'utf8'));
const table=JSON.parse(fs.readFileSync(path.join(lib,'params.json'),'utf8'));
const lims=JSON.parse(fs.readFileSync(path.join(lib,'limitations.json'),'utf8'));
const rows=E.tableRows(table);
const best=E.paramsFromTable(table,'best');
const G={
 recurrence:['u_exact','u_similar','u_composite','latent_coverage_factor','ok_coverage_factor','k_fill'],
 reach:['t_visible','t_latent','r_exact','r_similar','r_comp_full','r_comp_part','d_deliver','w_write'],
 quality:['v_max','k_distract','f_false','c_check_share','a_right','a_wrong','q_exact','q_similar','q_comp','q_part','h_harm','e_right','fix_on_found','delta_stale','retire_bad','s_exact','s_similar','s_comp','s_part'],
 running_cost:['c_lookup','c_screen','c_carry','c_write']
};
const good=id=>rows[id].good_end==='high'?rows[id].high:rows[id].low;
const bad=id=>rows[id].good_end==='high'?rows[id].low:rows[id].high;
function at(p){const tp=E.timePath(map,p);const last=tp.periods[tp.periods.length-1];return {cl:last.ratios.cost_vs_ladder,wl:last.ratios.wrong_vs_ladder,ct:last.ratios.cost_vs_top,wt:last.ratios.wrong_vs_top,lc:last.library.cost,lw:last.library.wrong,fe:last.library.measures.fw_right};}
const f=(v,d=3)=>Number(v).toFixed(d);
function setting(levels){const p=Object.assign({},best);for(const g of Object.keys(levels)){const lv=levels[g];G[g].forEach(id=>{p[id]=lv===1?good(id):lv===0?bad(id):p[id];});}return p;}
const b0=at(best);
console.log('middle guess |',f(b0.cl),f(b0.wl),f(b0.ct),f(b0.wt),'fe',f(b0.fe,2),'lib',f(b0.lc,2),f(b0.lw*100,1));
console.log('8 corners (recurrence, reach, quality), running cost at best: c/l w/l c/s w/s funnel | lib cost, wrong%');
for(const r of[0,1])for(const c of[0,1])for(const q of[0,1]){const x=at(setting({recurrence:r,reach:c,quality:q}));console.log(r,c,q,'|',f(x.cl),f(x.wl),f(x.ct),f(x.wt),'fe',f(x.fe,2),'|',f(x.lc,2),f(x.lw*100,1));}
const fav=setting({recurrence:1,reach:1,quality:1,running_cost:1});const F=at(fav);
const S=x=>((b0.lc-x.lc)/b0.lc+(b0.lw-x.lw)/b0.lw)/2;
console.log('all good incl running cost |',f(F.cl),f(F.wl),f(F.ct),f(F.wt),'fe',f(F.fe,2),'score',f(S(F)*100,1)+'%','cost fall',f((b0.lc-F.lc)/b0.lc*100,1)+'%','wrong fall',f((b0.lw-F.lw)/b0.lw*100,1)+'%');
const wc=at(setting({recurrence:1,reach:1,quality:0,running_cost:0}));console.log('worst corner (much recurs, high reach, poor quality, high running cost) |',f(wc.cl),f(wc.wl),f(wc.ct),f(wc.wt));
function alone(ids){const p=Object.assign({},best);ids.filter(id=>rows[id]&&rows[id].side==='library').forEach(id=>p[id]=good(id));return S(at(p))/S(F);}
function last(ids){const p=Object.assign({},fav);ids.filter(id=>rows[id]&&rows[id].side==='library').forEach(id=>p[id]=best[id]);return (S(F)-S(at(p)))/S(F);}
console.log('\nGROUPS alone% last% (share of the full fall, score = mean of relative fall in library cost and wrong rate)');
Object.keys(G).forEach(g=>console.log(g.padEnd(13),f(alone(G[g])*100,1),f(last(G[g])*100,1)));
const steps={};lims.items.forEach(l=>{(steps[l.main_step]=steps[l.main_step]||new Set());(l.params||[]).forEach(id=>steps[l.main_step].add(id));});
console.log('\nSTEPS alone% last%');
Object.keys(steps).sort((a,b)=>a-b).forEach(s=>{const ids=[...steps[s]];console.log('step',s,f(alone(ids)*100,1),f(last(ids)*100,1));});
console.log('\nLIMITATIONS top by last');
const lr=lims.items.map(l=>({id:l.id,s:l.main_step,t:l.title,a:alone(l.params||[]),l:last(l.params||[]),n:(l.params||[]).filter(id=>rows[id]&&rows[id].side==='library').length})).filter(r=>r.n).sort((x,y)=>y.l-x.l);
lr.slice(0,12).forEach(r=>console.log(r.id,'s'+r.s,'alone',f(r.a*100,1),'last',f(r.l*100,1),'|',r.t.slice(0,58)));
// greedy sequence on steps
let cur=Object.assign({},best),moved=new Set(),seq=[];const stepIds=Object.keys(steps);
for(let k=0;k<stepIds.length;k++){let bestS=null;for(const s of stepIds){if(seq.includes(s))continue;const p=Object.assign({},cur);[...steps[s]].filter(id=>rows[id]&&rows[id].side==='library').forEach(id=>p[id]=good(id));const sc=S(at(p));if(!bestS||sc>bestS.sc)bestS={s,sc,p};}seq.push(bestS.s);cur=bestS.p;console.log('seq',k+1,'step',bestS.s,'cumulative share of full fall',f(bestS.sc/S(F)*100,1)+'%');}
