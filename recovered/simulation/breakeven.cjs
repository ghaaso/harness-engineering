const fs=require('fs'),path=require('path');
const lib='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/library-pathways';
const E=require(path.join(lib,'engine.js'));
const map=JSON.parse(fs.readFileSync(path.join(lib,'map.json'),'utf8'));
const table=JSON.parse(fs.readFileSync(path.join(lib,'params.json'),'utf8'));
const rows=E.tableRows(table);const best=E.paramsFromTable(table,'best');
const ids=Object.keys(rows).filter(id=>rows[id].side==='library');
const grp={};ids.forEach(id=>{(grp[rows[id].lib_group]=grp[rows[id].lib_group]||[]).push(id);});
console.log(Object.keys(grp).map(g=>g+':'+grp[g].length).join(' '));
const good=id=>rows[id].good_end==='high'?rows[id].high:rows[id].low;
const poor=id=>rows[id].good_end==='high'?rows[id].low:rows[id].high;
const lvl=(id,l)=>poor(id)+l*(good(id)-poor(id));
function at(p){const tp=E.timePath(map,p);const last=tp.periods[tp.periods.length-1];return {cl:last.ratios.cost_vs_ladder,wl:last.ratios.wrong_vs_ladder,ct:last.ratios.cost_vs_top,wt:last.ratios.wrong_vs_top};}
const f=(v,d=3)=>Number(v).toFixed(d);
function setting(L){const p=Object.assign({},best);Object.keys(L).forEach(g=>{if(L[g]==null)return;grp[g].forEach(id=>p[id]=lvl(id,L[g]));});return p;}
const ceil=l=>['u_exact','u_similar','u_composite'].reduce((a,id)=>a+lvl(id,l),0);
// where is the middle value on the recurrence level scale?
const midCeil=['u_exact','u_similar','u_composite'].reduce((a,id)=>a+best[id],0);
console.log('ceiling share at middle values',f(midCeil,2),'| at level 0',f(ceil(0),2),'| at level 1',f(ceil(1),2));
console.log('\nreach and quality at good ends; running cost at middle; recurrence level swept: level, ceiling share, cost/ladder, wrong/ladder, cost/strong, wrong/strong');
for(let l=0;l<=1.0001;l+=0.1){const x=at(setting({recurrence:l,reach:1,quality:1}));console.log(f(l,1),f(ceil(l),2),'|',f(x.cl),f(x.wl),f(x.ct),f(x.wt));}
console.log('\nsame with running cost at its good (low) end');
for(let l=0;l<=1.0001;l+=0.1){const x=at(setting({recurrence:l,reach:1,quality:1,running_cost:1}));console.log(f(l,1),f(ceil(l),2),'|',f(x.cl),f(x.wl),f(x.ct),f(x.wt));}
console.log('\nreach and quality at 0.75 of the way; running cost middle');
for(let l=0;l<=1.0001;l+=0.1){const x=at(setting({recurrence:l,reach:0.75,quality:0.75}));console.log(f(l,1),f(ceil(l),2),'|',f(x.cl),f(x.wl),f(x.ct),f(x.wt));}
console.log('\nrecurrence at middle VALUES (not level), reach+quality good, running cost middle / low');
let x=at(setting({reach:1,quality:1}));console.log('mid recurrence',f(x.cl),f(x.wl),f(x.ct),f(x.wt));
x=at(setting({reach:1,quality:1,running_cost:1}));console.log('mid recurrence, low running cost',f(x.cl),f(x.wl),f(x.ct),f(x.wt));
// only the three ceilings moved (k_fill and factors at middle)
console.log('\nonly the three ceilings scaled (other recurrence unknowns at middle); reach+quality good; running cost middle: total ceiling share, cost/ladder, wrong/ladder');
for(const s of [0.26,0.35,0.45,0.55,0.65,0.75,0.85,0.92]){const p=setting({reach:1,quality:1});const k=s/midCeil;['u_exact','u_similar','u_composite'].forEach(id=>p[id]=Math.min(best[id]*k,1));const y=at(p);console.log(f(s,2),'|',f(y.cl),f(y.wl));}
